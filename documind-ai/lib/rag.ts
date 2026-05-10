/**
 * Streaming RAG Logic - lib/rag.ts
 *
 * Fetches chunks from Firestore, ranks them using BM25,
 * then streams a natural, document-grounded response via Groq.
 *
 * Prompt design philosophy: act like a knowledgeable assistant,
 * NOT a research auditor. Be concise, accurate, and human.
 */

import { getFailoverStream } from './groq';
import { rankChunksBM25 } from './bm25';
import { adminDb } from './firebase-admin';

/**
 * Performs a streaming Retrieval-Augmented Generation (RAG) pipeline.
 *
 * @param query   - The user's question
 * @param userId  - The authenticated user's ID for Firestore access
 * @param history - The recent conversation history for context
 * @yields Streamed text chunks from the LLM response
 */
export async function* performStreamingRAG(
  query: string,
  userId: string,
  history: { role: string; content: string }[] = []
) {
  try {
    // 1. Fetch user's document chunks from Firestore
    const chunksSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('chunks')
      .get();

    if (chunksSnapshot.empty) {
      yield "I don't see any uploaded documents yet. Upload a file first and I'll be able to answer your questions!";
      return;
    }

    const chunks = chunksSnapshot.docs.map((doc: any) => doc.data());

    // 2. Rank top relevant chunks using BM25 keyword scoring (Vercel-safe, zero-API)
    const topChunks = rankChunksBM25(query, chunks, 5);

    if (topChunks.length === 0) {
      yield "I couldn't find any sections in your documents related to that question. Try rephrasing, or check if the right file is uploaded.";
      return;
    }

    // 3. Build document context — each chunk is tagged with its source file
    const context = topChunks
      .map((c: any) => `[Source: ${c.metadata?.source || 'Unknown'}]\n${c.content}`)
      .join('\n\n---\n\n');

    // NOTE: Limit history to last 6 messages to keep context clean and focused.
    // Older messages pollute the prompt and can confuse the model.
    const formattedHistory = history
      .slice(-6)
      .map((h) => `${h.role}: ${h.content}`)
      .join('\n');

    // 4. Build the final prompt — conversational, grounded, no hallucination triggers
    const prompt = `
CONVERSATION HISTORY:
${formattedHistory}

DOCUMENT CONTEXT:
${context}

USER QUESTION:
${query}

ANSWER:
    `.trim();

    // 5. System prompt — defines personality cleanly, without over-constraining
    const systemPrompt = `
You are TropangAI, a helpful document assistant.

You answer questions based on uploaded documents provided in the context.

Guidelines:
- Be natural, concise, and direct. Write like a smart colleague, not a research paper.
- Answer ONLY using information from the provided document context.
- If the answer is not in the documents, say exactly: "I couldn't find that information in your uploaded documents."
- Cite the source file naturally (e.g., "According to [filename]...") only when you're using information from a specific document.
- Use Markdown formatting (bold, lists, headers) only when it genuinely improves clarity.
- Only use LaTeX math ($$...$$) if the user explicitly asks for a calculation, OR if the document itself contains mathematical formulas.
- Never invent formulas, statistics, or facts not present in the documents.
- Do not pad your answer with disclaimers, sign-offs, or unnecessary conclusions.
    `.trim();

    // 6. Stream response from Groq via failover model chain
    const failoverStream = getFailoverStream([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ]);

    for await (const chunk of failoverStream) {
      if (chunk.content) {
        yield chunk.content as string;
      }
    }
  } catch (error: any) {
    console.error('[RAG] Fatal streaming error:', error);
    yield `Something went wrong while processing your request. Please try again.`;
  }
}
