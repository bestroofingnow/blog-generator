// pages/api/admin/revenue.ts
// Super Admin API for revenue dashboard

import type { NextApiRequest, NextApiResponse } from "next";
import {
  db,
  users,
  organizations,
  overagePurchases,
  creditTransactions,
  auditLogs,
  eq,
  desc,
} from "../../../lib/db";
import { requireSuperAdmin } from "../../../lib/admin-guard";
import { SUBSCRIPTION_TIERS, getTierConfig } from "../../../lib/stripe";

interface RevenueData {
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  totalOverageRevenue: number;
  usersByTier: {
    starter: number;
    pro: number;
    agency: number;
    free: number;
  };
  activeSubscriptions: number;
  totalOrganizations: number;
  totalUsers: number;
  recentTransactions: Array<{
    id: string;
    organizationName: string;
    amount: number;
    type: string;
    createdAt: Date | null;
  }>;
  churnedThisMonth: number;
  newThisMonth: number;
}

interface RevenueResponse {
  success: boolean;
  data?: RevenueData;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RevenueResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // Superadmin check
  const { authorized } = await requireSuperAdmin(req, res);
  if (!authorized) return;

  try {
    // Get all organizations
    const allOrgs = await db.select().from(organizations);

    // Get all users
    const allUsers = await db.select().from(users);

    // Count by tier and calculate MRR
    const usersByTier = { starter: 0, pro: 0, agency: 0, free: 0 };
    let mrr = 0;
    let activeSubscriptions = 0;

    for (const org of allOrgs) {
      const tier = (org.subscriptionTier || "free") as keyof typeof usersByTier;
      if (tier in usersByTier) {
        usersByTier[tier]++;
      }

      if (org.subscriptionStatus === "active" || org.subscriptionStatus === "trialing") {
        activeSubscriptions++;
        const tierConfig = getTierConfig(tier);
        if (tier !== "free") {
          mrr += tierConfig.priceMonthly;
        }
      }
    }

    // Convert from cents to dollars
    mrr = mrr / 100;
    const arr = mrr * 12;

    // Get overage purchases for total overage revenue
    const overages = await db.select().from(overagePurchases);
    const totalOverageRevenue = overages.reduce(
      (sum, p) => sum + (p.pricePaid || 0),
      0
    ) / 100; // Convert from cents

    // Get recent credit transactions for activity
    const recentTx = await db
      .select({
        id: creditTransactions.id,
        organizationId: creditTransactions.organizationId,
        amount: creditTransactions.amount,
        type: creditTransactions.type,
        createdAt: creditTransactions.createdAt,
      })
      .from(creditTransactions)
      .orderBy(desc(creditTransactions.createdAt))
      .limit(20);

    // Enrich with organization names
    const recentTransactions = await Promise.all(
      recentTx.map(async (tx) => {
        const org = await db
          .select({ name: organizations.name })
          .from(organizations)
          .where(eq(organizations.id, tx.organizationId))
          .limit(1);

        return {
          id: tx.id,
          organizationName: org[0]?.name || "Unknown",
          amount: tx.amount,
          type: tx.type,
          createdAt: tx.createdAt,
        };
      })
    );

    // Calculate churn and new this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const churnedThisMonth = allOrgs.filter(
      (org) =>
        org.subscriptionStatus === "canceled" &&
        org.updatedAt &&
        new Date(org.updatedAt) >= startOfMonth
    ).length;

    const newThisMonth = allOrgs.filter(
      (org) =>
        org.createdAt &&
        new Date(org.createdAt) >= startOfMonth
    ).length;

    return res.status(200).json({
      success: true,
      data: {
        mrr,
        arr,
        totalOverageRevenue,
        usersByTier,
        activeSubscriptions,
        totalOrganizations: allOrgs.length,
        totalUsers: allUsers.length,
        recentTransactions,
        churnedThisMonth,
        newThisMonth,
      },
    });
  } catch (error) {
    console.error("[Admin Revenue] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch revenue data",
    });
  }
}
