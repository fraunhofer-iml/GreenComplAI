// First, and on its own line: the module body below runs only after every
// import has been evaluated, and `config.ts` reads `process.env` while it is
// being evaluated. Loading the files from here would be too late.
import "./load-env.js";

import { serve } from "@hono/node-server";

import { app } from "./app.js";
import { env } from "./config.js";
import { startWorker, stopWorker } from "./worker.js";

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`DPP API listening on http://localhost:${info.port}`);
  },
);

// A failing worker must not take the API down with it: serving passports matters
// more than sweeping orphans.
startWorker().catch((error) => console.error("[worker] Failed to start", error));

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void stopWorker().finally(() => process.exit(0));
  });
}
