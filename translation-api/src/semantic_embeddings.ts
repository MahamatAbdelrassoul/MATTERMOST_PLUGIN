import {pipeline} from '@xenova/transformers';

const MODEL = process.env.SEMANTIC_MODEL?.trim() || 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
const ENABLED = process.env.SEMANTIC_EMBEDDINGS !== 'false';

type FeatureExtractor = Awaited<ReturnType<typeof pipeline>>;
let extractorPromise: Promise<FeatureExtractor> | null = null;

export function isSemanticEmbeddingEnabled(): boolean {
  return ENABLED;
}

export function getSemanticModelName(): string {
  return MODEL;
}

async function getExtractor(): Promise<FeatureExtractor> {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', MODEL);
  }
  return extractorPromise;
}

function vectorFromOutput(output: Awaited<ReturnType<FeatureExtractor>>): Float32Array | number[] {
  const data = output?.data;
  if (data instanceof Float32Array || Array.isArray(data)) {
    return data;
  }
  if (output?.tolist) {
    const nested = output.tolist() as number[][] | number[];
    if (Array.isArray(nested[0])) {
      return (nested as number[][])[0];
    }
    return nested as number[];
  }
  return [];
}

function cosineSimilarity(a: Float32Array | number[], b: Float32Array | number[]): number {
  if (!a.length || !b.length || a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const av = Number(a[i]);
    const bv = Number(b[i]);
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  const similarity = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(0, Math.min(1, similarity));
}

export async function embeddingSimilarity(a: string, b: string): Promise<number> {
  const left = a.trim();
  const right = b.trim();
  if (!left || !right) {
    return 0;
  }
  if (left.toLowerCase() === right.toLowerCase()) {
    return 1;
  }
  if (!ENABLED) {
    return 0;
  }

  const extractor = await getExtractor();
  const [outA, outB] = await Promise.all([
    extractor(left, {pooling: 'mean', normalize: true}),
    extractor(right, {pooling: 'mean', normalize: true}),
  ]);

  return cosineSimilarity(vectorFromOutput(outA), vectorFromOutput(outB));
}

export function compositeQualityScore(
  levenshteinScore: number,
  wordOverlapScore: number,
  embeddingScore: number,
): number {
  if (embeddingScore > 0) {
    return Math.round((0.2 * levenshteinScore + 0.15 * wordOverlapScore + 0.65 * embeddingScore) * 100) / 100;
  }
  return Math.round((0.55 * levenshteinScore + 0.45 * wordOverlapScore) * 100) / 100;
}
