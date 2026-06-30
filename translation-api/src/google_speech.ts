import {GOOGLE_SPEECH_SYNC_MAX_SECONDS, normalizeSpeechLanguageCode, toSpeechBcp47} from './speech_bcp47.js';
import {fetchWithRetry} from './fetch_retry.js';

const GOOGLE_SPEECH_API_KEY =
  process.env.GOOGLE_SPEECH_API_KEY?.trim() ||
  process.env.GOOGLE_TRANSLATE_API_KEY?.trim() ||
  '';

const AUTO_DETECT_LANGUAGES = ['en-US', 'fr-FR', 'ja-JP', 'sw-KE'];

export function isGoogleSpeechEnabled(): boolean {
  return GOOGLE_SPEECH_API_KEY.length > 0;
}

function googleSpeechErrorMessage(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as {
      error?: {message?: string};
    };
    if (parsed.error?.message) {
      return parsed.error.message;
    }
  } catch {
    // ignore
  }
  return body || `Google Speech API error: HTTP ${status}`;
}

function buildLanguageConfig(languageHint?: string): {
  languageCode: string;
  alternativeLanguageCodes: string[];
} {
  const explicit = toSpeechBcp47(languageHint);
  if (explicit) {
    return {
      languageCode: explicit,
      alternativeLanguageCodes: [],
    };
  }

  return {
    languageCode: 'en-US',
    alternativeLanguageCodes: AUTO_DETECT_LANGUAGES.filter((code) => code !== 'en-US').slice(0, 3),
  };
}

export function speechEncoding(mimeType: string, fileName: string): string {
  const mime = (mimeType || '').toLowerCase();
  const name = (fileName || '').toLowerCase();

  if (mime.includes('webm') || name.endsWith('.webm')) {
    return 'WEBM_OPUS';
  }
  if (mime.includes('ogg') || name.endsWith('.ogg')) {
    return 'OGG_OPUS';
  }
  if (mime.includes('mp4') || mime.includes('m4a') || name.endsWith('.m4a') || name.endsWith('.mp4')) {
    return 'MP4';
  }
  if (mime.includes('mpeg') || mime.includes('mp3') || name.endsWith('.mp3')) {
    return 'MP3';
  }
  if (mime.includes('wav') || name.endsWith('.wav')) {
    return 'LINEAR16';
  }
  if (mime.includes('flac') || name.endsWith('.flac')) {
    return 'FLAC';
  }

  return 'WEBM_OPUS';
}

async function recognizeChunk(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
  languageHint?: string,
): Promise<{text: string; detected_language: string}> {
  const encoding = speechEncoding(mimeType, fileName);
  const languageConfig = buildLanguageConfig(languageHint);

  const payload = {
    config: {
      encoding,
      languageCode: languageConfig.languageCode,
      ...(languageConfig.alternativeLanguageCodes.length > 0
        ? {alternativeLanguageCodes: languageConfig.alternativeLanguageCodes}
        : {}),
      enableAutomaticPunctuation: true,
      model: 'default',
    },
    audio: {
      content: buffer.toString('base64'),
    },
  };

  const response = await fetchWithRetry(
    `https://speech.googleapis.com/v1/speech:recognize?key=${encodeURIComponent(GOOGLE_SPEECH_API_KEY)}`,
    {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload),
    },
  );

  const body = await response.text();
  if (!response.ok) {
    throw new Error(googleSpeechErrorMessage(response.status, body));
  }

  const data = JSON.parse(body) as {
    results?: Array<{
      alternatives?: Array<{transcript?: string}>;
      languageCode?: string;
    }>;
  };

  const transcripts: string[] = [];
  let detectedLanguage = languageConfig.languageCode;

  for (const result of data.results || []) {
    const piece = result.alternatives?.[0]?.transcript?.trim();
    if (piece) {
      transcripts.push(piece);
    }
    if (result.languageCode) {
      detectedLanguage = result.languageCode;
    }
  }

  return {
    text: transcripts.join(' ').trim(),
    detected_language: normalizeSpeechLanguageCode(detectedLanguage) || normalizeSpeechLanguageCode(languageConfig.languageCode),
  };
}

export async function transcribeWithGoogleSpeech(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
  languageHint?: string,
  durationSeconds?: number,
): Promise<{text: string; detected_language: string; engine: string}> {
  if (durationSeconds && durationSeconds > GOOGLE_SPEECH_SYNC_MAX_SECONDS) {
    throw new Error(
      `Audio is ${Math.round(durationSeconds)}s; Google sync STT supports up to ${GOOGLE_SPEECH_SYNC_MAX_SECONDS}s.`,
    );
  }

  const result = await recognizeChunk(buffer, mimeType, fileName, languageHint);
  if (!result.text) {
    throw new Error('No speech detected in the recording.');
  }

  return {
    text: result.text,
    detected_language: result.detected_language,
    engine: 'google-speech',
  };
}
