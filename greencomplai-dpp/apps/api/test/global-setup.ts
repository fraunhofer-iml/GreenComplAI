import { CreateBucketCommand, HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { runMigrations } from "@dpp/db/migrations";
import postgres from "postgres";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://dpp:dpp@localhost:5432/dpp_test";
const TEST_S3_ENDPOINT = process.env.TEST_S3_ENDPOINT ?? "http://localhost:9000";
const TEST_S3_BUCKET = "dpp-test";

// Creates the throwaway test database (dropping any leftover from a previous
// run) and brings it up to the current schema by applying the real migrations —
// so the suite also proves the migrations themselves apply cleanly from zero,
// which is one of the things SPEC.md's database tests ask for.
export async function setup() {
  const url = new URL(TEST_DATABASE_URL);
  const databaseName = url.pathname.slice(1);
  if (!databaseName)
    throw new Error(`TEST_DATABASE_URL has no database name: ${TEST_DATABASE_URL}`);

  const adminUrl = new URL(TEST_DATABASE_URL);
  adminUrl.pathname = "/postgres";

  const admin = postgres(adminUrl.toString(), { max: 1, onnotice: () => undefined });
  try {
    // A stale database from an aborted run would hide missing migrations behind
    // an already-correct schema.
    await admin.unsafe(`drop database if exists "${databaseName}" with (force)`);
    await admin.unsafe(`create database "${databaseName}"`);
  } finally {
    await admin.end();
  }

  const applied = await runMigrations(TEST_DATABASE_URL);
  if (applied.length === 0) {
    throw new Error("Expected the migrations to build the test schema from scratch, but none ran");
  }

  await ensureBucket();
}

// The bucket survives between runs (unlike the database): object keys are random
// per upload, so leftovers cannot collide with a later run.
async function ensureBucket() {
  const s3 = new S3Client({
    endpoint: TEST_S3_ENDPOINT,
    region: "local",
    credentials: { accessKeyId: "minio", secretAccessKey: "minio123" },
    forcePathStyle: true,
  });

  try {
    await s3.send(new HeadBucketCommand({ Bucket: TEST_S3_BUCKET }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: TEST_S3_BUCKET }));
  } finally {
    s3.destroy();
  }
}
