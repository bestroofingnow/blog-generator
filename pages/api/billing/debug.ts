// pages/api/billing/debug.ts
// Debug endpoint to check Stripe configuration (remove in production)

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { SUBSCRIPTION_TIERS, stripe } from "../../../lib/stripe";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Test session
  let sessionInfo = { hasSession: false, userId: "", error: "" };
  try {
    const session = await getServerSession(req, res, authOptions);
    sessionInfo = {
      hasSession: !!session,
      userId: session?.user?.id || "NO_ID",
      error: "",
    };
  } catch (err) {
    sessionInfo.error = err instanceof Error ? err.message : "Unknown error";
  }

  // Test Stripe API
  let stripeApiTest = { working: false, error: "" };
  try {
    const customers = await stripe.customers.list({ limit: 1 });
    stripeApiTest = { working: true, error: "" };
  } catch (err) {
    stripeApiTest.error = err instanceof Error ? err.message : "Unknown Stripe error";
  }

  const config = {
    stripeKeyConfigured: !!process.env.STRIPE_SECRET_KEY,
    stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7) || "NOT_SET",
    webhookSecretConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
    envVarsWithStripe: Object.keys(process.env).filter(k => k.startsWith('STRIPE')),
    tiers: {
      starter: {
        stripePriceId: SUBSCRIPTION_TIERS.starter.stripePriceId ? "SET" : "EMPTY",
        stripeAnnualPriceId: SUBSCRIPTION_TIERS.starter.stripeAnnualPriceId ? "SET" : "EMPTY",
        // Also check direct env var
        envPriceId: process.env.STRIPE_STARTER_PRICE_ID ? "SET" : "EMPTY",
        envAnnualPriceId: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID ? "SET" : "EMPTY",
      },
      pro: {
        stripePriceId: SUBSCRIPTION_TIERS.pro.stripePriceId ? "SET" : "EMPTY",
        stripeAnnualPriceId: SUBSCRIPTION_TIERS.pro.stripeAnnualPriceId ? "SET" : "EMPTY",
        envPriceId: process.env.STRIPE_PRO_PRICE_ID ? "SET" : "EMPTY",
        envAnnualPriceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID ? "SET" : "EMPTY",
      },
      agency: {
        stripePriceId: SUBSCRIPTION_TIERS.agency.stripePriceId ? "SET" : "EMPTY",
        stripeAnnualPriceId: SUBSCRIPTION_TIERS.agency.stripeAnnualPriceId ? "SET" : "EMPTY",
        envPriceId: process.env.STRIPE_AGENCY_PRICE_ID ? "SET" : "EMPTY",
        envAnnualPriceId: process.env.STRIPE_AGENCY_ANNUAL_PRICE_ID ? "SET" : "EMPTY",
      },
    },
  };

  return res.status(200).json({
    session: sessionInfo,
    stripeApiTest,
    ...config,
  });
}
