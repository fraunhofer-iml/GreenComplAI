import { describe, expect, it } from "vitest";

import { interpret } from "./clamav.js";

// clamd's INSTREAM reply is a single line; misreading it either waves malware
// through or rejects clean files, so the parser gets its own tests.
describe("interpret", () => {
  it("reads a clean verdict", () => {
    expect(interpret("stream: OK\0")).toEqual({ status: "clean" });
  });

  it("reads an infected verdict and keeps the signature name", () => {
    expect(interpret("stream: Eicar-Test-Signature FOUND\0")).toEqual({
      status: "infected",
      signature: "Eicar-Test-Signature",
    });
  });

  it("handles a signature name containing spaces", () => {
    expect(interpret("stream: Win.Test.EICAR_HDB-1 FOUND\0")).toEqual({
      status: "infected",
      signature: "Win.Test.EICAR_HDB-1",
    });
  });

  it("treats an error reply as unavailable, not as clean", () => {
    // The dangerous failure mode: an unparsed reply must never read as "clean".
    expect(interpret("INSTREAM size limit exceeded. ERROR\0")).toMatchObject({
      status: "unavailable",
    });
  });

  it("treats an empty reply as unavailable", () => {
    expect(interpret("")).toMatchObject({ status: "unavailable" });
  });

  it("tolerates missing NUL termination and surrounding whitespace", () => {
    expect(interpret("  stream: OK  ")).toEqual({ status: "clean" });
  });
});
