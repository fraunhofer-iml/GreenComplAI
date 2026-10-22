import PgBoss from "pg-boss";

import { env } from "./config.js";
import { cleanupOrphanBlobsForAllOrganizations } from "./services/blob-cleanup.js";

const BLOB_CLEANUP_QUEUE = "blobs.cleanup-orphans";

// Background jobs, backed by pg-boss on the same Postgres (no extra broker to
// operate for a self-hosted instance). Opt-in via WORKER_ENABLED so that scaling
// the API to several replicas does not run every job once per replica — pg-boss
// would still hand a job to exactly one worker, but the schedule is best kept in
// a single, deliberate place.
let boss: PgBoss | undefined;

export async function startWorker(): Promise<void> {
  if (!env.WORKER_ENABLED) return;

  boss = new PgBoss({ connectionString: env.DATABASE_URL });
  boss.on("error", (error) => console.error("[worker] pg-boss error", error));

  await boss.start();
  await boss.createQueue(BLOB_CLEANUP_QUEUE);

  await boss.work(BLOB_CLEANUP_QUEUE, async () => {
    const summaries = await cleanupOrphanBlobsForAllOrganizations();
    const deleted = summaries.reduce((total, summary) => total + summary.deleted, 0);
    // Logged even at zero: silence is indistinguishable from a worker that never
    // ran, which is exactly the failure this job would have.
    console.info(
      `[worker] Orphan sweep done: ${deleted} blob(s) deleted across ${summaries.length} organization(s)`,
    );
  });

  await boss.schedule(BLOB_CLEANUP_QUEUE, env.BLOB_CLEANUP_CRON);
  console.info(`[worker] Started; orphan sweep scheduled at "${env.BLOB_CLEANUP_CRON}"`);
}

export async function stopWorker(): Promise<void> {
  await boss?.stop({ graceful: true });
  boss = undefined;
}
