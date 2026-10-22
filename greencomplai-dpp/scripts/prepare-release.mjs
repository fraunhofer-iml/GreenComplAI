import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const tag = process.argv[2] ?? "";
const match =
  /^greencomplai-dpp\/v((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*)?)$/.exec(
    tag,
  );
if (!match || match[1].length > 128) {
  throw new Error("Expected a tag such as greencomplai-dpp/v1.2.3 or greencomplai-dpp/v1.2.3-rc.1");
}
const version = match[1];
const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
if (version !== pkg.version) {
  throw new Error(`Tag version ${version} does not match package.json version ${pkg.version}`);
}

const output = path.resolve(root, process.argv[3] ?? "build/release");
await mkdir(output, { recursive: true });
const installer = await readFile(path.join(root, "install.sh"), "utf8");
if (!installer.includes('DEFAULT_VERSION="latest"')) {
  throw new Error("Installer version marker is missing");
}
const files = {
  "install.sh": installer.replace('DEFAULT_VERSION="latest"', `DEFAULT_VERSION="${version}"`),
  "docker-compose.selfhost.yml": await readFile(path.join(root, "docker-compose.selfhost.yml")),
};
const checksums = [];
for (const [name, content] of Object.entries(files)) {
  await writeFile(path.join(output, name), content, { mode: name.endsWith(".sh") ? 0o755 : 0o644 });
  checksums.push(`${createHash("sha256").update(content).digest("hex")}  ${name}`);
}
await writeFile(path.join(output, "SHA256SUMS"), `${checksums.join("\n")}\n`);
console.log(`Prepared ${tag} in ${output}`);
