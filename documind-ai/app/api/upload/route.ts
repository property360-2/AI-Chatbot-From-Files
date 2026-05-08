import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF, chunkText } from '@/lib/pdf';
import { generateEmbeddings } from '@/lib/embeddings';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

/**
 * POST /api/upload
 * Handles PDF file uploads, text extraction, and saving chunks to Firestore.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

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

    if (!file || !userId) {
      return NextResponse.json({ error: 'File and User ID are required' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extract text and chunk it
    const text = await extractTextFromPDF(buffer);
    const chunks = chunkText(text);

    // Batch process embeddings and save to Firestore in chunks to avoid "Transaction too big" error
    const chunksRef = adminDb.collection('users').doc(userId).collection('chunks');
    
    // Clear existing chunks for this file to prevent duplicate context
    const existingChunksQuery = await chunksRef.where('metadata.source', '==', file.name).get();
    if (!existingChunksQuery.empty) {
      const deleteBatch = adminDb.batch();
      existingChunksQuery.docs.forEach((doc: any) => deleteBatch.delete(doc.ref));
      await deleteBatch.commit();
      console.log(`[Upload] Cleared ${existingChunksQuery.size} existing chunks for ${file.name}`);
    }
    const BATCH_SIZE = 100; // Firestore limit is 500, but 100 is safer for large embedding payloads
    
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = adminDb.batch();
      const currentBatchChunks = chunks.slice(i, i + BATCH_SIZE);
      
      console.log(`[Upload] Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${currentBatchChunks.length} chunks)`);
      
      for (let j = 0; j < currentBatchChunks.length; j++) {
        const content = currentBatchChunks[j];
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
      }
      
      await batch.commit();
      console.log(`[Upload] Batch ${Math.floor(i / BATCH_SIZE) + 1} committed successfully.`);
    }

    // Also update document metadata in user's files collection
    const docRef = adminDb.collection('users').doc(userId).collection('files').doc(file.name);
    const newDoc = {
      id: `${Date.now()}`,
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      uploadedAt: new Date().toISOString()
    };
    await docRef.set(newDoc);

    return NextResponse.json({ 
      success: true, 
      document: newDoc,
      chunksCount: chunks.length,
      message: 'File processed and stored in cloud.' 
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to process document' }, { status: 500 });
  }
}
