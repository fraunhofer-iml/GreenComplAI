// Postgres error codes that say something about the request, not the server.
//
// The code is not always on the thrown error itself: Drizzle wraps driver
// errors (`DrizzleQueryError`) and attaches the original one to `cause`. A
// check that only looks at the top level misses it - and a unique-constraint
// violation that should be a 409 turns into a 500.
//
// That is exactly what happened: the check in `services/dpps.ts` only looked
// at the top level. It only surfaced here because a duplicate service-account
// name is easy to trigger - the collision of two generated URNs there
// practically never is.

const UNIQUE_VIOLATION = "23505";

export function isUniqueViolation(error: unknown): boolean {
  return hasCode(error, UNIQUE_VIOLATION);
}

function hasCode(error: unknown, code: string, depth = 0): boolean {
  // A cause chain is short; the bound only guards against a cycle.
  if (depth > 5 || typeof error !== "object" || error === null) return false;

  if ((error as { code?: unknown }).code === code) return true;

  return hasCode((error as { cause?: unknown }).cause, code, depth + 1);
}
