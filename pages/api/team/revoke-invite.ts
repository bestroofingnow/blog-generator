// pages/api/team/revoke-invite.ts
// Revoke a pending team invitation

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import {
  db,
  users,
  organizations,
  teamInvitations,
  eq,
  and,
} from "../../../lib/db";

interface RevokeResponse {
  success: boolean;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RevokeResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  try {
    const { inviteId } = req.body;

    if (!inviteId) {
      return res.status(400).json({ success: false, error: "Invite ID is required" });
    }

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

    // Get organization and verify ownership
    const org = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, user[0].organizationId))
      .limit(1);

    if (!org[0]) {
      return res.status(404).json({ success: false, error: "Organization not found" });
    }

    if (org[0].ownerId !== userId) {
      return res.status(403).json({
        success: false,
        error: "Only the organization owner can revoke invitations",
      });
    }

    // Get the invitation
    const invite = await db
      .select()
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.id, inviteId),
          eq(teamInvitations.organizationId, org[0].id)
        )
      )
      .limit(1);

    if (!invite[0]) {
      return res.status(404).json({ success: false, error: "Invitation not found" });
    }

    if (invite[0].status !== "pending") {
      return res.status(400).json({
        success: false,
        error: "This invitation has already been " + invite[0].status,
      });
    }

    // Update invitation status to revoked
    await db
      .update(teamInvitations)
      .set({ status: "revoked" })
      .where(eq(teamInvitations.id, inviteId));

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[Revoke Invite] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to revoke invitation",
    });
  }
}
