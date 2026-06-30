import {toSpeechBcp47} from './speech_bcp47.js';

const GOOGLE_TTS_API_KEY =
  process.env.GOOGLE_TTS_API_KEY?.trim() ||
  process.env.GOOGLE_TRANSLATE_API_KEY?.trim() ||
  '';

export function isGoogleTTSEnabled(): boolean {
  return GOOGLE_TTS_API_KEY.length > 0;
}

function googleTTSErrorMessage(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as {error?: {message?: string}};
    if (parsed.error?.message) {
      return parsed.error.message;
    }
  } catch {
    // ignore
  }
  return body || `Google Text-to-Speech API error: HTTP ${status}`;
}

function normalizeGoogleVoiceGender(value?: string): 'MALE' | 'FEMALE' | 'NEUTRAL' {
  switch ((value || '').trim().toUpperCase()) {
  case 'MALE':
    return 'MALE';
  case 'FEMALE':
    return 'FEMALE';
  default:
    return 'NEUTRAL';
  }
}

export async function synthesizeSpeech(
  text: string,
  languageCode: string,
  voiceGender?: string,
): Promise<Buffer> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('text is required');
  }
  if (!isGoogleTTSEnabled()) {
    throw new Error('Google Text-to-Speech is not configured. Set GOOGLE_TRANSLATE_API_KEY or GOOGLE_TTS_API_KEY.');
  }

  const bcp47 = toSpeechBcp47(languageCode) || 'en-US';
  const gender = normalizeGoogleVoiceGender(voiceGender);
  const payload = {
    input: {text: trimmed},
    voice: {
      languageCode: bcp47,
      ssmlGender: gender,
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 1,
      pitch: 0,
    },
  };

  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(GOOGLE_TTS_API_KEY)}`,
    {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload),
    },
  );

  const body = await response.text();
  if (!response.ok) {
    throw new Error(googleTTSErrorMessage(response.status, body));
  }

  const data = JSON.parse(body) as {audioContent?: string};
  if (!data.audioContent) {
    throw new Error('Google Text-to-Speech returned no audio.');
  }

  return Buffer.from(data.audioContent, 'base64');
}
