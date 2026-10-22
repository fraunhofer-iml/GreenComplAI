import { zValidator as baseValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import type { ZodSchema } from "zod";

import { validationResult } from "./result.js";

// zValidator's default rejection is Zod's raw error object — neither the norm's
// Result envelope nor anything a form can put next to an input. This wraps it so
// a bad request answers like every other failure does, with one message per
// offending field .
//
// 422, not 400: the request parsed fine, its contents are what the server
// refuses. 400 is reserved for a request it could not read at all.
export function zValidator<T extends ZodSchema, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T,
) {
  return baseValidator(target, schema, (outcome, c) => {
    if (!outcome.success) {
      return c.json(validationResult(outcome.error), 422);
    }

    return undefined;
  });
}
