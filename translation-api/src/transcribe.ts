import {pipeline} from '@xenova/transformers';
import decode, {type AudioData} from 'audio-decode';

import {isGoogleSpeechEnabled, transcribeWithGoogleSpeech} from './google_speech.js';
import {detectLanguageWithGoogle, isGoogleTranslateEnabled} from './google.js';
import {GOOGLE_SPEECH_SYNC_MAX_SECONDS, normalizeSpeechLanguageCode, toWhisperLanguage} from './speech_bcp47.js';

type Transcriber = Awaited<ReturnType<typeof pipeline>>;

const WHISPER_MODEL = process.env.WHISPER_MODEL?.trim() || 'Xenova/whisper-small';

let transcriberPromise: Promise<Transcriber> | null = null;

async function getTranscriber(): Promise<Transcriber> {
  if (!transcriberPromise) {
    transcriberPromise = pipeline('automatic-speech-recognition', WHISPER_MODEL);
  }
  return transcriberPromise;
}

function resampleTo16k(input: Float32Array, inputRate: number): Float32Array {
  if (inputRate === 16000) {
    return input;
  }

  const ratio = inputRate / 16000;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const idx = Math.floor(srcIndex);
    const frac = srcIndex - idx;
    const s0 = input[idx] ?? 0;
    const s1 = input[idx + 1] ?? s0;
    output[i] = s0 + (s1 - s0) * frac;
  }

  return output;
}

function toMonoFloat32(audioData: AudioData): Float32Array {
  const {channelData} = audioData;
  if (!channelData.length || !channelData[0]?.length) {
    throw new Error('No audio samples in the recording.');
  }

  if (channelData.length === 1) {
    return new Float32Array(channelData[0]);
  }

  const channel0 = channelData[0];
  const channel1 = channelData[1];
  const merged = new Float32Array(channel0.length);
  const scale = Math.sqrt(2);

  for (let i = 0; i < channel0.length; i++) {
    merged[i] = (scale * (channel0[i] + channel1[i])) / 2;
  }

  return merged;
}

async function decodeAudioBuffer(buffer: Buffer): Promise<{samples: Float32Array; sampleRate: number; durationSeconds: number}> {
  const audioData = await decode(new Uint8Array(buffer));
  const mono = toMonoFloat32(audioData);
  const samples = resampleTo16k(mono, audioData.sampleRate);
  const durationSeconds = samples.length / 16000;
  return {samples, sampleRate: 16000, durationSeconds};
}

async function transcribeWithWhisper(
  buffer: Buffer,
  languageHint?: string,
): Promise<{text: string; detected_language: string; engine: string}> {
  const {samples} = await decodeAudioBuffer(buffer);
  const whisperLanguage = toWhisperLanguage(languageHint);

  const transcriber = await getTranscriber();
  const output = await transcriber(samples, {
    chunk_length_s: 30,
    stride_length_s: 5,
    ...(whisperLanguage ? {language: whisperLanguage, task: 'transcribe'} : {}),
  }) as {text?: string};

  const text = String(output?.text || '').trim();
  if (!text) {
    throw new Error('No speech detected in the recording.');
  }

  let detectedLanguage = whisperLanguage || '';
  if (!detectedLanguage && isGoogleTranslateEnabled()) {
    try {
      detectedLanguage = await detectLanguageWithGoogle(text);
    } catch {
      detectedLanguage = '';
    }
  }

  return {
    text,
    detected_language: normalizeSpeechLanguageCode(detectedLanguage) || 'auto',
    engine: `whisper:${WHISPER_MODEL}`,
  };
}

export function getSpeechEngine(): string {
  if (isGoogleSpeechEnabled()) {
    return `google-speech+whisper:${WHISPER_MODEL}`;
  }
  return `whisper:${WHISPER_MODEL}`;
}

export async function transcribeAudioBuffer(
  buffer: Buffer,
  fileName: string,
  options?: {languageHint?: string; mimeType?: string},
): Promise<{text: string; detected_language: string; engine: string}> {
  const mimeType = options?.mimeType || '';
  const languageHint = options?.languageHint?.trim() || '';

  let durationSeconds = 0;
  try {
    const decoded = await decodeAudioBuffer(buffer);
    durationSeconds = decoded.durationSeconds;
  } catch {
    durationSeconds = 0;
  }

  const useGoogleSync = isGoogleSpeechEnabled()
    && durationSeconds > 0
    && durationSeconds <= GOOGLE_SPEECH_SYNC_MAX_SECONDS;

  if (useGoogleSync) {
    try {
      return await transcribeWithGoogleSpeech(buffer, mimeType, fileName, languageHint, durationSeconds);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google Speech failed';
      console.warn(`Google Speech failed, falling back to Whisper: ${message}`);
    }
  } else if (isGoogleSpeechEnabled() && durationSeconds > GOOGLE_SPEECH_SYNC_MAX_SECONDS) {
    console.warn(
      `Audio is ${Math.round(durationSeconds)}s; using Whisper for long-form STT.`,
    );
  }

  return transcribeWithWhisper(buffer, languageHint);
}
