import { build } from "esbuild";

// Bundles the API into a single ESM file. Workspace packages (@dpp/*) and
// relative imports are bundled in; real npm dependencies and node builtins stay
// external and are provided by the production node_modules (see Dockerfile).
const externalizeNpm = {
  name: "externalize-npm",
  setup(b) {
    b.onResolve({ filter: /.*/ }, (args) => {
      if (args.kind === "entry-point") return null;
      const path = args.path;
      if (path.startsWith("@dpp/")) return null; // bundle workspace packages
      if (path.startsWith(".") || path.startsWith("/")) return null; // bundle relative
      return { path, external: true }; // externalize npm deps + node builtins
    });
  },
};

await build({
  // index = API server; migrate = standalone migration runner (reads the
  // migrations folder shipped next to dist, see Dockerfile); seed = the example
  // dataset, which install.sh runs as a one-off container for --with-demo-data.
  entryPoints: {
    index: "src/index.ts",
    migrate: "../../packages/db/src/migrate.ts",
    seed: "../../packages/db/src/seed.ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  outdir: "dist",
  sourcemap: true,
  // Keep source locations for stack traces without embedding original source text.
  sourcesContent: false,
  logLevel: "info",
  plugins: [externalizeNpm],
});
