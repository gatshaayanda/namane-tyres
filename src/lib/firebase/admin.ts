import "server-only";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function getAdminApp() {
  if (getApps().length) return getApps()[0];

  const rawKey = process.env.FIREBASE_ADMIN_KEY;
  if (rawKey) {
    try {
      const serviceAccount = JSON.parse(rawKey);
      return initializeApp({ credential: cert(serviceAccount) });
    } catch {
      throw new Error("FIREBASE_ADMIN_KEY is not valid service-account JSON.");
    }
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin server credentials are not configured.");
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

export function adminAuth(): Auth { return getAuth(getAdminApp()); }
export function adminDb(): Firestore { return getFirestore(getAdminApp()); }
