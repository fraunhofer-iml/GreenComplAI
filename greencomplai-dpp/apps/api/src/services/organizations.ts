import { createOrganization, findActiveMembership, listOrganizationsForUser } from "@dpp/db";
import type { CreateOrganizationInput } from "@dpp/schemas";

import { db } from "../db.js";

export async function getOrganizations(userId: string) {
  return listOrganizationsForUser(db, userId);
}

export async function registerOrganization(input: CreateOrganizationInput, creatorUserId: string) {
  return createOrganization(db, input, creatorUserId);
}

export async function getActiveMembership(organizationId: string, userId: string) {
  return findActiveMembership(db, organizationId, userId);
}
