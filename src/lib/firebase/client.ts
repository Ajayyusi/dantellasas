"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";

import { getPublicEnv } from "@/lib/env";

/**
 * Browser Firebase singletons. Import only from client components; server code
 * uses `@/lib/firebase/admin`. The browser SDK is used for sign-in and for
 * read-only realtime listeners — all writes go through Server Actions.
 */

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  const env = getPublicEnv();
  app = getApps().length
    ? getApp()
    : initializeApp({
        apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
      });
  return app;
}

const emulatorsEnabled = () => getPublicEnv().NEXT_PUBLIC_USE_FIREBASE_EMULATORS;

export function getClientAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
    if (emulatorsEnabled()) {
      connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    }
  }
  return auth;
}

export function getClientDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
    if (emulatorsEnabled()) connectFirestoreEmulator(db, "127.0.0.1", 8080);
  }
  return db;
}
