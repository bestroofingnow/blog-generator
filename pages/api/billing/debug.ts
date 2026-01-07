// pages/api/billing/debug.ts
// Debug endpoint to check all Stripe env vars for issues

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { stripe } from "../../../lib/stripe";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check all STRIPE env vars for newlines/whitespace
  const stripeEnvVars = Object.keys(process.env)
    .filter(k => k.startsWith('STRIPE'))
    .map(key => {
      const value = process.env[key] || "";
      return {
        key,
        length: value.length,
        hasNewline: value.includes('\n'),
        hasCarriageReturn: value.includes('\r'),
        hasLeadingSpace: value.startsWith(' '),
        hasTrailingSpace: value.endsWith(' '),
        prefix: value.substring(0, 10),
        suffix: value.substring(value.length - 5),
      };
    });

  // Check NEXTAUTH_URL
  const nextAuthUrl = process.env.NEXTAUTH_URL || "";
  const baseUrlDiagnostics = {
    value: nextAuthUrl,
    hasNewline: nextAuthUrl.includes('\n'),
    hasCarriageReturn: nextAuthUrl.includes('\r'),
    hasTrailingSlash: nextAuthUrl.endsWith('/'),
    hasTrailingSpace: nextAuthUrl.endsWith(' '),
  };

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
  let stripeApiTest = { working: false, error: "", errorType: "" };
  try {
    await stripe.customers.list({ limit: 1 });
    stripeApiTest = { working: true, error: "", errorType: "" };
  } catch (err: unknown) {
    const stripeErr = err as { message?: string; type?: string };
    stripeApiTest.error = stripeErr.message || "Unknown error";
    stripeApiTest.errorType = stripeErr.type || "";
  }

  return res.status(200).json({
    session: sessionInfo,
    stripeApiTest,
    baseUrl: baseUrlDiagnostics,
    stripeEnvVars,
  });
}
