import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

/**
 * API Route: Documents Management (Cloud Version)
 * GET: List all uploaded documents from Firestore
 * DELETE: Remove a document and its chunks from Firestore
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Using 'files' to be consistent with /api/upload and ChatInterface
    const docsSnapshot = await adminDb!
      .collection('users')
      .doc(userId)
      .collection('files')
      .get();

    const documents = docsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Fetch documents error:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id, userId } = await request.json();
    if (!id || !userId) {
      return NextResponse.json({ error: 'ID and User ID are required' }, { status: 400 });
    }

    const userRef = adminDb!.collection('users').doc(userId);
    
    // 1. Delete document metadata from 'files'
    await userRef.collection('files').doc(id).delete();

    // 2. Delete associated chunks in batches to avoid "Transaction too big"
    const chunksSnapshot = await userRef.collection('chunks')
      .where('metadata.source', '==', id)
      .get();
        
    if (!chunksSnapshot.empty) {
      const docs = chunksSnapshot.docs;
      console.log(`[Documents API] Clearing ${docs.length} chunks for document: ${id}`);
      
      // Delete in parallel to avoid batch limits and stay within Vercel execution time
      await Promise.all(docs.map((d: any) => d.ref.delete()));
      console.log(`[Documents API] Successfully deleted all chunks.`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete document', details: error.message }, { status: 500 });
  }
}
