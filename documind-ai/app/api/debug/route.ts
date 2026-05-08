import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

export async function GET(request: NextRequest) {
  const diagnostics: any = {
    env: {
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? 'Present' : 'Missing',
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ? 'Present' : 'Missing',
      FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? `Present (Length: ${process.env.FIREBASE_PRIVATE_KEY.length})` : 'Missing',
      FIREBASE_SERVICE_ACCOUNT: process.env.FIREBASE_SERVICE_ACCOUNT ? `Present (Length: ${process.env.FIREBASE_SERVICE_ACCOUNT.length})` : 'Missing',
      GROQ_API_KEY: process.env.GROQ_API_KEY ? 'Present' : 'Missing',
    },
    firebaseAdmin: {
      appsCount: admin.apps.length,
      initialized: admin.apps.length > 0,
    }
  };

  try {
    if (admin.apps.length > 0) {
      const db = admin.firestore();
      diagnostics.firebaseAdmin.firestore = 'Available';
      
      // Try a simple list collection (will fail if auth is wrong)
      try {
        await db.collection('health-check').limit(1).get();
        diagnostics.firebaseAdmin.firestoreAuth = 'Verified';
      } catch (e: any) {
        diagnostics.firebaseAdmin.firestoreAuth = `Failed: ${e.message}`;
      }
    }
  } catch (e: any) {
    diagnostics.error = e.message;
  }

  return NextResponse.json(diagnostics);
}
