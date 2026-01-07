// pages/api/seo/search-ads.ts
// Search Ads 360 API - Get campaign performance and ad insights

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { getSearchAds360Data, SearchAds360Summary } from "../../../lib/google-apis";

interface SearchAdsResponse {
  success: boolean;
  data?: SearchAds360Summary;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SearchAdsResponse>
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
    // Get advertiser ID from query or environment variable
    const advertiserId = (req.query.advertiserId as string) ||
      process.env.SEARCH_ADS_360_ADVERTISER_ID;

    if (!advertiserId) {
      return res.status(400).json({
        success: false,
        error: "Search Ads 360 advertiser ID not configured. Set SEARCH_ADS_360_ADVERTISER_ID env var or pass advertiserId query param.",
      });
    }

    // Get days parameter (default 30)
    const days = parseInt(req.query.days as string) || 30;

    console.log(`[Search Ads API] Fetching data for advertiser ${advertiserId} (${days} days)`);

    const data = await getSearchAds360Data(advertiserId, days);

    if (!data) {
      return res.status(500).json({
        success: false,
        error: "Failed to fetch Search Ads 360 data. Ensure service account has proper access.",
      });
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[Search Ads API] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch ad insights",
    });
  }
}
