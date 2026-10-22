import { describe, expect, it } from "vitest";

import { canTransitionDppStatus, dppStatuses } from "./index.js";

// The "exactly one editable revision" invariant rests on this table plus
// createDppRevisionRecord's published-only guard. Together they mean a DPP is
// never in two open revisions at once: the only way to open a new one is from
// `published`, and the only way back into editing an in-flight revision is
// `review -> draft`, which reuses the same revision.
describe("canTransitionDppStatus", () => {
  it("lets a review go back to draft for further editing", () => {
    expect(canTransitionDppStatus("review", "draft")).toBe(true);
  });

  it("does not let a published DPP be edited directly", () => {
    // Editing a published DPP must go through createDppRevision, which opens a
    // new revision and leaves the published version immutable and public.
    expect(canTransitionDppStatus("published", "draft")).toBe(false);
    expect(canTransitionDppStatus("published", "review")).toBe(false);
  });

  it("allows the forward path draft -> review -> published", () => {
    expect(canTransitionDppStatus("draft", "review")).toBe(true);
    expect(canTransitionDppStatus("review", "published")).toBe(true);
  });

  it("never lets a draft skip review", () => {
    expect(canTransitionDppStatus("draft", "published")).toBe(false);
  });

  it("treats archived as terminal", () => {
    for (const status of dppStatuses) {
      if (status === "archived") continue;
      expect(canTransitionDppStatus("archived", status)).toBe(false);
    }
  });

  it("allows archiving from every live status", () => {
    for (const status of ["draft", "review", "published"] as const) {
      expect(canTransitionDppStatus(status, "archived")).toBe(true);
    }
  });

  it("treats a no-op transition as allowed", () => {
    for (const status of dppStatuses) {
      expect(canTransitionDppStatus(status, status)).toBe(true);
    }
  });
});
