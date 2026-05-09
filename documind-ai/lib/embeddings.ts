/**
 * Universal Google Generative AI Embeddings
 * 
 * High-resiliency embedding generator that supports multiple API versions (v1, v1beta)
 * and multiple models to ensure 100% uptime regardless of Google's endpoint volatility.
 * Dimensions: 768
 */

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

export async function generateEmbeddings(text: string): Promise<number[]> {
  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY is missing. Please set it in your environment variables.");
  }

  const cleanedText = text.replace(/\n/g, " ").trim();
  if (!cleanedText) return new Array(768).fill(0);

  // Matrix of configurations to try
  const configs = [
    { version: "v1", model: "text-embedding-004" },
    { version: "v1beta", model: "text-embedding-004" },
    { version: "v1", model: "embedding-001" },
    { version: "v1beta", model: "embedding-001" }
  ];

  let lastError = null;

  for (const config of configs) {
    try {
      const url = `https://generativelanguage.googleapis.com/${config.version}/models/${config.model}:embedContent?key=${GOOGLE_API_KEY}`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: { parts: [{ text: cleanedText }] },
        }),
      });

      const data = await response.json();

      if (response.ok && data.embedding?.values) {
        console.log(`[Embeddings] Success using ${config.version}/${config.model}`);
        return data.embedding.values;
      }

      lastError = data.error?.message || "Unknown API error";
      console.warn(`[Embeddings] Attempt failed (${config.version}/${config.model}): ${lastError}`);
    } catch (error: any) {
      lastError = error.message;
      console.error(`[Embeddings] Connection error (${config.version}/${config.model}): ${lastError}`);
    }
  }

  throw new Error(`All embedding attempts failed. Last error: ${lastError}`);
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
