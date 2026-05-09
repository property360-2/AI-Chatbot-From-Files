import '@/lib/polyfill';
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
    console.log('[Upload API] Step 1: Extracting text from PDF...');
    const text = await extractTextFromPDF(buffer);
    console.log(`[Upload API] Step 1 complete. Text length: ${text.length}`);
    
    console.log('[Upload API] Step 2: Chunking text...');
    const chunks = chunkText(text);
    console.log(`[Upload API] Step 2 complete. Generated ${chunks.length} chunks.`);

    if (!adminDb) {
      throw new Error('Firestore Admin DB not initialized');
    }

    const chunksRef = adminDb.collection('users').doc(userId).collection('chunks');
    
    // Clear existing chunks for this file to avoid duplicates (Batched to avoid "Transaction too big")
    console.log(`[Upload API] Checking for existing chunks to clear for: ${file.name}`);
    const existingChunksQuery = await chunksRef.where('metadata.source', '==', file.name).get();
    
    if (!existingChunksQuery.empty) {
      const docs = existingChunksQuery.docs;
      console.log(`[Upload API] Clearing ${docs.length} existing chunks individually...`);
      
      // Delete in parallel to be faster than sequential but avoid batch limits
      await Promise.all(docs.map((d: any) => d.ref.delete()));
      console.log(`[Upload API] Successfully cleared all ${docs.length} chunks.`);
    }

    // Initialize document metadata with 'processing' status
    console.log('[Upload API] Step 4: Saving document metadata...');
    const docRef = adminDb.collection('users').doc(userId).collection('files').doc(file.name);
    const newDoc = {
      id: `${Date.now()}`,
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      uploadedAt: new Date().toISOString(),
      status: 'processing',
      totalChunks: chunks.length
    };
    await docRef.set(newDoc);
    console.log('[Upload API] Step 4 complete. Metadata saved.');

    console.log('[Upload API] Step 5: Returning success response...');
    return NextResponse.json({ 
      success: true, 
      document: newDoc,
      chunks: chunks, // Return chunks for client-side orchestration
      message: 'File uploaded and chunks prepared.' 
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
