// pages/api/billing/checkout.ts
// Create Stripe Checkout session for subscription

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import Stripe from "stripe";
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
  BillingPeriod,
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

  console.log("[Checkout] Starting checkout request");

  const session = await getServerSession(req, res, authOptions);
  console.log("[Checkout] Session:", session ? `Found user ${session.user?.id}` : "No session");

  if (!session?.user?.id) {
    console.error("[Checkout] No session found - returning 401");
    return res.status(401).json({ success: false, error: "Unauthorized - please log in again" });
  }

  const { tier, billingPeriod = "monthly", promoCode } = req.body as {
    tier: TierKey;
    billingPeriod?: BillingPeriod;
    promoCode?: string;
  };

  console.log(`[Checkout] Request params - tier: ${tier}, billingPeriod: ${billingPeriod}`);

  if (!tier || !SUBSCRIPTION_TIERS[tier]) {
    return res.status(400).json({ success: false, error: "Invalid subscription tier" });
  }

  const tierConfig = SUBSCRIPTION_TIERS[tier];
  const isAnnual = billingPeriod === "annual";

  // Get price ID directly from env vars as fallback since module-level vars may be empty
  let priceId = isAnnual ? tierConfig.stripeAnnualPriceId : tierConfig.stripePriceId;

  // Fallback to direct env var lookup if module-level is empty
  if (!priceId) {
    const envVarName = isAnnual
      ? `STRIPE_${tier.toUpperCase()}_ANNUAL_PRICE_ID`
      : `STRIPE_${tier.toUpperCase()}_PRICE_ID`;
    priceId = process.env[envVarName] || "";
    console.log(`[Checkout] Module priceId was empty, using env var ${envVarName}: ${priceId ? "found" : "not found"}`);
  }

  console.log(`[Checkout] Using priceId: ${priceId ? priceId.substring(0, 20) + "..." : "EMPTY"}`);
  console.log(`[Checkout] All env vars starting with STRIPE: ${Object.keys(process.env).filter(k => k.startsWith('STRIPE')).join(', ')}`);

  if (!priceId) {
    console.error(`[Checkout] No price ID configured for tier ${tier}, isAnnual: ${isAnnual}`);
    return res.status(500).json({
      success: false,
      error: "Stripe price not configured for this tier. Please contact support.",
    });
  }

  // Verify Stripe is configured
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("[Checkout] STRIPE_SECRET_KEY is not configured");
    return res.status(500).json({ success: false, error: "Payment system not configured" });
  }

  try {
    const userId = session.user.id;

    // Get or create user's organization
    console.log(`[Checkout] Looking up user ${userId}`);
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user[0]) {
      console.error(`[Checkout] User not found in database: ${userId}`);
      return res.status(404).json({ success: false, error: "User not found" });
    }
    console.log(`[Checkout] Found user: ${user[0].email}`);

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

    // Build checkout session options
    const checkoutOptions: Stripe.Checkout.SessionCreateParams = {
      customer: customer.id,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/settings/billing?canceled=true`,
      metadata: {
        organizationId: org.id,
        userId: userId,
        tier: tier,
        billingPeriod: billingPeriod,
      },
      subscription_data: {
        metadata: {
          organizationId: org.id,
          userId: userId,
          tier: tier,
          billingPeriod: billingPeriod,
        },
      },
      allow_promotion_codes: true, // Allow users to enter promo codes at checkout
    };

    // If a promo code was provided, validate and apply it
    if (promoCode) {
      try {
        const promoCodes = await stripe.promotionCodes.list({
          code: promoCode,
          active: true,
          limit: 1,
        });
        if (promoCodes.data.length > 0) {
          checkoutOptions.discounts = [{ promotion_code: promoCodes.data[0].id }];
          delete checkoutOptions.allow_promotion_codes; // Can't use both
        }
      } catch (promoError) {
        console.log(`[Checkout] Promo code ${promoCode} not found, allowing manual entry`);
      }
    }

    const checkoutSession = await stripe.checkout.sessions.create(checkoutOptions);

    console.log(`[Checkout] Created session for user ${userId}, tier: ${tier}, billing: ${billingPeriod}`);

    return res.status(200).json({
      success: true,
      checkoutUrl: checkoutSession.url || undefined,
    });
  } catch (error) {
    console.error("[Checkout] Error:", error);
    // Log full error details for Stripe errors
    if (error && typeof error === "object") {
      const stripeError = error as { type?: string; code?: string; message?: string; raw?: unknown };
      console.error("[Checkout] Error type:", stripeError.type);
      console.error("[Checkout] Error code:", stripeError.code);
      console.error("[Checkout] Error message:", stripeError.message);
      if (stripeError.raw) {
        console.error("[Checkout] Raw error:", JSON.stringify(stripeError.raw, null, 2));
      }
    }
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create checkout session",
    });
  }
}
