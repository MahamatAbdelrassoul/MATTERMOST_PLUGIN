export type MyMemoryResponse = {
  responseData?: {
    translatedText?: string;
    match?: number;
  };
  matches?: Array<{
    quality?: number;
  }>;
};

export async function translateWithMyMemory(
  text: string,
  from: string,
  to: string,
): Promise<{translated: string; engine: string}> {
  const source = (from || '').trim().toLowerCase().split(/[-_]/)[0];
  const target = (to || '').trim().toLowerCase().split(/[-_]/)[0];
  if (source && target && source === target) {
    return {translated: text, engine: 'mymemory'};
  }

  const url =
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}` +
    `&langpair=${encodeURIComponent(from)}|${encodeURIComponent(to)}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`MyMemory API error: HTTP ${res.status}`);
  }

  const data = (await res.json()) as MyMemoryResponse;
  const translated = data.responseData?.translatedText?.trim();

  if (!translated) {
    throw new Error('MyMemory returned an empty translation');
  }

  if (translated.toUpperCase().includes('BAD LANGUAGE PAIR')) {
    throw new Error(`Bad language pair: ${from}|${to}`);
  }

  if (translated.toUpperCase() === 'MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY.') {
    throw new Error('MyMemory daily quota exceeded. Try again tomorrow or enable caching.');
  }

  return {translated, engine: 'mymemory'};
}

export async function detectLanguage(text: string): Promise<string> {
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) return 'ja';
  if (/[\u0400-\u04FF]/.test(text)) return 'ru';

  const url =
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 200))}` +
    '&langpair=autodetect|en';

  try {
    const res = await fetch(url);
    if (!res.ok) return 'en';
    const data = (await res.json()) as {
      responseData?: {detectedLanguage?: string};
    };
    const detected = data.responseData?.detectedLanguage?.slice(0, 2).toLowerCase();
    return detected || 'en';
  } catch {
    return 'en';
  }
}
