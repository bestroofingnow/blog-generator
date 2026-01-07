// pages/api/team/members.ts
// Get team members and pending invitations

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

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  role: string;
  memberRole: string | null;
  status: string;
  joinedAt: Date | null;
  isOwner: boolean;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  sentAt: Date | null;
  expiresAt: Date;
}

interface MembersResponse {
  success: boolean;
  data?: {
    members: TeamMember[];
    pendingInvites: PendingInvite[];
    limits: {
      current: number;
      max: number;
      isUnlimited: boolean;
    };
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MembersResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
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

    // Get all team members
    const members = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        memberRole: users.memberRole,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.organizationId, org[0].id));

    const teamMembers: TeamMember[] = members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      memberRole: m.memberRole,
      status: m.status || "active",
      joinedAt: m.createdAt,
      isOwner: m.id === org[0].ownerId,
    }));

    // Get pending invitations (only for owner)
    let pendingInvites: PendingInvite[] = [];
    if (org[0].ownerId === userId) {
      const invites = await db
        .select()
        .from(teamInvitations)
        .where(
          and(
            eq(teamInvitations.organizationId, org[0].id),
            eq(teamInvitations.status, "pending")
          )
        );

      pendingInvites = invites.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        sentAt: i.createdAt,
        expiresAt: i.expiresAt,
      }));
    }

    // Calculate limits
    const maxMembers = org[0].maxTeamMembers ?? 3;
    const currentMembers = teamMembers.filter((m) => !m.isOwner && m.status === "active").length;

    return res.status(200).json({
      success: true,
      data: {
        members: teamMembers,
        pendingInvites,
        limits: {
          current: currentMembers,
          max: maxMembers,
          isUnlimited: maxMembers === -1,
        },
      },
    });
  } catch (error) {
    console.error("[Team Members] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get team members",
    });
  }
}
