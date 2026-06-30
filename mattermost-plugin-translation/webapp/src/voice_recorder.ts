type SpeechRecognitionCtor = new () => SpeechRecognition;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
    const w = window as Window & {
        SpeechRecognition?: SpeechRecognitionCtor;
        webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function pickMimeType(): string {
    const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
    ];
    for (const type of candidates) {
        if (MediaRecorder.isTypeSupported(type)) {
            return type;
        }
    }
    return '';
}

function extensionForMime(mimeType: string): string {
    if (mimeType.includes('ogg')) {
        return 'ogg';
    }
    if (mimeType.includes('mp4')) {
        return 'm4a';
    }
    return 'webm';
}

export type VoiceRecordingResult = {
    blob: Blob;
    fileName: string;
    mimeType: string;
    transcript: string;
    durationMs: number;
};

export type RecorderState = 'inactive' | 'recording' | 'paused';

export class VoiceRecorderSession {
    private mediaRecorder: MediaRecorder | null = null;
    private mediaStream: MediaStream | null = null;
    private speechRecognition: SpeechRecognition | null = null;
    private chunks: Blob[] = [];
    private transcriptParts: string[] = [];
    private startedAt = 0;
    private pausedMs = 0;
    private pauseStartedAt = 0;
    private mimeType = '';
    private state: RecorderState = 'inactive';

    getState(): RecorderState {
        return this.state;
    }

    async start(): Promise<void> {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('Microphone access is not supported in this browser.');
        }

        this.mediaStream = await navigator.mediaDevices.getUserMedia({audio: true});
        this.mimeType = pickMimeType();
        this.chunks = [];
        this.transcriptParts = [];
        this.startedAt = Date.now();
        this.pausedMs = 0;
        this.pauseStartedAt = 0;

        const SpeechRecognitionClass = getSpeechRecognition();
        if (SpeechRecognitionClass) {
            this.speechRecognition = new SpeechRecognitionClass();
            this.speechRecognition.continuous = true;
            this.speechRecognition.interimResults = true;
            this.speechRecognition.lang = navigator.language || 'en-US';
            this.speechRecognition.onresult = (event) => {
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const piece = event.results[i][0]?.transcript?.trim();
                    if (piece && event.results[i].isFinal) {
                        this.transcriptParts.push(piece);
                    }
                }
            };
            this.speechRecognition.onerror = () => {
                // Browser speech recognition is best-effort only.
            };
            try {
                this.speechRecognition.start();
            } catch {
                this.speechRecognition = null;
            }
        }

        this.mediaRecorder = this.mimeType
            ? new MediaRecorder(this.mediaStream, {mimeType: this.mimeType})
            : new MediaRecorder(this.mediaStream);

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.chunks.push(event.data);
            }
        };

        this.mediaRecorder.start(250);
        this.state = 'recording';
    }

    pause(): void {
        const recorder = this.mediaRecorder;
        if (!recorder || recorder.state !== 'recording') {
            return;
        }
        recorder.pause();
        this.pauseStartedAt = Date.now();
        this.state = 'paused';
        if (this.speechRecognition) {
            try {
                this.speechRecognition.stop();
            } catch {
                // ignore
            }
        }
    }

    resume(): void {
        const recorder = this.mediaRecorder;
        if (!recorder || recorder.state !== 'paused') {
            return;
        }
        if (this.pauseStartedAt > 0) {
            this.pausedMs += Date.now() - this.pauseStartedAt;
            this.pauseStartedAt = 0;
        }
        recorder.resume();
        this.state = 'recording';

        const SpeechRecognitionClass = getSpeechRecognition();
        if (SpeechRecognitionClass && !this.speechRecognition) {
            this.speechRecognition = new SpeechRecognitionClass();
            this.speechRecognition.continuous = true;
            this.speechRecognition.interimResults = true;
            this.speechRecognition.lang = navigator.language || 'en-US';
            this.speechRecognition.onresult = (event) => {
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const piece = event.results[i][0]?.transcript?.trim();
                    if (piece && event.results[i].isFinal) {
                        this.transcriptParts.push(piece);
                    }
                }
            };
            try {
                this.speechRecognition.start();
            } catch {
                this.speechRecognition = null;
            }
        }
    }

    getElapsedMs(): number {
        if (this.state === 'inactive') {
            return 0;
        }
        const now = Date.now();
        const activePause = this.state === 'paused' && this.pauseStartedAt > 0
            ? now - this.pauseStartedAt
            : 0;
        return Math.max(0, now - this.startedAt - this.pausedMs - activePause);
    }

    async stop(): Promise<VoiceRecordingResult> {
        const recorder = this.mediaRecorder;
        if (!recorder) {
            throw new Error('Recording was not started.');
        }

        if (this.state === 'paused') {
            this.resume();
        }

        const stopPromise = new Promise<void>((resolve) => {
            recorder.onstop = () => resolve();
        });

        if (recorder.state !== 'inactive') {
            recorder.stop();
        }
        await stopPromise;

        if (this.speechRecognition) {
            await new Promise<void>((resolve) => {
                const recognition = this.speechRecognition!;
                const timeout = window.setTimeout(resolve, 500);
                recognition.onend = () => {
                    window.clearTimeout(timeout);
                    resolve();
                };
                try {
                    recognition.stop();
                } catch {
                    window.clearTimeout(timeout);
                    resolve();
                }
            });
            this.speechRecognition = null;
        }

        await new Promise((resolve) => window.setTimeout(resolve, 200));

        this.mediaStream?.getTracks().forEach((track) => track.stop());
        this.mediaStream = null;
        this.mediaRecorder = null;
        this.state = 'inactive';

        const mimeType = this.mimeType || recorder.mimeType || 'audio/webm';
        const blob = new Blob(this.chunks, {type: mimeType});
        if (blob.size === 0) {
            throw new Error('No audio was captured. Try again and speak closer to the microphone.');
        }

        const transcript = this.transcriptParts.join(' ').trim();
        const extension = extensionForMime(mimeType);
        const fileName = `voice-note-${Date.now()}.${extension}`;

        return {
            blob,
            fileName,
            mimeType,
            transcript,
            durationMs: this.getElapsedMs(),
        };
    }

    cancel(): void {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        if (this.speechRecognition) {
            try {
                this.speechRecognition.stop();
            } catch {
                // ignore
            }
        }
        this.mediaStream?.getTracks().forEach((track) => track.stop());
        this.mediaStream = null;
        this.mediaRecorder = null;
        this.speechRecognition = null;
        this.chunks = [];
        this.transcriptParts = [];
        this.state = 'inactive';
    }
}
