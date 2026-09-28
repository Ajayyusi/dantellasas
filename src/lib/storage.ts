import "server-only";

import { randomUUID } from "node:crypto";

import { fail } from "@/lib/actions";
import { getAdminBucket, usingEmulators } from "@/lib/firebase/admin";
import type { AppContext } from "@/lib/tenancy/context";

export interface StoredFile {
  path: string;
  url: string;
  name: string;
  contentType: string;
  size: number;
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const RECEIPT_TYPES = [...IMAGE_TYPES, "application/pdf"];
export const PHOTO_TYPES = IMAGE_TYPES;

/**
 * Uploads a file (from a Server Action's FormData) under the tenant's folder
 * and returns a stable download URL (Firebase download-token URL, so no URL
 * signing credentials are needed). Size and type are enforced here.
 */
export async function uploadTenantFile(
  ctx: AppContext,
  folder: string,
  file: File,
  opts: { maxMB: number; types: string[] },
): Promise<StoredFile> {
  if (file.size > opts.maxMB * 1024 * 1024) fail("errors.fileTooLarge", undefined, { max: opts.maxMB });
  if (!opts.types.includes(file.type)) fail("errors.fileType");
  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-80) || "file";
  const path = `organizations/${ctx.org.id}/${folder}/${Date.now()}-${randomUUID().slice(0, 8)}-${safeName}`;
  const token = randomUUID();
  const bucket = getAdminBucket();
  await bucket.file(path).save(Buffer.from(await file.arrayBuffer()), {
    contentType: file.type,
    resumable: false,
    metadata: { metadata: { firebaseStorageDownloadTokens: token } },
  });
  const base = usingEmulators()
    ? `http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? "127.0.0.1:9199"}`
    : "https://firebasestorage.googleapis.com";
  const url = `${base}/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
  return { path, url, name: file.name.slice(0, 120), contentType: file.type, size: file.size };
}

export async function deleteTenantFile(ctx: AppContext, path: string | null | undefined) {
  if (!path || !path.startsWith(`organizations/${ctx.org.id}/`)) return;
  await getAdminBucket().file(path).delete({ ignoreNotFound: true }).catch(() => undefined);
}
