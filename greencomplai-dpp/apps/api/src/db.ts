import { createDb } from "@dpp/db";

import { env } from "./config.js";

export const db = createDb(env.DATABASE_URL);
