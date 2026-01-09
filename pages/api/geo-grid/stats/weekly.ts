// pages/api/geo-grid/stats/weekly.ts
// Get weekly stats for trend charts

import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { db, geoGridWeeklyStats, geoGridConfigs, geoGridKeywords } from "../../../../lib/db";
import { eq, and, desc } from "drizzle-orm";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = session.user.id;
  const configId = req.query.configId as string;
  const keywordId = req.query.keywordId as string;
  const weeks = parseInt(req.query.weeks as string) || 12; // Default 12 weeks

  if (!configId) {
    return res.status(400).json({ error: "configId query parameter required" });
  }

  try {
    // Verify config ownership
    const [config] = await db
      .select()
      .from(geoGridConfigs)
      .where(
        and(
          eq(geoGridConfigs.id, configId),
          eq(geoGridConfigs.userId, userId)
        )
      );

    if (!config) {
      return res.status(404).json({ error: "Config not found" });
    }

    // Build query conditions
    let query = db
      .select({
        stats: geoGridWeeklyStats,
        keyword: geoGridKeywords.keyword
      })
      .from(geoGridWeeklyStats)
      .leftJoin(geoGridKeywords, eq(geoGridWeeklyStats.keywordId, geoGridKeywords.id))
      .where(eq(geoGridWeeklyStats.configId, configId))
      .orderBy(desc(geoGridWeeklyStats.year), desc(geoGridWeeklyStats.weekNumber))
      .limit(weeks * 10); // Limit based on weeks * max keywords

    // If specific keyword requested, filter further
    if (keywordId) {
      // Verify keyword belongs to this config
      const [keyword] = await db
        .select()
        .from(geoGridKeywords)
        .where(
          and(
            eq(geoGridKeywords.id, keywordId),
            eq(geoGridKeywords.configId, configId)
          )
        );

      if (!keyword) {
        return res.status(404).json({ error: "Keyword not found" });
      }

      query = db
        .select({
          stats: geoGridWeeklyStats,
          keyword: geoGridKeywords.keyword
        })
        .from(geoGridWeeklyStats)
        .leftJoin(geoGridKeywords, eq(geoGridWeeklyStats.keywordId, geoGridKeywords.id))
        .where(
          and(
            eq(geoGridWeeklyStats.configId, configId),
            eq(geoGridWeeklyStats.keywordId, keywordId)
          )
        )
        .orderBy(desc(geoGridWeeklyStats.year), desc(geoGridWeeklyStats.weekNumber))
        .limit(weeks);
    }

    const results = await query;

    // Transform data for charts
    const statsByKeyword: Record<string, {
      keywordId: string;
      keyword: string;
      data: Array<{
        weekNumber: number;
        year: number;
        weekLabel: string;
        avgRank: number | null;
        bestRank: number | null;
        worstRank: number | null;
        visibilityScore: number;
        pointsTop3: number;
        pointsTop10: number;
        pointsTop20: number;
        pointsRanking: number;
        pointsNotFound: number;
        totalPoints: number;
        pointsInLocalPack: number;
      }>;
    }> = {};

    for (const { stats, keyword } of results) {
      const keywordIdKey = stats.keywordId;

      if (!statsByKeyword[keywordIdKey]) {
        statsByKeyword[keywordIdKey] = {
          keywordId: keywordIdKey,
          keyword: keyword || "Unknown",
          data: []
        };
      }

      statsByKeyword[keywordIdKey].data.push({
        weekNumber: stats.weekNumber,
        year: stats.year,
        weekLabel: `W${stats.weekNumber} ${stats.year}`,
        avgRank: stats.avgRank ? parseFloat(stats.avgRank as string) : null,
        bestRank: stats.bestRank,
        worstRank: stats.worstRank,
        visibilityScore: stats.visibilityScore ? parseFloat(stats.visibilityScore as string) : 0,
        pointsTop3: stats.pointsTop3 || 0,
        pointsTop10: stats.pointsTop10 || 0,
        pointsTop20: stats.pointsTop20 || 0,
        pointsRanking: stats.pointsRanking || 0,
        pointsNotFound: stats.pointsNotFound || 0,
        totalPoints: stats.totalPoints || 0,
        pointsInLocalPack: stats.pointsInLocalPack || 0
      });
    }

    // Sort data within each keyword by time (oldest to newest for charts)
    for (const keyword of Object.values(statsByKeyword)) {
      keyword.data.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.weekNumber - b.weekNumber;
      });
    }

    return res.status(200).json({
      config: {
        id: config.id,
        name: config.name,
        targetDomain: config.targetDomain
      },
      keywords: Object.values(statsByKeyword)
    });

  } catch (error) {
    console.error("Geo-grid weekly stats API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
