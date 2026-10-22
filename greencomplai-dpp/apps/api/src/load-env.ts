import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { config as loadEnvFiles } from "dotenv";

// Where the process looks for a `.env`.
//
// The file an operator creates sits at the repository root, this process starts
// in `apps/api`, and `dotenv/config` only ever looks in the working directory -
// so the file the README tells people to create was read by nothing, and every
// setting that has a development default silently kept it.
//
// Nearest first: a value set for this app wins over the shared one, and neither
// overwrites a variable the environment already carries. That last part is what
// keeps a deployment that passes real secrets as environment variables immune
// to a stray `.env` left behind in the image.
loadEnvFiles({
  quiet: true,
  path: [".env", "../.env", "../../.env"]
    .map((candidate) => resolve(process.cwd(), candidate))
    .filter((candidate) => existsSync(candidate)),
});
