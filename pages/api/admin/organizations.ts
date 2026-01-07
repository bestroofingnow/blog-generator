// pages/api/admin/organizations.ts
// Super Admin API for organization management

import type { NextApiRequest, NextApiResponse } from "next";
import {
  db,
  users,
  organizations,
  auditLogs,
  creditTransactions,
  eq,
  desc,
} from "../../../lib/db";
import { requireSuperAdmin } from "../../../lib/admin-guard";
import { getTierConfig, SUBSCRIPTION_TIERS, TierKey } from "../../../lib/stripe";
import { getAvailableCredits } from "../../../lib/credits";

interface OrganizationData {
  id: string;
  name: string;
  ownerEmail: string;
  ownerName: string | null;
  subscriptionTier: string;
  subscriptionStatus: string;
  monthlyCredits: number;
  creditsUsed: number;
  rolloverCredits: number;
  overageCredits: number;
  teamMemberCount: number;
  createdAt: Date | null;
}

interface OrganizationsResponse {
  success: boolean;
  organizations?: OrganizationData[];
  organization?: OrganizationData;
  error?: string;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OrganizationsResponse>
) {
  // Superadmin check
  const { authorized, session } = await requireSuperAdmin(req, res);
  if (!authorized || !session) return;

  switch (req.method) {
    case "GET":
      return handleGetOrganizations(req, res);
    case "PATCH":
      return handleUpdateOrganization(req, res, session);
    default:
      return res.status(405).json({ success: false, error: "Method not allowed" });
  }
}

// List all organizations
async function handleGetOrganizations(
  req: NextApiRequest,
  res: NextApiResponse<OrganizationsResponse>
) {
  try {
    const { search, tier, status } = req.query;

    const allOrgs = await db
      .select()
      .from(organizations)
      .orderBy(desc(organizations.createdAt));

    // Enrich with owner info and team count
    const enrichedOrgs: OrganizationData[] = await Promise.all(
      allOrgs.map(async (org) => {
        const owner = await db
          .select({ email: users.email, name: users.name })
          .from(users)
          .where(eq(users.id, org.ownerId))
          .limit(1);

        const teamMembers = await db
          .select()
          .from(users)
          .where(eq(users.organizationId, org.id));

        return {
          id: org.id,
          name: org.name,
          ownerEmail: owner[0]?.email || "Unknown",
          ownerName: owner[0]?.name || null,
          subscriptionTier: org.subscriptionTier || "free",
          subscriptionStatus: org.subscriptionStatus || "none",
          monthlyCredits: org.monthlyCredits || 0,
          creditsUsed: org.creditsUsed || 0,
          rolloverCredits: org.rolloverCredits || 0,
          overageCredits: org.overageCredits || 0,
          teamMemberCount: teamMembers.length,
          createdAt: org.createdAt,
        };
      })
    );

    // Apply filters
    let filtered = enrichedOrgs;

    if (search && typeof search === "string") {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (org) =>
          org.name.toLowerCase().includes(searchLower) ||
          org.ownerEmail.toLowerCase().includes(searchLower) ||
          (org.ownerName && org.ownerName.toLowerCase().includes(searchLower))
      );
    }

    if (tier && typeof tier === "string") {
      filtered = filtered.filter((org) => org.subscriptionTier === tier);
    }

    if (status && typeof status === "string") {
      filtered = filtered.filter((org) => org.subscriptionStatus === status);
    }

    return res.status(200).json({
      success: true,
      organizations: filtered,
    });
  } catch (error) {
    console.error("[Admin Organizations] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch organizations",
    });
  }
}

// Update organization (tier change, credit adjustment)
async function handleUpdateOrganization(
  req: NextApiRequest,
  res: NextApiResponse<OrganizationsResponse>,
  session: { user: { id: string; email: string } }
) {
  const { organizationId, action, data } = req.body;

  if (!organizationId || !action) {
    return res.status(400).json({
      success: false,
      error: "organizationId and action are required",
    });
  }

  try {
    // Get the organization
    const org = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org[0]) {
      return res.status(404).json({
        success: false,
        error: "Organization not found",
      });
    }

    switch (action) {
      case "change_tier": {
        const { tier } = data as { tier: TierKey };
        if (!tier || !SUBSCRIPTION_TIERS[tier]) {
          return res.status(400).json({
            success: false,
            error: "Invalid tier. Must be 'starter', 'pro', or 'agency'",
          });
        }

        const tierConfig = getTierConfig(tier);

        await db
          .update(organizations)
          .set({
            subscriptionTier: tier,
            monthlyCredits: tierConfig.monthlyCredits,
            maxTeamMembers: tierConfig.maxTeamMembers,
            updatedAt: new Date(),
          })
          .where(eq(organizations.id, organizationId));

        // Log the action
        await db.insert(auditLogs).values({
          actorId: session.user.id,
          actorEmail: session.user.email,
          actorRole: "superadmin",
          targetType: "organization",
          targetId: organizationId,
          action: "tier_change",
          details: {
            previousTier: org[0].subscriptionTier,
            newTier: tier,
            organizationName: org[0].name,
          },
        });

        return res.status(200).json({
          success: true,
          message: `Tier changed to ${tierConfig.name}`,
        });
      }

      case "add_credits": {
        const { amount, reason } = data as { amount: number; reason: string };
        if (!amount || amount <= 0) {
          return res.status(400).json({
            success: false,
            error: "Amount must be a positive number",
          });
        }

        const creditsBefore = await getAvailableCredits(organizationId);

        await db
          .update(organizations)
          .set({
            overageCredits: (org[0].overageCredits || 0) + amount,
            updatedAt: new Date(),
          })
          .where(eq(organizations.id, organizationId));

        const creditsAfter = await getAvailableCredits(organizationId);

        // Record transaction
        await db.insert(creditTransactions).values({
          organizationId,
          userId: session.user.id,
          amount,
          type: "admin_adjustment",
          description: reason || `Admin added ${amount} credits`,
          balanceBefore: creditsBefore.remaining,
          balanceAfter: creditsAfter.remaining,
        });

        // Log the action
        await db.insert(auditLogs).values({
          actorId: session.user.id,
          actorEmail: session.user.email,
          actorRole: "superadmin",
          targetType: "credits",
          targetId: organizationId,
          action: "credit_adjustment",
          details: {
            amount,
            reason,
            organizationName: org[0].name,
            balanceBefore: creditsBefore.remaining,
            balanceAfter: creditsAfter.remaining,
          },
        });

        return res.status(200).json({
          success: true,
          message: `Added ${amount} credits to organization`,
        });
      }

      case "change_status": {
        const { status } = data as { status: string };
        if (!["active", "trialing", "past_due", "canceled", "unpaid"].includes(status)) {
          return res.status(400).json({
            success: false,
            error: "Invalid status",
          });
        }

        await db
          .update(organizations)
          .set({
            subscriptionStatus: status,
            updatedAt: new Date(),
          })
          .where(eq(organizations.id, organizationId));

        // Log the action
        await db.insert(auditLogs).values({
          actorId: session.user.id,
          actorEmail: session.user.email,
          actorRole: "superadmin",
          targetType: "organization",
          targetId: organizationId,
          action: "update",
          details: {
            previousStatus: org[0].subscriptionStatus,
            newStatus: status,
            organizationName: org[0].name,
          },
        });

        return res.status(200).json({
          success: true,
          message: `Status changed to ${status}`,
        });
      }

      default:
        return res.status(400).json({
          success: false,
          error: "Invalid action. Must be 'change_tier', 'add_credits', or 'change_status'",
        });
    }
  } catch (error) {
    console.error("[Admin Organizations] Update error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update organization",
    });
  }
}
