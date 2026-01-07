// pages/api/team/invitation-info.ts
// Get invitation details for the acceptance page

import type { NextApiRequest, NextApiResponse } from "next";
import {
  db,
  users,
  organizations,
  teamInvitations,
  eq,
} from "../../../lib/db";

interface InvitationInfoResponse {
  success: boolean;
  invitation?: {
    email: string;
    role: string;
    organizationName: string;
    inviterName: string;
    expiresAt: string;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<InvitationInfoResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { token } = req.query;

  if (!token || typeof token !== "string") {
    return res.status(400).json({ success: false, error: "Token is required" });
  }

  try {
    // Find the invitation
    const invitation = await db
      .select()
      .from(teamInvitations)
      .where(eq(teamInvitations.token, token))
      .limit(1);

    if (!invitation[0]) {
      return res.status(404).json({
        success: false,
        error: "Invitation not found",
      });
    }

    // Check if expired or already used
    if (invitation[0].status !== "pending") {
      return res.status(400).json({
        success: false,
        error: `This invitation has already been ${invitation[0].status}`,
      });
    }

    if (new Date(invitation[0].expiresAt) < new Date()) {
      return res.status(400).json({
        success: false,
        error: "This invitation has expired. Please request a new one.",
      });
    }

    // Get organization info
    const org = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, invitation[0].organizationId))
      .limit(1);

    // Get inviter info
    const inviter = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, invitation[0].invitedBy))
      .limit(1);

    return res.status(200).json({
      success: true,
      invitation: {
        email: invitation[0].email,
        role: invitation[0].role,
        organizationName: org[0]?.name || "Unknown Organization",
        inviterName: inviter[0]?.name || "A team member",
        expiresAt: invitation[0].expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[Invitation Info] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get invitation details",
    });
  }
}
