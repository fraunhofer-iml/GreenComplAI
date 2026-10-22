import { S3Client } from "@aws-sdk/client-s3";

import { env } from "./config.js";

const credentials = {
  accessKeyId: env.S3_ACCESS_KEY_ID,
  secretAccessKey: env.S3_SECRET_ACCESS_KEY,
};

// S3-compatible object storage client (MinIO in local dev). forcePathStyle is
// required for MinIO and most non-AWS gateways.
export const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  credentials,
  forcePathStyle: true,
});

// Presigned URLs are handed to a browser, so they must name a host the browser
// can reach - which is not necessarily the one the API talks to. In a deployment
// where object storage sits on an internal network behind a public gateway, the
// two differ, and signing against the internal endpoint would produce links that
// resolve nowhere. Signing builds a URL without any network call, so a second
// client configured with the public endpoint is enough; where the endpoints are
// the same (local dev) this is the same client twice.
export const s3Presigner =
  env.S3_PUBLIC_ENDPOINT === env.S3_ENDPOINT
    ? s3
    : new S3Client({
        endpoint: env.S3_PUBLIC_ENDPOINT,
        region: env.S3_REGION,
        credentials,
        forcePathStyle: true,
      });
