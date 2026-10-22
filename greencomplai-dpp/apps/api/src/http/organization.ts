import type { Context } from "hono";

import type { AppBindings } from "./context.js";
import { getRequiredOrganizationId } from "./context.js";
import { jsonError } from "./result.js";

export function getOrganizationOrError(c: Context<AppBindings>) {
  try {
    return getRequiredOrganizationId(c);
  } catch {
    jsonError(c, "Missing organization context", {
      code: "ORGANIZATION_REQUIRED",
      status: 400,
    });
    return undefined;
  }
}
