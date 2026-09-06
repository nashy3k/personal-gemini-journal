import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

export function getClientFirebaseConfig() {
  if (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__) {
    const rc = (window as any).__RUNTIME_CONFIG__;
    if (rc.NEXT_PUBLIC_FIREBASE_API_KEY && rc.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      return {
        apiKey: rc.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: rc.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: rc.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: rc.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: rc.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: rc.NEXT_PUBLIC_FIREBASE_APP_ID,
        databaseId: rc.NEXT_PUBLIC_FIREBASE_DATABASE_ID || 'gemini-journal',
      };
    }
  }

  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
    databaseId: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || 'gemini-journal',
  };
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let isFirebaseConfigured = false;

export function initFirebase(): { app: FirebaseApp | null; auth: Auth | null; db: Firestore | null } {
  if (typeof window === 'undefined') {
    return { app: null, auth: null, db: null };
  }

  const config = getClientFirebaseConfig();
  if (!config.apiKey || !config.projectId) {
    return { app, auth, db };
  }

  try {
    if (!app) {
      app = getApps().length > 0 ? getApp() : initializeApp(config);
      auth = getAuth(app);
      db = getFirestore(app, config.databaseId);
      isFirebaseConfigured = true;
    }
  } catch (error) {
    console.error('[Firebase] Lazy initialization error:', error);
  }

  return { app, auth, db };
}

export async function ensureFirebaseInitialized(): Promise<{ app: FirebaseApp | null; auth: Auth | null; db: Firestore | null }> {
  if (typeof window === 'undefined') {
    return { app: null, auth: null, db: null };
  }

  if (auth && db) {
    return { app, auth, db };
  }

  // First try direct config
  let result = initFirebase();
  if (result.auth && result.db) {
    return result;
  }

  // Fallback to fetching runtime configuration from server
  try {
    const res = await fetch('/api/env-config', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.apiKey && data.projectId) {
        (window as any).__RUNTIME_CONFIG__ = {
          NEXT_PUBLIC_FIREBASE_API_KEY: data.apiKey,
          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: data.authDomain,
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: data.projectId,
          NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: data.storageBucket,
          NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: data.messagingSenderId,
          NEXT_PUBLIC_FIREBASE_APP_ID: data.appId,
          NEXT_PUBLIC_FIREBASE_DATABASE_ID: data.databaseId || 'gemini-journal',
        };
        result = initFirebase();
      }
    }
  } catch (err) {
    console.warn('[Firebase] Could not fetch runtime environment configuration:', err);
  }

  return result;
}

// Initial synchronous attempt
if (typeof window !== 'undefined') {
  initFirebase();
}

export function isFirebaseAvailable(): boolean {
  return Boolean(
    auth ||
    (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__?.NEXT_PUBLIC_FIREBASE_API_KEY) ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  );
}

export { app, auth, db, isFirebaseConfigured };

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});


