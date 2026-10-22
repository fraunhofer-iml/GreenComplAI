import { expect, test } from "@playwright/test";

const apiOrigin = process.env.E2E_API_ORIGIN ?? "http://localhost:3100";

test("registering from an invitation opens the dashboard with the granted membership", async ({
  page,
  request,
}) => {
  const runId = crypto.randomUUID();
  const invitedEmail = `invited-${runId}@example.com`;
  const signup = await request.post(`${apiOrigin}/api/auth/sign-up/email`, {
    data: {
      name: "Invitation test administrator",
      email: `admin-${runId}@example.com`,
      password: "invitation test password",
    },
  });
  expect(signup.ok(), await signup.text()).toBe(true);

  const created = await request.post(`${apiOrigin}/organizations`, {
    data: { name: `Invitation test ${runId}`, slug: `invitation-${runId}` },
  });
  expect(created.ok(), await created.text()).toBe(true);
  const { organization } = await created.json();
  const invited = await request.post(`${apiOrigin}/invitations`, {
    headers: { "x-organization-id": organization.id },
    data: { email: invitedEmail, role: "editor" },
  });
  expect(invited.ok(), await invited.text()).toBe(true);
  const { result: invitation } = await invited.json();

  // The page has a separate cookie jar from the administrator's API context.
  await page.goto(`/accept-invite?token=${encodeURIComponent(invitation.token)}`);
  await expect(page).toHaveURL(/\/login\?redirect=/);
  await expect(async () => {
    await page.getByRole("button", { name: "Einladung erhalten? Konto erstellen" }).click();
    await expect(page.getByLabel("Name", { exact: true })).toBeVisible({ timeout: 2_000 });
  }).toPass();
  await page.getByLabel("Name", { exact: true }).fill("Invited editor");
  await page.getByLabel("E-Mail").fill(invitedEmail);
  await page.getByLabel("Passwort").fill("invitation test password");
  await page.getByRole("button", { name: "Registrieren", exact: true }).click();

  // Signup accepts the invitation itself. Returning to its acceptance URL would
  // incorrectly report that this successfully redeemed invitation was invalid.
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("Einladung nicht angenommen", { exact: true })).toHaveCount(0);
  const organizations = await page.request.get(`${apiOrigin}/organizations`);
  expect(organizations.ok(), await organizations.text()).toBe(true);
  const memberships = await organizations.json();
  expect(memberships.organizations).toEqual(
    expect.arrayContaining([expect.objectContaining({ id: organization.id, role: "editor" })]),
  );

  // Existing accounts still return to the invitation after signing in, because
  // sign-in does not accept pending invitations automatically.
  const secondOrganization = await request.post(`${apiOrigin}/organizations`, {
    data: { name: `Second invitation ${runId}`, slug: `second-invitation-${runId}` },
  });
  expect(secondOrganization.ok(), await secondOrganization.text()).toBe(true);
  const { organization: second } = await secondOrganization.json();
  const secondInvite = await request.post(`${apiOrigin}/invitations`, {
    headers: { "x-organization-id": second.id },
    data: { email: invitedEmail, role: "viewer" },
  });
  expect(secondInvite.ok(), await secondInvite.text()).toBe(true);
  const { result: secondInvitation } = await secondInvite.json();
  await page.context().clearCookies();
  await page.goto(`/accept-invite?token=${encodeURIComponent(secondInvitation.token)}`);
  await expect(page).toHaveURL(/\/login\?redirect=/);
  await page.getByLabel("E-Mail").fill(invitedEmail);
  await page.getByLabel("Passwort").fill("invitation test password");
  await page.getByRole("button", { name: "Einloggen", exact: true }).click();
  await expect(page.getByText("Einladung angenommen", { exact: true })).toBeVisible();
  const joined = await page.request.get(`${apiOrigin}/organizations`);
  expect(joined.ok(), await joined.text()).toBe(true);
  expect((await joined.json()).organizations).toEqual(
    expect.arrayContaining([expect.objectContaining({ id: second.id, role: "viewer" })]),
  );
});
