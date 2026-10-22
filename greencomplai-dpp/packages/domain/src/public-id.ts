// Web Crypto is available as a global in both Node (18+) and the browser, but
// this package types neither environment, so declare just the slice we use.
declare const crypto: { getRandomValues<T extends Uint8Array>(array: T): T };

// Base58: alphanumerics without the visually ambiguous 0/O/I/l. The identifier
// ends up in QR targets and printed links, where a misread character costs a
// support call.
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const PUBLIC_ID_LENGTH = 12;

// Rejection sampling keeps the distribution uniform: a plain modulo would favour
// the first 60 - (256 % 58) = 24 characters of the alphabet.
const MAX_ACCEPTABLE = Math.floor(256 / ALPHABET.length) * ALPHABET.length - 1;

// Short, URL-safe handle for a DPP. Not the canonical identifier — the URN in
// `digitalProductPassportId` is (prEN 18222). This only keeps routes readable,
// and never contains ':', so it can never collide with a URN.
export function generateDppPublicId(length: number = PUBLIC_ID_LENGTH): string {
  let id = "";

  while (id.length < length) {
    // Web Crypto rather than node:crypto, so the module stays usable from the
    // browser bundle. Over-fetches: ~1.1 bytes are consumed per accepted
    // character on average.
    const bytes = crypto.getRandomValues(new Uint8Array((length - id.length) * 2));
    for (const byte of bytes) {
      if (byte > MAX_ACCEPTABLE) continue;
      id += ALPHABET[byte % ALPHABET.length];
      if (id.length === length) break;
    }
  }

  return id;
}

// Maps arbitrary bytes (e.g. a hash) onto the public-id alphabet. For callers
// that need a *deterministic* id from a seed rather than a random one — the
// in-memory demo tenant, whose DPPs have no database row to generate one on.
// Not for real ids: a derived id is only as unpredictable as its seed.
export function derivePublicIdFromBytes(
  bytes: Uint8Array,
  length: number = PUBLIC_ID_LENGTH,
): string {
  let id = "";
  for (let index = 0; index < length; index += 1) {
    const byte = bytes[index % bytes.length] ?? 0;
    id += ALPHABET[byte % ALPHABET.length];
  }

  return id;
}

// Whether a string is a DPP public id rather than a URN. Used to decide which
// column a route parameter addresses.
export function isDppPublicId(value: string): boolean {
  return (
    value.length === PUBLIC_ID_LENGTH &&
    [...value].every((character) => ALPHABET.includes(character))
  );
}
