// pages/api/ai-visibility/scans/[id].ts
// Get scan details with results

import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import {
  db,
  aiVisibilityScans,
  aiVisibilityResults,
  aiVisibilityQueries,
} from "../../../../lib/db";
import { eq, and } from "drizzle-orm";

interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // Auth check
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return res.status(401).json({ success: false, error: "User ID not found" });
  }

  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ success: false, error: "Missing scan id" });
  }

  try {
    // Get scan and verify ownership
    const [scan] = await db
      .select()
      .from(aiVisibilityScans)
      .where(and(eq(aiVisibilityScans.id, id), eq(aiVisibilityScans.userId, userId)));

    if (!scan) {
      return res.status(404).json({ success: false, error: "Scan not found" });
    }

    // Get results for this scan
    const results = await db
      .select()
      .from(aiVisibilityResults)
      .where(eq(aiVisibilityResults.scanId, id));

    // Get query texts for context
    const queryIds = Array.from(new Set(results.map(r => r.queryId)));
    const queries = queryIds.length > 0
      ? await db
          .select()
          .from(aiVisibilityQueries)
          .where(eq(aiVisibilityQueries.configId, scan.configId))
      : [];

    const queryMap = new Map(queries.map(q => [q.id, q.queryText]));

    // Calculate summary metrics
    const totalResults = results.length;
    const mentionedCount = results.filter(r => r.isMentioned).length;
    const citedCount = results.filter(r => r.hasCitation).length;
    const hallucinationCount = results.filter(r => r.hasHallucination).length;

    const sentiments = results
      .filter(r => r.sentimentScore !== null)
      .map(r => parseFloat(r.sentimentScore || "0"));
    const avgSentiment = sentiments.length > 0
      ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
      : 0;

    // Group results by platform
    const platformStats: Record<string, {
      total: number;
      mentioned: number;
      cited: number;
      avgSentiment: number;
    }> = {};

    for (const result of results) {
      if (!platformStats[result.platform]) {
        platformStats[result.platform] = {
          total: 0,
          mentioned: 0,
          cited: 0,
          avgSentiment: 0,
        };
      }
      platformStats[result.platform].total++;
      if (result.isMentioned) platformStats[result.platform].mentioned++;
      if (result.hasCitation) platformStats[result.platform].cited++;
    }

    // Calculate platform avg sentiments
    for (const platform of Object.keys(platformStats)) {
      const platformResults = results.filter(r => r.platform === platform);
      const platformSentiments = platformResults
        .filter(r => r.sentimentScore !== null)
        .map(r => parseFloat(r.sentimentScore || "0"));
      platformStats[platform].avgSentiment = platformSentiments.length > 0
        ? platformSentiments.reduce((a, b) => a + b, 0) / platformSentiments.length
        : 0;
    }

    // Format results with query text
    const formattedResults = results.map(r => ({
      id: r.id,
      queryId: r.queryId,
      queryText: queryMap.get(r.queryId) || "Unknown query",
      platform: r.platform,
      isMentioned: r.isMentioned,
      mentionPosition: r.mentionPosition,
      mentionContext: r.mentionContext,
      sentimentScore: r.sentimentScore ? parseFloat(r.sentimentScore) : null,
      hasCitation: r.hasCitation,
      citationUrl: r.citationUrl,
      hasHallucination: r.hasHallucination,
      hallucinationDetails: r.hallucinationDetails,
      responseWordCount: r.responseWordCount,
      competitorsMentioned: r.competitorsMentioned,
      createdAt: r.createdAt,
    }));

    return res.status(200).json({
      success: true,
      data: {
        scan: {
          id: scan.id,
          configId: scan.configId,
          status: scan.status,
          startedAt: scan.startedAt,
          completedAt: scan.completedAt,
          totalQueries: scan.totalQueries,
          completedQueries: scan.completedQueries,
          errorCount: scan.errorCount,
          creditsUsed: scan.creditsUsed,
          weekNumber: scan.weekNumber,
          year: scan.year,
        },
        summary: {
          totalResults,
          mentionRate: totalResults > 0 ? Math.round((mentionedCount / totalResults) * 100) : 0,
          citationRate: totalResults > 0 ? Math.round((citedCount / totalResults) * 100) : 0,
          hallucinationRate: totalResults > 0 ? Math.round((hallucinationCount / totalResults) * 100) : 0,
          avgSentiment: Math.round(avgSentiment * 100) / 100,
        },
        platformStats,
        results: formattedResults,
      },
    });
  } catch (error) {
    console.error("Error fetching scan details:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch scan details",
    });
  }
}
