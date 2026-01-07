// lib/email.ts
// Email sending utilities using Resend

import { Resend } from "resend";

// Initialize Resend (only if API key exists)
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Default from address
const FROM_EMAIL = process.env.EMAIL_FROM || "Blog Generator <onboarding@resend.dev>";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn("[Email] No RESEND_API_KEY configured, skipping email send");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      console.error("[Email] Send error:", error);
      return { success: false, error: error.message };
    }

    console.log("[Email] Sent successfully:", data?.id);
    return { success: true };
  } catch (error) {
    console.error("[Email] Exception:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

// Team invitation email
export async function sendTeamInvitationEmail(options: {
  to: string;
  inviterName: string;
  organizationName: string;
  role: string;
  inviteUrl: string;
  expiresAt: Date;
}): Promise<{ success: boolean; error?: string }> {
  const { to, inviterName, organizationName, role, inviteUrl, expiresAt } = options;

  const expiresFormatted = expiresAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">You're Invited!</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Hi there,
    </p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on Blog Generator as a <strong>${role}</strong>.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${inviteUrl}" style="background: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
        Accept Invitation
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
      This invitation expires on <strong>${expiresFormatted}</strong>.
    </p>

    <p style="font-size: 14px; color: #6b7280;">
      If you didn't expect this invitation, you can safely ignore this email.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="font-size: 12px; color: #9ca3af; text-align: center;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${inviteUrl}" style="color: #4f46e5; word-break: break-all;">${inviteUrl}</a>
    </p>
  </div>
</body>
</html>
  `.trim();

  const text = `
You're Invited!

Hi there,

${inviterName} has invited you to join ${organizationName} on Blog Generator as a ${role}.

Accept your invitation by clicking this link:
${inviteUrl}

This invitation expires on ${expiresFormatted}.

If you didn't expect this invitation, you can safely ignore this email.
  `.trim();

  return sendEmail({
    to,
    subject: `You're invited to join ${organizationName} on Blog Generator`,
    html,
    text,
  });
}
