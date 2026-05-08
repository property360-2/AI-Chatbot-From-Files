import { ChatGroq } from "@langchain/groq";

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  console.warn("WARNING: GROQ_API_KEY is not defined in .env.local");
}

/**
 * Comprehensive model hierarchy for robust failover (Free Tier optimization)
 * Ordered by quality then availability based on quota limits.
 */
export const MODELS = [
  "llama-3.3-70b-versatile",                  // Premium Quality (1K/day)
  "meta-llama/llama-4-scout-17b-16e-instruct", // Next-Gen Experimental
  "qwen/qwen3-32b",                            // High Throughput (60 RPM)
  "llama-3.1-8b-instant",                      // High Availability (14.4K/day)
  "groq/compound",                             // Groq Optimized
  "groq/compound-mini",                        // Groq Optimized (Fast)
  "openai/gpt-oss-120b",                       // Large Model Fallback
  "openai/gpt-oss-20b",                        // Medium Model Fallback
  "mixtral-8x7b-32768",                        // High Context Fallback
  "allam-2-7b",                                // Lightweight Fallback
  "meta-llama/llama-prompt-guard-2-86m",       // Utility/Security
  "meta-llama/llama-prompt-guard-2-22m"        // Utility/Security
];

/**
 * Utility to create a specific Groq client
 */
export const createGroqClient = (modelName: string) => {
  return new ChatGroq({
    apiKey: apiKey || "MISSING",
    model: modelName,
    temperature: 0.1,
  });
};

/**
 * Primary Groq client (for simple non-streaming calls or backward compatibility)
 */
export const groq = createGroqClient(MODELS[0]);

/**
 * Attempts to stream from models in the hierarchy until one succeeds.
 * Specifically catches 429 (Rate Limit) errors.
 */
export async function* getFailoverStream(messages: any[]) {
  for (const modelName of MODELS) {
    try {
      console.log(`[Groq] Attempting stream with model: ${modelName}`);
      const client = createGroqClient(modelName);
      const stream = await client.stream(messages);
      
      // If we reach this point, the initial request was accepted.
      // We wrap the iteration to catch potential mid-stream errors.
      for await (const chunk of stream) {
        yield chunk;
      }
      
      return; // Full success, exit the loop
    } catch (error: any) {
      const isRateLimit = error.status === 429 || 
                          error.message?.toLowerCase().includes('rate limit') ||
                          error.message?.toLowerCase().includes('429');

      if (isRateLimit && modelName !== MODELS[MODELS.length - 1]) {
        console.warn(`[Groq] Model ${modelName} rate limited. Falling back to next model...`);
        continue; 
      }

      console.error(`[Groq] Fatal error with ${modelName}:`, error.message);
      throw error;
    }
  }
}
