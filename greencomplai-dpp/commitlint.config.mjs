/** Conventional Commits drive versioning; validate commits and squash-merge titles. */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Scopes follow workspace responsibilities; omitting a scope is allowed.
    "scope-enum": [
      2,
      "always",
      [
        "api",
        "web",
        "db",
        "domain",
        "schemas",
        "ui",
        "connectors",
        "e2e",
        "deploy",
        "ci",
        "docs",
        "deps",
      ],
    ],
    // Long explanatory bodies are warnings; URLs in footers have no limit.
    "body-max-line-length": [1, "always", 100],
    "footer-max-line-length": [0],
  },
};
