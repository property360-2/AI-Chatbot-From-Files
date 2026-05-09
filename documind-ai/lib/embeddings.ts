import { pipeline } from '@xenova/transformers';

/**
 * Local Embeddings Singleton
 * Uses '@xenova/transformers' to run a lightweight model (all-MiniLM-L6-v2) locally.
 * This avoids external API calls for embeddings, making it faster and free.
 */
class EmbeddingPipeline {
  static instance: any = null;

  static async getInstance() {
    if (this.instance === null) {
      console.log('[Embeddings] Loading local transformation model...');
      this.instance = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      console.log('[Embeddings] Model loaded successfully.');
    }
    return this.instance;
  }
}

/**
 * Generate embeddings for a given text using a local transformer model.
 * Model: all-MiniLM-L6-v2 (384 dimensions)
 */
export async function generateEmbeddings(text: string): Promise<number[]> {
  try {
    const extractor = await EmbeddingPipeline.getInstance();
    const output = await extractor(text, {
      pooling: 'mean',
      normalize: true,
    });

    // Extract the vector data from the tensor
    return Array.from(output.data);
  } catch (error: any) {
    console.error("[Embeddings] Error generating local vectors:", error.message);
    throw new Error(`Failed to generate local embeddings: ${error.message}`);
  }
}

/**
 * Calculate cosine similarity between two vectors.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    // Return 0 if dimensions don't match (happens if model changed)
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
