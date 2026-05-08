import * as admin from 'firebase-admin';

/**
 * Firebase Admin SDK Singleton
 * Used for server-side operations (API routes) where we need full access
 * or to interact with Firestore/Auth without client-side context.
 */

if (!admin.apps.length) {
  try {
    let serviceAccount;

    // Check if we have the service account as an environment variable (Production/Render)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
      // Fallback to local file (Development)
      serviceAccount = require('../service-account.json');
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export const adminDb = admin.apps.length ? admin.firestore() : null as any;
export const adminAuth = admin.apps.length ? admin.auth() : null as any;
