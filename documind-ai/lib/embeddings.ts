const GROQ_API_KEY = process.env.GROQ_API_KEY;

/**
 * Generate embeddings for a given text using Groq's Embedding API.
 * Uses the 'nomic-embed-text-v1.5' model for high-performance semantic vectors.
 * This is much faster and more reliable for serverless environments (Vercel).
 */
export async function generateEmbeddings(text: string): Promise<number[]> {
  if (!GROQ_API_KEY) {
    console.error("[Embeddings] Missing GROQ_API_KEY");
    throw new Error("GROQ_API_KEY is not configured.");
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "nomic-embed-text-v1.5",
        input: text,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Groq API error: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error: any) {
    console.error("[Embeddings] Error generating vectors:", error.message);
    throw new Error("Failed to generate embeddings via Groq.");
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
