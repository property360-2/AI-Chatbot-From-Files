import { groq, getFailoverStream } from './groq';
import { generateEmbeddings, cosineSimilarity } from './embeddings';
import { adminDb } from './firebase-admin';

/**
 * Streaming RAG Logic - Fetches chunks from Firestore
 */
export async function* performStreamingRAG(query: string, userId: string, history: { role: string, content: string }[] = []) {
  try {
    // Fetch user's chunks from Firestore
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
    const queryEmbedding = await generateEmbeddings(query);

    const similarities = chunks.map((chunk: any) => ({
      ...chunk,
      similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
    }));

    const topChunks = similarities
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, 5);

    const context = topChunks.map((c: any) => `[Source: ${c.metadata.source}]\n${c.content}`).join('\n\n---\n\n');
    const formattedHistory = history.map(h => `${h.role.toUpperCase()}: ${h.content}`).join('\n');

    const prompt = `
      You are TropangAI, a highly accurate document analysis assistant.
      
      INSTRUCTIONS:
      1. Answer the user's question ONLY using the provided context below.
      2. If the context doesn't contain the answer, say "I'm sorry, I couldn't find that information in the uploaded documents."
      3. CRITICAL: Always cite your sources. Use the [Source: filename] provided in the context. 
      4. Format your answer nicely using Markdown.
      5. Consider the conversation history for context, but prioritize the documents for facts.

      CONVERSATION HISTORY:
      ${formattedHistory}

      CONTEXT FROM UPLOADED DOCUMENTS:
      ${context}

      USER QUESTION:
      ${query}

      AI RESPONSE:
    `;

    const failoverStream = getFailoverStream([
      { role: 'system', content: 'You are TropangAI, a minimalist AI assistant.' },
      { role: 'user', content: prompt }
    ]);
    
    for await (const chunk of failoverStream) {
      if (chunk.content) {
        yield chunk.content as string;
      }
    }

  } catch (error) {
    console.error('Streaming RAG Error:', error);
    yield "Error processing your request.";
  }
}
