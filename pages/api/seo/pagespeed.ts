// pages/api/seo/pagespeed.ts
// Google PageSpeed Insights API - Get Core Web Vitals and performance scores

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { loadUserProfile } from "../../../lib/database";
import { getPageSpeedInsights, PageSpeedData } from "../../../lib/google-apis";

interface PageSpeedResponse {
  success: boolean;
  data?: PageSpeedData;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PageSpeedResponse>
) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // Auth check
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  try {
    // Get URL from query or body
    let url = (req.query.url as string) || (req.body?.url as string);
    const strategy = ((req.query.strategy as string) || (req.body?.strategy as string) || "mobile") as "mobile" | "desktop";

    // If no URL provided, use company website
    if (!url) {
      const userId = (session.user as { id?: string }).id || session.user?.email || "";
      const userProfile = await loadUserProfile(userId);
      url = userProfile?.companyProfile?.website || "";
    }

    if (!url) {
      return res.status(400).json({
        success: false,
        error: "URL is required. Provide a URL or set your company website in profile.",
      });
    }

    // Ensure URL has protocol
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    console.log(`[PageSpeed API] Analyzing ${url} (${strategy})`);

    const data = await getPageSpeedInsights(url, strategy);

    if (!data) {
      return res.status(500).json({
        success: false,
        error: "Failed to fetch PageSpeed data. Check if GOOGLE_PAGESPEED_API_KEY is configured.",
      });
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[PageSpeed API] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to analyze page speed",
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
  maxDuration: 60, // PageSpeed analysis can take time
};
