// pages/api/billing/overage.ts
// Purchase overage credit packs

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import {
  db,
  users,
  organizations,
  eq,
} from "../../../lib/db";
import { stripe, OVERAGE_PACKAGES, OveragePackageKey } from "../../../lib/stripe";

interface OverageResponse {
  success: boolean;
  checkoutUrl?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OverageResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const { package: packageKey } = req.body as { package: OveragePackageKey };

  if (!packageKey || !OVERAGE_PACKAGES[packageKey]) {
    return res.status(400).json({
      success: false,
      error: "Invalid package. Choose 'small' ($10/40 credits) or 'large' ($20/100 credits)",
    });
  }

  const packageConfig = OVERAGE_PACKAGES[packageKey];

  if (!packageConfig.stripePriceId) {
    return res.status(500).json({
      success: false,
      error: "Stripe price not configured for overage package. Please contact support.",
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
        error: "You need an active subscription to purchase additional credits",
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

    // Check if organization has an active subscription
    if (!org[0].stripeSubscriptionId || org[0].subscriptionStatus !== "active") {
      return res.status(400).json({
        success: false,
        error: "You need an active subscription to purchase additional credits",
      });
    }

    // Must have a Stripe customer
    if (!org[0].stripeCustomerId) {
      return res.status(400).json({
        success: false,
        error: "Billing not set up. Please contact support.",
      });
    }

    // Create checkout session for one-time payment
    const baseUrl = process.env.NEXTAUTH_URL?.trim() || "http://localhost:3000";
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: org[0].stripeCustomerId,
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: packageConfig.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/settings/billing?overage_success=true&credits=${packageConfig.credits}`,
      cancel_url: `${baseUrl}/settings/billing?overage_canceled=true`,
      metadata: {
        organizationId: org[0].id,
        userId: userId,
        credits: String(packageConfig.credits),
        type: "overage",
      },
      payment_intent_data: {
        metadata: {
          organizationId: org[0].id,
          userId: userId,
          credits: String(packageConfig.credits),
          type: "overage",
        },
      },
    });

    console.log(`[Overage] Created checkout for ${packageConfig.credits} credits, org ${org[0].id}`);

    return res.status(200).json({
      success: true,
      checkoutUrl: checkoutSession.url || undefined,
    });
  } catch (error) {
    console.error("[Overage] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create checkout session",
    });
  }
}
