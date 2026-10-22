import { beforeAll, describe, expect, it } from "vitest";

import {
  addMember,
  anonymous,
  createOrganization,
  type OrganizationFixture,
  type TestClient,
} from "./helpers/client.js";
import { createDraftDpp, publishDpp } from "./helpers/dpp.js";

type BlobMetadata = { checksum: string; contentType: string; id: string; size: number };

const PDF_BYTES = new Uint8Array([
  0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a,
]);

function upload(client: TestClient, bytes: Uint8Array, filename: string, contentType: string) {
  const form = new FormData();
  form.append("file", new File([bytes as BufferSource], filename, { type: contentType }));
  return client.sendRaw<{ result: BlobMetadata }>("POST", "/documents", form);
}

const documentElement = (blobObjectId: string, visibility: "public" | "controlled") => ({
  elementId: "datasheet",
  kind: "document" as const,
  blobObjectId,
  filename: "datasheet.pdf",
  contentType: "application/pdf",
  visibility,
  ...(visibility === "controlled"
    ? { policy: { readRoles: ["admin"], writeRoles: ["admin"] } }
    : {}),
});

// Runs against the real MinIO: the upload is stored, the download is a presigned
// redirect that is actually followed. Everything below the API — bucket, keys,
// signatures — is exercised, not stubbed.
describe("document upload and download", () => {
  let organization: OrganizationFixture;
  let viewer: TestClient;

  beforeAll(async () => {
    organization = await createOrganization("blob");
    viewer = await addMember(organization, "viewer");
  });

  describe("upload", () => {
    it("stores a PDF and reports size and checksum", async () => {
      const response = await upload(
        organization.admin,
        PDF_BYTES,
        "datasheet.pdf",
        "application/pdf",
      );

      expect(response.status).toBe(201);
      expect(response.body.result.size).toBe(PDF_BYTES.byteLength);
      expect(response.body.result.checksum).toMatch(/^sha256:[0-9a-f]{64}$/);
    });

    it("rejects an executable claiming to be a PDF", async () => {
      const executable = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03]);

      const response = await upload(organization.admin, executable, "evil.pdf", "application/pdf");

      expect(response.status).toBe(415);
    });

    it("rejects a disallowed content type", async () => {
      const response = await upload(
        organization.admin,
        new TextEncoder().encode("<html></html>"),
        "page.html",
        "text/html",
      );

      expect(response.status).toBe(415);
    });

    it("does not let a viewer upload", async () => {
      const response = await upload(viewer, PDF_BYTES, "datasheet.pdf", "application/pdf");

      expect(response.status).toBe(403);
    });
  });

  describe("authenticated download", () => {
    it("redirects the uploader to a presigned URL that serves the bytes", async () => {
      const uploaded = await upload(
        organization.admin,
        PDF_BYTES,
        "datasheet.pdf",
        "application/pdf",
      );
      const blobId = uploaded.body.result.id;

      const download = await organization.admin.get(`/documents/${blobId}/content`);
      expect(download.status).toBe(302);

      // Follow the presigned URL for real: asserting only on the 302 would pass
      // just as happily for a URL nobody can fetch.
      const location = download.headers.get("location");
      expect(location).toBeTruthy();

      const stored = await fetch(location!);
      expect(stored.status).toBe(200);
      expect(new Uint8Array(await stored.arrayBuffer())).toEqual(PDF_BYTES);
      expect(stored.headers.get("content-disposition")).toContain("attachment");
    });

    // The path the UI takes: a link in the browser cannot send the
    // organization header, so it fetches the presigned URL as a payload
    // and only then navigates there.
    it("hands out the presigned URL as a payload and applies the same policy", async () => {
      const uploaded = await upload(
        organization.admin,
        PDF_BYTES,
        "datasheet.pdf",
        "application/pdf",
      );
      const blobId = uploaded.body.result.id;

      const response = await organization.admin.get(`/documents/${blobId}/download-url`);
      expect(response.status).toBe(200);
      expect(response.body.result.expiresIn).toBeGreaterThan(0);

      const stored = await fetch(response.body.result.url as string);
      expect(stored.status).toBe(200);
      expect(new Uint8Array(await stored.arrayBuffer())).toEqual(PDF_BYTES);

      const other = await createOrganization("blob-url-rival");
      expect((await other.admin.get(`/documents/${blobId}/download-url`)).status).toBe(404);
    });

    it("hides a blob from another tenant", async () => {
      const uploaded = await upload(
        organization.admin,
        PDF_BYTES,
        "datasheet.pdf",
        "application/pdf",
      );
      const other = await createOrganization("blob-rival");

      const response = await other.admin.get(`/documents/${uploaded.body.result.id}/content`);

      expect(response.status).toBe(404);
    });

    it("hides a blob on a controlled element from a viewer", async () => {
      const uploaded = await upload(organization.admin, PDF_BYTES, "secret.pdf", "application/pdf");
      const blobId = uploaded.body.result.id;
      await createDraftDpp(organization.admin, {
        dataElements: [documentElement(blobId, "controlled")],
      });

      // Not merely tenant-scoped: the element policy decides, so knowing the id
      // is not enough (G10/G5).
      const response = await viewer.get(`/documents/${blobId}/content`);

      expect(response.status).toBe(404);
    });

    it("lets a viewer download a blob on a public element", async () => {
      const uploaded = await upload(organization.admin, PDF_BYTES, "public.pdf", "application/pdf");
      const blobId = uploaded.body.result.id;
      await createDraftDpp(organization.admin, {
        dataElements: [documentElement(blobId, "public")],
      });

      const response = await viewer.get(`/documents/${blobId}/content`);

      expect(response.status).toBe(302);
    });
  });

  describe("public release", () => {
    it("keeps an upload private until a publish releases it", async () => {
      const uploaded = await upload(
        organization.admin,
        PDF_BYTES,
        "datasheet.pdf",
        "application/pdf",
      );
      const blobId = uploaded.body.result.id;

      const beforeAnyDpp = await anonymous.get(`/public/documents/${blobId}/content`);
      expect(beforeAnyDpp.status).toBe(404);

      const dpp = await createDraftDpp(organization.admin, {
        dataElements: [documentElement(blobId, "public")],
      });

      // Referenced by a draft is still not published.
      const beforePublish = await anonymous.get(`/public/documents/${blobId}/content`);
      expect(beforePublish.status).toBe(404);

      await publishDpp(organization.admin, dpp.publicId);

      const afterPublish = await anonymous.get(`/public/documents/${blobId}/content`);
      expect(afterPublish.status).toBe(302);
    });

    it("never releases a blob on a controlled element", async () => {
      const uploaded = await upload(organization.admin, PDF_BYTES, "secret.pdf", "application/pdf");
      const blobId = uploaded.body.result.id;
      const dpp = await createDraftDpp(organization.admin, {
        dataElements: [documentElement(blobId, "controlled")],
      });
      await publishDpp(organization.admin, dpp.publicId);

      const response = await anonymous.get(`/public/documents/${blobId}/content`);

      expect(response.status).toBe(404);
    });

    it("revokes public access when the DPP is archived", async () => {
      const uploaded = await upload(
        organization.admin,
        PDF_BYTES,
        "datasheet.pdf",
        "application/pdf",
      );
      const blobId = uploaded.body.result.id;
      const dpp = await createDraftDpp(organization.admin, {
        dataElements: [documentElement(blobId, "public")],
      });
      await publishDpp(organization.admin, dpp.publicId);
      expect((await anonymous.get(`/public/documents/${blobId}/content`)).status).toBe(302);

      await organization.admin.put(`/dpps/${dpp.publicId}/status`, { status: "archived" });

      // isPublic is derived from the public projections, so archiving withdraws
      // the file the moment it withdraws the passport.
      const response = await anonymous.get(`/public/documents/${blobId}/content`);
      expect(response.status).toBe(404);
    });
  });
});
