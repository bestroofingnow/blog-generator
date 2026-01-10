// pages/api/competitor-intel/run-scan.ts
// Execute a competitor analysis scan using BrightData

import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import {
  db,
  competitorProfiles,
  competitorScans,
  competitorContentSnapshots,
  competitorSocialSnapshots,
  competitorReviewSnapshots,
  CompetitorScanType,
} from "../../../lib/db";
import { eq, and } from "drizzle-orm";
import { BrightData, analyzeCompetitorWebsite, discoverCompetitorInfo } from "../../../lib/brightdata";
import { hasEnoughCredits, deductCredits } from "../../../lib/credits";

export const maxDuration = 120; // 2 minutes for full scan

interface RunScanRequest {
  competitorId: string;
  scanType?: CompetitorScanType;
}

interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "POST") {
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

  const { competitorId, scanType = "full" }: RunScanRequest = req.body;

  if (!competitorId) {
    return res.status(400).json({ success: false, error: "Missing competitorId" });
  }

  // Check credits (competitor_scan operation)
  const canScan = await hasEnoughCredits(userId, "competitor_scan");
  if (!canScan) {
    return res.status(402).json({
      success: false,
      error: "Insufficient credits for competitor scan",
    });
  }

  try {
    // Get competitor
    const [competitor] = await db
      .select()
      .from(competitorProfiles)
      .where(and(eq(competitorProfiles.id, competitorId), eq(competitorProfiles.userId, userId)));

    if (!competitor) {
      return res.status(404).json({ success: false, error: "Competitor not found" });
    }

    console.log(`[Competitor Scan] Starting ${scanType} scan for ${competitor.domain}`);

    // Create scan record
    const [scan] = await db
      .insert(competitorScans)
      .values({
        userId,
        competitorIds: [competitorId],
        scanType,
        status: "running",
        startedAt: new Date(),
        competitorsScanned: 0,
      })
      .returning();

    const scanResults: {
      website?: unknown;
      social?: unknown;
      reviews?: unknown;
      discoveredInfo?: unknown;
    } = {};

    try {
      // Website analysis
      if (scanType === "full" || scanType === "website") {
        console.log(`[Competitor Scan] Analyzing website: ${competitor.domain}`);
        try {
          const websiteAnalysis = await analyzeCompetitorWebsite(`https://${competitor.domain}`);
          scanResults.website = websiteAnalysis;

          // Store content snapshot
          await db.insert(competitorContentSnapshots).values({
            competitorId,
            userId,
            pageTitle: websiteAnalysis.title,
            metaDescription: websiteAnalysis.description,
            wordCount: websiteAnalysis.wordCount,
            headingStructure: websiteAnalysis.headings,
            mainKeywords: websiteAnalysis.mainKeywords,
            hasSchema: websiteAnalysis.hasSchema,
            schemaTypes: websiteAnalysis.schemaTypes,
          });
        } catch (e) {
          console.error(`[Competitor Scan] Website analysis failed:`, e);
        }
      }

      // Discover additional info (social links, contact info)
      if (scanType === "full") {
        console.log(`[Competitor Scan] Discovering info for: ${competitor.domain}`);
        try {
          const discoveredInfo = await discoverCompetitorInfo(competitor.domain);
          scanResults.discoveredInfo = discoveredInfo;

          // Update competitor with discovered social links
          if (discoveredInfo.socialLinks && Object.keys(discoveredInfo.socialLinks).length > 0) {
            await db
              .update(competitorProfiles)
              .set({
                socialLinks: {
                  ...(competitor.socialLinks as Record<string, string>),
                  ...discoveredInfo.socialLinks,
                },
                updatedAt: new Date(),
              })
              .where(eq(competitorProfiles.id, competitorId));
          }
        } catch (e) {
          console.error(`[Competitor Scan] Discovery failed:`, e);
        }
      }

      // Social analysis
      if ((scanType === "full" || scanType === "social") && BrightData.isConfigured()) {
        const socialLinks = competitor.socialLinks as Record<string, string> || {};
        if (Object.keys(socialLinks).length > 0) {
          console.log(`[Competitor Scan] Analyzing social profiles`);
          try {
            const socialProfiles = await BrightData.social.getProfiles(socialLinks);
            scanResults.social = socialProfiles;

            // Store social snapshots
            for (const profile of socialProfiles) {
              await db.insert(competitorSocialSnapshots).values({
                competitorId,
                userId,
                platform: profile.platform,
                followers: profile.followers || null,
                following: null, // May not always be available
                posts: profile.posts || null,
                engagementRate: profile.engagement?.toString() || null,
              });
            }
          } catch (e) {
            console.error(`[Competitor Scan] Social analysis failed:`, e);
          }
        }
      }

      // Reviews analysis
      if ((scanType === "full" || scanType === "reviews") && BrightData.isConfigured()) {
        console.log(`[Competitor Scan] Fetching reviews for: ${competitor.name}`);
        try {
          const reviews = await BrightData.reviews.google(competitor.name);
          scanResults.reviews = reviews;

          // Store review snapshot
          if (reviews) {
            await db.insert(competitorReviewSnapshots).values({
              competitorId,
              userId,
              source: "google",
              rating: reviews.rating?.toString() || null,
              reviewCount: reviews.reviewCount || null,
              recentReviews: reviews.reviews?.slice(0, 10).map((r: { author?: string; text?: string; rating?: number; date?: string }) => ({
                author: r.author || "Anonymous",
                text: r.text || "",
                rating: r.rating || 0,
                date: r.date || new Date().toISOString(),
              })) || [],
            });
          }
        } catch (e) {
          console.error(`[Competitor Scan] Reviews analysis failed:`, e);
        }
      }

      // Update scan as completed
      await db
        .update(competitorScans)
        .set({
          status: "completed",
          completedAt: new Date(),
          competitorsScanned: 1,
        })
        .where(eq(competitorScans.id, scan.id));

      // Update competitor's updated timestamp
      await db
        .update(competitorProfiles)
        .set({
          updatedAt: new Date(),
        })
        .where(eq(competitorProfiles.id, competitorId));

      // Deduct credits
      await deductCredits(userId, "competitor_scan", `Competitor scan: ${competitor.name} (${scanType})`);

      console.log(`[Competitor Scan] Completed scan for ${competitor.domain}`);

      return res.status(200).json({
        success: true,
        data: {
          scanId: scan.id,
          competitorId,
          scanType,
          results: scanResults,
        },
      });
    } catch (error) {
      // Update scan as failed
      await db
        .update(competitorScans)
        .set({
          status: "failed",
          completedAt: new Date(),
          errorCount: 1,
        })
        .where(eq(competitorScans.id, scan.id));

      throw error;
    }
  } catch (error) {
    console.error("Competitor scan error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Scan failed",
    });
  }
}
