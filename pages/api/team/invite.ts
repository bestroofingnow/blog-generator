// pages/api/team/invite.ts
// Send team member invitation

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { randomBytes } from "crypto";
import {
  db,
  users,
  organizations,
  teamInvitations,
  auditLogs,
  eq,
  and,
} from "../../../lib/db";

interface InviteResponse {
  success: boolean;
  invitation?: {
    id: string;
    email: string;
    role: string;
    expiresAt: Date;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<InviteResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const { email, role } = req.body as { email: string; role: "editor" | "viewer" };

  if (!email || !email.includes("@")) {
    return res.status(400).json({ success: false, error: "Valid email is required" });
  }

  if (!role || !["editor", "viewer"].includes(role)) {
    return res.status(400).json({ success: false, error: "Role must be 'editor' or 'viewer'" });
  }

  try {
    const userId = session.user.id;

    // Get user and their organization
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user[0] || !user[0].organizationId) {
      return res.status(400).json({
        success: false,
        error: "You need an organization to invite team members",
      });
    }

    const org = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, user[0].organizationId))
      .limit(1);

    if (!org[0]) {
      return res.status(404).json({ success: false, error: "Organization not found" });
    }

    // Only organization owners can invite members
    if (org[0].ownerId !== userId) {
      return res.status(403).json({
        success: false,
        error: "Only organization owners can invite team members",
      });
    }

    // Check team member limit (agency tier has unlimited = -1)
    const teamMembers = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.organizationId, org[0].id),
          eq(users.status, "active")
        )
      );

    const pendingInvites = await db
      .select()
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.organizationId, org[0].id),
          eq(teamInvitations.status, "pending")
        )
      );

    const maxMembers = org[0].maxTeamMembers ?? 3;
    const currentCount = teamMembers.length - 1 + pendingInvites.length; // -1 for owner

    if (maxMembers !== -1 && currentCount >= maxMembers) {
      return res.status(400).json({
        success: false,
        error: `Team member limit reached (${maxMembers}). Upgrade to Agency tier for unlimited members.`,
      });
    }

    // Check if user already exists in organization
    const existingMember = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingMember[0]?.organizationId === org[0].id) {
      return res.status(400).json({
        success: false,
        error: "This user is already a member of your organization",
      });
    }

    // Check for existing pending invitation
    const existingInvite = await db
      .select()
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.organizationId, org[0].id),
          eq(teamInvitations.email, email.toLowerCase()),
          eq(teamInvitations.status, "pending")
        )
      )
      .limit(1);

    if (existingInvite[0]) {
      return res.status(400).json({
        success: false,
        error: "An invitation has already been sent to this email",
      });
    }

    // Generate invitation token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiration

    // Create invitation
    const invitation = await db
      .insert(teamInvitations)
      .values({
        organizationId: org[0].id,
        invitedBy: userId,
        email: email.toLowerCase(),
        role,
        token,
        status: "pending",
        expiresAt,
      })
      .returning();

    // Log the action
    await db.insert(auditLogs).values({
      actorId: userId,
      actorEmail: session.user.email,
      actorRole: user[0].memberRole || "owner",
      targetType: "user",
      targetEmail: email.toLowerCase(),
      action: "invitation_sent",
      details: {
        organizationId: org[0].id,
        organizationName: org[0].name,
        role,
        invitationId: invitation[0].id,
      },
    });

    console.log(`[Team] Invitation sent to ${email} for org ${org[0].id}`);

    // TODO: Send email with invitation link
    // For now, we'll just return the token - you can integrate with an email service
    const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${token}`;
    console.log(`[Team] Invite URL: ${inviteUrl}`);

    return res.status(200).json({
      success: true,
      invitation: {
        id: invitation[0].id,
        email: invitation[0].email,
        role: invitation[0].role,
        expiresAt: invitation[0].expiresAt,
      },
    });
  } catch (error) {
    console.error("[Team Invite] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to send invitation",
    });
  }
}
