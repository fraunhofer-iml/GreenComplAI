import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { pingDatabase } from "@dpp/db";

import { env } from "../config.js";
import { db } from "../db.js";
import { s3 } from "../storage.js";

export type DependencyState = "up" | "down";

export type ReadinessReport = {
  ok: boolean;
  database: DependencyState;
  storage: DependencyState;
};

// Probes the dependencies the API needs to serve traffic (database and object
// storage). Used by the /ready endpoint for orchestrator readiness gating.
export async function checkReadiness(): Promise<ReadinessReport> {
  const [database, storage] = await Promise.all([probeDatabase(), probeStorage()]);
  return { ok: database === "up" && storage === "up", database, storage };
}

async function probeDatabase(): Promise<DependencyState> {
  try {
    await pingDatabase(db);
    return "up";
  } catch {
    return "down";
  }
}

async function probeStorage(): Promise<DependencyState> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }));
    return "up";
  } catch {
    return "down";
  }
}
