// pages/api/billing/subscription.ts
// Get subscription details and invoices from Stripe

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { db, users, organizations, eq } from "../../../lib/db";
import { stripe, SUBSCRIPTION_TIERS, TierKey } from "../../../lib/stripe";

interface Invoice {
  id: string;
  amount: number;
  status: string;
  date: string;
  pdfUrl: string | null;
}

interface SubscriptionDetails {
  tier: string;
  tierName: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  monthlyPrice: number;
  billingPeriod: "monthly" | "annual";
  paymentMethod: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null;
  invoices: Invoice[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Get user and organization
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user[0]?.organizationId) {
      return res.status(200).json({
        subscription: null,
        message: "No subscription found",
      });
    }

    const org = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, user[0].organizationId))
      .limit(1);

    if (!org[0]) {
      return res.status(200).json({
        subscription: null,
        message: "No organization found",
      });
    }

    // If no Stripe subscription, return basic info
    if (!org[0].stripeSubscriptionId || !org[0].stripeCustomerId) {
      const tierConfig = SUBSCRIPTION_TIERS[org[0].subscriptionTier as TierKey];
      return res.status(200).json({
        subscription: {
          tier: org[0].subscriptionTier,
          tierName: tierConfig?.name || "Free",
          status: org[0].subscriptionStatus || "inactive",
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          monthlyPrice: tierConfig?.priceMonthly || 0,
          billingPeriod: "monthly",
          paymentMethod: null,
          invoices: [],
        },
      });
    }

    // Get subscription from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(
      org[0].stripeSubscriptionId,
      { expand: ["default_payment_method"] }
    ) as unknown as {
      status: string;
      current_period_end: number;
      cancel_at_period_end: boolean;
      items: { data: Array<{ price?: { id?: string } }> };
      default_payment_method?: {
        type?: string;
        card?: {
          brand?: string;
          last4?: string;
          exp_month?: number;
          exp_year?: number;
        };
      };
    };

    // Get invoices
    const stripeInvoices = await stripe.invoices.list({
      customer: org[0].stripeCustomerId,
      limit: 10,
    });

    // Determine billing period from price
    const priceId = stripeSubscription.items.data[0]?.price?.id;
    let billingPeriod: "monthly" | "annual" = "monthly";
    let detectedTier: string = org[0].subscriptionTier || "starter";

    // Check which tier and period this price belongs to
    for (const [tierKey, tierConfig] of Object.entries(SUBSCRIPTION_TIERS)) {
      if (tierConfig.stripePriceId === priceId) {
        detectedTier = tierKey;
        billingPeriod = "monthly";
        break;
      }
      if (tierConfig.stripeAnnualPriceId === priceId) {
        detectedTier = tierKey;
        billingPeriod = "annual";
        break;
      }
    }

    const tierConfig = SUBSCRIPTION_TIERS[detectedTier as TierKey];

    // Extract payment method details
    let paymentMethod = null;
    const pm = stripeSubscription.default_payment_method;
    if (pm && typeof pm === "object" && pm.type === "card" && pm.card) {
      paymentMethod = {
        brand: pm.card.brand || "unknown",
        last4: pm.card.last4 || "****",
        expMonth: pm.card.exp_month || 0,
        expYear: pm.card.exp_year || 0,
      };
    }

    // Format invoices
    const invoices: Invoice[] = stripeInvoices.data.map((inv) => ({
      id: inv.id,
      amount: inv.amount_paid / 100,
      status: inv.status || "unknown",
      date: new Date(inv.created * 1000).toISOString(),
      pdfUrl: inv.invoice_pdf ?? null,
    }));

    const subscription: SubscriptionDetails = {
      tier: detectedTier,
      tierName: tierConfig?.name || detectedTier,
      status: stripeSubscription.status,
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      monthlyPrice: billingPeriod === "annual" 
        ? (tierConfig?.priceAnnual || 0) / 12 
        : (tierConfig?.priceMonthly || 0),
      billingPeriod,
      paymentMethod,
      invoices,
    };

    return res.status(200).json({ subscription });
  } catch (error) {
    console.error("[Subscription] Error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch subscription",
    });
  }
}
