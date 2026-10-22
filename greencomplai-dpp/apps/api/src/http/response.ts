import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ZodType } from "zod";

// Response schemas as an outbound boundary, not as documentation.
//
// Today a handler returns whatever its service produced. The repositories are
// careful — they pick columns by hand rather than `select()` — but that is
// convention, enforced nowhere. One forgotten column list and the next response
// carries `blob_objects.storage_key`, `organization_invitations.token`, or
// `two_factor.secret` with it. A schema makes the payload's shape a decision
// instead of an accident.
//
// Two different failures, two different answers:
//   - unknown fields are stripped (Zod's default) and logged: the boundary holds,
//     and the drift becomes visible instead of shipping quietly;
//   - a payload that does not satisfy its own schema throws. That is a server
//     bug, and a client would break on it anyway — better a loud 500 with a
//     correlation id than a malformed body the caller has to reverse-engineer.

function collectKeys(value: unknown, prefix = ""): Set<string> {
  const keys = new Set<string>();
  if (Array.isArray(value)) {
    // Array indices are noise; the interesting part is which properties the
    // elements carry.
    for (const item of value) {
      for (const key of collectKeys(item, prefix)) keys.add(key);
    }
    return keys;
  }
  if (!value || typeof value !== "object" || value instanceof Date) return keys;

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    keys.add(path);
    for (const child of collectKeys(nested, path)) keys.add(child);
  }

  return keys;
}

// Warn once per route and field set, not once per request. Several repositories
// still `select()` whole rows, so their handlers drop the same internal columns
// on every single call — logging each one would bury the interesting case (a
// field that appeared today) under thousands of copies of the boring one.
const reportedDrops = new Set<string>();

export function serializeResponse<T>(schema: ZodType<T>, value: unknown, context: string): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new Error(
      `Response for ${context} does not match its schema: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")}`,
    );
  }

  const kept = collectKeys(parsed.data);
  const dropped = [...collectKeys(value)].filter((key) => !kept.has(key));
  if (dropped.length > 0) {
    // Not silent: a field the schema does not know about is either a leak the
    // boundary just caught, or a schema that has fallen behind the payload.
    const signature = `${context}:${dropped.join(",")}`;
    if (!reportedDrops.has(signature)) {
      reportedDrops.add(signature);
      console.warn(`[response] ${context} dropped unknown field(s): ${dropped.join(", ")}`);
    }
  }

  return parsed.data;
}

// Tests need each case observed on its own; production wants one line per route.
export function resetDropReporting(): void {
  reportedDrops.clear();
}

// Sends a payload through its response schema. `key` keeps the existing envelope
// ({ result: … }, { entry: … }); success responses carry no Result object —
// EN 18222 Table 16 reserves that for failures.
export function jsonResponse<T>(
  c: Context,
  schema: ZodType<T>,
  value: unknown,
  options: { context: string; key?: string; status?: ContentfulStatusCode } = {
    context: "response",
  },
) {
  const serialized = serializeResponse(schema, value, options.context);
  const body = options.key ? { [options.key]: serialized } : serialized;

  return c.json(body, options.status ?? 200);
}
