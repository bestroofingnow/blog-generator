// pages/api/team/accept-invite.ts
// Accept team member invitation

import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import {
  db,
  users,
  organizations,
  teamInvitations,
  auditLogs,
  eq,
} from "../../../lib/db";

interface AcceptResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AcceptResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { token, name, password } = req.body as {
    token: string;
    name: string;
    password: string;
  };

  if (!token) {
    return res.status(400).json({ success: false, error: "Invitation token required" });
  }

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ success: false, error: "Name is required (min 2 characters)" });
  }

  if (!password || password.length < 8) {
    return res.status(400).json({ success: false, error: "Password must be at least 8 characters" });
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
        error: "Invalid or expired invitation",
      });
    }

    // Check if invitation is still valid
    if (invitation[0].status !== "pending") {
      return res.status(400).json({
        success: false,
        error: `This invitation has already been ${invitation[0].status}`,
      });
    }

    if (new Date(invitation[0].expiresAt) < new Date()) {
      // Mark as expired
      await db
        .update(teamInvitations)
        .set({ status: "expired" })
        .where(eq(teamInvitations.id, invitation[0].id));

      return res.status(400).json({
        success: false,
        error: "This invitation has expired. Please request a new one.",
      });
    }

    // Get the organization
    const org = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, invitation[0].organizationId))
      .limit(1);

    if (!org[0]) {
      return res.status(404).json({
        success: false,
        error: "Organization no longer exists",
      });
    }

    // Check if user with this email already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, invitation[0].email))
      .limit(1);

    let userId: string;

    if (existingUser[0]) {
      // User exists - update their organization membership
      if (existingUser[0].organizationId) {
        return res.status(400).json({
          success: false,
          error: "This email is already associated with another organization",
        });
      }

      await db
        .update(users)
        .set({
          organizationId: org[0].id,
          memberRole: invitation[0].role,
          status: "active",
          name: name.trim() || existingUser[0].name,
        })
        .where(eq(users.id, existingUser[0].id));

      userId = existingUser[0].id;
    } else {
      // Create new user
      const hashedPassword = await bcrypt.hash(password, 12);

      const newUser = await db
        .insert(users)
        .values({
          email: invitation[0].email,
          name: name.trim(),
          password: hashedPassword,
          role: "user",
          organizationId: org[0].id,
          memberRole: invitation[0].role,
          status: "active",
          emailVerified: new Date(),
        })
        .returning();

      userId = newUser[0].id;
    }

    // Update invitation status
    await db
      .update(teamInvitations)
      .set({
        status: "accepted",
        acceptedAt: new Date(),
      })
      .where(eq(teamInvitations.id, invitation[0].id));

    // Log the action
    await db.insert(auditLogs).values({
      actorId: userId,
      actorEmail: invitation[0].email,
      actorRole: invitation[0].role,
      targetType: "user",
      targetId: userId,
      targetEmail: invitation[0].email,
      action: "invitation_accepted",
      details: {
        organizationId: org[0].id,
        organizationName: org[0].name,
        role: invitation[0].role,
        invitationId: invitation[0].id,
      },
    });

    console.log(`[Team] Invitation accepted: ${invitation[0].email} joined org ${org[0].id}`);

    return res.status(200).json({
      success: true,
      message: `Welcome to ${org[0].name}! You can now log in with your email and password.`,
    });
  } catch (error) {
    console.error("[Accept Invite] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to accept invitation",
    });
  }
}
