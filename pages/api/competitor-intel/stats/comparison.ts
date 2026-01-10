// pages/api/competitor-intel/stats/comparison.ts
// Get comparison metrics across all competitors

import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import {
  db,
  competitorProfiles,
  competitorContentSnapshots,
  competitorSocialSnapshots,
  competitorReviewSnapshots,
} from "../../../../lib/db";
import { eq, and, desc } from "drizzle-orm";

interface CompetitorComparison {
  id: string;
  name: string;
  domain: string;
  industry: string | null;
  updatedAt: Date | null;
  content?: {
    wordCount: number;
    hasSchema: boolean;
    headingCount: number;
    keywordCount: number;
  };
  social?: {
    totalFollowers: number;
    platforms: Array<{
      platform: string;
      followers: number;
      engagement: string | null;
    }>;
  };
  reviews?: {
    averageRating: number;
    totalReviews: number;
  };
}

interface ApiResponse {
  success: boolean;
  data?: {
    competitors: CompetitorComparison[];
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

  try {
    // Get all competitors for this user
    const competitors = await db
      .select()
      .from(competitorProfiles)
      .where(eq(competitorProfiles.userId, userId))
      .orderBy(desc(competitorProfiles.createdAt));

    if (competitors.length === 0) {
      return res.status(200).json({
        success: true,
        data: { competitors: [], insights: ["Add competitors to start tracking"] },
      });
    }

    const comparisons: CompetitorComparison[] = [];

    for (const competitor of competitors) {
      const comparison: CompetitorComparison = {
        id: competitor.id,
        name: competitor.name,
        domain: competitor.domain,
        industry: competitor.industry,
        updatedAt: competitor.updatedAt,
      };

      // Get latest content snapshot
      const [latestContent] = await db
        .select()
        .from(competitorContentSnapshots)
        .where(eq(competitorContentSnapshots.competitorId, competitor.id))
        .orderBy(desc(competitorContentSnapshots.snapshotDate))
        .limit(1);

      if (latestContent) {
        const headings = latestContent.headingStructure as string[] || [];
        const keywords = latestContent.mainKeywords as string[] || [];
        comparison.content = {
          wordCount: latestContent.wordCount || 0,
          hasSchema: latestContent.hasSchema || false,
          headingCount: headings.length,
          keywordCount: keywords.length,
        };
      }

      // Get latest social snapshots
      const socialSnapshots = await db
        .select()
        .from(competitorSocialSnapshots)
        .where(eq(competitorSocialSnapshots.competitorId, competitor.id))
        .orderBy(desc(competitorSocialSnapshots.snapshotDate));

      // Get the most recent snapshot per platform
      const platformSnapshots = new Map<string, typeof socialSnapshots[0]>();
      for (const snapshot of socialSnapshots) {
        if (!platformSnapshots.has(snapshot.platform)) {
          platformSnapshots.set(snapshot.platform, snapshot);
        }
      }

      if (platformSnapshots.size > 0) {
        const platforms = Array.from(platformSnapshots.values()).map((s) => ({
          platform: s.platform,
          followers: s.followers || 0,
          engagement: s.engagementRate,
        }));

        comparison.social = {
          totalFollowers: platforms.reduce((sum, p) => sum + p.followers, 0),
          platforms,
        };
      }

      // Get latest review snapshot
      const [latestReview] = await db
        .select()
        .from(competitorReviewSnapshots)
        .where(eq(competitorReviewSnapshots.competitorId, competitor.id))
        .orderBy(desc(competitorReviewSnapshots.snapshotDate))
        .limit(1);

      if (latestReview) {
        comparison.reviews = {
          averageRating: parseFloat(latestReview.rating || "0"),
          totalReviews: latestReview.reviewCount || 0,
        };
      }

      comparisons.push(comparison);
    }

    // Generate insights
    const insights = generateInsights(comparisons);

    return res.status(200).json({
      success: true,
      data: { competitors: comparisons, insights },
    });
  } catch (error) {
    console.error("Error fetching comparison stats:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch comparison stats",
    });
  }
}

function generateInsights(comparisons: CompetitorComparison[]): string[] {
  const insights: string[] = [];

  if (comparisons.length === 0) {
    return ["Add competitors to start tracking"];
  }

  // Content insights
  const withContent = comparisons.filter((c) => c.content);
  if (withContent.length > 0) {
    const avgWordCount = withContent.reduce((sum, c) => sum + (c.content?.wordCount || 0), 0) / withContent.length;
    const schemaCount = withContent.filter((c) => c.content?.hasSchema).length;

    if (avgWordCount > 1500) {
      insights.push(`Competitors average ${Math.round(avgWordCount)} words per page - aim for 2000+ to outperform`);
    }
    if (schemaCount > withContent.length / 2) {
      insights.push(`${schemaCount}/${withContent.length} competitors use schema markup - add structured data to stay competitive`);
    }
  }

  // Social insights
  const withSocial = comparisons.filter((c) => c.social);
  if (withSocial.length > 0) {
    const bestSocial = withSocial.reduce((best, c) =>
      (c.social?.totalFollowers || 0) > (best.social?.totalFollowers || 0) ? c : best
    );
    if (bestSocial.social) {
      insights.push(`${bestSocial.name} leads social with ${bestSocial.social.totalFollowers.toLocaleString()} total followers`);
    }

    // Find most popular platform
    const platformTotals = new Map<string, number>();
    for (const c of withSocial) {
      for (const p of c.social?.platforms || []) {
        platformTotals.set(p.platform, (platformTotals.get(p.platform) || 0) + p.followers);
      }
    }
    const topPlatform = Array.from(platformTotals.entries()).sort((a, b) => b[1] - a[1])[0];
    if (topPlatform) {
      insights.push(`${topPlatform[0]} is the top platform among competitors - prioritize your presence there`);
    }
  }

  // Review insights
  const withReviews = comparisons.filter((c) => c.reviews && c.reviews.totalReviews > 0);
  if (withReviews.length > 0) {
    const avgRating = withReviews.reduce((sum, c) => sum + (c.reviews?.averageRating || 0), 0) / withReviews.length;
    const bestReviewed = withReviews.reduce((best, c) =>
      (c.reviews?.averageRating || 0) > (best.reviews?.averageRating || 0) ? c : best
    );

    insights.push(`Average competitor rating: ${avgRating.toFixed(1)}/5 - aim for ${(avgRating + 0.3).toFixed(1)}+ to stand out`);
    if (bestReviewed.reviews) {
      insights.push(`${bestReviewed.name} has the highest rating (${bestReviewed.reviews.averageRating.toFixed(1)}/5)`);
    }
  }

  // Scan freshness
  const needsScan = comparisons.filter((c) => {
    if (!c.updatedAt) return true;
    const daysSinceScan = (Date.now() - new Date(c.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceScan > 7;
  });
  if (needsScan.length > 0) {
    insights.push(`${needsScan.length} competitor(s) haven't been scanned recently - run a new scan for fresh data`);
  }

  return insights.slice(0, 6); // Limit to 6 insights
}
