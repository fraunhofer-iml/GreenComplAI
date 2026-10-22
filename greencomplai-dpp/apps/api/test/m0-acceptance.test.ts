import { randomUUID } from "node:crypto";

import { auditEvents } from "@dpp/db/schema";
import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import { db } from "../src/db.js";
import {
  addMember,
  anonymous,
  createOrganization,
  type OrganizationFixture,
  type TestClient,
} from "./helpers/client.js";

// The M0 acceptance test: the ten Definition-of-Done steps from
// docs/umsetzungsplan-2026-07-16.md, in exactly this order, along *one*
// passport.
//
// Why one continuous thread instead of ten independent scenarios: the
// individual guarantees have their own suites (dpp-workflow, element-policy,
// public-projection, blob-upload, tenant-isolation). What none of those check
// is how they interact - that the value the editor enters in step 3 is the
// same one the validator flags in step 4, the reviewer sees in the diff in
// step 5, step 6 freezes immutably, and the anonymous fetch in step 7 shows.
// That is why the `it` blocks share state and run in sequence; a failure in
// step 4 drops the following steps, and that is the correct outcome - the
// path is not green.
//
// Roles: the model knows admin/editor/viewer/authority (packages/domain).
// The DoD's "reviewer" is therefore not its own role but a *second* admin -
// the four-eyes rule requires that the approver is not the author, not
// that they carry a different title.

const currentYear = new Date().getFullYear();

const PDF_BYTES = new Uint8Array([
  0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a,
]);

// Data point names used throughout the test.
const RECYCLED_CONTENT = "recyclat-anteil"; // required, public
const SUPPLIER_PRICE = "lieferantenpreis"; // controlled, readable by authorities
const INTERNAL_CALC = "interne-kalkulation"; // controlled, admin only
const TEST_REPORT = "pruefbericht"; // document, public
const INTERNAL_REPORT = "interner-bericht"; // document, controlled

type ValidationIssue = { code: string; message: string; path: string };
type ValidationReport = { errors: ValidationIssue[]; valid: boolean; warnings: ValidationIssue[] };
type DataElementLike = { elementId: string; value?: unknown };
type ViewPayload = {
  view: {
    dpp: { dataElements: DataElementLike[]; status: string };
    hasPublicVersion: boolean;
    publishedVersionLabel?: string;
    versionLabel: string;
  };
};
type TimelineEntry = {
  fieldDiffs: { newValue: string | null; oldValue: string | null; path: string }[];
  kind: string;
  statusTo?: string;
};

function upload(client: TestClient, filename: string) {
  const form = new FormData();
  form.append("file", new File([PDF_BYTES as BufferSource], filename, { type: "application/pdf" }));
  return client.sendRaw<{ result: { id: string } }>("POST", "/documents", form);
}

describe("M0 Definition of Done", () => {
  const runId = randomUUID().slice(0, 8);
  const repositoryKey = `abnahme-${runId}`;
  const dictionaryVersion = "2026.1";
  const schemaBinding = `${repositoryKey}/${dictionaryVersion}`;
  const productId = `ABNAHME-${runId}`;
  const operatorId = `OP-${runId}`;
  const recycledValue = "68 %";
  const supplierPriceValue = "42,00 EUR";

  let organization: OrganizationFixture;
  let reviewer: TestClient; // second admin - approves what they did not write themselves
  let editor: TestClient;
  let authority: TestClient;
  let viewer: TestClient;

  let publicId: string;
  let publicBlobId: string;
  let controlledBlobId: string;

  // A patch replaces the element list wholesale, and the write check compares
  // signatures: an element sent back unchanged does not count as written.
  // All patches are therefore assembled from the same objects - a
  // differently-written copy would count as a change and thus a rights
  // violation.
  type Element = Record<string, unknown>;
  let supplierPriceElement: Element;
  let testReportElement: Element;
  let internalReportElement: Element;
  let internalCalcElement: Element;

  // Controlled but (still) without a policy - the finding from step 4.
  const internalCalcDraft: Element = {
    elementId: INTERNAL_CALC,
    kind: "single",
    value: "Marge 12 %",
    valueDataType: "string",
    visibility: "controlled",
  };

  const recycledContentElement = (value: string): Element => ({
    elementId: RECYCLED_CONTENT,
    dictionaryReference: RECYCLED_CONTENT,
    kind: "single",
    value,
    valueDataType: "string",
    visibility: "public",
  });

  beforeAll(async () => {
    organization = await createOrganization("m0");
  });

  // --- 1. Admin creates the organization and its users ----------------------
  it("1. admin creates the organization and its users", async () => {
    editor = await addMember(organization, "editor");
    reviewer = await addMember(organization, "admin");
    authority = await addMember(organization, "authority");
    viewer = await addMember(organization, "viewer");

    const members = await organization.admin.get<{
      result: { email: string; role: string }[];
    }>("/members");

    expect(members.status).toBe(200);
    const roles = members.body.result.map((member) => member.role).sort();
    // The founder is admin, plus the four invited members.
    expect(roles).toEqual(["admin", "admin", "authority", "editor", "viewer"]);
  });

  // --- 2. Editor creates a DPP from a released profile -----------------------
  it("2. editor creates a DPP from a released profile", async () => {
    // In M0, "released profile" is the active dictionary at a fixed version:
    // it decides which data points are required (G23/G24 build the registry
    // and release process on top of this).
    const repository = await organization.admin.post("/data-dictionary-repositories", {
      repositoryKey,
      name: { de: `Abnahme-Wörterbuch ${runId}` },
      namespaceUri: `https://dictionary.test/${repositoryKey}/${dictionaryVersion}/`,
      version: dictionaryVersion,
      status: "active",
    });
    expect(repository.status).toBe(201);

    const entries = [
      {
        entryKey: RECYCLED_CONTENT,
        name: { de: "Rezyklatanteil" },
        valueType: "string",
        visibility: "public",
        required: true,
      },
      {
        entryKey: SUPPLIER_PRICE,
        name: { de: "Lieferantenpreis" },
        valueType: "string",
        visibility: "controlled",
        required: false,
      },
      {
        entryKey: TEST_REPORT,
        name: { de: "Prüfbericht" },
        valueType: "document",
        visibility: "public",
        required: false,
      },
    ];
    for (const entry of entries) {
      const created = await organization.admin.post(
        `/data-dictionary-repositories/${repositoryKey}/entries`,
        entry,
      );
      expect(created.status).toBe(201);
    }

    const operator = await organization.admin.post("/economic-operators", {
      operatorId,
      legalName: `Abnahme Operator GmbH ${runId}`,
      roles: ["manufacturer"],
    });
    expect(operator.status).toBe(201);

    const created = await editor.post<{ publicId: string }>("/dpps", {
      productId,
      granularity: "model",
      dppSchemaVersion: schemaBinding,
      economicOperatorId: operatorId,
    });

    expect(created.status).toBe(201);
    publicId = created.body.publicId;

    const view = await editor.get<ViewPayload>(`/dpps/${publicId}/view`);
    expect(view.body.view.dpp.status).toBe("draft");
    expect(view.body.view.versionLabel).toBe(`${currentYear}.1`);
  });

  // --- 3. Editor records public and controlled values and a document --------
  it("3. editor records public and controlled values and a document", async () => {
    const publicUpload = await upload(editor, "pruefbericht.pdf");
    const controlledUpload = await upload(editor, "interner-bericht.pdf");
    expect(publicUpload.status).toBe(201);
    expect(controlledUpload.status).toBe(201);
    publicBlobId = publicUpload.body.result.id;
    controlledBlobId = controlledUpload.body.result.id;

    supplierPriceElement = {
      elementId: SUPPLIER_PRICE,
      dictionaryReference: SUPPLIER_PRICE,
      kind: "single",
      value: supplierPriceValue,
      valueDataType: "string",
      visibility: "controlled",
      policy: { readRoles: ["admin", "authority"], writeRoles: ["admin", "editor"] },
    };
    testReportElement = {
      elementId: TEST_REPORT,
      dictionaryReference: TEST_REPORT,
      kind: "document",
      blobObjectId: publicBlobId,
      filename: "pruefbericht.pdf",
      contentType: "application/pdf",
      visibility: "public",
    };
    internalReportElement = {
      elementId: INTERNAL_REPORT,
      kind: "document",
      blobObjectId: controlledBlobId,
      filename: "interner-bericht.pdf",
      contentType: "application/pdf",
      visibility: "controlled",
      policy: { readRoles: ["admin", "authority"], writeRoles: ["admin", "editor"] },
    };

    const patched = await editor.patch(`/dpps/${publicId}`, {
      snapshot: {
        dataElements: [supplierPriceElement, testReportElement, internalReportElement],
      },
    });
    expect(patched.status).toBe(200);

    // The editor cannot create a controlled element without a policy:
    // fail-closed applies to writing just as it does to reading - a new
    // element's own policy governs it, and "no policy" grants nobody but the
    // admin anything (G5).
    const withoutPolicy = await editor.patch(`/dpps/${publicId}`, {
      snapshot: {
        dataElements: [
          supplierPriceElement,
          testReportElement,
          internalReportElement,
          { ...internalCalcDraft },
        ],
      },
    });
    expect(withoutPolicy.status).toBe(403);

    // The admin is allowed to (override) - leaving exactly the unfinished
    // state that step 4 has to flag. Together with the still-missing required
    // data point, the draft is deliberately not release-ready.
    internalCalcElement = { ...internalCalcDraft };
    const byAdmin = await organization.admin.patch(`/dpps/${publicId}`, {
      snapshot: {
        dataElements: [
          supplierPriceElement,
          testReportElement,
          internalReportElement,
          internalCalcElement,
        ],
      },
    });
    expect(byAdmin.status).toBe(200);
  });

  // --- 4. Validator reports the required-field and policy errors ------------
  it("4. the validator reports the missing mandatory field and the missing policy", async () => {
    const report = await editor.get<{ report: ValidationReport }>(`/dpps/${publicId}/validation`);

    expect(report.status).toBe(200);
    expect(report.body.report.valid).toBe(false);
    expect(report.body.report.errors.map((issue) => issue.code)).toContain("required-missing");
    expect(report.body.report.errors.map((issue) => issue.path)).toContain(
      `dictionary:${RECYCLED_CONTENT}`,
    );
    // Controlled without a policy is a warning, not an error: fail-closed means
    // nobody but the admin sees it - incomplete, but not unsafe.
    expect(report.body.report.warnings.map((issue) => issue.code)).toContain("missing-policy");
    expect(report.body.report.warnings.map((issue) => issue.path)).toContain(INTERNAL_CALC);
  });

  it("4b. the publish gate refuses the incomplete DPP", async () => {
    expect((await editor.put(`/dpps/${publicId}/status`, { status: "review" })).status).toBe(200);

    const refused = await reviewer.put<{ messages: { code: string }[] }>(
      `/dpps/${publicId}/status`,
      { status: "published" },
    );

    // 422: the request was well-formed, its content is rejected (G38).
    expect(refused.status).toBe(422);
    expect(refused.body.messages[0]?.code).toBe("DPP_PUBLISH_VALIDATION_FAILED");

    expect((await editor.put(`/dpps/${publicId}/status`, { status: "draft" })).status).toBe(200);
  });

  it("4c. the findings get fixed until the validator passes", async () => {
    // The editor adds the missing required data point. All other elements go
    // along unchanged - including ones the editor is not allowed to write;
    // those do not count as a write access.
    const byEditor = await editor.patch(`/dpps/${publicId}`, {
      snapshot: {
        dataElements: [
          recycledContentElement(recycledValue),
          supplierPriceElement,
          testReportElement,
          internalReportElement,
          internalCalcElement,
        ],
      },
    });
    expect(byEditor.status).toBe(200);

    // Only the admin can add the missing policy: changing a policy is itself
    // a privileged write.
    internalCalcElement = {
      ...internalCalcDraft,
      policy: { readRoles: ["admin"], writeRoles: ["admin"] },
    };
    const patched = await organization.admin.patch(`/dpps/${publicId}`, {
      snapshot: {
        dataElements: [
          recycledContentElement(recycledValue),
          supplierPriceElement,
          testReportElement,
          internalReportElement,
          internalCalcElement,
        ],
      },
    });
    expect(patched.status).toBe(200);

    const report = await editor.get<{ report: ValidationReport }>(`/dpps/${publicId}/validation`);
    expect(report.body.report.errors).toEqual([]);
    expect(report.body.report.valid).toBe(true);
  });

  // --- 5. Reviewer checks the diff/timeline and approves ---------------------
  it("5. the reviewer sees the change in the timeline and the editor may not release", async () => {
    expect((await editor.put(`/dpps/${publicId}/status`, { status: "review" })).status).toBe(200);

    const timeline = await reviewer.get<{ entries: TimelineEntry[] }>(`/dpps/${publicId}/timeline`);
    expect(timeline.status).toBe(200);

    // The reviewer sees *what* changed - not just that something changed.
    const diffs = timeline.body.entries.flatMap((entry) => entry.fieldDiffs);
    const recycledDiff = diffs.find((diff) => diff.path === RECYCLED_CONTENT);
    expect(recycledDiff?.newValue).toBe(recycledValue);

    expect(timeline.body.entries.some((entry) => entry.statusTo === "review")).toBe(true);

    // Four-eyes (G3): the author does not approve their own work.
    const selfRelease = await editor.put(`/dpps/${publicId}/status`, { status: "published" });
    expect(selfRelease.status).toBe(403);
  });

  // --- 6. Admin publishes; an immutable active version appears --------------
  it("6. the admin publishes and an immutable active version appears", async () => {
    const published = await reviewer.put(`/dpps/${publicId}/status`, { status: "published" });
    expect(published.status).toBe(200);

    const view = await reviewer.get<ViewPayload>(`/dpps/${publicId}/view`);
    expect(view.body.view.dpp.status).toBe("published");
    expect(view.body.view.publishedVersionLabel).toBe(`${currentYear}.1`);
    expect(view.body.view.hasPublicVersion).toBe(true);

    // Immutable means the normal write path is closed, not just the UI.
    const overwrite = await reviewer.patch(`/dpps/${publicId}`, {
      snapshot: { granularity: "item" },
    });
    expect(overwrite.status).toBe(409);
  });

  // --- 6b. New revision, running label, still published ----------------------
  it("6b. a new revision increments the label while the published version stays live", async () => {
    const revision = await organization.admin.post(`/dpps/${publicId}/revisions`);
    expect(revision.status).toBe(201);

    const view = await organization.admin.get<ViewPayload>(`/dpps/${publicId}/view`);
    // The bug that G62/G63 grew out of: this used to just say "draft".
    expect(view.body.view.dpp.status).toBe("draft");
    expect(view.body.view.versionLabel).toBe(`${currentYear}.2`);
    expect(view.body.view.publishedVersionLabel).toBe(`${currentYear}.1`);
    expect(view.body.view.hasPublicVersion).toBe(true);

    // And the actual immutability test: change the value in the open revision -
    // the published version must see none of it.
    const patched = await editor.patch(`/dpps/${publicId}`, {
      snapshot: {
        dataElements: [
          recycledContentElement("99 % (Entwurf)"),
          supplierPriceElement,
          testReportElement,
          internalReportElement,
          internalCalcElement,
        ],
      },
    });
    expect(patched.status).toBe(200);

    const publicView = await anonymous.get<{ dpp: { dataElements: DataElementLike[] } }>(
      `/public/dpps/${publicId}`,
    );
    const recycled = publicView.body.dpp.dataElements.find(
      (element) => element.elementId === RECYCLED_CONTENT,
    );
    expect(recycled?.value).toBe(recycledValue);
  });

  // --- 7. QR opens, anonymously, only the public projection + public files --
  it("7. the QR link serves only the public projection and its public files", async () => {
    const response = await anonymous.get<{ dpp: { dataElements: DataElementLike[] } }>(
      `/public/dpps/${publicId}`,
    );
    expect(response.status).toBe(200);

    const ids = response.body.dpp.dataElements.map((element) => element.elementId);
    expect(ids).toContain(RECYCLED_CONTENT);
    expect(ids).toContain(TEST_REPORT);

    // Not just the element IDs: the value itself must not survive anywhere in
    // the payload - not even in a label or a trace of metadata.
    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain(SUPPLIER_PRICE);
    expect(serialized).not.toContain(supplierPriceValue);
    expect(serialized).not.toContain(INTERNAL_CALC);
    expect(serialized).not.toContain("Marge 12 %");

    expect((await anonymous.get(`/public/documents/${publicBlobId}/content`)).status).toBe(302);
    expect((await anonymous.get(`/public/documents/${controlledBlobId}/content`)).status).toBe(404);

    // The workspace stays closed to anonymous callers.
    expect((await anonymous.get(`/dpps/${publicId}/view`)).status).toBe(401);
  });

  // --- 8. Authority reads only the controlled fields its policy allows ------
  it("8. the authority reads exactly the controlled fields its policy allows", async () => {
    const view = await authority.get<ViewPayload>(`/dpps/${publicId}/view`);
    expect(view.status).toBe(200);

    const elements = view.body.view.dpp.dataElements;
    const ids = elements.map((element) => element.elementId);
    expect(ids).toContain(SUPPLIER_PRICE);
    expect(ids).toContain(INTERNAL_REPORT);
    // Same visibility level, different policy - "controlled" is not a blanket
    // grant.
    expect(ids).not.toContain(INTERNAL_CALC);
    expect(elements.find((element) => element.elementId === SUPPLIER_PRICE)?.value).toBe(
      supplierPriceValue,
    );

    // Reading does not mean writing.
    expect((await authority.get(`/documents/${controlledBlobId}/content`)).status).toBe(302);
    const write = await authority.patch(`/dpps/${publicId}`, {
      snapshot: { dataElements: [] },
    });
    expect(write.status).toBe(403);

    // And the viewer does not see what the authority may see either.
    const asViewer = await viewer.get<ViewPayload>(`/dpps/${publicId}/view`);
    const viewerIds = asViewer.body.view.dpp.dataElements.map((element) => element.elementId);
    expect(viewerIds).toContain(RECYCLED_CONTENT);
    expect(viewerIds).not.toContain(SUPPLIER_PRICE);
    expect(viewerIds).not.toContain(INTERNAL_CALC);
  });

  // --- 9. Every read/role/rights/data change is in the audit trail ----------
  it("9. every read, role change and data change is traceable in the audit trail", async () => {
    const audit = await organization.admin.get<{
      audit: { actorUserId: string; eventType: string }[];
    }>(`/dpps/${publicId}/audit-events`);
    expect(audit.status).toBe(200);

    const events = audit.body.audit.map((entry) => entry.eventType);
    for (const expected of [
      "dpp.created",
      "dpp.updated",
      "dpp.submitted_for_review",
      "dpp.returned_to_draft",
      "dpp.published",
      "dpp.revision_created",
      "dpp.read",
    ]) {
      expect(events).toContain(expected);
    }

    // The read access from step 8 must be attributed to the authority - an
    // audit entry without an actor does not answer the question it exists to
    // answer.
    const authorityReads = audit.body.audit.filter(
      (entry) => entry.eventType === "dpp.read" && entry.actorUserId === authority.user.id,
    );
    expect(authorityReads.length).toBeGreaterThan(0);

    // Role/rights change: downgrading the editor to viewer.
    const changed = await organization.admin.patch<{
      result: { email: string; role: string; userId: string };
    }>(`/members/${editor.user.id}`, { role: "viewer" });
    expect(changed.status).toBe(200);
    // The response is the member, not an abbreviated version of it - a
    // two-field object here threw a 500 at the response boundary until this
    // was fixed for acceptance.
    expect(changed.body.result.userId).toBe(editor.user.id);
    expect(changed.body.result.role).toBe("viewer");
    expect(changed.body.result.email).toBe(editor.user.email);

    // These events attach to the organization, not to a DPP - and there is no
    // endpoint yet for organization-wide audit queries (open in M4/G25). Until
    // then, the test verifies the recording directly at its source.
    const memberEvents = await db
      .select({ eventType: auditEvents.eventType })
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.organizationId, organization.id),
          eq(auditEvents.eventType, "organization.member_updated"),
        ),
      );
    expect(memberEvents.length).toBeGreaterThan(0);

    // The downgrade takes effect immediately: the former editor can no longer write.
    const afterDowngrade = await editor.patch(`/dpps/${publicId}`, {
      snapshot: { dataElements: [] },
    });
    expect(afterDowngrade.status).toBe(403);
  });

  // --- 10. Cross-tenant, policy-bypass, bulk-extraction attempts ------------
  it("10. cross-tenant, policy-bypass and bulk-extraction attempts fail safely", async () => {
    const rival = await createOrganization("m0-rival");

    // Cross-tenant: the foreign admin is genuinely authenticated - just not a
    // member here. 404 instead of 403, so existence is not confirmed.
    expect((await rival.admin.get(`/dpps/${publicId}/view`)).status).toBe(404);
    expect(
      (await rival.admin.patch(`/dpps/${publicId}`, { snapshot: { granularity: "hijacked" } }))
        .status,
    ).toBe(404);
    expect((await rival.admin.get(`/documents/${controlledBlobId}/content`)).status).toBe(404);
    // The organization header is client-controlled; membership is verified,
    // not trusted.
    expect((await rival.admin.forOrganization(organization.id).get("/dpps")).status).toBe(403);

    // Policy bypass: the attack that would only work with the *sent* policy -
    // loosen the policy and write the value in the same patch.
    const bypassEditor = await addMember(organization, "editor");
    const bypass = await bypassEditor.patch(`/dpps/${publicId}`, {
      snapshot: {
        dataElements: [
          {
            elementId: INTERNAL_CALC,
            kind: "single",
            value: "manipuliert",
            valueDataType: "string",
            visibility: "controlled",
            policy: { readRoles: ["admin", "editor"], writeRoles: ["admin", "editor"] },
          },
        ],
      },
    });
    expect(bypass.status).toBe(403);

    const stored = await organization.admin.get<ViewPayload>(`/dpps/${publicId}/view`);
    expect(
      stored.body.view.dpp.dataElements.find((element) => element.elementId === INTERNAL_CALC)
        ?.value,
    ).toBe("Marge 12 %");

    // Bulk extraction: an oversized page size is **rejected**, not silently
    // capped. The difference is not cosmetic - with a silent cap, the caller
    // cannot tell whether it got 100 results because there only are 100, or
    // because the server answered something other than what was asked.
    const bulk = await organization.admin.get<{ messages: { path?: string }[] }>(
      "/dpps?limit=100000",
    );
    expect(bulk.status).toBe(422);
    expect(bulk.body.messages[0]?.path).toBe("limit");

    // The allowed maximum page size still works.
    const maxPage = await organization.admin.get<{ result: { dpps: unknown[] } }>(
      "/dpps?limit=100",
    );
    expect(maxPage.status).toBe(200);
    expect(maxPage.body.result.dpps.length).toBeLessThanOrEqual(100);

    // And the anonymous surface returns no list to harvest.
    expect((await anonymous.get("/public/dpps")).status).not.toBe(200);
  });
});
