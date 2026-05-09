/**
 * Local Embeddings using @xenova/transformers
 * This avoids all Google API 404/versioning issues by running locally.
 */

// Dynamic import to avoid issues with some environments
let pipeline: any = null;

async function getPipeline() {
  if (!pipeline) {
    const { pipeline: transformersPipeline } = await import('@xenova/transformers');
    // Using a lightweight but effective model (384 dimensions)
    pipeline = await transformersPipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return pipeline;
}

/**
 * Generates an embedding for a given text locally.
 */
export async function generateEmbeddings(text: string): Promise<number[]> {
  try {
    if (!text || text.trim().length === 0) {
      return new Array(384).fill(0); 
    }

    const extractor = await getPipeline();
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    
    // Convert Float32Array to regular array
    return Array.from(output.data);
  } catch (error: any) {
    console.error("[Local Embeddings Error] Failed:", error.message);
    throw new Error(`Local embedding generation failed: ${error.message}`);
  }
}

/**
 * Calculates cosine similarity between two vectors.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return isNaN(similarity) ? 0 : similarity;
}
