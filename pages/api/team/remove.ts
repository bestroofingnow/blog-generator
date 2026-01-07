// pages/api/team/remove.ts
// Remove team member or revoke invitation

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import {
  db,
  users,
  organizations,
  teamInvitations,
  auditLogs,
  eq,
} from "../../../lib/db";

interface RemoveResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RemoveResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const { memberId, invitationId } = req.body as {
    memberId?: string;
    invitationId?: string;
  };

  if (!memberId && !invitationId) {
    return res.status(400).json({
      success: false,
      error: "Either memberId or invitationId is required",
    });
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
        error: "You are not part of an organization",
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

    // Only organization owners can remove members
    if (org[0].ownerId !== userId) {
      return res.status(403).json({
        success: false,
        error: "Only organization owners can remove team members",
      });
    }

    // Handle invitation revocation
    if (invitationId) {
      const invitation = await db
        .select()
        .from(teamInvitations)
        .where(eq(teamInvitations.id, invitationId))
        .limit(1);

      if (!invitation[0] || invitation[0].organizationId !== org[0].id) {
        return res.status(404).json({
          success: false,
          error: "Invitation not found",
        });
      }

      await db
        .update(teamInvitations)
        .set({ status: "revoked" })
        .where(eq(teamInvitations.id, invitationId));

      // Log the action
      await db.insert(auditLogs).values({
        actorId: userId,
        actorEmail: session.user.email,
        actorRole: "owner",
        targetType: "user",
        targetEmail: invitation[0].email,
        action: "invitation_revoked",
        details: {
          organizationId: org[0].id,
          invitationId,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Invitation revoked successfully",
      });
    }

    // Handle member removal
    if (memberId) {
      // Cannot remove yourself
      if (memberId === userId) {
        return res.status(400).json({
          success: false,
          error: "You cannot remove yourself from the organization",
        });
      }

      // Cannot remove the owner
      if (memberId === org[0].ownerId) {
        return res.status(400).json({
          success: false,
          error: "Cannot remove the organization owner",
        });
      }

      // Verify member belongs to this organization
      const member = await db
        .select()
        .from(users)
        .where(eq(users.id, memberId))
        .limit(1);

      if (!member[0] || member[0].organizationId !== org[0].id) {
        return res.status(404).json({
          success: false,
          error: "Team member not found",
        });
      }

      // Remove member from organization (set organizationId to null)
      await db
        .update(users)
        .set({
          organizationId: null,
          memberRole: null,
          status: "inactive",
        })
        .where(eq(users.id, memberId));

      // Log the action
      await db.insert(auditLogs).values({
        actorId: userId,
        actorEmail: session.user.email,
        actorRole: "owner",
        targetType: "user",
        targetId: memberId,
        targetEmail: member[0].email,
        action: "team_member_removed",
        details: {
          organizationId: org[0].id,
          memberRole: member[0].memberRole,
        },
      });

      console.log(`[Team] Member ${member[0].email} removed from org ${org[0].id}`);

      return res.status(200).json({
        success: true,
        message: `${member[0].name || member[0].email} has been removed from the team`,
      });
    }

    return res.status(400).json({ success: false, error: "No action taken" });
  } catch (error) {
    console.error("[Team Remove] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove team member",
    });
  }
}
