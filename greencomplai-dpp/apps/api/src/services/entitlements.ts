import { env } from "../config.js";

// Entitlements seam: decides per-organization limits. In self-hosted mode
// everything is unlimited; in SaaS mode a plan-backed provider enforces quotas.
// The call sites (e.g. DPP creation, blob upload) always go through this
// interface so the SaaS implementation can be plugged in without touching the
// domain or hot paths.

export type EntitlementDecision =
  { allowed: true } | { allowed: false; code: string; message: string };

export type EntitlementsProvider = {
  checkDppCreateAllowed(organizationId: string): Promise<EntitlementDecision>;
  // null means unlimited.
  storageQuotaBytes(organizationId: string): Promise<number | null>;
  // Whether this organization may install this connector module.
  //
  // This - and only this - is where a paywall for connectors would hang.
  // Whether the core stays free and connectors cost something is not
  // decided yet; this is the seam for it. As long as it stays in place, the
  // difference between "free" and "paid" is exactly one implementation of
  // this method and no change at the call sites.
  checkConnectorAllowed(organizationId: string, connectorKey: string): Promise<EntitlementDecision>;
};

const unlimitedEntitlements: EntitlementsProvider = {
  async checkDppCreateAllowed() {
    return { allowed: true };
  },
  async storageQuotaBytes() {
    return null;
  },
  async checkConnectorAllowed() {
    return { allowed: true };
  },
};

// SaaS plan/quota/billing is not implemented yet (Phase 2). Until then SaaS
// also runs unlimited; replace this with a plan-backed provider.
const saasEntitlements: EntitlementsProvider = unlimitedEntitlements;

export const entitlements: EntitlementsProvider =
  env.DEPLOYMENT_MODE === "saas" ? saasEntitlements : unlimitedEntitlements;
