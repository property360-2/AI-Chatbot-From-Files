import { pipeline } from '@xenova/transformers';

let embedderPromise: any = null;

/**
 * Get or initialize the embedding pipeline.
 */
async function getEmbedder() {
  if (!embedderPromise) {
    embedderPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedderPromise;
}

/**
 * Generate embeddings for a given text.
 * Uses the all-MiniLM-L6-v2 model for high-quality semantic vectors.
 */
export async function generateEmbeddings(text: string): Promise<number[]> {
  try {
    const embedder = await getEmbedder();
    const output = await embedder(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data) as number[];
  } catch (error) {
    console.error("Embedding error:", error);
    throw new Error("Failed to generate embeddings.");
  }
}

/**
 * Calculate cosine similarity between two vectors.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
