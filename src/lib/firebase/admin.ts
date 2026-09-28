import "server-only";

import {
  applicationDefault,
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
  type AppOptions,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

import { getServerEnv } from "@/lib/env.server";

/**
 * Server-side Firebase Admin singletons. The Admin SDK bypasses security
 * rules — every caller MUST authorise through `@/lib/tenancy/context` first.
 *
 * With FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST /
 * FIREBASE_STORAGE_EMULATOR_HOST set, the SDK talks to the emulators.
 */

export function usingEmulators(): boolean {
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST);
}

function projectId(): string | undefined {
  const env = getServerEnv();
  if (env.FIREBASE_ADMIN_PROJECT_ID) return env.FIREBASE_ADMIN_PROJECT_ID;
  if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (process.env.FIREBASE_CONFIG) {
    try {
      return (JSON.parse(process.env.FIREBASE_CONFIG) as { projectId?: string }).projectId;
    } catch {
      return undefined;
    }
  }
  return process.env.GCLOUD_PROJECT;
}

function storageBucket(): string | undefined {
  if (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) {
    return process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  }
  if (process.env.FIREBASE_CONFIG) {
    try {
      return (JSON.parse(process.env.FIREBASE_CONFIG) as { storageBucket?: string }).storageBucket;
    } catch {
      return undefined;
    }
  }
  const id = projectId();
  return id ? `${id}.firebasestorage.app` : undefined;
}

let adminApp: App | undefined;

export function getAdminApp(): App {
  if (adminApp) return adminApp;
  if (getApps().length) {
    adminApp = getApp();
    return adminApp;
  }
  const env = getServerEnv();
  const hasServiceAccount =
    env.FIREBASE_ADMIN_PROJECT_ID && env.FIREBASE_ADMIN_CLIENT_EMAIL && env.FIREBASE_ADMIN_PRIVATE_KEY;

  const options: AppOptions = { projectId: projectId(), storageBucket: storageBucket() };
  if (!usingEmulators()) {
    options.credential = hasServiceAccount
      ? cert({
          projectId: env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, "\n"),
        })
      : applicationDefault();
  }
  adminApp = initializeApp(options);
  return adminApp;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

let adminDb: Firestore | undefined;
const SETTINGS_FLAG = Symbol.for("dantella.firestoreSettingsApplied");

export function getAdminDb(): Firestore {
  if (!adminDb) {
    adminDb = getFirestore(getAdminApp());
    // settings() may run only once per Firestore instance; dev hot reloads
    // re-evaluate this module while the instance survives.
    const g = globalThis as unknown as Record<symbol, boolean>;
    if (!g[SETTINGS_FLAG]) {
      try {
        adminDb.settings({ ignoreUndefinedProperties: true });
      } catch {
        // Already configured by a previous module instance.
      }
      g[SETTINGS_FLAG] = true;
    }
  }
  return adminDb;
}

export function getAdminBucket() {
  return getStorage(getAdminApp()).bucket();
}
