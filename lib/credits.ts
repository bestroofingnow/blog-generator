// lib/credits.ts
// Credit management utilities for the billing system

import {
  db,
  organizations,
  creditTransactions,
  overagePurchases,
  users,
  eq,
  and,
  Organization,
} from "./db";
import { SUBSCRIPTION_TIERS, getTierConfig } from "./stripe";

// Credit operation types
export type CreditOperation =
  | "blog_generation"
  | "location_page_generation"
  | "image_generation"
  | "image_editing"
  | "keyword_research"
  | "deep_research"
  | "seo_plan"
  | "site_builder_research"
  | "kb_enrichment"
  | "chat_response";

// Credit costs per operation
// Fractional credits are supported (e.g., 0.5 credits)
const CREDIT_COSTS: Record<CreditOperation, number> = {
  blog_generation: 1,
  location_page_generation: 1,
  image_generation: 1,
  image_editing: 0.5,
  keyword_research: 1,
  deep_research: 1,
  seo_plan: 2,
  site_builder_research: 1,
  kb_enrichment: 1,
  chat_response: 0.5,
};

// Get credit cost for an operation (exported for UI display)
export function getCreditCost(operation: CreditOperation): number {
  return CREDIT_COSTS[operation];
}

// Get user's organization
export async function getUserOrganization(userId: string): Promise<Organization | null> {
  const user = await db
    .select({ organizationId: users.organizationId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user[0]?.organizationId) {
    return null;
  }

  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, user[0].organizationId))
    .limit(1);

  return org[0] || null;
}

// Get available credits for an organization
export async function getAvailableCredits(organizationId: string): Promise<{
  monthly: number;
  rollover: number;
  overage: number;
  total: number;
  used: number;
  remaining: number;
}> {
  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org[0]) {
    return { monthly: 0, rollover: 0, overage: 0, total: 0, used: 0, remaining: 0 };
  }

  const monthly = org[0].monthlyCredits || 0;
  const used = org[0].creditsUsed || 0;
  const rollover = org[0].rolloverCredits || 0;
  const overage = org[0].overageCredits || 0;

  // Calculate remaining (monthly - used + rollover + overage)
  const remaining = Math.max(0, monthly - used) + rollover + overage;

  return {
    monthly,
    rollover,
    overage,
    total: monthly + rollover + overage,
    used,
    remaining,
  };
}

// Check if user has enough credits for an operation
export async function hasEnoughCredits(
  userId: string,
  operation: CreditOperation
): Promise<boolean> {
  const org = await getUserOrganization(userId);
  if (!org) return false;

  const credits = await getAvailableCredits(org.id);
  const cost = CREDIT_COSTS[operation];

  return credits.remaining >= cost;
}

// Deduct credits for an operation
export async function deductCredits(
  userId: string,
  operation: CreditOperation,
  description?: string
): Promise<{
  success: boolean;
  error?: string;
  remainingCredits?: number;
}> {
  const org = await getUserOrganization(userId);
  if (!org) {
    return { success: false, error: "User has no organization" };
  }

  const credits = await getAvailableCredits(org.id);
  const cost = CREDIT_COSTS[operation];

  if (credits.remaining < cost) {
    return {
      success: false,
      error: `Insufficient credits. You have ${credits.remaining} credits, but this operation costs ${cost} credit(s).`,
    };
  }

  // Deduct from the appropriate pool (monthly first, then rollover, then overage)
  let monthlyRemaining = Math.max(0, (org.monthlyCredits || 0) - (org.creditsUsed || 0));
  let newCreditsUsed = org.creditsUsed || 0;
  let newRollover = org.rolloverCredits || 0;
  let newOverage = org.overageCredits || 0;

  let remainingCost = cost;

  // First, use monthly credits
  if (monthlyRemaining > 0 && remainingCost > 0) {
    const useFromMonthly = Math.min(monthlyRemaining, remainingCost);
    newCreditsUsed += useFromMonthly;
    remainingCost -= useFromMonthly;
  }

  // Then, use rollover credits
  if (newRollover > 0 && remainingCost > 0) {
    const useFromRollover = Math.min(newRollover, remainingCost);
    newRollover -= useFromRollover;
    remainingCost -= useFromRollover;
  }

  // Finally, use overage credits
  if (newOverage > 0 && remainingCost > 0) {
    const useFromOverage = Math.min(newOverage, remainingCost);
    newOverage -= useFromOverage;
    remainingCost -= useFromOverage;

    // Also update the overage purchase records
    await updateOveragePurchaseBalance(org.id, useFromOverage);
  }

  // Update organization credits
  await db
    .update(organizations)
    .set({
      creditsUsed: newCreditsUsed,
      rolloverCredits: newRollover,
      overageCredits: newOverage,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, org.id));

  // Record the transaction
  const newCredits = await getAvailableCredits(org.id);

  await db.insert(creditTransactions).values({
    organizationId: org.id,
    userId,
    amount: -cost,
    type: "generation",
    description: description || `${operation.replace("_", " ")} (${cost} credit)`,
    balanceBefore: credits.remaining,
    balanceAfter: newCredits.remaining,
  });

  return {
    success: true,
    remainingCredits: newCredits.remaining,
  };
}

// Update overage purchase balance when credits are used
async function updateOveragePurchaseBalance(organizationId: string, creditsUsed: number) {
  // Get active overage purchases ordered by expiration (use oldest first)
  const purchases = await db
    .select()
    .from(overagePurchases)
    .where(
      and(
        eq(overagePurchases.organizationId, organizationId),
        eq(overagePurchases.status, "active")
      )
    );

  // Sort by expiration date (oldest first)
  purchases.sort((a, b) => {
    const dateA = new Date(a.expiresAt).getTime();
    const dateB = new Date(b.expiresAt).getTime();
    return dateA - dateB;
  });

  let remaining = creditsUsed;

  for (const purchase of purchases) {
    if (remaining <= 0) break;

    const useFromThis = Math.min(purchase.creditsRemaining, remaining);
    const newBalance = purchase.creditsRemaining - useFromThis;

    await db
      .update(overagePurchases)
      .set({
        creditsRemaining: newBalance,
        status: newBalance === 0 ? "depleted" : "active",
      })
      .where(eq(overagePurchases.id, purchase.id));

    remaining -= useFromThis;
  }
}

// Add credits (for purchases, refunds, or admin adjustments)
export async function addCredits(
  organizationId: string,
  amount: number,
  type: "purchase" | "refund" | "admin_adjustment" | "monthly_allocation" | "rollover",
  description: string,
  userId?: string,
  expiresAt?: Date
): Promise<{ success: boolean; error?: string }> {
  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org[0]) {
    return { success: false, error: "Organization not found" };
  }

  const creditsBefore = await getAvailableCredits(organizationId);

  // Update the appropriate credit pool
  if (type === "purchase") {
    await db
      .update(organizations)
      .set({
        overageCredits: (org[0].overageCredits || 0) + amount,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId));
  } else if (type === "rollover") {
    await db
      .update(organizations)
      .set({
        rolloverCredits: (org[0].rolloverCredits || 0) + amount,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId));
  } else if (type === "monthly_allocation") {
    // Reset used credits and set new monthly allocation
    await db
      .update(organizations)
      .set({
        creditsUsed: 0,
        monthlyCredits: amount,
        billingCycleStart: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId));
  } else {
    // Admin adjustment or refund - add to overage credits
    await db
      .update(organizations)
      .set({
        overageCredits: (org[0].overageCredits || 0) + amount,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId));
  }

  const creditsAfter = await getAvailableCredits(organizationId);

  // Record the transaction
  await db.insert(creditTransactions).values({
    organizationId,
    userId,
    amount,
    type,
    description,
    balanceBefore: creditsBefore.remaining,
    balanceAfter: creditsAfter.remaining,
    expiresAt,
  });

  return { success: true };
}

// Reset monthly credits (called at billing cycle start)
export async function resetMonthlyCredits(organizationId: string): Promise<void> {
  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org[0]) return;

  const tierConfig = getTierConfig(org[0].subscriptionTier || "starter");

  // Calculate unused credits for rollover (max 30 days worth)
  const monthlyRemaining = Math.max(0, (org[0].monthlyCredits || 0) - (org[0].creditsUsed || 0));
  const maxRollover = Math.floor(tierConfig.monthlyCredits * 0.5); // Max 50% of monthly can roll over
  const newRollover = Math.min(monthlyRemaining, maxRollover);

  await db
    .update(organizations)
    .set({
      monthlyCredits: tierConfig.monthlyCredits,
      creditsUsed: 0,
      rolloverCredits: newRollover,
      billingCycleStart: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId));

  // Record the transactions
  if (newRollover > 0) {
    await addCredits(
      organizationId,
      newRollover,
      "rollover",
      `Rolled over ${newRollover} unused credits from previous month`
    );
  }

  await db.insert(creditTransactions).values({
    organizationId,
    amount: tierConfig.monthlyCredits,
    type: "monthly_allocation",
    description: `Monthly allocation of ${tierConfig.monthlyCredits} credits (${tierConfig.name} tier)`,
  });
}

// Expire overage credits older than 30 days
export async function expireOldOverageCredits(): Promise<number> {
  const now = new Date();

  // Find expired purchases
  const expiredPurchases = await db
    .select()
    .from(overagePurchases)
    .where(eq(overagePurchases.status, "active"));

  let totalExpired = 0;

  for (const purchase of expiredPurchases) {
    if (new Date(purchase.expiresAt) < now && purchase.creditsRemaining > 0) {
      // Mark as expired
      await db
        .update(overagePurchases)
        .set({ status: "expired" })
        .where(eq(overagePurchases.id, purchase.id));

      // Deduct from organization's overage credits
      const org = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, purchase.organizationId))
        .limit(1);

      if (org[0]) {
        await db
          .update(organizations)
          .set({
            overageCredits: Math.max(0, (org[0].overageCredits || 0) - purchase.creditsRemaining),
            updatedAt: new Date(),
          })
          .where(eq(organizations.id, purchase.organizationId));

        // Record the expiration
        await db.insert(creditTransactions).values({
          organizationId: purchase.organizationId,
          amount: -purchase.creditsRemaining,
          type: "expiration",
          description: `${purchase.creditsRemaining} overage credits expired`,
        });

        totalExpired += purchase.creditsRemaining;
      }
    }
  }

  return totalExpired;
}

// Get credit transaction history
export async function getCreditHistory(
  organizationId: string,
  limit = 50,
  offset = 0
): Promise<{
  transactions: Array<{
    id: string;
    amount: number;
    type: string;
    description: string | null;
    createdAt: Date | null;
    userEmail?: string;
  }>;
  total: number;
}> {
  const transactions = await db
    .select({
      id: creditTransactions.id,
      amount: creditTransactions.amount,
      type: creditTransactions.type,
      description: creditTransactions.description,
      createdAt: creditTransactions.createdAt,
      userId: creditTransactions.userId,
    })
    .from(creditTransactions)
    .where(eq(creditTransactions.organizationId, organizationId))
    .orderBy(creditTransactions.createdAt)
    .limit(limit)
    .offset(offset);

  // Get user emails for transactions
  const enrichedTransactions = await Promise.all(
    transactions.map(async (tx) => {
      let userEmail: string | undefined;
      if (tx.userId) {
        const user = await db
          .select({ email: users.email })
          .from(users)
          .where(eq(users.id, tx.userId))
          .limit(1);
        userEmail = user[0]?.email;
      }
      return { ...tx, userEmail };
    })
  );

  return {
    transactions: enrichedTransactions,
    total: transactions.length, // For proper pagination, you'd need a count query
  };
}

// Check if organization needs to show low credit warning
export async function shouldShowLowCreditWarning(organizationId: string): Promise<boolean> {
  const credits = await getAvailableCredits(organizationId);
  const org = await db
    .select({ tier: organizations.subscriptionTier })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org[0]) return false;

  const tierConfig = getTierConfig(org[0].tier || "starter");
  const threshold = Math.floor(tierConfig.monthlyCredits * 0.1); // 10% threshold

  return credits.remaining <= threshold;
}
