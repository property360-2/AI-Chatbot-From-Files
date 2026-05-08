import * as admin from 'firebase-admin';

/**
 * Firebase Admin SDK Singleton
 * Used for server-side operations (API routes) where we need full access
 * or to interact with Firestore/Auth without client-side context.
 */

if (!admin.apps.length) {
  try {
    let serviceAccount;

    // Check for the full service account JSON first
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log('[Firebase Admin] Initializing with full SERVICE_ACCOUNT JSON');
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } 
    // Otherwise, construct it from individual variables (Easier for Vercel/Render)
    else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      console.log('[Firebase Admin] Initializing with individual environment variables');
      serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Robust fix for private key: handle literal \n AND accidental quotes
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, ''),
      };
    }
    else {
      console.log('[Firebase Admin] No environment variables found, checking for local service-account.json');
      try {
        const path = require('path');
        const fs = require('fs');
        const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
        if (fs.existsSync(serviceAccountPath)) {
          serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
          console.log('[Firebase Admin] Successfully loaded local service-account.json');
        } else {
          console.warn('[Firebase Admin] Local configuration missing. Please set environment variables.');
        }
      } catch (err: any) {
        console.error('[Firebase Admin] Error loading local file:', err.message);
      }
    }

    // The "Ultimate PEM Reconstructor"
    // This strips everything and rebuilds the key from scratch to be perfect.
    const cleanKey = (key: string) => {
      if (!key) return "";
      
      const header = "-----BEGIN PRIVATE KEY-----";
      const footer = "-----END PRIVATE KEY-----";
      
      // 1. Remove quotes, literal \n, and accidental spaces
      let raw = key.replace(/"/g, "").replace(/\\n/g, "\n").trim();
      
      // 2. Extract the core base64 body by removing headers/footers/whitespace
      const body = raw
        .replace(header, "")
        .replace(footer, "")
        .replace(/\s+/g, ""); // Remove ALL whitespace and newlines from the middle
      
      // 3. Re-wrap it in a perfect PEM structure
      return `${header}\n${body}\n${footer}`;
    };

    if (serviceAccount?.privateKey) {
      serviceAccount.privateKey = cleanKey(serviceAccount.privateKey);
    }

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin initialized successfully');
    }
  } catch (error: any) {
    console.warn('[Firebase Admin] Initialization deferred or failed.');
    console.warn('Reason:', error.message);
  }
}

export const adminDb = admin.apps.length ? admin.firestore() : null as any;
export const adminAuth = admin.apps.length ? admin.auth() : null as any;
