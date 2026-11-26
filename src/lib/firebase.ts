import { initializeApp } from 'firebase/app';
import { AppCheck, initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAuth, GoogleAuthProvider, User } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile } from '../types/store';

export const ADMIN_EMAIL = 'jellyzizy@gmail.com';

const app = initializeApp(firebaseConfig);

const APP_CHECK_SITE_KEY = String(
  (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY : '') ||
    firebaseConfig.recaptchaSiteKey ||
    ''
).trim();

let appCheckInstance: AppCheck | null = null;
let appCheckMode: 'active' | 'not_configured' = 'not_configured';
let appCheckNote =
  'App Check site key is not set. Configure reCAPTCHA v3 in Firebase Console and set VITE_FIREBASE_APP_CHECK_SITE_KEY to enforce App Check.';

if (typeof window !== 'undefined' && APP_CHECK_SITE_KEY.length > 0) {
  try {
    const debugToken = String(
      typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || '' : ''
    ).trim();
    if (typeof import.meta.env !== 'undefined' && import.meta.env.DEV && debugToken) {
      (
        window as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean }
      ).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken === 'true' ? true : debugToken;
    }
    appCheckInstance = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(APP_CHECK_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
    appCheckMode = 'active';
    appCheckNote = 'Firebase App Check initialized with reCAPTCHA v3 provider.';
  } catch (err) {
    appCheckMode = 'not_configured';
    appCheckNote =
      err instanceof Error ? `App Check fallback (${err.message}).` : 'App Check initialization skipped.';
  }
}

export const APP_CHECK_STATUS = {
  configured: appCheckMode === 'active',
  mode: appCheckMode,
  note: appCheckNote,
};
export { appCheckInstance };

// CRITICAL: Pass firebaseConfig.firestoreDatabaseId so Enterprise Firestore targets the provisioned database.
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<{
  connected: boolean;
  error?: string;
}> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return { connected: true };
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      return { connected: false, error: 'Firestore client appears offline.' };
    }
    // Missing or insufficient permissions on test/connection still confirms server roundtrip.
    return { connected: true };
  }
}

export function isUserAdmin(
  user: User | null,
  _profile: UserProfile | null,
  hasAdminDoc: boolean
): boolean {
  if (!user || !user.emailVerified) return false;
  if (user.email === ADMIN_EMAIL) return true;
  return hasAdminDoc;
}

export const FIREBASE_PROJECT_INFO = {
  projectId: firebaseConfig.projectId,
  databaseId: firebaseConfig.firestoreDatabaseId,
  storageBucket: firebaseConfig.storageBucket,
};
