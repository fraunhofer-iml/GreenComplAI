import { execFileSync } from "node:child_process";

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0");
const forbidden = files.filter((file) => {
  const parts = file.split("/");
  const name = parts.at(-1);
  return (
    (name !== ".env.example" && /^\.env(?:\.|$)/.test(name)) ||
    /\.(?:pem|key|p12|pfx)$/i.test(name) ||
    [".npmrc", ".netrc", "credentials.json"].includes(name) ||
    /service-account.*\.json$/i.test(name) ||
    parts.some((part) => [".aws", ".ssh", "backups", "dumps", "norm"].includes(part))
  );
});

if (forbidden.length) {
  console.error("Remove local credentials or operational files from the publication:");
  for (const file of forbidden) console.error(`  ${file}`);
  process.exitCode = 1;
} else {
  console.log(
    "Tracked files contain no local environment files, key files or operational directories.",
  );
}
