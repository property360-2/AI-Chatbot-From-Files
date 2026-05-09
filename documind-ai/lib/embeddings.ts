/**
 * Stable Google Generative AI Embeddings
 * 
 * Uses the stable v1 REST API to avoid versioning issues and environment constraints.
 * This is the recommended approach for Vercel Serverless environments.
 * Dimensions: 768
 */

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

/**
 * Generates an embedding for a given text using Google's API.
 */
export async function generateEmbeddings(text: string): Promise<number[]> {
  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY is missing. Check your .env.local or Vercel Environment Variables.");
  }

  const cleanedText = text.replace(/\n/g, " ").trim();
  if (!cleanedText) return new Array(768).fill(0);

  // Try text-embedding-004 first (latest)
  const models = ["text-embedding-004", "embedding-001"];
  let lastError = null;

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${model}:embedContent?key=${GOOGLE_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: { parts: [{ text: cleanedText }] },
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.embedding?.values) {
        return data.embedding.values;
      }

      lastError = data.error?.message || "Unknown error";
      console.warn(`[Embeddings] Model ${model} failed: ${lastError}`);
    } catch (error: any) {
      lastError = error.message;
      console.error(`[Embeddings] Connection error with model ${model}: ${error.message}`);
    }
  }

  throw new Error(`Failed to generate embeddings after trying all models: ${lastError}`);
}

/**
 * Calculates cosine similarity between dalawang vectors.
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
