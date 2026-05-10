import { NextRequest, NextResponse } from 'next/server';
import { performStreamingRAG } from '@/lib/rag';
import { adminAuth } from '@/lib/firebase-admin';

// Vercel-specific config for extended duration (if Fluid Compute is enabled)
export const maxDuration = 30;

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
      if (!adminAuth) {
        console.error('Chat API: adminAuth is null. Firebase Admin failed to initialize.');
        return NextResponse.json({ error: 'Server configuration error: Firebase Admin not initialized' }, { status: 500 });
      }
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      if (decodedToken.uid !== userId) {
        return NextResponse.json({ error: 'Forbidden: User ID mismatch' }, { status: 403 });
      }
    } catch (err: any) {
      console.error('Token verification failed:', err.message);
      return NextResponse.json({ error: `Unauthorized: ${err.message}` }, { status: 401 });
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
        } catch (err: any) {
          console.error('Streaming RAG Error:', err.message);
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

  } catch (error: any) {
    console.error('Chat API Fatal Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
