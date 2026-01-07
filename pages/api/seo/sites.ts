// pages/api/seo/sites.ts
// Get list of Search Console sites the user has access to

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { getUserSearchConsoleSites } from "../../../lib/google-apis";

interface SitesResponse {
  success: boolean;
  sites?: Array<{ siteUrl: string; permissionLevel: string }>;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SitesResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // Auth check
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  try {
    const userId = session.user.id;
    const sites = await getUserSearchConsoleSites(userId);

    if (!sites) {
      return res.status(400).json({
        success: false,
        error: "Google Search Console not connected",
      });
    }

    return res.status(200).json({
      success: true,
      sites,
    });
  } catch (error) {
    console.error("[Sites API] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch sites",
    });
  }
}
