// pages/api/billing/checkout.ts
// Create Stripe Checkout session for subscription

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
  stripe,
  SUBSCRIPTION_TIERS,
  getOrCreateCustomer,
  TierKey,
} from "../../../lib/stripe";

interface CheckoutResponse {
  success: boolean;
  checkoutUrl?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CheckoutResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const { tier } = req.body as { tier: TierKey };

  if (!tier || !SUBSCRIPTION_TIERS[tier]) {
    return res.status(400).json({ success: false, error: "Invalid subscription tier" });
  }

  const tierConfig = SUBSCRIPTION_TIERS[tier];

  if (!tierConfig.stripePriceId) {
    return res.status(500).json({
      success: false,
      error: "Stripe price not configured for this tier. Please contact support.",
    });
  }

  try {
    const userId = session.user.id;

    // Get or create user's organization
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user[0]) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    let organizationId = user[0].organizationId;
    let org;

    // If user doesn't have an organization, create one
    if (!organizationId) {
      const newOrg = await db
        .insert(organizations)
        .values({
          name: user[0].name ? `${user[0].name}'s Organization` : "My Organization",
          ownerId: userId,
          subscriptionTier: "free",
          subscriptionStatus: "trialing",
          monthlyCredits: 0,
          maxTeamMembers: 3,
        })
        .returning();

      organizationId = newOrg[0].id;

      // Update user with organization ID and owner role
      await db
        .update(users)
        .set({
          organizationId: newOrg[0].id,
          memberRole: "owner",
        })
        .where(eq(users.id, userId));

      org = newOrg[0];
    } else {
      const existingOrg = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);
      org = existingOrg[0];
    }

    if (!org) {
      return res.status(500).json({ success: false, error: "Failed to get organization" });
    }

    // Only organization owners can manage billing
    if (org.ownerId !== userId) {
      return res.status(403).json({
        success: false,
        error: "Only organization owners can manage billing",
      });
    }

    // Get or create Stripe customer
    const customer = await getOrCreateCustomer({
      email: user[0].email,
      name: user[0].name || undefined,
      organizationId: org.id,
    });

    // Update organization with Stripe customer ID
    if (!org.stripeCustomerId) {
      await db
        .update(organizations)
        .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
        .where(eq(organizations.id, org.id));
    }

    // Create checkout session
    const baseUrl = process.env.NEXTAUTH_URL?.trim() || "http://localhost:3000";
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: tierConfig.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/settings/billing?canceled=true`,
      metadata: {
        organizationId: org.id,
        userId: userId,
        tier: tier,
      },
      subscription_data: {
        metadata: {
          organizationId: org.id,
          userId: userId,
          tier: tier,
        },
      },
    });

    console.log(`[Checkout] Created session for user ${userId}, tier: ${tier}`);

    return res.status(200).json({
      success: true,
      checkoutUrl: checkoutSession.url || undefined,
    });
  } catch (error) {
    console.error("[Checkout] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create checkout session",
    });
  }
}
