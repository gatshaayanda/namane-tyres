import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, type User } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const isBrowser = typeof window !== "undefined";
const firebaseConfig = isBrowser ? {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
} : {
  apiKey: "AIzaSyNamaneTyresBuildPlaceholder000000000",
  authDomain: "namane-tyres-build.invalid",
  projectId: "namane-tyres-build",
  storageBucket: "namane-tyres-build.invalid",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:namanetyresbuild",
};
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export async function ensureCustomerSession(): Promise<User | null> {
  if (typeof window === "undefined") return null;
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser;
  return (await signInAnonymously(auth)).user;
}
export const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
export const storage = getStorage(app);
export { app };
