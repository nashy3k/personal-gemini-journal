import * as admin from 'firebase-admin';

let adminApp: admin.app.App | null = null;

/**
 * Initializes and returns the Firebase Admin SDK application instance.
 * Supports ADC (Application Default Credentials) on Cloud Run / GCP,
 * or FIREBASE_SERVICE_ACCOUNT_KEY json string for local / custom configs.
 */
export function getFirebaseAdminApp(): admin.app.App {
  if (adminApp) {
    return adminApp;
  }

  if (admin.apps.length > 0 && admin.apps[0]) {
    adminApp = admin.apps[0];
    return adminApp;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT;

  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId,
      });
      return adminApp;
    } catch (e) {
      console.warn(
        '[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY, falling back to applicationDefault()',
        e
      );
    }
  }

  // Application Default Credentials (Standard for Cloud Run / GCP IAM)
  adminApp = admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId,
  });

  return adminApp;
}

export const adminAuth = () => getFirebaseAdminApp().auth();
export const adminFirestore = () => {
  const app = getFirebaseAdminApp();
  const dbId = process.env.FIREBASE_DATABASE_ID || process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || 'gemini-journal';
  try {
    return (app as any).firestore(dbId);
  } catch {
    return app.firestore();
  }
};

/**
 * Verifies a client-provided Bearer Firebase ID token.
 * Extracts the raw token from authorization headers if needed.
 *
 * @param tokenOrHeader string e.g. "Bearer <token>" or raw token
 * @returns DecodedIdToken containing uid, email, etc.
 */
export async function verifyFirebaseIdToken(
  tokenOrHeader: string
): Promise<admin.auth.DecodedIdToken> {
  if (!tokenOrHeader || typeof tokenOrHeader !== 'string') {
    throw new Error('Missing or empty authorization token');
  }

  const token = tokenOrHeader.startsWith('Bearer ')
    ? tokenOrHeader.substring(7).trim()
    : tokenOrHeader.trim();

  if (!token) {
    throw new Error('Malformed authorization token');
  }

  const auth = adminAuth();
  return await auth.verifyIdToken(token, true); // checkRevoked = true
}
