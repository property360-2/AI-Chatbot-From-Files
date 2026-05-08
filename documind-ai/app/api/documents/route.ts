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

    const docsSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('documents')
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

    const userRef = adminDb.collection('users').doc(userId);
    
    // 1. Delete document metadata
    await userRef.collection('documents').doc(id).delete();

    // 2. Delete associated chunks (we need to find them by source name)
    // Note: In a production app, we'd store the docId in chunks to make this efficient.
    // For now, we'll query by metadata.source if available.
    const docRef = await userRef.collection('documents').doc(id).get();
    const docData = docRef.data();
    
    if (docData?.name) {
      const chunksSnapshot = await userRef.collection('chunks')
        .where('metadata.source', '==', docData.name)
        .get();
        
      const batch = adminDb.batch();
      chunksSnapshot.docs.forEach((doc: any) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
