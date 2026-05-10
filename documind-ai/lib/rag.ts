import { getFailoverStream } from './groq';
import { rankChunksBM25 } from './bm25';
import { adminDb } from './firebase-admin';

/**
 * Streaming RAG Logic - Fetches chunks from Firestore and ranks them using BM25
 */
export async function* performStreamingRAG(query: string, userId: string, history: { role: string, content: string }[] = []) {
  try {
    // 1. Fetch user's chunks from Firestore (Text content only)
    const chunksSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('chunks')
      .get();

    if (chunksSnapshot.empty) {
      yield "I'm sorry, I couldn't find any documents in your account. Please upload one first!";
      return;
    }

    const chunks = chunksSnapshot.docs.map((doc: any) => doc.data());

    // 2. Rank chunks using BM25 keyword scoring (Vercel-safe, zero-API)
    const topChunks = rankChunksBM25(query, chunks, 5);

    if (topChunks.length === 0) {
      yield "I found your documents, but couldn't find any specific sections related to your question. Try rephrasing?";
      return;
    }

    // 3. Build context and prompt
    const context = topChunks.map((c: any) => `[Source: ${c.metadata?.source || 'Unknown'}]\n${c.content}`).join('\n\n---\n\n');
    const formattedHistory = history.map(h => `${h.role.toUpperCase()}: ${h.content}`).join('\n');

    const prompt = `
      You are TropangAI, a Senior Document Analyst specializing in data accuracy and scientific reporting.
      
      INSTRUCTIONS:
      1. Answer the user's question ONLY using the provided context below.
      2. DATA ANALYSIS: If the context contains numerical data, be rigorous. Check for consistency. If you spot a calculation error or a typo in the original document, point it out politely.
      3. MATHEMATICS: Use LaTeX formatting for all mathematical formulas and calculations.
         - CRITICAL: Use EXACTLY $$ for block formulas (e.g., $$x = y + z$$) and $ for inline math (e.g., $x$).
         - DO NOT use square brackets [ ] for math; ONLY use $$ or $.
      4. CITATIONS: Always cite your sources. Use the [Source: filename] provided in the context. 
      5. FORMATTING: Use clean Markdown, bold headers, and lists.
      6. PERSONALITY: Be helpful, precise, and analytical.
      7. CONTEXT: Consider the conversation history, but prioritize the documents for facts.

      CONVERSATION HISTORY:
      ${formattedHistory}

      CONTEXT FROM UPLOADED DOCUMENTS:
      ${context}

      USER QUESTION:
      ${query}

      SCIENTIFIC ANALYSIS RESPONSE:
    `;

    // 4. Stream response from Groq
    const failoverStream = getFailoverStream([
      { role: 'system', content: 'You are TropangAI, a helpful document assistant.' },
      { role: 'user', content: prompt }
    ]);
    
    for await (const chunk of failoverStream) {
      if (chunk.content) {
        yield chunk.content as string;
      }
    }

  } catch (error: any) {
    console.error('Streaming RAG Fatal Error:', error);
    yield `Error processing your request: ${error.message || "Unknown error"}`;
  }
}
