import { createHash, randomBytes, scrypt } from "node:crypto";

import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import postgres from "postgres";

import { assertSafeDemoSeed } from "./seed-policy.js";

import type { DppSnapshot } from "@dpp/domain";

import { buildPublicProjection } from "./repositories/dpps.js";
import {
  demoBlobObjects,
  demoDictionaryEntries,
  demoDictionaryRepository,
  demoDpps,
  demoPublicId,
  demoDppVersionsByDigitalId,
  demoEconomicOperators,
  demoOrganization,
  demoProducts,
  demoRelationshipsByDppId,
} from "../../../apps/api/src/services/demo.js";

assertSafeDemoSeed(process.env);

const databaseUrl = process.env.DATABASE_URL ?? "postgres://dpp:dpp@localhost:5432/dpp";
// Named: seed the example data into an organization that already exists,
// instead of creating the demo tenant and its demo admin. That is the mode
// install.sh uses for --with-demo-data: a customer installation must not
// receive an account whose password is published in this repository.
const targetOrganizationId = process.env.SEED_ORGANIZATION_ID;
const demoAdminEmail = process.env.DEMO_ADMIN_EMAIL ?? "demo.admin@example.com";
const demoAdminName = process.env.DEMO_ADMIN_NAME ?? "Demo Admin";
const demoAdminPassword = process.env.DEMO_ADMIN_PASSWORD ?? "DemoAdmin123!";
// Same defaults as the API's config, so a plain `pnpm db:seed` against the
// local docker-compose stack finds the bucket without any env.
const s3Bucket = process.env.S3_BUCKET ?? "dpp";
const client = postgres(databaseUrl, { max: 1, onnotice: () => undefined });

await client.begin(async (tx) => {
  const toJson = (value: unknown) => tx.json(value as Parameters<typeof tx.json>[0]);

  let organizationId: string;

  if (targetOrganizationId) {
    const [existing] = await tx`
      select id from organizations where id = ${targetOrganizationId}
    `;
    if (!existing) throw new Error(`No organization ${targetOrganizationId} to seed into`);
    organizationId = existing.id as string;
  } else {
    await tx`
      delete from organizations
      where slug = ${demoOrganization.slug}
        and id <> ${demoOrganization.id}
    `;

    // Conflict on **id**, not on slug: the demo tenant has a fixed id, and its
    // slug may change. Resolving on the slug would mean a renamed demo tenant
    // fails on the primary key at the next seed.
    const [organization] = await tx`
      insert into organizations (id, name, slug)
      values (${demoOrganization.id}, ${demoOrganization.name}, ${demoOrganization.slug})
      on conflict (id)
      do update set name = excluded.name, slug = excluded.slug, updated_at = now()
      returning id
    `;
    if (!organization) throw new Error("Could not seed demo organization");
    organizationId = organization.id as string;

    await seedDemoAdmin(tx, organizationId);
  }

  // The files behind the demo's document elements. Upserted by id rather than
  // deleted and re-inserted: the id is derived from the element, so a re-seed
  // refreshes the row and keeps pointing at the object already in the bucket.
  for (const blob of demoBlobObjects) {
    await tx`
      insert into blob_objects (
        id,
        organization_id,
        storage_key,
        filename,
        content_type,
        size,
        checksum,
        is_public,
        created_by
      )
      values (
        ${blob.id},
        ${organizationId},
        ${demoStorageKey(organizationId, blob.id)},
        ${blob.filename},
        ${blob.contentType},
        ${blob.content.byteLength},
        ${demoChecksum(blob.content)},
        ${blob.isPublic},
        ${"demo-admin"}
      )
      on conflict (id)
      do update set
        organization_id = excluded.organization_id,
        storage_key = excluded.storage_key,
        filename = excluded.filename,
        content_type = excluded.content_type,
        size = excluded.size,
        checksum = excluded.checksum,
        is_public = excluded.is_public
    `;
  }

  // Clear first, then set anew: the demo dataset is a fixed statement, not
  // state that accumulates across runs. Without this, after a change to the
  // demo domain the old data would sit next to the new one - two
  // dictionaries, two product worlds, and no way to tell which is meant.
  //
  // Order follows the foreign keys: relationships before passports, entries
  // before dictionaries. Only the demo tenant is affected.
  await tx`delete from dpp_relationships where organization_id = ${organizationId}`;
  await tx`delete from dpps where organization_id = ${organizationId}`;
  await tx`delete from data_dictionary_entries where organization_id = ${organizationId}`;
  await tx`delete from data_dictionary_repositories where organization_id = ${organizationId}`;
  await tx`delete from economic_operators where organization_id = ${organizationId}`;
  await tx`delete from products where organization_id = ${organizationId}`;

  for (const product of demoProducts) {
    const [row] = await tx`
      insert into products (
        organization_id,
        product_id,
        name,
        category,
        manufacturer_product_id,
        lifecycle_status,
        metadata
      )
      values (
        ${organizationId},
        ${product.productId},
        ${toJson(product.name)},
        ${product.category ?? null},
        ${product.manufacturerProductId ?? null},
        ${product.lifecycleStatus},
        ${toJson(product.metadata ?? null)}
      )
      returning id
    `;
    if (!row) throw new Error(`Could not seed demo product ${product.productId}`);

    for (const [identifierType, identifierValue] of Object.entries(product.identifiers ?? {})) {
      await tx`
        insert into product_identifiers (product_id, identifier_type, identifier_value, issuer)
        values (${row.id as string}, ${identifierType}, ${identifierValue}, 'demo')
        on conflict (product_id, identifier_type, identifier_value) do nothing
      `;
    }
  }

  for (const operator of demoEconomicOperators) {
    await tx`
      insert into economic_operators (
        organization_id,
        operator_id,
        legal_name,
        roles,
        country_code,
        vat_id,
        address,
        metadata
      )
      values (
        ${organizationId},
        ${operator.operatorId},
        ${operator.legalName},
        ${toJson(operator.roles)},
        ${operator.countryCode ?? null},
        ${operator.vatId ?? null},
        ${toJson(operator.address ?? null)},
        ${toJson(operator.metadata ?? null)}
      )
      on conflict (organization_id, operator_id)
      do update set
        legal_name = excluded.legal_name,
        roles = excluded.roles,
        country_code = excluded.country_code,
        vat_id = excluded.vat_id,
        address = excluded.address,
        metadata = excluded.metadata,
        updated_at = now()
    `;
  }

  const [repository] = await tx`
    insert into data_dictionary_repositories (
      organization_id,
      repository_key,
      name,
      namespace_uri,
      version,
      publisher,
      status,
      metadata
    )
    values (
      ${organizationId},
      ${demoDictionaryRepository.repositoryKey},
      ${toJson(demoDictionaryRepository.name)},
      ${demoDictionaryRepository.namespaceUri},
      ${demoDictionaryRepository.version},
      ${demoDictionaryRepository.publisher},
      ${demoDictionaryRepository.status},
      ${toJson(demoDictionaryRepository.metadata)}
    )
    -- The unique index covers three columns: since dictionaries became
    -- versioned, the same key exists once per version. With two columns
    -- Postgres finds no matching index and rejects the upsert.
    on conflict (organization_id, repository_key, version)
    do update set
      name = excluded.name,
      namespace_uri = excluded.namespace_uri,
      version = excluded.version,
      publisher = excluded.publisher,
      status = excluded.status,
      metadata = excluded.metadata,
      updated_at = now()
    returning id
  `;
  if (!repository) throw new Error("Could not seed demo dictionary repository");

  for (const entry of demoDictionaryEntries) {
    await tx`
      insert into data_dictionary_entries (
        organization_id,
        repository_id,
        entry_key,
        external_id,
        canonical_uri,
        version,
        name,
        description,
        value_type,
        unit,
        required,
        visibility,
        standard_reference,
        allowed_values,
        validation_rules,
        metadata
      )
      values (
        ${organizationId},
        ${repository.id},
        ${entry.entryKey},
        ${entry.externalId},
        ${entry.canonicalUri},
        ${entry.version},
        ${toJson(entry.name)},
        ${toJson(entry.description)},
        ${entry.valueType},
        ${entry.unit ?? null},
        ${entry.required},
        ${entry.visibility},
        ${entry.standardReference},
        ${toJson(entry.allowedValues)},
        ${toJson(entry.validationRules)},
        ${toJson(entry.metadata)}
      )
      -- (organization_id, entry_key) is only a lookup index, not a unique
      -- one: the same key may occur in two dictionaries of the same
      -- organization. It is unique per dictionary.
      on conflict (repository_id, entry_key)
      do update set
        repository_id = excluded.repository_id,
        external_id = excluded.external_id,
        canonical_uri = excluded.canonical_uri,
        version = excluded.version,
        name = excluded.name,
        description = excluded.description,
        value_type = excluded.value_type,
        unit = excluded.unit,
        required = excluded.required,
        visibility = excluded.visibility,
        standard_reference = excluded.standard_reference,
        allowed_values = excluded.allowed_values,
        validation_rules = excluded.validation_rules,
        metadata = excluded.metadata,
        updated_at = now()
    `;
  }

  for (const dpp of Object.values(demoDpps)) {
    await tx`
      insert into dpps (
        organization_id,
        digital_product_passport_id,
        public_id,
        version_label,
        product_id,
        granularity,
        dpp_schema_version,
        status,
        last_update,
        economic_operator_id,
        facility_id,
        current_snapshot,
        public_projection
      )
      values (
        ${organizationId},
        ${dpp.digitalProductPassportId},
        ${demoPublicId(dpp.digitalProductPassportId)},
        ${"2026.1"},
        ${dpp.productId},
        ${dpp.granularity},
        ${dpp.dppSchemaVersion},
        ${dpp.status},
        ${dpp.lastUpdate},
        ${dpp.economicOperatorId},
        ${dpp.facilityId ?? null},
        ${toJson(dpp)},
        ${null}
      )
      on conflict (digital_product_passport_id)
      do update set
        public_id = excluded.public_id,
        product_id = excluded.product_id,
        granularity = excluded.granularity,
        dpp_schema_version = excluded.dpp_schema_version,
        status = excluded.status,
        last_update = excluded.last_update,
        economic_operator_id = excluded.economic_operator_id,
        facility_id = excluded.facility_id,
        current_snapshot = excluded.current_snapshot,
        public_projection = excluded.public_projection,
        updated_at = now()
    `;
  }
});

const [organization] = targetOrganizationId
  ? await client`select id from organizations where id = ${targetOrganizationId}`
  : await client`select id from organizations where slug = ${demoOrganization.slug}`;
if (!organization) throw new Error("Could not load seeded organization");
const organizationId = organization.id as string;

const seededDpps = await client<Array<{ id: string; digital_product_passport_id: string }>>`
  select id, digital_product_passport_id
  from dpps
  where organization_id = ${organizationId}
`;

const dppsByDigitalId = new Map(seededDpps.map((dpp) => [dpp.digital_product_passport_id, dpp.id]));

for (const [sourceDigitalProductPassportId, relationships] of Object.entries(
  demoRelationshipsByDppId,
)) {
  const sourceDppId = dppsByDigitalId.get(sourceDigitalProductPassportId);
  if (!sourceDppId) continue;

  for (const relationship of relationships) {
    await client`
      insert into dpp_relationships (
        organization_id,
        source_dpp_id,
        target_dpp_id,
        target_digital_product_passport_id,
        target_product_id,
        relationship_type,
        visibility,
        valid_from,
        valid_to,
        metadata
      )
      values (
        ${organizationId},
        ${sourceDppId},
        ${dppsByDigitalId.get(relationship.targetDigitalProductPassportId) ?? null},
        ${relationship.targetDigitalProductPassportId},
        ${relationship.targetProductId},
        ${relationship.relationshipType},
        ${relationship.visibility},
        ${relationship.validFrom},
        ${relationship.validTo},
        ${client.json(relationship.metadata as Parameters<typeof client.json>[0])}
      )
      on conflict (organization_id, source_dpp_id, relationship_type, target_digital_product_passport_id)
      do update set
        target_dpp_id = excluded.target_dpp_id,
        target_product_id = excluded.target_product_id,
        visibility = excluded.visibility,
        valid_from = excluded.valid_from,
        valid_to = excluded.valid_to,
        metadata = excluded.metadata,
        updated_at = now()
    `;
  }
}

// Seed an authoring history so seeded DPPs (e.g. the frame passport) have a
// timeline. created_by = the demo admin user id written by seedDemoAdmin.
for (const [digitalId, versions] of Object.entries(demoDppVersionsByDigitalId)) {
  const dppId = dppsByDigitalId.get(digitalId);
  if (!dppId) continue;

  await client`delete from dpp_versions where dpp_id = ${dppId}`;
  await client`update dpps set active_version_id = null where id = ${dppId}`;
  let activeVersionId: string | undefined;
  let activeSnapshot: unknown;
  for (const version of versions) {
    const [row] = await client<Array<{ id: string }>>`
      insert into dpp_versions (dpp_id, version_number, version_label, status, snapshot, created_by, created_at)
      values (
        ${dppId},
        ${version.versionNumber},
        ${version.versionLabel},
        ${version.status},
        ${client.json(version.snapshot as Parameters<typeof client.json>[0])},
        ${"demo-admin"},
        ${version.createdAt}
      )
      returning id
    `;
    if (version.status === "published" && row) {
      activeVersionId = row.id;
      activeSnapshot = version.snapshot;
    }
  }
  if (activeVersionId) {
    // The projection is what a publish writes, and `blob_objects.is_public` is
    // recomputed from it on every status change. Leaving it null would let the
    // next transition in the demo tenant revoke the demo documents.
    await client`
      update dpps
      set active_version_id = ${activeVersionId},
          public_projection = ${client.json(
            buildPublicProjection(activeSnapshot as DppSnapshot) as Parameters<
              typeof client.json
            >[0],
          )}
      where id = ${dppId}
    `;
  }
}

await seedDemoBlobStorage(organizationId);

console.log(`Seeded demo organization ${demoOrganization.slug} (${organizationId})`);
console.log(`Seeded demo admin ${demoAdminEmail} with password ${demoAdminPassword}`);
await client.end();

async function seedDemoAdmin(tx: postgres.TransactionSql, organizationId: string) {
  const demoAdminUserId = "demo-admin";
  const passwordHash = await hashPassword(demoAdminPassword);

  await tx`
    insert into "user" (id, name, email, email_verified)
    values (${demoAdminUserId}, ${demoAdminName}, ${demoAdminEmail}, true)
    on conflict (email)
    do update set
      name = excluded.name,
      email_verified = true,
      updated_at = now()
  `;

  const [user] = await tx<{ id: string }[]>`
    select id from "user" where email = ${demoAdminEmail}
  `;
  if (!user) throw new Error("Could not seed demo admin user");

  await tx`
    insert into account (
      id,
      account_id,
      provider_id,
      user_id,
      password
    )
    values (
      ${`${user.id}-credential`},
      ${user.id},
      ${"credential"},
      ${user.id},
      ${passwordHash}
    )
    on conflict (provider_id, account_id)
    do update set
      password = excluded.password,
      updated_at = now()
  `;

  await tx`
    insert into organization_memberships (
      organization_id,
      user_id,
      role,
      status
    )
    values (
      ${organizationId},
      ${user.id},
      ${"admin"},
      ${"active"}
    )
    on conflict (organization_id, user_id)
    do update set
      role = excluded.role,
      status = excluded.status,
      updated_at = now()
  `;
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await derivePasswordKey(password, salt);
  return `${salt}:${key.toString("hex")}`;
}

function derivePasswordKey(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      64,
      {
        N: 16384,
        maxmem: 128 * 16384 * 16 * 2,
        p: 1,
        r: 16,
      },
      (error, key) => {
        if (error) reject(error);
        else resolve(key);
      },
    );
  });
}
function demoStorageKey(organizationId: string, blobId: string): string {
  return `org/${organizationId}/blobs/${blobId}`;
}

function demoChecksum(content: Buffer): string {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

// The blob rows are only half the file: without the object in the bucket the
// viewer hands out a presigned URL that resolves to nothing. Storage failures
// stay warnings - a seed that only needs the database (CI, a fresh checkout
// without MinIO) should not fail over documents nobody is going to download.
async function seedDemoBlobStorage(organizationId: string) {
  if (demoBlobObjects.length === 0) return;

  const s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
    region: process.env.S3_REGION ?? "local",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "minio",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "minio123",
    },
    forcePathStyle: true,
  });

  try {
    try {
      await s3.send(new HeadBucketCommand({ Bucket: s3Bucket }));
    } catch {
      await s3.send(new CreateBucketCommand({ Bucket: s3Bucket }));
    }

    for (const blob of demoBlobObjects) {
      await s3.send(
        new PutObjectCommand({
          Bucket: s3Bucket,
          Key: demoStorageKey(organizationId, blob.id),
          Body: blob.content,
          ContentType: blob.contentType,
        }),
      );
    }

    console.log(`Seeded ${demoBlobObjects.length} demo document(s) into bucket ${s3Bucket}`);
  } catch (cause) {
    console.warn(
      `Could not store the demo documents in object storage (${String(cause)}). ` +
        "The passport still resolves; its document downloads will not.",
    );
  } finally {
    s3.destroy();
  }
}
