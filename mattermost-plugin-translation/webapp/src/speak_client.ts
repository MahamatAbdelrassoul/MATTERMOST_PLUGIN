const PLUGIN_ID = 'com.transchecker.translation';
const API_BASE = `/plugins/${PLUGIN_ID}/api/v1`;

let activeAudio: HTMLAudioElement | null = null;
let activeObjectUrl: string | null = null;
let activePostId: string | null = null;
let usingBrowserSpeech = false;

type SpeechListener = (postId: string | null) => void;
const listeners = new Set<SpeechListener>();

function notifyListeners(): void {
    for (const listener of listeners) {
        listener(activePostId);
    }
}

export function onSpeechStateChange(listener: SpeechListener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function getActiveSpeechPostId(): string | null {
    return activePostId;
}

export function isSpeechPlaying(): boolean {
    if (activeAudio && !activeAudio.paused) {
        return true;
    }
    if (usingBrowserSpeech && typeof window !== 'undefined' && window.speechSynthesis?.speaking) {
        return true;
    }
    return false;
}

export function stopActiveSpeech(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    usingBrowserSpeech = false;

    if (activeAudio) {
        activeAudio.pause();
        activeAudio.onended = null;
        activeAudio.onerror = null;
        activeAudio = null;
    }
    if (activeObjectUrl) {
        URL.revokeObjectURL(activeObjectUrl);
        activeObjectUrl = null;
    }
    activePostId = null;
    notifyListeners();
}

function toBcp47(language: string): string {
    const code = language.trim().toLowerCase();
    if (!code) {
        return 'en-US';
    }
    if (code.includes('-')) {
        const [lang, region] = code.split('-');
        return `${lang}-${region.toUpperCase()}`;
    }
    const defaults: Record<string, string> = {
        en: 'en-US',
        fr: 'fr-FR',
        ja: 'ja-JP',
        lg: 'lg-UG',
        sw: 'sw-KE',
        de: 'de-DE',
        es: 'es-ES',
    };
    return defaults[code] || `${code}-${code.toUpperCase()}`;
}

function pickBrowserVoice(language: string, voiceGender?: string): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
        return null;
    }

    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) {
        return null;
    }

    const langPrefix = toBcp47(language).toLowerCase().split('-')[0];
    const languageMatches = voices.filter((voice) => voice.lang.toLowerCase().startsWith(langPrefix));
    const pool = languageMatches.length > 0 ? languageMatches : voices;

    const gender = (voiceGender || 'neutral').toLowerCase();
    const femalePattern = /female|woman|girl|zira|samantha|victoria|hazel|susan|karen|moira|tessa|amelie|marie|claire/i;
    const malePattern = /male|man|boy|david|mark|james|daniel|thomas|paul|george|henri|nicolas/i;

    if (gender === 'female') {
        return pool.find((voice) => femalePattern.test(voice.name)) || pool[0] || null;
    }
    if (gender === 'male') {
        return pool.find((voice) => malePattern.test(voice.name)) || pool[0] || null;
    }

    return pool[0] || null;
}

async function fetchSpeakResolve(postId: string): Promise<{text: string; language: string; voice_gender?: string}> {
    const response = await fetch(`${API_BASE}/speak/resolve`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({post_id: postId}),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Could not prepare speech (${response.status})`);
    }

    return response.json() as Promise<{text: string; language: string}>;
}

async function playWithBrowserSpeech(postId: string, text: string, language: string, voiceGender?: string): Promise<'started'> {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
        throw new Error('This browser does not support read-aloud.');
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = toBcp47(language);
    const selectedVoice = pickBrowserVoice(language, voiceGender);
    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }
    utterance.onend = () => {
        stopActiveSpeech();
    };
    utterance.onerror = () => {
        stopActiveSpeech();
    };

    activePostId = postId;
    usingBrowserSpeech = true;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    notifyListeners();
    return 'started';
}

async function playWithGoogleAudio(postId: string, blob: Blob): Promise<'started'> {
    activeObjectUrl = URL.createObjectURL(blob);
    activePostId = postId;
    activeAudio = new Audio(activeObjectUrl);
    activeAudio.onended = () => {
        stopActiveSpeech();
    };
    activeAudio.onerror = () => {
        stopActiveSpeech();
    };

    await activeAudio.play();
    notifyListeners();
    return 'started';
}

export async function playPostSpeech(postId: string): Promise<'started' | 'stopped'> {
    if (activePostId === postId && isSpeechPlaying()) {
        stopActiveSpeech();
        return 'stopped';
    }

    stopActiveSpeech();

    const response = await fetch(`${API_BASE}/speak`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({post_id: postId}),
    });

    if (response.ok) {
        const blob = await response.blob();
        if (blob.size > 0) {
            return playWithGoogleAudio(postId, blob);
        }
    }

    const resolved = await fetchSpeakResolve(postId);
    const text = resolved.text?.trim();
    if (!text) {
        throw new Error('No text available to read aloud.');
    }

    return playWithBrowserSpeech(postId, text, resolved.language || 'en', resolved.voice_gender);
}
