import * as admin from 'firebase-admin';

/**
 * Firebase Admin SDK Singleton
 * Optimized for Vercel/Next.js environment variables.
 */

if (!admin.apps.length) {
  try {
    let serviceAccount: any = null;

    // 1. Try the "All-in-One" JSON string (Recommended for Vercel)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log('[Firebase Admin] Initializing with full SERVICE_ACCOUNT JSON');
      } catch (e) {
        console.warn('[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON string');
      }
    } 
    
    // 2. Try individual environment variables
    if (!serviceAccount && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      console.log('[Firebase Admin] Initializing with individual environment variables');
      
      const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';

      // Step 1: Strip any wrapping quotes
      let fixedKey = rawKey.replace(/^"|"$/g, '').replace(/^'|'$/g, '');

      // Step 2: Normalize all newline representations to a real \n character
      // This handles: literal \n strings, \\n double-escaped, and \r\n
      fixedKey = fixedKey
        .replace(/\\r\\n/g, '\n')
        .replace(/\\n/g, '\n')
        .replace(/\r\n/g, '\n')
        .trim();

      // Step 3: Validate PEM structure is intact
      if (!fixedKey.includes('-----BEGIN PRIVATE KEY-----') || !fixedKey.includes('-----END PRIVATE KEY-----')) {
        console.error('[Firebase Admin] PEM structure is invalid after parsing. Check FIREBASE_PRIVATE_KEY format.');
      } else {
        console.log('[Firebase Admin] PEM key structure looks valid.');
      }

      serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: fixedKey,
      };
    }

    // 3. Try local file (For local development only)
    if (!serviceAccount) {
      try {
        const path = require('path');
        const fs = require('fs');
        const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
        
        if (fs.existsSync(serviceAccountPath)) {
          serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
          console.log('[Firebase Admin] Initializing with local service-account.json');
        }
      } catch (e) {
        // Silent fail for local file
      }
    }

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('[Firebase Admin] Initialized successfully');
    } else {
      console.warn('[Firebase Admin] No configuration found. Check your environment variables.');
    }
  } catch (error: any) {
    console.warn('[Firebase Admin] Initialization failed.');
    console.warn('Reason:', error.message);
  }
}

export const adminDb = admin.apps.length ? admin.firestore() : null as any;
export const adminAuth = admin.apps.length ? admin.auth() : null as any;
