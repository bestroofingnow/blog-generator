// pages/api/billing/portal.ts
// Create Stripe Billing Portal session for customer self-service

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import {
  db,
  users,
  organizations,
  eq,
} from "../../../lib/db";
import { createBillingPortalSession } from "../../../lib/stripe";

interface PortalResponse {
  success: boolean;
  portalUrl?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PortalResponse>
) {
  if (req.method !== "POST") {
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

    if (!user[0] || !user[0].organizationId) {
      return res.status(400).json({
        success: false,
        error: "No billing account found",
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

    // Only organization owners can access billing portal
    if (org[0].ownerId !== userId) {
      return res.status(403).json({
        success: false,
        error: "Only organization owners can access the billing portal",
      });
    }

    if (!org[0].stripeCustomerId) {
      return res.status(400).json({
        success: false,
        error: "No billing account found. Please subscribe first.",
      });
    }

    // Create billing portal session
    const baseUrl = process.env.NEXTAUTH_URL?.trim() || "http://localhost:3000";
    const portalSession = await createBillingPortalSession(
      org[0].stripeCustomerId,
      `${baseUrl}/settings/billing`
    );

    console.log(`[Portal] Created portal session for org ${org[0].id}`);

    return res.status(200).json({
      success: true,
      portalUrl: portalSession.url,
    });
  } catch (error) {
    console.error("[Portal] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create portal session",
    });
  }
}
