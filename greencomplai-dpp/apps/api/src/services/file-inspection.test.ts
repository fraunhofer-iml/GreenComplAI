import { describe, expect, it } from "vitest";

import { inspectUpload, sniffContentType } from "./file-inspection.js";

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);
const WINDOWS_EXE = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);
const ELF = new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01]);
const ZIP = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
const SHELL_SCRIPT = new Uint8Array([0x23, 0x21, 0x2f, 0x62, 0x69, 0x6e, 0x2f, 0x73, 0x68]);

function text(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

describe("sniffContentType", () => {
  it("recognizes the accepted binary formats", () => {
    expect(sniffContentType(PDF)).toBe("application/pdf");
    expect(sniffContentType(PNG)).toBe("image/png");
    expect(sniffContentType(JPEG)).toBe("image/jpeg");
    expect(sniffContentType(WEBP)).toBe("image/webp");
  });

  it("returns undefined for content without a known signature", () => {
    expect(sniffContentType(text("id;name\n1;Bolt\n"))).toBeUndefined();
  });
});

describe("inspectUpload", () => {
  it("accepts content that matches its declared type", () => {
    expect(inspectUpload(PDF, "application/pdf").ok).toBe(true);
    expect(inspectUpload(PNG, "image/png").ok).toBe(true);
    expect(inspectUpload(text("id;name\n1;Bolt\n"), "text/csv").ok).toBe(true);
    expect(inspectUpload(text('{"a":1}'), "application/json").ok).toBe(true);
  });

  it("tolerates the image/jpg alias browsers send for JPEG", () => {
    expect(inspectUpload(JPEG, "image/jpg").ok).toBe(true);
  });

  it("rejects an executable disguised as a PDF", () => {
    const result = inspectUpload(WINDOWS_EXE, "application/pdf");

    expect(result).toMatchObject({ ok: false, code: "CONTENT_REJECTED" });
  });

  it.each([
    ["ELF executable", ELF],
    ["ZIP archive", ZIP],
    ["shell script", SHELL_SCRIPT],
  ])("rejects a %s whatever it claims to be", (_label, bytes) => {
    expect(inspectUpload(bytes, "text/plain")).toMatchObject({
      ok: false,
      code: "CONTENT_REJECTED",
    });
  });

  it("rejects a PNG declared as PDF", () => {
    expect(inspectUpload(PNG, "application/pdf")).toMatchObject({
      ok: false,
      code: "CONTENT_TYPE_MISMATCH",
    });
  });

  it("rejects unknown binary content claiming to be a PDF", () => {
    expect(
      inspectUpload(new Uint8Array([0x01, 0x02, 0x03, 0x04]), "application/pdf"),
    ).toMatchObject({ ok: false, code: "CONTENT_TYPE_MISMATCH" });
  });

  it("rejects binary content mislabelled as text", () => {
    const bytes = new Uint8Array([0x68, 0x69, 0x00, 0x01, 0x02]);

    expect(inspectUpload(bytes, "text/plain")).toMatchObject({
      ok: false,
      code: "CONTENT_REJECTED",
    });
  });
});
