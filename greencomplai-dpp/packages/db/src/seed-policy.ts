// Production demo data must go into an existing organization. This avoids
// creating the development tenant and its publicly documented admin account.
export function assertSafeDemoSeed(values: NodeJS.ProcessEnv) {
  if (values.NODE_ENV === "production" && !values.SEED_ORGANIZATION_ID?.trim()) {
    throw new Error(
      "Refusing to seed a demo administrator in production. Set SEED_ORGANIZATION_ID to an existing organization to add example data without creating an account.",
    );
  }
}
