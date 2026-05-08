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
      console.log('[Firebase Admin] Initializing with environment variable');
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
      console.log('[Firebase Admin] No environment variable found, checking for local service-account.json');
      // Fallback to local file (Development) - Using process.cwd() for robust path resolution in Next.js
      try {
        const path = require('path');
        const fs = require('fs');
        const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
        if (fs.existsSync(serviceAccountPath)) {
          serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
          console.log('[Firebase Admin] Successfully loaded local service-account.json');
        } else {
          console.warn('[Firebase Admin] Local service-account.json not found');
        }
      } catch (err: any) {
        console.error('[Firebase Admin] Error loading local file:', err.message);
      }
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
