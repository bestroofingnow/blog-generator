// pages/api/geo-grid/run-scan.ts
// Execute a geo-grid scan - core scanning logic

import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import {
  db,
  geoGridScans,
  geoGridConfigs,
  geoGridKeywords,
  geoGridRankSnapshots,
  geoGridWeeklyStats
} from "../../../lib/db";
import { eq, and } from "drizzle-orm";
import {
  generateGridPoints,
  fetchGeoTargetedSerp,
  extractRank,
  calculateAggregateStats,
  RateLimiter,
  getISOWeek
} from "../../../lib/geo-grid";
import type { GridPoint, RankExtractionResult } from "../../../lib/geo-grid";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = session.user.id;
  const { scanId } = req.body;

  if (!scanId) {
    return res.status(400).json({ error: "scanId required" });
  }

  try {
    // Get scan and verify ownership
    const [scan] = await db
      .select()
      .from(geoGridScans)
      .where(
        and(
          eq(geoGridScans.id, scanId),
          eq(geoGridScans.userId, userId)
        )
      );

    if (!scan) {
      return res.status(404).json({ error: "Scan not found" });
    }

    if (scan.status === "completed") {
      return res.status(400).json({ error: "Scan already completed" });
    }

    if (scan.status === "running") {
      return res.status(409).json({ error: "Scan already running" });
    }

    // Get config
    const [config] = await db
      .select()
      .from(geoGridConfigs)
      .where(eq(geoGridConfigs.id, scan.configId));

    if (!config) {
      return res.status(404).json({ error: "Config not found" });
    }

    // Get active keywords
    const keywords = await db
      .select()
      .from(geoGridKeywords)
      .where(
        and(
          eq(geoGridKeywords.configId, scan.configId),
          eq(geoGridKeywords.isActive, true)
        )
      );

    if (keywords.length === 0) {
      return res.status(400).json({ error: "No active keywords" });
    }

    // Mark scan as running
    await db
      .update(geoGridScans)
      .set({ status: "running", startedAt: new Date() })
      .where(eq(geoGridScans.id, scanId));

    // Generate grid points
    const gridPoints = generateGridPoints({
      centerLat: parseFloat(config.centerLat as string),
      centerLng: parseFloat(config.centerLng as string),
      gridSize: config.gridSize as 3 | 5 | 7,
      radiusMiles: parseFloat(config.radiusMiles as string)
    });

    // Rate limiter for API calls
    const rateLimiter = new RateLimiter({
      maxConcurrent: 3,
      requestsPerSecond: 2,
      maxRetries: 2
    });

    let apiCallsMade = 0;
    let pointsCompleted = 0;
    let errorCount = 0;
    const errorMessages: string[] = [];

    const keywordResults: Map<string, RankExtractionResult[]> = new Map();

    // Process each keyword
    for (const keyword of keywords) {
      const results: RankExtractionResult[] = [];
      keywordResults.set(keyword.id, results);

      // Process each grid point for this keyword
      const pointTasks = gridPoints.map((point: GridPoint) => async () => {
        try {
          // Fetch SERP for this point
          const serpResponse = await fetchGeoTargetedSerp({
            keyword: keyword.keyword,
            lat: point.lat,
            lng: point.lng,
            numResults: 20
          });

          apiCallsMade++;

          // Extract rank for target domain
          const rankResult = extractRank(serpResponse, config.targetDomain);
          results.push(rankResult);

          // Save snapshot to database
          await db.insert(geoGridRankSnapshots).values({
            scanId,
            keywordId: keyword.id,
            userId,
            gridRow: point.row,
            gridCol: point.col,
            pointLat: point.lat.toString(),
            pointLng: point.lng.toString(),
            rankPosition: rankResult.organicRank,
            serpUrl: rankResult.organicUrl,
            serpTitle: rankResult.organicTitle,
            serpSnippet: rankResult.organicSnippet,
            localPackPosition: rankResult.localPackRank,
            isInLocalPack: rankResult.isInLocalPack,
            top3Competitors: rankResult.topCompetitors,
            serpFeatures: rankResult.serpFeatures
          });

          pointsCompleted++;

          // Update scan progress
          await db
            .update(geoGridScans)
            .set({
              pointsCompleted,
              apiCallsMade
            })
            .where(eq(geoGridScans.id, scanId));

        } catch (error) {
          errorCount++;
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          errorMessages.push(`Point (${point.row},${point.col}): ${errorMsg}`);

          // Still create a snapshot with null rank on error
          results.push({
            organicRank: null,
            organicUrl: null,
            organicTitle: null,
            organicSnippet: null,
            localPackRank: null,
            isInLocalPack: false,
            topCompetitors: [],
            serpFeatures: []
          });
        }
      });

      // Execute all point tasks with rate limiting
      await rateLimiter.executeAll(pointTasks);

      // Calculate and save weekly stats for this keyword
      const aggregateStats = calculateAggregateStats(results, gridPoints.length);
      const { weekNumber, year } = getISOWeek();

      // Upsert weekly stats
      try {
        await db
          .insert(geoGridWeeklyStats)
          .values({
            configId: config.id,
            keywordId: keyword.id,
            userId,
            scanId,
            weekNumber,
            year,
            avgRank: aggregateStats.avgRank?.toString() || null,
            bestRank: aggregateStats.bestRank,
            worstRank: aggregateStats.worstRank,
            pointsRanking: aggregateStats.pointsRanking,
            pointsTop3: aggregateStats.pointsTop3,
            pointsTop10: aggregateStats.pointsTop10,
            pointsTop20: aggregateStats.pointsTop20,
            pointsNotFound: aggregateStats.pointsNotFound,
            totalPoints: aggregateStats.totalPoints,
            pointsInLocalPack: aggregateStats.pointsInLocalPack,
            avgLocalPackPosition: aggregateStats.avgLocalPackPosition?.toString() || null,
            visibilityScore: aggregateStats.visibilityScore.toString()
          })
          .onConflictDoUpdate({
            target: [
              geoGridWeeklyStats.configId,
              geoGridWeeklyStats.keywordId,
              geoGridWeeklyStats.year,
              geoGridWeeklyStats.weekNumber
            ],
            set: {
              scanId,
              avgRank: aggregateStats.avgRank?.toString() || null,
              bestRank: aggregateStats.bestRank,
              worstRank: aggregateStats.worstRank,
              pointsRanking: aggregateStats.pointsRanking,
              pointsTop3: aggregateStats.pointsTop3,
              pointsTop10: aggregateStats.pointsTop10,
              pointsTop20: aggregateStats.pointsTop20,
              pointsNotFound: aggregateStats.pointsNotFound,
              totalPoints: aggregateStats.totalPoints,
              pointsInLocalPack: aggregateStats.pointsInLocalPack,
              avgLocalPackPosition: aggregateStats.avgLocalPackPosition?.toString() || null,
              visibilityScore: aggregateStats.visibilityScore.toString()
            }
          });
      } catch (statsError) {
        console.error("Error saving weekly stats:", statsError);
      }
    }

    // Mark scan as completed
    await db
      .update(geoGridScans)
      .set({
        status: "completed",
        completedAt: new Date(),
        pointsCompleted,
        apiCallsMade,
        creditsUsed: apiCallsMade, // 1 credit per API call
        errorCount,
        errorMessages: errorMessages.length > 0 ? errorMessages : null
      })
      .where(eq(geoGridScans.id, scanId));

    // Return summary
    return res.status(200).json({
      success: true,
      scanId,
      summary: {
        totalPoints: gridPoints.length,
        totalKeywords: keywords.length,
        totalQueries: gridPoints.length * keywords.length,
        apiCallsMade,
        errorCount,
        status: "completed"
      }
    });

  } catch (error) {
    console.error("Geo-grid run-scan error:", error);

    // Mark scan as failed
    try {
      await db
        .update(geoGridScans)
        .set({
          status: "failed",
          errorMessages: [error instanceof Error ? error.message : "Unknown error"]
        })
        .where(eq(geoGridScans.id, scanId));
    } catch (updateError) {
      console.error("Error updating scan status:", updateError);
    }

    return res.status(500).json({ error: "Scan failed", message: (error as Error).message });
  }
}

// Increase timeout for this endpoint since scans can take a while
export const config = {
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: "1mb"
    }
  }
};
