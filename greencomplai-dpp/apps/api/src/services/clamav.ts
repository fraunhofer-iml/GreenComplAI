import { connect } from "node:net";

import { env } from "../config.js";

// Minimal clamd client speaking the INSTREAM command over TCP. A dedicated
// library would add a dependency for ~60 lines of a stable, documented protocol.
//
// INSTREAM: send `zINSTREAM\0`, then length-prefixed chunks (4-byte big-endian),
// then a zero-length chunk to end. clamd answers with one line, terminated by a
// NUL because the command was sent in "z" mode.

export type ScanVerdict =
  | { status: "clean" }
  | { status: "infected"; signature: string }
  | { status: "unavailable"; reason: string };

const CHUNK_SIZE = 64 * 1024;

export async function scanWithClamav(bytes: Uint8Array): Promise<ScanVerdict> {
  if (!env.CLAMAV_HOST) return { status: "unavailable", reason: "not-configured" };

  try {
    const reply = await instream(bytes, env.CLAMAV_HOST, env.CLAMAV_PORT, env.CLAMAV_TIMEOUT_MS);
    return interpret(reply);
  } catch (error) {
    return {
      status: "unavailable",
      reason: error instanceof Error ? error.message : "scan failed",
    };
  }
}

// `stream: OK` / `stream: Eicar-Test-Signature FOUND` / `... ERROR`
export function interpret(reply: string): ScanVerdict {
  const line = reply.replace(/\0/g, "").trim();

  if (line.endsWith("OK")) return { status: "clean" };
  if (line.endsWith("FOUND")) {
    const signature = line.replace(/^stream:\s*/, "").replace(/\s*FOUND$/, "");
    return { status: "infected", signature: signature || "unknown" };
  }

  // Anything else (including ERROR and size limits) is not a clean verdict, but
  // neither is it proof of infection — the caller decides how strict to be.
  return { status: "unavailable", reason: line || "empty reply" };
}

function instream(
  bytes: Uint8Array,
  host: string,
  port: number,
  timeoutMs: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = connect({ host, port });
    let reply = "";

    socket.setTimeout(timeoutMs, () => {
      socket.destroy();
      reject(new Error(`clamd timed out after ${timeoutMs}ms`));
    });
    socket.on("error", reject);
    socket.on("data", (chunk) => {
      reply += chunk.toString("utf8");
    });
    socket.on("close", () => resolve(reply));

    socket.on("connect", () => {
      socket.write("zINSTREAM\0");

      for (let offset = 0; offset < bytes.byteLength; offset += CHUNK_SIZE) {
        const chunk = bytes.subarray(offset, Math.min(offset + CHUNK_SIZE, bytes.byteLength));
        const header = Buffer.alloc(4);
        header.writeUInt32BE(chunk.byteLength, 0);
        socket.write(header);
        socket.write(chunk);
      }

      // Zero-length chunk ends the stream.
      socket.write(Buffer.alloc(4));
    });
  });
}
