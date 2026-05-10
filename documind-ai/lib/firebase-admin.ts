import * as admin from 'firebase-admin';
import { createPrivateKey } from 'crypto';

/**
 * Firebase Admin SDK Singleton
 * Optimized for Vercel/Next.js environment variables.
 * Uses crypto.createPrivateKey() to normalize the PEM key for OpenSSL 3 / Node.js 18+
 * compatibility, which is required for Vercel's production serverless environment.
 */

/**
 * Normalizes a PEM private key for OpenSSL 3 compatibility on Node.js 18+.
 * Re-exports the key from a KeyObject to ensure the exact byte format expected
 * by the gRPC auth plugin used by Firebase Admin.
 * 
 * @param rawPemKey - The raw PEM private key string
 * @returns A normalized PEM key string, or the original key if normalization fails
 */
function normalizePemKey(rawPemKey: string): string {
  try {
    // Strip accidental outer quotes, then normalize all newline variants
    let key = rawPemKey
      .replace(/^\"|\"$/g, '')
      .replace(/^'|'$/g, '')
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\r\n/g, '\n')
      .trim();

    // Re-export through Node.js crypto to normalize to OpenSSL 3 compatible format
    const keyObject = createPrivateKey({ key, format: 'pem' });
    const normalized = keyObject.export({ type: 'pkcs8', format: 'pem' }) as string;
    console.log('[Firebase Admin] PEM key normalized successfully via crypto.createPrivateKey()');
    return normalized;
  } catch (err: any) {
    console.error('[Firebase Admin] Key normalization failed, using raw key:', err.message);
    // Fall back to the basic-cleaned version
    return rawPemKey
      .replace(/^\"|\"$/g, '')
      .replace(/\\n/g, '\n')
      .trim();
  }
}

if (!admin.apps.length) {
  try {
    let serviceAccount: any = null;

    // 1. Try the "All-in-One" JSON string (Most reliable for Vercel)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        // Normalize the private key inside the parsed JSON for OpenSSL 3
        if (parsed.private_key) {
          parsed.private_key = normalizePemKey(parsed.private_key);
        }
        serviceAccount = parsed;
        console.log('[Firebase Admin] Initializing with full SERVICE_ACCOUNT JSON');
      } catch (e: any) {
        console.warn('[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', e.message);
      }
    } 
    
    // 2. Try individual environment variables
    if (!serviceAccount && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      console.log('[Firebase Admin] Initializing with individual environment variables');
      
      const normalizedKey = normalizePemKey(process.env.FIREBASE_PRIVATE_KEY);

      serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: normalizedKey,
      };
    }

    // 3. Try local file (For local development only)
    if (!serviceAccount) {
      try {
        const path = require('path');
        const fs = require('fs');
        const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
        
        if (fs.existsSync(serviceAccountPath)) {
          const parsed = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
          if (parsed.private_key) {
            parsed.private_key = normalizePemKey(parsed.private_key);
          }
          serviceAccount = parsed;
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
