// pages/api/seo/dashboard.ts
// Combined SEO Dashboard API - Aggregates all SEO data sources
// Uses per-user OAuth for Search Console data

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { db, googleConnections, eq } from "../../../lib/db";
import {
  getUserTopQueries,
  getUserTopPages,
  getPageSpeedInsights,
  TopQuery,
  TopPage,
  PageSpeedData,
} from "../../../lib/google-apis";

interface SEODashboardData {
  siteUrl: string;
  searchConsole?: {
    topQueries: TopQuery[];
    topPages: TopPage[];
    totals: {
      clicks: number;
      impressions: number;
      ctr: number;
      avgPosition: number;
    };
    dateRange: { startDate: string; endDate: string };
  };
  pageSpeed?: {
    mobile?: PageSpeedData;
    desktop?: PageSpeedData;
  };
  seoScore?: {
    overall: number;
    breakdown: {
      performance: number;
      accessibility: number;
      bestPractices: number;
      seo: number;
    };
    recommendations: string[];
  };
}

interface DashboardResponse {
  success: boolean;
  data?: SEODashboardData;
  error?: string;
  needsConnection?: boolean;
  needsSiteSelection?: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DashboardResponse>
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

    // Get user's Google connection
    const connection = await db
      .select()
      .from(googleConnections)
      .where(eq(googleConnections.userId, userId))
      .limit(1);

    const googleConnection = connection[0];
    let siteUrl = googleConnection?.connectedSiteUrl || "";

    // If no site URL configured, check if they have a connection
    if (!siteUrl && googleConnection) {
      return res.status(400).json({
        success: false,
        error: "Please select a website in your Google Search Console connection settings",
        needsSiteSelection: true,
      });
    }

    if (!googleConnection) {
      return res.status(400).json({
        success: false,
        error: "Google Search Console not connected. Please connect your account in Settings.",
        needsConnection: true,
      });
    }

    // Ensure URL has protocol for PageSpeed
    let pageSpeedUrl = siteUrl;
    if (pageSpeedUrl && !pageSpeedUrl.startsWith("http://") && !pageSpeedUrl.startsWith("https://")) {
      pageSpeedUrl = "https://" + pageSpeedUrl.replace("sc-domain:", "");
    }

    console.log(`[SEO Dashboard] Fetching data for ${siteUrl} (user: ${userId})`);

    const days = 28;
    const dashboardData: SEODashboardData = { siteUrl };

    // Fetch all data in parallel - using user's OAuth for Search Console
    const [topQueries, topPages, mobilePageSpeed, desktopPageSpeed] = await Promise.all([
      getUserTopQueries(userId, siteUrl, days).catch((e) => {
        console.log("[SEO Dashboard] Search Console not available:", e.message);
        return [] as TopQuery[];
      }),
      getUserTopPages(userId, siteUrl, days).catch((e) => {
        console.log("[SEO Dashboard] Search Console pages not available:", e.message);
        return [] as TopPage[];
      }),
      pageSpeedUrl ? getPageSpeedInsights(pageSpeedUrl, "mobile").catch((e) => {
        console.log("[SEO Dashboard] Mobile PageSpeed not available:", e.message);
        return null;
      }) : Promise.resolve(null),
      pageSpeedUrl ? getPageSpeedInsights(pageSpeedUrl, "desktop").catch((e) => {
        console.log("[SEO Dashboard] Desktop PageSpeed not available:", e.message);
        return null;
      }) : Promise.resolve(null),
    ]);

    // Search Console data
    if (topQueries.length > 0 || topPages.length > 0) {
      const totals = {
        clicks: topQueries.reduce((sum, q) => sum + q.clicks, 0),
        impressions: topQueries.reduce((sum, q) => sum + q.impressions, 0),
        ctr: 0,
        avgPosition: topQueries.length > 0
          ? topQueries.reduce((sum, q) => sum + q.position, 0) / topQueries.length
          : 0,
      };
      totals.ctr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0;

      const endDate = new Date().toISOString().split("T")[0];
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      dashboardData.searchConsole = {
        topQueries: topQueries.slice(0, 15),
        topPages: topPages.slice(0, 15),
        totals,
        dateRange: { startDate, endDate },
      };
    }

    // PageSpeed data
    if (mobilePageSpeed || desktopPageSpeed) {
      dashboardData.pageSpeed = {};
      if (mobilePageSpeed) dashboardData.pageSpeed.mobile = mobilePageSpeed;
      if (desktopPageSpeed) dashboardData.pageSpeed.desktop = desktopPageSpeed;
    }

    // Calculate overall SEO score
    if (mobilePageSpeed) {
      const recommendations: string[] = [];

      // Add recommendations based on scores
      if (mobilePageSpeed.performanceScore < 50) {
        recommendations.push("Performance needs significant improvement - consider optimizing images and reducing JavaScript");
      } else if (mobilePageSpeed.performanceScore < 90) {
        recommendations.push("Performance can be improved - check Core Web Vitals");
      }

      if (mobilePageSpeed.seoScore < 90) {
        recommendations.push("SEO score needs attention - ensure proper meta tags and structured data");
      }

      if (mobilePageSpeed.accessibilityScore < 90) {
        recommendations.push("Improve accessibility - add alt tags and proper heading structure");
      }

      // Add CWV recommendations
      if (mobilePageSpeed.coreWebVitals.lcp.rating !== "good") {
        recommendations.push(`LCP is ${mobilePageSpeed.coreWebVitals.lcp.rating} - optimize largest content element loading`);
      }
      if (mobilePageSpeed.coreWebVitals.cls.rating !== "good") {
        recommendations.push(`CLS is ${mobilePageSpeed.coreWebVitals.cls.rating} - fix layout shifts`);
      }

      // Add opportunity recommendations
      for (const opp of mobilePageSpeed.opportunities.slice(0, 2)) {
        if (opp.savings) {
          recommendations.push(`${opp.title}: ${opp.savings}`);
        }
      }

      const overallScore = Math.round(
        (mobilePageSpeed.performanceScore +
          mobilePageSpeed.accessibilityScore +
          mobilePageSpeed.bestPracticesScore +
          mobilePageSpeed.seoScore) /
          4
      );

      dashboardData.seoScore = {
        overall: overallScore,
        breakdown: {
          performance: mobilePageSpeed.performanceScore,
          accessibility: mobilePageSpeed.accessibilityScore,
          bestPractices: mobilePageSpeed.bestPracticesScore,
          seo: mobilePageSpeed.seoScore,
        },
        recommendations: recommendations.slice(0, 5),
      };
    }

    return res.status(200).json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error("[SEO Dashboard] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch SEO dashboard data",
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
  maxDuration: 90, // Allow time for multiple API calls
};
