// pages/api/ai-visibility/stats/weekly.ts
// Get weekly trends for AI visibility

import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import {
  db,
  aiVisibilityConfigs,
  aiVisibilityWeeklyStats,
  aiVisibilityResults,
  aiVisibilityScans,
} from "../../../../lib/db";
import { eq, and, desc, gte } from "drizzle-orm";

interface WeeklyTrend {
  weekNumber: number;
  year: number;
  platform: string;
  mentionRate: number;
  citationRate: number;
  avgSentiment: number;
  totalQueries: number;
}

interface PlatformSummary {
  platform: string;
  mentionRate: number;
  citationRate: number;
  avgSentiment: number;
  visibilityScore: number;
}

interface ApiResponse {
  success: boolean;
  data?: {
    config: { id: string; brandName: string };
    weeklyTrends: WeeklyTrend[];
    platformSummary: PlatformSummary[];
    insights: string[];
  };
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

  const { configId, weeks = "4" } = req.query;

  if (!configId || typeof configId !== "string") {
    return res.status(400).json({ success: false, error: "Missing configId" });
  }

  try {
    // Verify config belongs to user
    const [config] = await db
      .select()
      .from(aiVisibilityConfigs)
      .where(and(eq(aiVisibilityConfigs.id, configId), eq(aiVisibilityConfigs.userId, userId)));

    if (!config) {
      return res.status(404).json({ success: false, error: "Config not found" });
    }

    // Get weekly stats from the table
    const weeklyStats = await db
      .select()
      .from(aiVisibilityWeeklyStats)
      .where(eq(aiVisibilityWeeklyStats.configId, configId))
      .orderBy(desc(aiVisibilityWeeklyStats.year), desc(aiVisibilityWeeklyStats.weekNumber))
      .limit(parseInt(weeks as string, 10) * 5); // 5 platforms per week

    // Transform weekly stats
    let weeklyTrends: WeeklyTrend[] = [];
    const platformSummary: PlatformSummary[] = [];

    if (weeklyStats.length > 0) {
      weeklyTrends = weeklyStats.map((stat) => ({
        weekNumber: stat.weekNumber,
        year: stat.year,
        platform: stat.platform,
        mentionRate: parseFloat(stat.mentionRate || "0"),
        citationRate: parseFloat(stat.citationRate || "0"),
        avgSentiment: parseFloat(stat.avgSentiment || "0"),
        totalQueries: stat.totalQueries || 0,
      }));

      // Calculate platform summary from most recent week
      const latestWeek = weeklyStats[0]?.weekNumber;
      const latestYear = weeklyStats[0]?.year;
      const latestStats = weeklyStats.filter(
        s => s.weekNumber === latestWeek && s.year === latestYear
      );

      for (const stat of latestStats) {
        platformSummary.push({
          platform: stat.platform,
          mentionRate: parseFloat(stat.mentionRate || "0"),
          citationRate: parseFloat(stat.citationRate || "0"),
          avgSentiment: parseFloat(stat.avgSentiment || "0"),
          visibilityScore: parseFloat(stat.visibilityScore || "0"),
        });
      }
    } else {
      // If no pre-calculated stats, calculate from recent results
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      // Get recent completed scans
      const recentScans = await db
        .select()
        .from(aiVisibilityScans)
        .where(and(
          eq(aiVisibilityScans.configId, configId),
          eq(aiVisibilityScans.status, "completed"),
          gte(aiVisibilityScans.startedAt, fourWeeksAgo)
        ))
        .orderBy(desc(aiVisibilityScans.startedAt));

      if (recentScans.length > 0) {
        // Get results for these scans
        const scanIds = recentScans.map(s => s.id);

        for (const scan of recentScans) {
          const results = await db
            .select()
            .from(aiVisibilityResults)
            .where(eq(aiVisibilityResults.scanId, scan.id));

          // Group by platform
          const platformGroups = new Map<string, typeof results>();
          for (const result of results) {
            const existing = platformGroups.get(result.platform) || [];
            existing.push(result);
            platformGroups.set(result.platform, existing);
          }

          for (const [platform, platformResults] of Array.from(platformGroups.entries())) {
            const total = platformResults.length;
            const mentioned = platformResults.filter((r: typeof results[0]) => r.isMentioned).length;
            const cited = platformResults.filter((r: typeof results[0]) => r.hasCitation).length;
            const sentiments = platformResults
              .filter((r: typeof results[0]) => r.sentimentScore !== null)
              .map((r: typeof results[0]) => parseFloat(r.sentimentScore || "0"));
            const avgSentiment = sentiments.length > 0
              ? sentiments.reduce((a: number, b: number) => a + b, 0) / sentiments.length
              : 0;

            weeklyTrends.push({
              weekNumber: scan.weekNumber || getWeekNumber(scan.startedAt || new Date()),
              year: scan.year || (scan.startedAt?.getFullYear() || new Date().getFullYear()),
              platform,
              mentionRate: total > 0 ? Math.round((mentioned / total) * 100) : 0,
              citationRate: total > 0 ? Math.round((cited / total) * 100) : 0,
              avgSentiment: Math.round(avgSentiment * 100) / 100,
              totalQueries: total,
            });
          }
        }

        // Calculate platform summary from most recent scan
        if (recentScans.length > 0) {
          const latestScanId = recentScans[0].id;
          const latestResults = await db
            .select()
            .from(aiVisibilityResults)
            .where(eq(aiVisibilityResults.scanId, latestScanId));

          const platformGroups2 = new Map<string, typeof latestResults>();
          for (const result of latestResults) {
            const existing = platformGroups2.get(result.platform) || [];
            existing.push(result);
            platformGroups2.set(result.platform, existing);
          }

          for (const [platform, platformResults] of Array.from(platformGroups2.entries())) {
            const total = platformResults.length;
            const mentioned = platformResults.filter((r: typeof latestResults[0]) => r.isMentioned).length;
            const cited = platformResults.filter((r: typeof latestResults[0]) => r.hasCitation).length;
            const sentiments = platformResults
              .filter((r: typeof latestResults[0]) => r.sentimentScore !== null)
              .map((r: typeof latestResults[0]) => parseFloat(r.sentimentScore || "0"));
            const avgSentiment = sentiments.length > 0
              ? sentiments.reduce((a: number, b: number) => a + b, 0) / sentiments.length
              : 0;

            const mentionRate = total > 0 ? (mentioned / total) * 100 : 0;
            const citationRate = total > 0 ? (cited / total) * 100 : 0;

            platformSummary.push({
              platform,
              mentionRate: Math.round(mentionRate),
              citationRate: Math.round(citationRate),
              avgSentiment: Math.round(avgSentiment * 100) / 100,
              visibilityScore: Math.round((mentionRate * 0.5 + citationRate * 0.3 + (avgSentiment + 1) * 10) * 10) / 10,
            });
          }
        }
      }
    }

    // Generate insights
    const insights = generateInsights(weeklyTrends, platformSummary);

    return res.status(200).json({
      success: true,
      data: {
        config: { id: config.id, brandName: config.brandName },
        weeklyTrends,
        platformSummary,
        insights,
      },
    });
  } catch (error) {
    console.error("Error fetching weekly stats:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch stats",
    });
  }
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function generateInsights(weeklyTrends: WeeklyTrend[], platformSummary: PlatformSummary[]): string[] {
  const insights: string[] = [];

  if (weeklyTrends.length === 0 && platformSummary.length === 0) {
    return ["Run your first AI visibility scan to see insights"];
  }

  // Platform performance insights
  if (platformSummary.length > 0) {
    const bestPlatform = platformSummary.reduce((best, p) =>
      p.mentionRate > best.mentionRate ? p : best
    );
    insights.push(`${formatPlatformName(bestPlatform.platform)} has highest mention rate at ${bestPlatform.mentionRate}%`);

    const lowestPlatform = platformSummary.reduce((lowest, p) =>
      p.mentionRate < lowest.mentionRate ? p : lowest
    );
    if (lowestPlatform.mentionRate < 30) {
      insights.push(`Optimize content for ${formatPlatformName(lowestPlatform.platform)} - only ${lowestPlatform.mentionRate}% mention rate`);
    }

    // Citation insights
    const bestCitation = platformSummary.reduce((best, p) =>
      p.citationRate > best.citationRate ? p : best
    );
    if (bestCitation.citationRate > 20) {
      insights.push(`${formatPlatformName(bestCitation.platform)} cites your content ${bestCitation.citationRate}% of the time`);
    }

    // Sentiment insights
    const avgSentiment = platformSummary.reduce((sum, p) => sum + p.avgSentiment, 0) / platformSummary.length;
    if (avgSentiment >= 0.5) {
      insights.push(`Strong positive sentiment (${Math.round(avgSentiment * 100)}%) across AI platforms`);
    } else if (avgSentiment < 0) {
      insights.push(`Negative sentiment detected - review AI's perception of your brand`);
    }
  }

  // Trend analysis
  if (weeklyTrends.length >= 2) {
    // Group by week
    const weekGroups = new Map<string, WeeklyTrend[]>();
    for (const trend of weeklyTrends) {
      const key = `${trend.year}-${trend.weekNumber}`;
      const existing = weekGroups.get(key) || [];
      existing.push(trend);
      weekGroups.set(key, existing);
    }

    const sortedWeeks = Array.from(weekGroups.keys()).sort().reverse();
    if (sortedWeeks.length >= 2) {
      const latestWeekData = weekGroups.get(sortedWeeks[0]) || [];
      const previousWeekData = weekGroups.get(sortedWeeks[1]) || [];

      const latestAvgMention = latestWeekData.reduce((sum, t) => sum + t.mentionRate, 0) / latestWeekData.length;
      const previousAvgMention = previousWeekData.reduce((sum, t) => sum + t.mentionRate, 0) / previousWeekData.length;

      const mentionChange = latestAvgMention - previousAvgMention;
      if (mentionChange > 5) {
        insights.push(`Mention rate improved by ${Math.round(mentionChange)}% this week`);
      } else if (mentionChange < -5) {
        insights.push(`Mention rate decreased by ${Math.abs(Math.round(mentionChange))}% - consider content refresh`);
      }
    }
  }

  return insights.slice(0, 5);
}

function formatPlatformName(platform: string): string {
  const names: Record<string, string> = {
    chatgpt: "ChatGPT",
    perplexity: "Perplexity",
    google_aio: "Google AI Overview",
    claude: "Claude",
    gemini: "Gemini",
  };
  return names[platform] || platform.toUpperCase();
}
