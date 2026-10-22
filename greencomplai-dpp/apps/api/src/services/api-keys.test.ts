import { describe, expect, it } from "vitest";

import {
  apiKeyFromHeader,
  generateApiKey,
  hashSecret,
  parseApiKey,
  secretMatches,
} from "./api-keys.js";

describe("api keys", () => {
  describe("generation", () => {
    it("produces a key in the documented shape", () => {
      const key = generateApiKey();

      expect(key.plaintext).toMatch(/^dpp_[0-9a-f]{16}_[0-9a-f]{64}$/);
      expect(parseApiKey(key.plaintext)?.keyPrefix).toBe(key.keyPrefix);
    });

    // The recognizable prefix is not decoration: secret scanners recognize
    // keys by such patterns, so an accidentally committed one gets flagged
    // instead of sitting unnoticed.
    it("starts with the scannable marker", () => {
      expect(generateApiKey().plaintext.startsWith("dpp_")).toBe(true);
    });

    // The parts must not be able to contain the separator. The first draft
    // used base64url, whose alphabet includes `_` - a key could then have
    // been unparseable depending on chance, working roughly every other
    // time. That is exactly what this test checks across many draws.
    it("never produces a part containing the separator", () => {
      for (let attempt = 0; attempt < 200; attempt += 1) {
        const key = generateApiKey();
        expect(key.plaintext.split("_")).toHaveLength(3);
        expect(parseApiKey(key.plaintext)).toBeDefined();
      }
    });

    it("never repeats", () => {
      const keys = new Set(Array.from({ length: 200 }, () => generateApiKey().plaintext));

      expect(keys.size).toBe(200);
    });

    // The plaintext must not be storable anywhere: what goes into the
    // database is the hash, and the key does not follow from it.
    it("keeps the secret out of what gets stored", () => {
      const key = generateApiKey();
      const secret = parseApiKey(key.plaintext)!.secret;

      expect(key.secretHash).not.toContain(secret);
      expect(key.secretHash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe("verification", () => {
    it("accepts the secret it was made from", () => {
      const key = generateApiKey();
      const { secret } = parseApiKey(key.plaintext)!;

      expect(secretMatches(secret, key.secretHash)).toBe(true);
    });

    it("rejects a different secret", () => {
      const key = generateApiKey();
      const other = generateApiKey();
      const { secret } = parseApiKey(other.plaintext)!;

      expect(secretMatches(secret, key.secretHash)).toBe(false);
    });

    // `timingSafeEqual` throws on unequal length; a corrupted hash from the
    // database must not raise an exception but must simply be rejected.
    it("rejects a malformed stored hash instead of throwing", () => {
      expect(() => secretMatches("irgendwas", "zu-kurz")).not.toThrow();
      expect(secretMatches("irgendwas", "zu-kurz")).toBe(false);
    });

    it("hashes deterministically", () => {
      expect(hashSecret("abc")).toBe(hashSecret("abc"));
      expect(hashSecret("abc")).not.toBe(hashSecret("abd"));
    });
  });

  describe("parsing", () => {
    it("refuses anything that is not three parts with the right scheme", () => {
      expect(parseApiKey("")).toBeUndefined();
      expect(parseApiKey("dpp_only-two")).toBeUndefined();
      expect(parseApiKey("dpp_a_b_c")).toBeUndefined();
      expect(parseApiKey("other_a_b")).toBeUndefined();
      expect(parseApiKey("dpp__b")).toBeUndefined();
      expect(parseApiKey("dpp_a_")).toBeUndefined();
    });
  });

  describe("reading the header", () => {
    it("takes a bearer token", () => {
      expect(apiKeyFromHeader("Bearer dpp_a_b")).toBe("dpp_a_b");
      expect(apiKeyFromHeader("bearer dpp_a_b")).toBe("dpp_a_b");
    });

    // A key does not belong in a URL: that ends up in server logs, browser
    // history and referrer headers.
    it("ignores other schemes", () => {
      expect(apiKeyFromHeader("Basic abc")).toBeUndefined();
      expect(apiKeyFromHeader("dpp_a_b")).toBeUndefined();
      expect(apiKeyFromHeader(undefined)).toBeUndefined();
    });
  });
});
