import { env } from "../config.js";
import { scanWithClamav } from "./clamav.js";

// Content inspection for uploads. The client-declared MIME type is untrusted:
// it is checked against an allowlist and then verified against the actual bytes,
// so a payload cannot enter the store by simply claiming to be a PDF
// (prEN 18239 5.2 no. 11/16).

type Signature = {
  contentType: string;
  // Byte prefix; `null` matches any byte at that position.
  magic: (number | null)[];
  offset?: number;
};

// Magic-byte signatures for the binary types we accept.
const SIGNATURES: Signature[] = [
  { contentType: "application/pdf", magic: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // %PDF-
  { contentType: "image/png", magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { contentType: "image/jpeg", magic: [0xff, 0xd8, 0xff] },
  {
    contentType: "image/webp",
    magic: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50],
  }, // RIFF....WEBP
];

// Byte prefixes that are never acceptable, whatever the declared type: native
// executables, archives (a container we cannot inspect) and scripts.
const FORBIDDEN_SIGNATURES: { label: string; magic: number[] }[] = [
  { label: "Windows executable", magic: [0x4d, 0x5a] }, // MZ
  { label: "ELF executable", magic: [0x7f, 0x45, 0x4c, 0x46] },
  { label: "Mach-O executable", magic: [0xcf, 0xfa, 0xed, 0xfe] },
  { label: "Java class file", magic: [0xca, 0xfe, 0xba, 0xbe] },
  { label: "ZIP archive", magic: [0x50, 0x4b, 0x03, 0x04] },
  { label: "gzip archive", magic: [0x1f, 0x8b] },
  { label: "shell script", magic: [0x23, 0x21] }, // #!
];

// Types that legitimately have no magic bytes and must therefore be plain text.
const TEXT_CONTENT_TYPES = new Set([
  "text/csv",
  "text/plain",
  "text/xml",
  "application/xml",
  "application/json",
]);

export type InspectionResult =
  { ok: true } | { ok: false; code: "CONTENT_TYPE_MISMATCH" | "CONTENT_REJECTED"; message: string };

function matches(bytes: Uint8Array, signature: Signature): boolean {
  const offset = signature.offset ?? 0;
  if (bytes.length < offset + signature.magic.length) return false;

  return signature.magic.every((byte, index) => byte === null || bytes[offset + index] === byte);
}

export function sniffContentType(bytes: Uint8Array): string | undefined {
  return SIGNATURES.find((signature) => matches(bytes, signature))?.contentType;
}

// JPEG and PNG are distinct types but browsers routinely send image/jpg; treat
// only exact equality as a match otherwise.
function typesAgree(declared: string, sniffed: string): boolean {
  if (declared === sniffed) return true;
  return declared === "image/jpg" && sniffed === "image/jpeg";
}

export function inspectUpload(bytes: Uint8Array, declaredContentType: string): InspectionResult {
  const forbidden = FORBIDDEN_SIGNATURES.find((signature) =>
    matches(bytes, { contentType: "", magic: signature.magic }),
  );
  if (forbidden) {
    return {
      ok: false,
      code: "CONTENT_REJECTED",
      message: `The file was rejected: its content looks like a ${forbidden.label}.`,
    };
  }

  const sniffed = sniffContentType(bytes);
  if (sniffed) {
    return typesAgree(declaredContentType, sniffed)
      ? { ok: true }
      : {
          ok: false,
          code: "CONTENT_TYPE_MISMATCH",
          message: `The file content is ${sniffed}, but it was declared as ${declaredContentType}.`,
        };
  }

  // No known signature: only the text-ish types are plausible, and they must not
  // contain NUL bytes (a marker of binary content mislabelled as text).
  if (!TEXT_CONTENT_TYPES.has(declaredContentType)) {
    return {
      ok: false,
      code: "CONTENT_TYPE_MISMATCH",
      message: `The file content does not match the declared type ${declaredContentType}.`,
    };
  }
  if (bytes.includes(0x00)) {
    return {
      ok: false,
      code: "CONTENT_REJECTED",
      message: `The file was declared as ${declaredContentType} but contains binary data.`,
    };
  }

  return { ok: true };
}

// Malware scanning. The signature checks above block the obvious carriers; this
// hands the bytes to ClamAV when the instance has one configured.
//
// The unavailable case is a real decision, not an oversight: with
// CLAMAV_REQUIRED=false (the default) an instance without a scanner — or one
// whose scanner is down — keeps accepting uploads, protected only by the
// signature checks. Set CLAMAV_REQUIRED=true to fail closed instead, which is
// what a regulated deployment should do.
export async function scanUpload(bytes: Uint8Array): Promise<InspectionResult> {
  const verdict = await scanWithClamav(bytes);

  if (verdict.status === "infected") {
    return {
      ok: false,
      code: "CONTENT_REJECTED",
      message: `The file was rejected by the malware scanner (${verdict.signature}).`,
    };
  }

  if (verdict.status === "unavailable") {
    if (env.CLAMAV_REQUIRED) {
      return {
        ok: false,
        code: "CONTENT_REJECTED",
        message: "The file could not be scanned for malware and was therefore rejected.",
      };
    }
    // Logged rather than silent: "no scanner" and "scanner broken" look the same
    // to the user, and only one of them is expected.
    if (verdict.reason !== "not-configured") {
      console.warn(`[scan] ClamAV unavailable, accepting unscanned upload: ${verdict.reason}`);
    }
  }

  return { ok: true };
}
