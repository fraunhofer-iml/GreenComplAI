import { createTransport, type Transporter } from "nodemailer";

import { env } from "../config.js";

export type Mail = {
  html: string;
  subject: string;
  text: string;
  to: string;
};

// Mail delivery is optional by design: a self-hosted instance may have no SMTP
// server, and an invitation must not fail to be *created* because it could not
// be *delivered* — the admin can always hand over the link. Without SMTP_HOST
// configured, mails are logged instead of sent, and the caller is told so it can
// keep showing the copyable link.
let transporter: Transporter | undefined;

function getTransporter(): Transporter | undefined {
  if (!env.SMTP_HOST) return undefined;
  transporter ??= createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
  });

  return transporter;
}

export type MailOutcome = { delivered: boolean; reason?: "not-configured" | "failed" };

export async function sendMail(mail: Mail): Promise<MailOutcome> {
  const transport = getTransporter();
  if (!transport) {
    console.info(`[mail] SMTP not configured — would send "${mail.subject}" to ${mail.to}`);
    return { delivered: false, reason: "not-configured" };
  }

  try {
    await transport.sendMail({
      from: env.SMTP_FROM,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    return { delivered: true };
  } catch (error) {
    // A failed delivery is logged and reported, never thrown: the invitation
    // itself is already valid.
    console.error(`[mail] Failed to send "${mail.subject}" to ${mail.to}`, error);
    return { delivered: false, reason: "failed" };
  }
}

export function invitationMail(input: {
  email: string;
  inviteUrl: string;
  organizationName: string;
  role: string;
}): Mail {
  const subject = `Einladung zu ${input.organizationName}`;
  const text = [
    `Du wurdest zu ${input.organizationName} eingeladen (Rolle: ${input.role}).`,
    "",
    "Einladung annehmen:",
    input.inviteUrl,
    "",
    "Der Link ist 14 Tage gültig. Wenn du damit nichts anfangen kannst, ignoriere diese E-Mail.",
  ].join("\n");

  const html = [
    `<p>Du wurdest zu <strong>${escapeHtml(input.organizationName)}</strong> eingeladen (Rolle: ${escapeHtml(input.role)}).</p>`,
    `<p><a href="${escapeHtml(input.inviteUrl)}">Einladung annehmen</a></p>`,
    `<p style="color:#666;font-size:12px">Der Link ist 14 Tage gültig. Wenn du damit nichts anfangen kannst, ignoriere diese E-Mail.</p>`,
  ].join("\n");

  return { html, subject, text, to: input.email };
}

// The invite URL and the organization name are attacker-influenced (an admin
// names their own tenant), and the mail is rendered by someone else's client.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
