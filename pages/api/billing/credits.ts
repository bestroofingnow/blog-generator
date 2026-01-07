// pages/api/billing/credits.ts
// Get credit balance and usage info

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import {
  db,
  users,
  organizations,
  eq,
} from "../../../lib/db";
import {
  getAvailableCredits,
  getCreditHistory,
  shouldShowLowCreditWarning,
} from "../../../lib/credits";
import { getTierConfig } from "../../../lib/stripe";

interface CreditsResponse {
  success: boolean;
  data?: {
    credits: {
      monthly: number;
      rollover: number;
      overage: number;
      total: number;
      used: number;
      remaining: number;
    };
    subscription: {
      tier: string;
      tierName: string;
      status: string;
      billingCycleStart: string | null;
    };
    lowCreditWarning: boolean;
    history?: Array<{
      id: string;
      amount: number;
      type: string;
      description: string | null;
      createdAt: Date | null;
      userEmail?: string;
    }>;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreditsResponse>
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

    if (!user[0]) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // If user has no organization, return default state
    if (!user[0].organizationId) {
      return res.status(200).json({
        success: true,
        data: {
          credits: {
            monthly: 0,
            rollover: 0,
            overage: 0,
            total: 0,
            used: 0,
            remaining: 0,
          },
          subscription: {
            tier: "free",
            tierName: "Free",
            status: "none",
            billingCycleStart: null,
          },
          lowCreditWarning: false,
        },
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

    // Get credit info
    const credits = await getAvailableCredits(org[0].id);
    const lowCreditWarning = await shouldShowLowCreditWarning(org[0].id);
    const tierConfig = getTierConfig(org[0].subscriptionTier || "free");

    // Get recent transaction history if requested
    const includeHistory = req.query.history === "true";
    let history;
    if (includeHistory) {
      const historyData = await getCreditHistory(org[0].id, 20);
      history = historyData.transactions;
    }

    return res.status(200).json({
      success: true,
      data: {
        credits,
        subscription: {
          tier: org[0].subscriptionTier || "free",
          tierName: tierConfig.name,
          status: org[0].subscriptionStatus || "none",
          billingCycleStart: org[0].billingCycleStart?.toISOString() || null,
        },
        lowCreditWarning,
        history,
      },
    });
  } catch (error) {
    console.error("[Credits] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get credit info",
    });
  }
}
