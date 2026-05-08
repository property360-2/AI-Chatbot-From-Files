import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF, chunkText } from '@/lib/pdf';
import { generateEmbeddings } from '@/lib/embeddings';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extract text and chunk it
    console.log('[Upload API] Extracting text from PDF...');
    const text = await extractTextFromPDF(buffer);
    const chunks = chunkText(text);
    console.log(`[Upload API] Text extracted. Generated ${chunks.length} chunks.`);

    if (!adminDb) {
      throw new Error('Firestore Admin DB not initialized');
    }

    const chunksRef = adminDb.collection('users').doc(userId).collection('chunks');
    
    // Clear existing chunks for this file
    console.log(`[Upload API] Checking for existing chunks for: ${file.name}`);
    const existingChunksQuery = await chunksRef.where('metadata.source', '==', file.name).get();
    if (!existingChunksQuery.empty) {
      console.log(`[Upload API] Deleting ${existingChunksQuery.size} existing chunks...`);
      const deleteBatch = adminDb.batch();
      existingChunksQuery.docs.forEach((doc: any) => deleteBatch.delete(doc.ref));
      await deleteBatch.commit();
    }

    const BATCH_SIZE = 50; // Smaller batch size for production reliability
    
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = adminDb.batch();
      const currentBatchChunks = chunks.slice(i, i + BATCH_SIZE);
      
      console.log(`[Upload API] Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${currentBatchChunks.length} chunks)`);
      
      for (let j = 0; j < currentBatchChunks.length; j++) {
        const content = currentBatchChunks[j];
        try {
          const embedding = await generateEmbeddings(content);
          
          const chunkDoc = {
            id: `${file.name}-${i + j}-${Date.now()}`,
            content,
            embedding,
            metadata: { 
              source: file.name,
              uploadedAt: new Date().toISOString()
            }
          };

          const docRef = chunksRef.doc(chunkDoc.id);
          batch.set(docRef, chunkDoc);
        } catch (embedError: any) {
          console.error(`[Upload API] Embedding error at chunk ${i + j}:`, embedError.message);
          throw embedError;
        }
      }
      
      await batch.commit();
      console.log(`[Upload API] Batch ${Math.floor(i / BATCH_SIZE) + 1} committed.`);
    }

    // Update document metadata
    console.log('[Upload API] Updating file metadata...');
    const docRef = adminDb.collection('users').doc(userId).collection('files').doc(file.name);
    const newDoc = {
      id: `${Date.now()}`,
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      uploadedAt: new Date().toISOString()
    };
    await docRef.set(newDoc);

    console.log('[Upload API] Process complete!');
    return NextResponse.json({ 
      success: true, 
      document: newDoc,
      chunksCount: chunks.length,
      message: 'File processed and stored.' 
    });

  } catch (error: any) {
    console.error('[Upload API] Fatal Error:', error);
    return NextResponse.json({ 
      error: 'Failed to process document', 
      details: error.message 
    }, { status: 500 });
  }
}
