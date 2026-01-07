// pages/api/seo/search-ads.ts
// Search Ads 360 API - Get campaign performance and ad insights
// Now supports per-user OAuth

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import {
  getUserAdsConnection,
  getUserAdsConnectionDetails,
  SearchAds360Summary
} from "../../../lib/google-apis";
import { google } from "googleapis";

interface SearchAdsResponse {
  success: boolean;
  data?: SearchAds360Summary;
  connected?: boolean;
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
  if (!session?.user?.id) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const userId = session.user.id;

  try {
    // Check if user has connected their ads account
    const connectionDetails = await getUserAdsConnectionDetails(userId);

    if (!connectionDetails.connected) {
      return res.status(200).json({
        success: false,
        connected: false,
        error: "Search Ads 360 not connected. Please connect your Google Ads account.",
      });
    }

    // Get user's OAuth tokens
    const tokens = await getUserAdsConnection(userId);
    if (!tokens) {
      return res.status(200).json({
        success: false,
        connected: false,
        error: "Session expired. Please reconnect your Google Ads account.",
      });
    }

    // Get advertiser ID from connection or query
    const advertiserId = (req.query.advertiserId as string) || connectionDetails.advertiserId;

    if (!advertiserId) {
      return res.status(200).json({
        success: true,
        connected: true,
        error: "No advertiser selected. Please select an advertiser account.",
        data: undefined,
      });
    }

    // Get days parameter (default 30)
    const days = parseInt(req.query.days as string) || 30;

    console.log(`[Search Ads API] Fetching data for user ${userId}, advertiser ${advertiserId} (${days} days)`);

    // Create OAuth client from user tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken || undefined,
    });

    // Use Search Ads 360 API with user auth
    const sa360 = google.doubleclicksearch({ version: "v2", auth: oauth2Client });

    const endDate = new Date();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    // Request campaign performance report
    const response = await sa360.reports.generate({
      requestBody: {
        reportScope: {
          advertiserId: advertiserId,
        },
        reportType: "campaign",
        columns: [
          { columnName: "campaignId" },
          { columnName: "campaign" },
          { columnName: "clicks" },
          { columnName: "impr" },
          { columnName: "cost" },
          { columnName: "conv" },
        ],
        timeRange: {
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
        },
        statisticsCurrency: "usd",
      },
    });

    const rows = response.data.rows || [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const campaigns = rows.map((row: any) => {
      const clicks = Number(row.clicks) || 0;
      const impressions = Number(row.impr) || 0;
      const cost = Number(row.cost) || 0;
      const conversions = Number(row.conv) || 0;

      return {
        campaignId: String(row.campaignId || ""),
        campaignName: String(row.campaign || "Unknown"),
        clicks,
        impressions,
        cost: cost / 1000000, // SA360 returns cost in micros
        conversions,
        ctr: impressions > 0 ? clicks / impressions : 0,
        avgCpc: clicks > 0 ? cost / 1000000 / clicks : 0,
        conversionRate: clicks > 0 ? conversions / clicks : 0,
      };
    });

    // Calculate totals
    const totals = campaigns.reduce(
      (acc, campaign) => ({
        clicks: acc.clicks + campaign.clicks,
        impressions: acc.impressions + campaign.impressions,
        cost: acc.cost + campaign.cost,
        conversions: acc.conversions + campaign.conversions,
      }),
      { clicks: 0, impressions: 0, cost: 0, conversions: 0 }
    );

    const data: SearchAds360Summary = {
      totalClicks: totals.clicks,
      totalImpressions: totals.impressions,
      totalCost: totals.cost,
      totalConversions: totals.conversions,
      avgCtr: totals.impressions > 0 ? totals.clicks / totals.impressions : 0,
      avgCpc: totals.clicks > 0 ? totals.cost / totals.clicks : 0,
      campaigns: campaigns.sort((a, b) => b.clicks - a.clicks),
      dateRange: {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
      },
    };

    return res.status(200).json({
      success: true,
      connected: true,
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
