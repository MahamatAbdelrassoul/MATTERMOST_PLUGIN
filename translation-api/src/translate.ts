import {
  detectLanguageWithGoogle,
  isGoogleTranslateEnabled,
  listGoogleLanguages,
  translateWithGoogle,
  type LanguageOption,
} from './google.js';
import {expandChatSlang} from './chat_slang.js';
import {levenshteinScore} from './levenshtein.js';
import {
  compositeQualityScore,
  embeddingSimilarity,
  isSemanticEmbeddingEnabled,
} from './semantic_embeddings.js';
import {detectLanguage as detectLanguageMyMemory, translateWithMyMemory} from './mymemory.js';

export type TranslateRequest = {
  text: string;
  to: string;
  from?: string;
  hint_language?: string;
  /** Fast path for voice/video: one Google translate call, no back-translation or embeddings. */
  fast?: boolean;
};

export type TranslateResponse = {
  origin: string;
  to: string;
  from: string;
  detected_from: string;
  translated: string;
  engine: string;
  reversed: string;
  score: number;
  semantic_score: number;
  embedding_score: number;
  quality_score: number;
  slang_expanded?: boolean;
  normalized_text?: string;
};

const FALLBACK_LANGUAGES: LanguageOption[] = [
  {code: 'en', name: 'English'},
  {code: 'ja', name: 'Japanese'},
  {code: 'lg', name: 'Luganda'},
  {code: 'fr', name: 'French'},
  {code: 'sw', name: 'Swahili'},
  {code: 'ln', name: 'Lingala'},
];

const SHORT_TEXT_MAX = 40;

export async function listLanguages(): Promise<LanguageOption[]> {
  if (isGoogleTranslateEnabled()) {
    return listGoogleLanguages('en');
  }
  return FALLBACK_LANGUAGES;
}

export function getTranslationEngine(): string {
  return isGoogleTranslateEnabled() ? 'google-translate' : 'mymemory';
}

async function detectLanguage(text: string): Promise<string> {
  if (isGoogleTranslateEnabled()) {
    return detectLanguageWithGoogle(text);
  }
  return detectLanguageMyMemory(text);
}

async function translateForward(
  text: string,
  from: string,
  to: string,
): Promise<{translated: string; engine: string; detectedFrom?: string}> {
  if (isGoogleTranslateEnabled()) {
    return translateWithGoogle(text, from, to);
  }
  return translateWithMyMemory(text, from, to);
}

function simpleSemanticScore(original: string, backTranslated: string): number {
  const origWords = new Set(
    original.toLowerCase().split(/\W+/).filter(Boolean),
  );
  const backWords = backTranslated.toLowerCase().split(/\W+/).filter(Boolean);
  if (origWords.size === 0 || backWords.length === 0) return 0;

  let overlap = 0;
  for (const word of backWords) {
    if (origWords.has(word)) overlap++;
  }

  const recall = overlap / origWords.size;
  const precision = overlap / backWords.length;
  if (recall + precision === 0) return 0;
  return (2 * recall * precision) / (recall + precision);
}

function normalizeLanguageCode(code: string): string {
  return code.trim().toLowerCase().split(/[-_]/)[0];
}

function isSameLanguage(a: string, b: string): boolean {
  return normalizeLanguageCode(a) === normalizeLanguageCode(b);
}

type ScoredCandidate = {
  from: string;
  detectedFrom: string;
  translated: string;
  engine: string;
  reversed: string;
  score: number;
  semantic_score: number;
  embedding_score: number;
  quality_score: number;
};

async function scoreTranslation(
  scoreOrigin: string,
  to: string,
  from: string,
  detectedFrom: string,
  translated: string,
  engine: string,
): Promise<ScoredCandidate> {
  if (isSameLanguage(from, to) || isSameLanguage(detectedFrom, to)) {
    return {
      from,
      detectedFrom,
      translated,
      engine,
      reversed: translated,
      score: 1,
      semantic_score: 1,
      embedding_score: 1,
      quality_score: 1,
    };
  }

  const backward = await translateForward(translated, to, from);
  const score = levenshteinScore(scoreOrigin, backward.translated);
  const semantic_score = simpleSemanticScore(scoreOrigin, backward.translated);
  const embedding_score = isSemanticEmbeddingEnabled()
    ? await embeddingSimilarity(scoreOrigin, backward.translated)
    : 0;
  const quality_score = compositeQualityScore(score, semantic_score, embedding_score);

  return {
    from,
    detectedFrom,
    translated,
    engine,
    reversed: backward.translated,
    score: Math.round(score * 100) / 100,
    semantic_score: Math.round(semantic_score * 100) / 100,
    embedding_score: Math.round(embedding_score * 100) / 100,
    quality_score,
  };
}

async function buildCandidate(
  scoreOrigin: string,
  sourceText: string,
  to: string,
  from: string,
): Promise<ScoredCandidate> {
  const forward = await translateForward(sourceText, from, to);
  const detectedFrom = forward.detectedFrom || from || await detectLanguage(sourceText);
  const resolvedFrom = from || detectedFrom;

  if (isSameLanguage(detectedFrom, to) || isSameLanguage(resolvedFrom, to)) {
    return {
      from: resolvedFrom,
      detectedFrom,
      translated: forward.translated,
      engine: forward.engine,
      reversed: forward.translated,
      score: 1,
      semantic_score: 1,
      embedding_score: 1,
      quality_score: 1,
    };
  }

  return scoreTranslation(
    scoreOrigin,
    to,
    resolvedFrom,
    detectedFrom,
    forward.translated,
    forward.engine,
  );
}

async function pickBestCandidate(candidates: ScoredCandidate[]): Promise<ScoredCandidate> {
  return candidates.reduce((best, current) => (
    current.quality_score > best.quality_score ? current : best
  ));
}

async function translateTextFast(req: TranslateRequest): Promise<TranslateResponse> {
  const text = req.text?.trim();
  if (!text) {
    throw new Error('text is required');
  }

  const to = req.to;
  let from = req.from?.trim() || '';

  if (!from) {
    from = await detectLanguage(text);
  }

  if (isSameLanguage(from, to)) {
    return {
      origin: text,
      to,
      from,
      detected_from: from,
      translated: text,
      engine: 'none',
      reversed: text,
      score: 1,
      semantic_score: 1,
      embedding_score: 0,
      quality_score: 1,
    };
  }

  const forward = await translateForward(text, from, to);
  const detectedFrom = forward.detectedFrom || from;

  return {
    origin: text,
    to,
    from: detectedFrom,
    detected_from: detectedFrom,
    translated: forward.translated,
    engine: `${forward.engine}:fast`,
    reversed: forward.translated,
    score: 1,
    semantic_score: 1,
    embedding_score: 0,
    quality_score: 1,
  };
}

export async function translateText(req: TranslateRequest): Promise<TranslateResponse> {
  const text = req.text?.trim();
  if (!text) {
    throw new Error('text is required');
  }
  if (!req.to) {
    throw new Error('to is required');
  }

  if (req.fast) {
    return translateTextFast(req);
  }

  const to = req.to;
  const hintLanguage = req.hint_language?.trim() || '';
  let from = req.from?.trim() || '';

  const slang = expandChatSlang(text, hintLanguage || undefined);
  const workingText = slang.text;

  if (!from) {
    const detectedFrom = await detectLanguage(workingText);

    if (isSameLanguage(detectedFrom, to)) {
      return {
        origin: text,
        to,
        from: detectedFrom,
        detected_from: detectedFrom,
        translated: text,
        engine: 'none',
        reversed: text,
        score: 1,
        semantic_score: 1,
        embedding_score: 1,
        quality_score: 1,
        slang_expanded: slang.expanded || undefined,
        normalized_text: slang.expanded ? workingText : undefined,
      };
    }

    const candidates: ScoredCandidate[] = [];

    if (slang.expanded) {
      candidates.push(await buildCandidate(text, workingText, to, ''));
      if (slang.slangLanguage) {
        candidates.push(await buildCandidate(text, workingText, to, slang.slangLanguage));
      }
    } else {
      candidates.push(await buildCandidate(text, text, to, ''));
    }

    if (text.length <= SHORT_TEXT_MAX && hintLanguage && !isSameLanguage(hintLanguage, detectedFrom)) {
      candidates.push(await buildCandidate(text, workingText, to, hintLanguage));
    }

    const best = await pickBestCandidate(candidates);
    return {
      origin: text,
      to,
      from: best.from,
      detected_from: best.detectedFrom,
      translated: best.translated,
      engine: best.engine,
      reversed: best.reversed,
      score: best.score,
      semantic_score: best.semantic_score,
      embedding_score: best.embedding_score,
      quality_score: best.quality_score,
      slang_expanded: slang.expanded || undefined,
      normalized_text: slang.expanded ? workingText : undefined,
    };
  }

  if (isSameLanguage(from, to)) {
    return {
      origin: text,
      to,
      from,
      detected_from: from,
      translated: text,
      engine: 'none',
      reversed: text,
      score: 1,
      semantic_score: 1,
      embedding_score: 1,
      quality_score: 1,
      slang_expanded: slang.expanded || undefined,
      normalized_text: slang.expanded ? workingText : undefined,
    };
  }

  const best = await buildCandidate(
    text,
    slang.expanded ? workingText : text,
    to,
    from,
  );

  return {
    origin: text,
    to,
    from: best.from,
    detected_from: best.detectedFrom,
    translated: best.translated,
    engine: best.engine,
    reversed: best.reversed,
    score: best.score,
    semantic_score: best.semantic_score,
    embedding_score: best.embedding_score,
    quality_score: best.quality_score,
    slang_expanded: slang.expanded || undefined,
    normalized_text: slang.expanded ? workingText : undefined,
  };
}
