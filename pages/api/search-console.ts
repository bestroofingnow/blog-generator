// pages/api/search-console.ts
// Fetches keyword data from Google Search Console

import { NextApiRequest, NextApiResponse } from "next";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

interface SearchConsoleRequest {
  accessToken: string;
  refreshToken?: string;
  siteUrl: string;
  startDate?: string;
  endDate?: string;
  dimensions?: string[];
  rowLimit?: number;
}

interface SearchConsoleRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

// Refresh access token if needed
async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return null;
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.access_token;
    }
  } catch (error) {
    console.error("Token refresh failed:", error);
  }
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    accessToken,
    refreshToken,
    siteUrl,
    startDate,
    endDate,
    dimensions = ["query"],
    rowLimit = 100,
  }: SearchConsoleRequest = req.body;

  if (!accessToken || !siteUrl) {
    return res.status(400).json({ error: "Missing required parameters: accessToken and siteUrl" });
  }

  // Calculate date range (default: last 28 days)
  const end = endDate || new Date().toISOString().split("T")[0];
  const start = startDate || new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  let currentToken = accessToken;

  // Try the request, refresh token if needed
  const makeRequest = async (token: string) => {
    const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;

    return fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: start,
        endDate: end,
        dimensions,
        rowLimit,
        dimensionFilterGroups: [],
      }),
    });
  };

  try {
    let response = await makeRequest(currentToken);

    // If unauthorized and we have a refresh token, try refreshing
    if (response.status === 401 && refreshToken) {
      const newToken = await refreshAccessToken(refreshToken);
      if (newToken) {
        currentToken = newToken;
        response = await makeRequest(currentToken);
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Search Console API error:", errorText);

      if (response.status === 403) {
        return res.status(403).json({
          error: "Access denied",
          message: "You don't have access to this site in Search Console. Make sure the site is verified.",
        });
      }

      return res.status(response.status).json({
        error: "Search Console API error",
        details: errorText,
      });
    }

    const data = await response.json();

    // Process and return the data
    const keywords = (data.rows || []).map((row: SearchConsoleRow) => ({
      keyword: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: (row.ctr * 100).toFixed(2) + "%",
      position: row.position.toFixed(1),
      // Additional dimensions if requested
      ...(dimensions.length > 1 && row.keys.length > 1
        ? { page: row.keys[1], country: row.keys[2], device: row.keys[3] }
        : {}),
    }));

    return res.status(200).json({
      keywords,
      dateRange: { start, end },
      totalRows: data.rows?.length || 0,
      newAccessToken: currentToken !== accessToken ? currentToken : undefined,
    });
  } catch (error) {
    console.error("Search Console fetch error:", error);
    return res.status(500).json({ error: "Failed to fetch Search Console data" });
  }
}
