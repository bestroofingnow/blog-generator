// pages/api/seo/search-console.ts
// Google Search Console API - Get real ranking data, impressions, clicks

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { loadUserProfile } from "../../../lib/database";
import { getTopQueries, getTopPages, getSearchConsoleData } from "../../../lib/google-apis";

interface SearchConsoleResponse {
  success: boolean;
  data?: {
    topQueries: Array<{
      query: string;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }>;
    topPages: Array<{
      page: string;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }>;
    totals: {
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    };
    dateRange: {
      startDate: string;
      endDate: string;
    };
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SearchConsoleResponse>
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
    const userId = (session.user as { id?: string }).id || session.user?.email || "";
    const userProfile = await loadUserProfile(userId);
    const siteUrl = userProfile?.companyProfile?.website;

    if (!siteUrl) {
      return res.status(400).json({
        success: false,
        error: "No website URL configured in company profile",
      });
    }

    // Get days parameter (default 28)
    const days = parseInt(req.query.days as string) || 28;

    // Fetch data in parallel
    const [topQueries, topPages] = await Promise.all([
      getTopQueries(siteUrl, days),
      getTopPages(siteUrl, days),
    ]);

    // Calculate totals
    const totals = {
      clicks: topQueries.reduce((sum, q) => sum + q.clicks, 0),
      impressions: topQueries.reduce((sum, q) => sum + q.impressions, 0),
      ctr: 0,
      position: topQueries.length > 0
        ? topQueries.reduce((sum, q) => sum + q.position, 0) / topQueries.length
        : 0,
    };
    totals.ctr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0;

    // Calculate date range
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    return res.status(200).json({
      success: true,
      data: {
        topQueries: topQueries.slice(0, 20),
        topPages: topPages.slice(0, 20),
        totals,
        dateRange: { startDate, endDate },
      },
    });
  } catch (error) {
    console.error("[Search Console API] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch Search Console data",
    });
  }
}
