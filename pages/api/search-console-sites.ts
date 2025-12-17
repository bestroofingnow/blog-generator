// pages/api/search-console-sites.ts
// Lists all sites the user has access to in Google Search Console

import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { accessToken } = req.body;

  if (!accessToken) {
    return res.status(400).json({ error: "Missing accessToken" });
  }

  try {
    const response = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Sites list error:", errorText);
      return res.status(response.status).json({ error: "Failed to fetch sites", details: errorText });
    }

    const data = await response.json();

    // Format sites for easy selection
    const sites = (data.siteEntry || []).map((site: { siteUrl: string; permissionLevel: string }) => ({
      url: site.siteUrl,
      permissionLevel: site.permissionLevel,
      // Clean up URL for display
      displayName: site.siteUrl
        .replace("sc-domain:", "")
        .replace("https://", "")
        .replace("http://", "")
        .replace(/\/$/, ""),
    }));

    return res.status(200).json({ sites });
  } catch (error) {
    console.error("Sites fetch error:", error);
    return res.status(500).json({ error: "Failed to fetch Search Console sites" });
  }
}
