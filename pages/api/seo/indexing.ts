// pages/api/seo/indexing.ts
// Google Web Indexing API - Request instant indexing for new/updated content

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { requestIndexing, getIndexingStatus, IndexingResult } from "../../../lib/google-apis";

interface IndexingResponse {
  success: boolean;
  data?: {
    results?: IndexingResult[];
    status?: {
      url: string;
      lastCrawlTime?: string;
      lastSubmitTime?: string;
    };
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IndexingResponse>
) {
  // Auth check
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  try {
    if (req.method === "POST") {
      // Request indexing for URLs
      const { urls, type = "URL_UPDATED" } = req.body as {
        urls: string | string[];
        type?: "URL_UPDATED" | "URL_DELETED";
      };

      if (!urls) {
        return res.status(400).json({
          success: false,
          error: "URLs are required",
        });
      }

      const urlList = Array.isArray(urls) ? urls : [urls];

      console.log(`[Indexing API] Requesting indexing for ${urlList.length} URLs`);

      // Process URLs in parallel (max 10 at a time)
      const results: IndexingResult[] = [];
      const batchSize = 10;

      for (let i = 0; i < urlList.length; i += batchSize) {
        const batch = urlList.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map((url) => requestIndexing(url, type))
        );
        results.push(...batchResults);
      }

      const successCount = results.filter((r) => r.success).length;
      console.log(`[Indexing API] ${successCount}/${results.length} URLs submitted successfully`);

      return res.status(200).json({
        success: true,
        data: { results },
      });
    } else if (req.method === "GET") {
      // Get indexing status for a URL
      const url = req.query.url as string;

      if (!url) {
        return res.status(400).json({
          success: false,
          error: "URL is required",
        });
      }

      const status = await getIndexingStatus(url);

      if (!status) {
        return res.status(500).json({
          success: false,
          error: "Failed to fetch indexing status",
        });
      }

      return res.status(200).json({
        success: true,
        data: { status },
      });
    } else {
      return res.status(405).json({ success: false, error: "Method not allowed" });
    }
  } catch (error) {
    console.error("[Indexing API] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Indexing operation failed",
    });
  }
}
