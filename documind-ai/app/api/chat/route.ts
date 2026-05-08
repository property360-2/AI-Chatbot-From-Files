import { NextRequest, NextResponse } from 'next/server';
import { performStreamingRAG } from '@/lib/rag';
import { adminAuth } from '@/lib/firebase-admin';

/**
 * POST /api/chat
 * Handles user chat questions and returns AI-generated responses using streaming RAG.
 */
export async function POST(request: NextRequest) {
  try {
    const { message, history, userId } = await request.json();

    // Verify Authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      if (decodedToken.uid !== userId) {
        return NextResponse.json({ error: 'Forbidden: User ID mismatch' }, { status: 403 });
      }
    } catch (err) {
      console.error('Token verification failed:', err);
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    if (!message || !userId) {
      return NextResponse.json({ error: 'Message and User ID are required' }, { status: 400 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of performStreamingRAG(message, userId, history)) {
            if (chunk) {
              controller.enqueue(encoder.encode(chunk));
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
