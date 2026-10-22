import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";

// The key must be set before config.ts reads the environment - an import
// higher up would set it too late.
process.env.CONNECTOR_SECRET_KEY ??= randomBytes(32).toString("base64");

const { decryptSecret, encryptSecret, secretStorageAvailable, SecretBoxCorruptError } =
  await import("./secret-box.js");

describe("secret box", () => {
  beforeAll(() => {
    expect(secretStorageAvailable()).toBe(true);
  });

  it("returns what it was given", () => {
    expect(decryptSecret(encryptSecret("client-secret-value"))).toBe("client-secret-value");
  });

  it("survives non-ascii secrets", () => {
    const secret = "pässwörd-🔑-with-dots.and.dots";
    expect(decryptSecret(encryptSecret(secret))).toBe(secret);
  });

  it("produces a different envelope every time", () => {
    // Same plaintext, same ciphertext would leak information on its own: anyone
    // reading the database would see which tenants share the same secret.
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });

  it("rejects an altered ciphertext instead of returning something else", () => {
    const envelope = encryptSecret("client-secret-value");
    const [version, iv, tag, ciphertext] = envelope.split(".") as [string, string, string, string];
    const flipped = Buffer.from(ciphertext, "base64");
    flipped.writeUInt8(flipped.readUInt8(0) ^ 0x01, 0);

    expect(() => decryptSecret([version, iv, tag, flipped.toString("base64")].join("."))).toThrow(
      SecretBoxCorruptError,
    );
  });

  it("rejects a malformed envelope", () => {
    expect(() => decryptSecret("not-an-envelope")).toThrow(SecretBoxCorruptError);
    expect(() => decryptSecret("v2.a.b.c")).toThrow(SecretBoxCorruptError);
  });
});
