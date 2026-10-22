import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

// Generation and verification of API keys.
//
// A key looks like this: `dpp_<prefix>_<secret>`.
//
//   * **`prefix`** is public and used for lookup. Without it, every call would have to check
//     every stored hash - that doesn't scale and makes response time depend on the number of
//     keys.
//   * **`secret`** is the actual secret. Only its hash is stored; the plaintext exists exactly
//     once, in the response to the creation call. Reading the database grants no access.
//   * The recognizable `dpp_` prefix isn't decoration: secret scanners on code hosting
//     platforms recognize keys by such patterns, so an accidentally committed key gets flagged
//     instead of sitting unnoticed.
//
// **SHA-256, not Argon2/bcrypt** - a deliberate deviation from the rule for passwords. Slow
// hashing exists because of low entropy: a password is guessable, so every attempt must be
// expensive. A key here has 256 bits from `randomBytes` and isn't guessable; a slow algorithm
// would only make every legitimate call more expensive and turn the API itself into an attack
// target (every call with a made-up key would then cost compute time). The same reasoning is
// behind the choice made by GitHub and Stripe.

const KEY_PREFIX = "dpp";
const PREFIX_BYTES = 8;
const SECRET_BYTES = 32;

// **Hex, not base64url**, even though base64url would be shorter: its alphabet contains `_` -
// exactly the separator. A key would then be unparseable depending on chance, working correctly
// roughly half the time. The condition this hinges on is simple: the parts must never contain
// the separator. Hex guarantees that; base64url doesn't.
const ENCODING = "hex" as const;

export type GeneratedKey = {
  // Only here, only once: the full key for the caller.
  plaintext: string;
  keyPrefix: string;
  secretHash: string;
};

export function generateApiKey(): GeneratedKey {
  const keyPrefix = randomBytes(PREFIX_BYTES).toString(ENCODING);
  const secret = randomBytes(SECRET_BYTES).toString(ENCODING);

  return {
    plaintext: `${KEY_PREFIX}_${keyPrefix}_${secret}`,
    keyPrefix,
    secretHash: hashSecret(secret),
  };
}

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

// Parses a presented key. Returns `undefined` if the shape is wrong - without revealing *why*.
export function parseApiKey(presented: string): { keyPrefix: string; secret: string } | undefined {
  const parts = presented.split("_");
  if (parts.length !== 3) return undefined;

  const [scheme, keyPrefix, secret] = parts;
  if (scheme !== KEY_PREFIX || !keyPrefix || !secret) return undefined;

  return { keyPrefix, secret };
}

// Constant-time comparison. A string `===` bails out at the first differing character; timing
// would let the hash be guessed character by character. The hashes have a fixed length, so a
// length mismatch would itself already be malformed input - checked anyway, because
// `timingSafeEqual` throws on unequal length.
export function secretMatches(secret: string, storedHash: string): boolean {
  const presented = Buffer.from(hashSecret(secret), "hex");
  const stored = Buffer.from(storedHash, "hex");
  if (presented.length !== stored.length) return false;

  return timingSafeEqual(presented, stored);
}

// Reads the key from the Authorization header. Only `Bearer` is accepted - a key as a query
// parameter ends up in server logs, browser history, and referrer headers.
export function apiKeyFromHeader(authorization: string | undefined): string | undefined {
  if (!authorization) return undefined;

  const [scheme, value] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !value) return undefined;

  return value;
}
