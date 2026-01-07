// lib/google-apis.ts
// Google API integrations for SEO features
// Supports: Search Console, PageSpeed Insights, Web Indexing
// Now with per-user OAuth support for multi-tenant SaaS

import { google, Auth } from "googleapis";
import { db, googleConnections, eq } from "./db";

// ============================================
// USER TOKEN MANAGEMENT
// ============================================

interface UserTokens {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
}

// Get user's Google connection from database
export async function getUserGoogleConnection(userId: string): Promise<UserTokens | null> {
  try {
    const connection = await db
      .select()
      .from(googleConnections)
      .where(eq(googleConnections.userId, userId))
      .limit(1);

    if (connection.length === 0 || !connection[0].isActive) {
      return null;
    }

    const conn = connection[0];

    // Check if token is expired and needs refresh
    if (conn.expiresAt && new Date(conn.expiresAt) < new Date()) {
      // Token expired, try to refresh
      const refreshed = await refreshUserToken(userId, conn.refreshToken);
      if (refreshed) {
        return refreshed;
      }
      return null;
    }

    return {
      accessToken: conn.accessToken,
      refreshToken: conn.refreshToken,
      expiresAt: conn.expiresAt,
    };
  } catch (error) {
    console.error("[Google APIs] Error getting user connection:", error);
    return null;
  }
}

// Refresh user's access token
async function refreshUserToken(userId: string, refreshToken: string | null): Promise<UserTokens | null> {
  if (!refreshToken) {
    console.log("[Google APIs] No refresh token available for user:", userId);
    // Mark connection as inactive
    await db
      .update(googleConnections)
      .set({ isActive: false, errorMessage: "No refresh token - please reconnect" })
      .where(eq(googleConnections.userId, userId));
    return null;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("[Google APIs] Missing OAuth credentials");
    return null;
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Google APIs] Token refresh failed:", error);
      await db
        .update(googleConnections)
        .set({ isActive: false, errorMessage: "Token refresh failed - please reconnect" })
        .where(eq(googleConnections.userId, userId));
      return null;
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    // Update token in database
    await db
      .update(googleConnections)
      .set({
        accessToken: data.access_token,
        expiresAt,
        lastRefreshedAt: new Date(),
        isActive: true,
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(googleConnections.userId, userId));

    return {
      accessToken: data.access_token,
      refreshToken,
      expiresAt,
    };
  } catch (error) {
    console.error("[Google APIs] Error refreshing token:", error);
    return null;
  }
}

// Create OAuth2 client from user tokens
function createUserOAuth2Client(tokens: UserTokens): Auth.OAuth2Client {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken || undefined,
  });

  return oauth2Client;
}

// Legacy: Initialize Google Auth for service account (for backwards compatibility)
function getGoogleAuth() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    return null;
  }

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: [
      "https://www.googleapis.com/auth/webmasters.readonly",
      "https://www.googleapis.com/auth/indexing",
      "https://www.googleapis.com/auth/doubleclicksearch",
    ],
  });
}

// ============================================
// GOOGLE SEARCH CONSOLE API
// ============================================

export interface SearchConsoleData {
  rows: Array<{
    keys: string[];
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
}

export interface TopQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface TopPage {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export async function getSearchConsoleData(
  siteUrl: string,
  startDate: string,
  endDate: string,
  dimensions: string[] = ["query"]
): Promise<SearchConsoleData | null> {
  const auth = getGoogleAuth();
  if (!auth) {
    console.log("[Search Console] No service account configured");
    return null;
  }

  try {
    const searchconsole = google.searchconsole({ version: "v1", auth });

    const response = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions,
        rowLimit: 25,
        startRow: 0,
      },
    });

    const rows = response.data.rows || [];
    const totals = rows.reduce(
      (acc: { clicks: number; impressions: number; ctr: number; position: number }, row) => ({
        clicks: acc.clicks + (row.clicks || 0),
        impressions: acc.impressions + (row.impressions || 0),
        ctr: 0,
        position: acc.position + (row.position || 0),
      }),
      { clicks: 0, impressions: 0, ctr: 0, position: 0 }
    );

    if (rows.length > 0) {
      totals.ctr = totals.clicks / totals.impressions;
      totals.position = totals.position / rows.length;
    }

    return {
      rows: rows.map((row) => ({
        keys: row.keys || [],
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      })),
      totals,
    };
  } catch (error) {
    console.error("[Search Console] API error:", error);
    return null;
  }
}

export async function getTopQueries(
  siteUrl: string,
  days: number = 28
): Promise<TopQuery[]> {
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const data = await getSearchConsoleData(siteUrl, startDate, endDate, ["query"]);
  if (!data) return [];

  return data.rows
    .map((row) => ({
      query: row.keys[0] || "",
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }))
    .sort((a, b) => b.clicks - a.clicks);
}

export async function getTopPages(
  siteUrl: string,
  days: number = 28
): Promise<TopPage[]> {
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const data = await getSearchConsoleData(siteUrl, startDate, endDate, ["page"]);
  if (!data) return [];

  return data.rows
    .map((row) => ({
      page: row.keys[0] || "",
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }))
    .sort((a, b) => b.clicks - a.clicks);
}

// ============================================
// PER-USER SEARCH CONSOLE API (OAuth)
// ============================================

// Get Search Console data using user's OAuth token
export async function getUserSearchConsoleData(
  userId: string,
  siteUrl: string,
  startDate: string,
  endDate: string,
  dimensions: string[] = ["query"]
): Promise<SearchConsoleData | null> {
  const tokens = await getUserGoogleConnection(userId);
  if (!tokens) {
    console.log("[Search Console] User not connected:", userId);
    return null;
  }

  try {
    const auth = createUserOAuth2Client(tokens);
    const searchconsole = google.searchconsole({ version: "v1", auth });

    const response = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions,
        rowLimit: 25,
        startRow: 0,
      },
    });

    const rows = response.data.rows || [];
    const totals = rows.reduce(
      (acc: { clicks: number; impressions: number; ctr: number; position: number }, row) => ({
        clicks: acc.clicks + (row.clicks || 0),
        impressions: acc.impressions + (row.impressions || 0),
        ctr: 0,
        position: acc.position + (row.position || 0),
      }),
      { clicks: 0, impressions: 0, ctr: 0, position: 0 }
    );

    if (rows.length > 0) {
      totals.ctr = totals.clicks / totals.impressions;
      totals.position = totals.position / rows.length;
    }

    return {
      rows: rows.map((row) => ({
        keys: row.keys || [],
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      })),
      totals,
    };
  } catch (error) {
    console.error("[Search Console] User API error:", error);
    return null;
  }
}

// Get top queries for a user's site
export async function getUserTopQueries(
  userId: string,
  siteUrl: string,
  days: number = 28
): Promise<TopQuery[]> {
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const data = await getUserSearchConsoleData(userId, siteUrl, startDate, endDate, ["query"]);
  if (!data) return [];

  return data.rows
    .map((row) => ({
      query: row.keys[0] || "",
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }))
    .sort((a, b) => b.clicks - a.clicks);
}

// Get top pages for a user's site
export async function getUserTopPages(
  userId: string,
  siteUrl: string,
  days: number = 28
): Promise<TopPage[]> {
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const data = await getUserSearchConsoleData(userId, siteUrl, startDate, endDate, ["page"]);
  if (!data) return [];

  return data.rows
    .map((row) => ({
      page: row.keys[0] || "",
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }))
    .sort((a, b) => b.clicks - a.clicks);
}

// Get list of Search Console sites the user has access to
export async function getUserSearchConsoleSites(
  userId: string
): Promise<Array<{ siteUrl: string; permissionLevel: string }> | null> {
  const tokens = await getUserGoogleConnection(userId);
  if (!tokens) {
    return null;
  }

  try {
    const auth = createUserOAuth2Client(tokens);
    const searchconsole = google.searchconsole({ version: "v1", auth });

    const response = await searchconsole.sites.list();
    const sites = response.data.siteEntry || [];

    return sites.map((site) => ({
      siteUrl: site.siteUrl || "",
      permissionLevel: site.permissionLevel || "unknown",
    }));
  } catch (error) {
    console.error("[Search Console] Error fetching user sites:", error);
    return null;
  }
}

// Request indexing for a user's URL
export async function requestUserIndexing(
  userId: string,
  url: string,
  type: "URL_UPDATED" | "URL_DELETED" = "URL_UPDATED"
): Promise<IndexingResult> {
  const tokens = await getUserGoogleConnection(userId);
  if (!tokens) {
    return {
      url,
      type,
      success: false,
      error: "Google account not connected",
    };
  }

  try {
    const auth = createUserOAuth2Client(tokens);
    const indexing = google.indexing({ version: "v3", auth });

    await indexing.urlNotifications.publish({
      requestBody: {
        url,
        type,
      },
    });

    return { url, type, success: true };
  } catch (error) {
    console.error("[Indexing] User API error:", error);
    return {
      url,
      type,
      success: false,
      error: error instanceof Error ? error.message : "Indexing request failed",
    };
  }
}

// ============================================
// PAGESPEED INSIGHTS API
// ============================================

export interface PageSpeedData {
  url: string;
  performanceScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  seoScore: number;
  coreWebVitals: {
    lcp: { value: number; rating: string }; // Largest Contentful Paint
    fid: { value: number; rating: string }; // First Input Delay
    cls: { value: number; rating: string }; // Cumulative Layout Shift
    fcp: { value: number; rating: string }; // First Contentful Paint
    ttfb: { value: number; rating: string }; // Time to First Byte
  };
  opportunities: Array<{
    title: string;
    description: string;
    savings: string;
  }>;
}

export async function getPageSpeedInsights(
  url: string,
  strategy: "mobile" | "desktop" = "mobile"
): Promise<PageSpeedData | null> {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;

  if (!apiKey) {
    console.log("[PageSpeed] No API key configured");
    return null;
  }

  try {
    const apiUrl = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
    apiUrl.searchParams.set("url", url);
    apiUrl.searchParams.set("key", apiKey);
    apiUrl.searchParams.set("strategy", strategy);
    apiUrl.searchParams.set("category", "performance");
    apiUrl.searchParams.set("category", "accessibility");
    apiUrl.searchParams.set("category", "best-practices");
    apiUrl.searchParams.set("category", "seo");

    const response = await fetch(apiUrl.toString());

    if (!response.ok) {
      console.error("[PageSpeed] API error:", response.status);
      return null;
    }

    const data = await response.json();
    const lighthouse = data.lighthouseResult;
    const categories = lighthouse?.categories || {};
    const audits = lighthouse?.audits || {};

    // Extract Core Web Vitals
    const getLcpRating = (ms: number) => ms <= 2500 ? "good" : ms <= 4000 ? "needs-improvement" : "poor";
    const getFidRating = (ms: number) => ms <= 100 ? "good" : ms <= 300 ? "needs-improvement" : "poor";
    const getClsRating = (score: number) => score <= 0.1 ? "good" : score <= 0.25 ? "needs-improvement" : "poor";
    const getFcpRating = (ms: number) => ms <= 1800 ? "good" : ms <= 3000 ? "needs-improvement" : "poor";
    const getTtfbRating = (ms: number) => ms <= 800 ? "good" : ms <= 1800 ? "needs-improvement" : "poor";

    const lcpValue = audits["largest-contentful-paint"]?.numericValue || 0;
    const fidValue = audits["max-potential-fid"]?.numericValue || 0;
    const clsValue = audits["cumulative-layout-shift"]?.numericValue || 0;
    const fcpValue = audits["first-contentful-paint"]?.numericValue || 0;
    const ttfbValue = audits["server-response-time"]?.numericValue || 0;

    // Extract opportunities
    const opportunities: PageSpeedData["opportunities"] = [];
    const opportunityAudits = [
      "render-blocking-resources",
      "unused-css-rules",
      "unused-javascript",
      "modern-image-formats",
      "efficiently-encode-images",
      "defer-offscreen-images",
    ];

    for (const auditId of opportunityAudits) {
      const audit = audits[auditId];
      if (audit && audit.score !== null && audit.score < 1) {
        opportunities.push({
          title: audit.title || auditId,
          description: audit.description || "",
          savings: audit.displayValue || "",
        });
      }
    }

    return {
      url,
      performanceScore: Math.round((categories.performance?.score || 0) * 100),
      accessibilityScore: Math.round((categories.accessibility?.score || 0) * 100),
      bestPracticesScore: Math.round((categories["best-practices"]?.score || 0) * 100),
      seoScore: Math.round((categories.seo?.score || 0) * 100),
      coreWebVitals: {
        lcp: { value: Math.round(lcpValue), rating: getLcpRating(lcpValue) },
        fid: { value: Math.round(fidValue), rating: getFidRating(fidValue) },
        cls: { value: Math.round(clsValue * 1000) / 1000, rating: getClsRating(clsValue) },
        fcp: { value: Math.round(fcpValue), rating: getFcpRating(fcpValue) },
        ttfb: { value: Math.round(ttfbValue), rating: getTtfbRating(ttfbValue) },
      },
      opportunities: opportunities.slice(0, 5),
    };
  } catch (error) {
    console.error("[PageSpeed] Error:", error);
    return null;
  }
}

// ============================================
// WEB INDEXING API
// ============================================

export interface IndexingResult {
  url: string;
  type: "URL_UPDATED" | "URL_DELETED";
  success: boolean;
  error?: string;
}

export async function requestIndexing(
  url: string,
  type: "URL_UPDATED" | "URL_DELETED" = "URL_UPDATED"
): Promise<IndexingResult> {
  const auth = getGoogleAuth();
  if (!auth) {
    return {
      url,
      type,
      success: false,
      error: "No service account configured",
    };
  }

  try {
    const indexing = google.indexing({ version: "v3", auth });

    await indexing.urlNotifications.publish({
      requestBody: {
        url,
        type,
      },
    });

    return { url, type, success: true };
  } catch (error) {
    console.error("[Indexing] API error:", error);
    return {
      url,
      type,
      success: false,
      error: error instanceof Error ? error.message : "Indexing request failed",
    };
  }
}

export async function getIndexingStatus(url: string): Promise<{
  url: string;
  lastCrawlTime?: string;
  lastSubmitTime?: string;
  error?: string;
} | null> {
  const auth = getGoogleAuth();
  if (!auth) return null;

  try {
    const indexing = google.indexing({ version: "v3", auth });

    const response = await indexing.urlNotifications.getMetadata({
      url,
    });

    return {
      url,
      lastCrawlTime: response.data.latestUpdate?.notifyTime || undefined,
      lastSubmitTime: response.data.latestRemove?.notifyTime || undefined,
    };
  } catch (error) {
    console.error("[Indexing] Status check error:", error);
    return null;
  }
}

// ============================================
// SEARCH ADS 360 API
// ============================================

export interface SearchAds360Report {
  campaignId: string;
  campaignName: string;
  clicks: number;
  impressions: number;
  cost: number;
  conversions: number;
  ctr: number;
  avgCpc: number;
  conversionRate: number;
}

export interface SearchAds360Summary {
  totalClicks: number;
  totalImpressions: number;
  totalCost: number;
  totalConversions: number;
  avgCtr: number;
  avgCpc: number;
  campaigns: SearchAds360Report[];
  dateRange: { startDate: string; endDate: string };
}

export async function getSearchAds360Data(
  customerId: string,
  days: number = 30
): Promise<SearchAds360Summary | null> {
  const auth = getGoogleAuth();
  if (!auth) {
    console.log("[Search Ads 360] No service account configured");
    return null;
  }

  try {
    // Search Ads 360 uses the doubleclicksearch API
    const sa360 = google.doubleclicksearch({ version: "v2", auth });

    const endDate = new Date();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Format dates for SA360 (YYYY-MM-DD)
    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    // Request campaign performance report
    const response = await sa360.reports.generate({
      requestBody: {
        reportScope: {
          advertiserId: customerId,
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
    const campaigns: SearchAds360Report[] = rows.map((row: any) => {
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

    return {
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
  } catch (error) {
    console.error("[Search Ads 360] API error:", error);
    return null;
  }
}

// Get advertiser accounts linked to the service account
export async function getSearchAds360Advertisers(): Promise<
  Array<{ id: string; name: string }> | null
> {
  const auth = getGoogleAuth();
  if (!auth) return null;

  try {
    const sa360 = google.doubleclicksearch({ version: "v2", auth });

    // This would typically require agency-level access
    // For now, return null and let the user configure their advertiser ID
    console.log("[Search Ads 360] Advertiser listing requires agency access");
    return null;
  } catch (error) {
    console.error("[Search Ads 360] Error fetching advertisers:", error);
    return null;
  }
}

// ============================================
// COMBINED SEO ANALYSIS
// ============================================

export interface SEOAnalysis {
  searchConsole?: {
    topQueries: TopQuery[];
    topPages: TopPage[];
    totals: SearchConsoleData["totals"];
  };
  pageSpeed?: PageSpeedData;
  indexingStatus?: {
    lastCrawlTime?: string;
    lastSubmitTime?: string;
  };
}

export async function getComprehensiveSEOAnalysis(
  siteUrl: string,
  pageUrl?: string
): Promise<SEOAnalysis> {
  const analysis: SEOAnalysis = {};

  // Run all API calls in parallel
  const [topQueries, topPages, pageSpeed, indexing] = await Promise.all([
    getTopQueries(siteUrl, 28).catch(() => []),
    getTopPages(siteUrl, 28).catch(() => []),
    pageUrl ? getPageSpeedInsights(pageUrl, "mobile").catch(() => null) : Promise.resolve(null),
    pageUrl ? getIndexingStatus(pageUrl).catch(() => null) : Promise.resolve(null),
  ]);

  // Aggregate Search Console data
  if (topQueries.length > 0 || topPages.length > 0) {
    const totals = {
      clicks: topQueries.reduce((sum, q) => sum + q.clicks, 0),
      impressions: topQueries.reduce((sum, q) => sum + q.impressions, 0),
      ctr: 0,
      position: topQueries.length > 0
        ? topQueries.reduce((sum, q) => sum + q.position, 0) / topQueries.length
        : 0,
    };
    totals.ctr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0;

    analysis.searchConsole = {
      topQueries,
      topPages,
      totals,
    };
  }

  if (pageSpeed) {
    analysis.pageSpeed = pageSpeed;
  }

  if (indexing) {
    analysis.indexingStatus = {
      lastCrawlTime: indexing.lastCrawlTime,
      lastSubmitTime: indexing.lastSubmitTime,
    };
  }

  return analysis;
}
