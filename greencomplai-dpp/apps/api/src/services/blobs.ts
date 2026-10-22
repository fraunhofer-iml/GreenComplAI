import { createHash, randomUUID } from "node:crypto";

import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  createBlobObject,
  findBlobObject,
  findPublicBlobObject,
  listSnapshotsReferencingBlob,
  recordBlobDownload,
} from "@dpp/db";
import { canRoleReadBlob } from "@dpp/domain";
import type { OrganizationRole } from "@dpp/domain";

import { env } from "../config.js";
import { db } from "../db.js";
import { s3, s3Presigner } from "../storage.js";
import { inspectUpload, scanUpload } from "./file-inspection.js";

type ServiceResult<T> =
  | { ok: true; value: T }
  | { code: string; message: string; ok: false; status: 400 | 403 | 404 | 413 | 415 };

function fail(
  status: 400 | 403 | 404 | 413 | 415,
  code: string,
  message: string,
): ServiceResult<never> {
  return { ok: false, status, code, message };
}

export type BlobMetadata = {
  checksum: string;
  contentType: string;
  createdAt: string;
  filename: string;
  id: string;
  isPublic: boolean;
  size: number;
};

function toMetadata(row: {
  checksum: string;
  contentType: string;
  createdAt: Date;
  filename: string;
  id: string;
  isPublic: boolean;
  size: number;
}): BlobMetadata {
  return {
    checksum: row.checksum,
    contentType: row.contentType,
    createdAt: row.createdAt.toISOString(),
    filename: row.filename,
    id: row.id,
    isPublic: row.isPublic,
    size: row.size,
  };
}

// Strips any path component and control characters: the filename is attacker-
// controlled and ends up in Content-Disposition and the UI.
function sanitizeFilename(raw: string): string {
  const base = raw.split(/[/\\]/).pop() ?? "";
  // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping control characters is the point
  const cleaned = base.replace(/[\x00-\x1f\x7f]/g, "").trim();
  return cleaned.slice(0, 255) || "unnamed";
}

type UploadInput = {
  actorUserId: string;
  file: File;
  organizationId: string;
};

export async function uploadBlob(input: UploadInput): Promise<ServiceResult<BlobMetadata>> {
  const filename = sanitizeFilename(input.file.name);
  const declaredContentType = (input.file.type || "").toLowerCase().split(";")[0]?.trim() ?? "";

  if (!declaredContentType) {
    return fail(415, "CONTENT_TYPE_REQUIRED", "The upload must declare a content type.");
  }
  if (!env.UPLOAD_ALLOWED_MIME_TYPES.has(declaredContentType)) {
    return fail(
      415,
      "CONTENT_TYPE_NOT_ALLOWED",
      `Content type ${declaredContentType} is not allowed. Allowed: ${[...env.UPLOAD_ALLOWED_MIME_TYPES].join(", ")}`,
    );
  }
  // Checked against the declared size first so an oversized body is rejected
  // before it is materialized, then again against the real byte length below.
  if (input.file.size > env.UPLOAD_MAX_BYTES) {
    return fail(
      413,
      "FILE_TOO_LARGE",
      `The file exceeds the maximum upload size of ${env.UPLOAD_MAX_BYTES} bytes.`,
    );
  }

  const bytes = new Uint8Array(await input.file.arrayBuffer());
  if (bytes.byteLength === 0) {
    return fail(400, "FILE_EMPTY", "The uploaded file is empty.");
  }
  if (bytes.byteLength > env.UPLOAD_MAX_BYTES) {
    return fail(
      413,
      "FILE_TOO_LARGE",
      `The file exceeds the maximum upload size of ${env.UPLOAD_MAX_BYTES} bytes.`,
    );
  }

  const inspection = inspectUpload(bytes, declaredContentType);
  if (!inspection.ok) return fail(415, inspection.code, inspection.message);

  const scan = await scanUpload(bytes);
  if (!scan.ok) return fail(415, scan.code, scan.message);

  // Checksum over the bytes we actually store, so it can verify the object later
  // (integrity, prEN 18239 5.2 no. 11).
  const checksum = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  // The storage key is tenant-prefixed and random: it carries no user-controlled
  // path segment and does not leak the filename to anyone listing the bucket.
  const storageKey = `org/${input.organizationId}/blobs/${randomUUID()}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: storageKey,
      Body: bytes,
      ContentType: declaredContentType,
      ChecksumSHA256: Buffer.from(checksum.slice("sha256:".length), "hex").toString("base64"),
    }),
  );

  const created = await createBlobObject(db, {
    actorUserId: input.actorUserId,
    checksum,
    contentType: declaredContentType,
    filename,
    organizationId: input.organizationId,
    size: bytes.byteLength,
    storageKey,
  });

  return { ok: true, value: toMetadata(created) };
}

export async function getBlobMetadata(
  organizationId: string,
  actorUserId: string,
  role: OrganizationRole,
  blobId: string,
): Promise<ServiceResult<BlobMetadata>> {
  const row = await findBlobObject(db, organizationId, blobId);
  if (!row) return fail(404, "BLOB_NOT_FOUND", "No such file in this organization.");

  // Metadata leaks filename and checksum, so it follows the same rule as the
  // bytes themselves.
  if (!(await mayReadBlob(organizationId, actorUserId, role, row))) {
    return fail(404, "BLOB_NOT_FOUND", "No such file in this organization.");
  }

  return { ok: true, value: toMetadata(row) };
}

async function presign(storageKey: string, filename: string, contentType: string) {
  return getSignedUrl(
    s3Presigner,
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: storageKey,
      // Force a download with the original filename rather than letting the
      // browser render attacker-supplied content inline on the storage origin.
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(filename)}"`,
      ResponseContentType: contentType,
    }),
    { expiresIn: env.DOWNLOAD_URL_TTL_SECONDS },
  );
}

// Whether the caller may read the file, evaluated fail-closed against the same
// element policies as the DPP read path (G5). Membership in the owning tenant is
// necessary but not sufficient: a viewer who knows a blob id must not be able to
// pull a file that hangs on a `controlled` element they may not read.
async function mayReadBlob(
  organizationId: string,
  actorUserId: string,
  role: OrganizationRole,
  blob: { createdBy: string; id: string },
): Promise<boolean> {
  if (role === "admin") return true;
  // A freshly uploaded file is not referenced by any DPP yet; its uploader
  // already holds the bytes, so they keep access until it is filed away.
  if (blob.createdBy === actorUserId) return true;

  const snapshots = await listSnapshotsReferencingBlob(db, organizationId, blob.id);
  return snapshots.some((snapshot) => canRoleReadBlob(snapshot, blob.id, role));
}

// Authenticated download: tenant-scoped, policy-checked and audited. An
// unauthorized file is a 404, not a 403 — the id's existence is itself
// information the caller is not entitled to.
export async function getBlobDownloadUrl(
  organizationId: string,
  actorUserId: string,
  role: OrganizationRole,
  blobId: string,
): Promise<ServiceResult<{ expiresIn: number; url: string }>> {
  const row = await findBlobObject(db, organizationId, blobId);
  if (!row) return fail(404, "BLOB_NOT_FOUND", "No such file in this organization.");

  if (!(await mayReadBlob(organizationId, actorUserId, role, row))) {
    return fail(404, "BLOB_NOT_FOUND", "No such file in this organization.");
  }

  const url = await presign(row.storageKey, row.filename, row.contentType);
  await recordBlobDownload(db, { actorUserId, blobId, organizationId });

  return { ok: true, value: { expiresIn: env.DOWNLOAD_URL_TTL_SECONDS, url } };
}

// Anonymous download for the public viewer. Only blobs released by a publish are
// reachable; `isPublic` is recomputed from the public projections on every DPP
// status change, so a file stops being downloadable as soon as it stops being
// published.
export async function getPublicBlobDownloadUrl(
  blobId: string,
): Promise<ServiceResult<{ expiresIn: number; url: string }>> {
  const row = await findPublicBlobObject(db, blobId);
  if (!row) return fail(404, "BLOB_NOT_FOUND", "No publicly available file with this id.");

  const url = await presign(row.storageKey, row.filename, row.contentType);
  await recordBlobDownload(db, {
    actorUserId: "anonymous",
    blobId,
    organizationId: row.organizationId,
  });

  return { ok: true, value: { expiresIn: env.DOWNLOAD_URL_TTL_SECONDS, url } };
}
