import { NextRequest, NextResponse } from 'next/server';
import { generateEmbeddings } from '@/lib/embeddings';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

/**
 * POST /api/process-batch
 * Processes a small batch of text chunks: generates embeddings and saves to Firestore.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, fileName, chunks, startIndex, isLastBatch } = await request.json();
    
    // Verify Authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth!.verifyIdToken(idToken);
    if (decodedToken.uid !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
      return NextResponse.json({ error: 'No chunks provided' }, { status: 400 });
    }

    console.log(`[Batch API] Processing ${chunks.length} chunks for ${fileName} starting at ${startIndex}`);

    const chunksRef = adminDb!.collection('users').doc(userId).collection('chunks');
    const batch = adminDb!.batch();

    for (let i = 0; i < chunks.length; i++) {
      const content = chunks[i];
      const embedding = await generateEmbeddings(content);
      
      const chunkId = `${fileName}-${startIndex + i}-${Date.now()}`;
      const docRef = chunksRef.doc(chunkId);
      
      batch.set(docRef, {
        id: chunkId,
        content,
        embedding,
        metadata: { 
          source: fileName,
          uploadedAt: new Date().toISOString()
        }
      });
    }

    await batch.commit();

    // If this is the last batch, update the file status to 'ready'
    if (isLastBatch) {
      const docRef = adminDb!.collection('users').doc(userId).collection('files').doc(fileName);
      await docRef.update({ status: 'ready' });
      console.log(`[Batch API] Final batch complete. File ${fileName} is now ready.`);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[Batch API] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
