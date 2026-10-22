import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";

import { env } from "../config.js";

// Credentials for third-party systems must be stored **decryptable** - unlike
// the platform's own API keys, of which only the hash is stored.
//
// The difference is not carelessness but the direction of the call. For an
// incoming key, the platform only has to check whether the presented value
// matches; a hash is enough for that, and storing more would be an
// unnecessary risk. An outgoing credential, by contrast, must go to the
// third-party system in plaintext on every call. A hash couldn't do that.
//
// Hence encryption, with a key that is **not** stored in the database:
// whoever steals a database dump does not thereby gain access to third-party
// ERP credentials. AES-256-GCM because, besides confidentiality, it also
// secures integrity - a tampered ciphertext fails to decrypt instead of
// silently yielding something else.

const VERSION = "v1";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

export class SecretBoxUnavailableError extends Error {
  readonly code = "CONNECTOR_SECRET_KEY_MISSING";

  constructor() {
    super(
      "No key for encrypting connector credentials is configured on this instance. Connectors carrying a secret are rejected rather than stored in cleartext. Set CONNECTOR_SECRET_KEY to a base64-encoded 32-byte key.",
    );
  }
}

export class SecretBoxCorruptError extends Error {
  readonly code = "CONNECTOR_SECRET_CORRUPT";
}

// Whether credentials can be stored at all. The UI asks this to say what's
// missing during setup - instead of letting the user fill out a form that
// fails on submit.
export function secretStorageAvailable(): boolean {
  return readKey() !== undefined;
}

export function encryptSecret(plaintext: string): string {
  const key = readKey();
  if (!key) throw new SecretBoxUnavailableError();

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);

  return [
    VERSION,
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}

export function decryptSecret(envelope: string): string {
  const key = readKey();
  if (!key) throw new SecretBoxUnavailableError();

  const [version, iv, tag, ciphertext] = envelope.split(".");
  // The version comes first so a later change of scheme can still read old
  // values instead of making them unreadable.
  if (version !== VERSION || !iv || !tag || !ciphertext) {
    throw new SecretBoxCorruptError("Stored credentials are not in a readable format");
  }

  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));

    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // The most common cause is a rotated key, the second most common a
    // tampered ciphertext. Both end up here, and both mean the same thing for
    // the caller: these credentials need to be re-entered.
    throw new SecretBoxCorruptError(
      "Stored credentials could not be decrypted. They were written with a different CONNECTOR_SECRET_KEY or have been altered.",
    );
  }
}

// A comparison that doesn't reveal at which position it fails. Needed where a
// decrypted secret is checked against an input - rare, but then it matters.
export function secretsMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");

  return left.length === right.length && timingSafeEqual(left, right);
}

function readKey(): Buffer | undefined {
  const raw = env.CONNECTOR_SECRET_KEY;
  if (!raw) return undefined;

  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `CONNECTOR_SECRET_KEY must decode to ${KEY_LENGTH} bytes, got ${key.length}. Generate one with: openssl rand -base64 32`,
    );
  }

  return key;
}
