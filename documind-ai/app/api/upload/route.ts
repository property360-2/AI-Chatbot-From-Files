import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromFile, chunkText } from '@/lib/document';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

// Vercel-specific config for extended duration (if Fluid Compute is enabled)
export const maxDuration = 60;

/**
 * POST /api/upload
 * Handles PDF file uploads, text extraction, and saving chunks to Firestore.
 */
export async function POST(request: NextRequest) {
  console.log('[Upload API] Start request processing');
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    
    console.log(`[Upload API] File: ${file?.name}, Size: ${file?.size}, User: ${userId}`);

    // Verify Authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[Upload API] Missing Authorization header');
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
      if (!adminAuth) {
        throw new Error('Firebase Admin Auth not initialized');
      }
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      if (decodedToken.uid !== userId) {
        console.error('[Upload API] User ID mismatch', { tokenUid: decodedToken.uid, userId });
        return NextResponse.json({ error: 'Forbidden: User ID mismatch' }, { status: 403 });
      }
      console.log('[Upload API] Token verified for user:', userId);
    } catch (err: any) {
      console.error('[Upload API] Token verification failed:', err.message);
      return NextResponse.json({ error: `Unauthorized: ${err.message}` }, { status: 401 });
    }

    if (!file || !userId) {
      return NextResponse.json({ error: 'File and User ID are required' }, { status: 400 });
    }

    // 1. Extract text and chunk it
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log(`[Upload API] Step 1: Extracting text from ${file.name}...`);
    const text = await extractTextFromFile(buffer, file.name);
    console.log(`[Upload API] Step 1 complete. Text length: ${text.length}`);
    
    console.log('[Upload API] Step 2: Chunking text...');
    const chunks = chunkText(text);
    console.log(`[Upload API] Step 2 complete. Generated ${chunks.length} chunks.`);

    if (!adminDb) {
      throw new Error('Firestore Admin DB not initialized');
    }

    const chunksRef = adminDb.collection('users').doc(userId).collection('chunks');
    const filesRef = adminDb.collection('users').doc(userId).collection('files').doc(file.name);

    // 2. Clear existing chunks for this file
    console.log(`[Upload API] Step 3: Clearing existing chunks for: ${file.name}`);
    const existingChunksQuery = await chunksRef.where('metadata.source', '==', file.name).get();
    
    if (!existingChunksQuery.empty) {
      const deleteDocs = existingChunksQuery.docs;
      // Delete in small batches to avoid timeout/batch limits
      const batchSize = 100;
      for (let i = 0; i < deleteDocs.length; i += batchSize) {
        const batch = adminDb.batch();
        const currentBatch = deleteDocs.slice(i, i + batchSize);
        currentBatch.forEach((doc: any) => batch.delete(doc.ref));
        await batch.commit();
      }
      console.log(`[Upload API] Successfully cleared ${deleteDocs.length} existing chunks.`);
    }

    // 3. Save new chunks (Batched for performance and limit safety)
    console.log('[Upload API] Step 4: Saving new chunks to Firestore...');
    const writeBatchSize = 100;
    for (let i = 0; i < chunks.length; i += writeBatchSize) {
      const batch = adminDb.batch();
      const currentChunks = chunks.slice(i, i + writeBatchSize);
      
      currentChunks.forEach((content, index) => {
        const chunkId = `${file.name}-${i + index}-${Date.now()}`;
        const docRef = chunksRef.doc(chunkId);
        batch.set(docRef, {
          id: chunkId,
          content,
          metadata: { 
            source: file.name,
            uploadedAt: new Date().toISOString()
          }
        });
      });
      
      await batch.commit();
    }
    console.log(`[Upload API] Step 4 complete. Saved ${chunks.length} chunks.`);

    // 4. Save document metadata with 'ready' status
    console.log('[Upload API] Step 5: Saving document metadata...');
    const newDoc = {
      id: `${Date.now()}`,
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      uploadedAt: new Date().toISOString(),
      status: 'ready',
      totalChunks: chunks.length
    };
    await filesRef.set(newDoc);
    console.log('[Upload API] Step 5 complete. Metadata saved.');

    return NextResponse.json({ 
      success: true, 
      document: newDoc,
      message: 'File uploaded, processed, and ready for chat.' 
    });

  } catch (error: any) {
    console.error('[Upload API] Fatal Error:', error);
    
    return NextResponse.json({ 
      error: 'Failed to process document', 
      details: error.message || 'Unknown error occurred',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
