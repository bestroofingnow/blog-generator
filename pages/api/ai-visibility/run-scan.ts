// pages/api/ai-visibility/run-scan.ts
// Execute AI visibility scan across platforms

import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import {
  db,
  aiVisibilityConfigs,
  aiVisibilityQueries,
  aiVisibilityScans,
  aiVisibilityResults,
  AIPlatform,
} from "../../../lib/db";
import { eq, and } from "drizzle-orm";
import { hasEnoughCredits, deductCredits } from "../../../lib/credits";

export const maxDuration = 300; // 5 minutes for full scan

// Platform configurations for AI visibility scanning
const PLATFORM_CONFIGS: Record<AIPlatform, {
  name: string;
  searchable: boolean;
  description: string;
}> = {
  chatgpt: {
    name: "ChatGPT",
    searchable: true,
    description: "OpenAI ChatGPT responses",
  },
  perplexity: {
    name: "Perplexity",
    searchable: true,
    description: "Perplexity AI search results",
  },
  google_aio: {
    name: "Google AI Overview",
    searchable: true,
    description: "Google AI-generated overviews in search",
  },
  claude: {
    name: "Claude",
    searchable: true,
    description: "Anthropic Claude responses",
  },
  gemini: {
    name: "Gemini",
    searchable: true,
    description: "Google Gemini responses",
  },
};

interface RunScanRequest {
  configId: string;
  platforms?: AIPlatform[];
  queryIds?: string[];
}

interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

// Get current week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
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

  const { configId, platforms, queryIds }: RunScanRequest = req.body;

  if (!configId) {
    return res.status(400).json({ success: false, error: "Missing configId" });
  }

  // Check credits
  const canScan = await hasEnoughCredits(userId, "ai_visibility_scan");
  if (!canScan) {
    return res.status(402).json({
      success: false,
      error: "Insufficient credits for AI visibility scan",
    });
  }

  try {
    // Get config
    const [config] = await db
      .select()
      .from(aiVisibilityConfigs)
      .where(and(eq(aiVisibilityConfigs.id, configId), eq(aiVisibilityConfigs.userId, userId)));

    if (!config) {
      return res.status(404).json({ success: false, error: "Config not found" });
    }

    // Get queries to scan
    let queriesToScan = await db
      .select()
      .from(aiVisibilityQueries)
      .where(and(
        eq(aiVisibilityQueries.configId, configId),
        eq(aiVisibilityQueries.isActive, true)
      ));

    if (queryIds && queryIds.length > 0) {
      queriesToScan = queriesToScan.filter((q) => queryIds.includes(q.id));
    }

    if (queriesToScan.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No active queries to scan. Add queries first.",
      });
    }

    // Determine platforms to scan from config or request
    const configPlatforms = (config.platforms as AIPlatform[]) || Object.keys(PLATFORM_CONFIGS) as AIPlatform[];
    const platformsToScan = platforms || configPlatforms;

    console.log(`[AI Visibility] Starting scan for ${config.brandName}`);
    console.log(`[AI Visibility] Platforms: ${platformsToScan.join(", ")}`);
    console.log(`[AI Visibility] Queries: ${queriesToScan.length}`);

    const now = new Date();

    // Create scan record
    const [scan] = await db
      .insert(aiVisibilityScans)
      .values({
        configId,
        userId,
        status: "running",
        startedAt: now,
        totalQueries: queriesToScan.length * platformsToScan.length,
        completedQueries: 0,
        errorCount: 0,
        creditsUsed: 0,
        weekNumber: getWeekNumber(now),
        year: now.getFullYear(),
      })
      .returning();

    const results: Array<{
      queryId: string;
      platform: AIPlatform;
      isMentioned: boolean;
      mentionPosition: number | null;
      sentimentScore: number;
      hasCitation: boolean;
      competitorsMentioned: string[];
    }> = [];

    let completedQueries = 0;
    let errorCount = 0;

    try {
      // For each query, analyze across platforms
      for (const query of queriesToScan) {
        for (const platform of platformsToScan) {
          console.log(`[AI Visibility] Checking "${query.queryText}" on ${platform}`);

          try {
            // Simulate AI platform response analysis
            // In production, this would use BrightData scraping_browser to query each platform
            const analysisResult = await analyzeAIPlatformResponse(
              platform,
              query.queryText,
              config.brandName,
              config.brandDomain,
              (config.alternateNames as string[]) || []
            );

            // Store result
            await db.insert(aiVisibilityResults).values({
              scanId: scan.id,
              queryId: query.id,
              userId,
              platform,
              isMentioned: analysisResult.isMentioned,
              mentionPosition: analysisResult.mentionPosition,
              mentionContext: analysisResult.mentionContext,
              sentimentScore: String(analysisResult.sentimentScore),
              hasCitation: analysisResult.hasCitation,
              citationUrl: analysisResult.citationUrl,
              citationPosition: analysisResult.citationPosition,
              hasHallucination: analysisResult.hasHallucination,
              hallucinationDetails: analysisResult.hallucinationDetails,
              aiResponse: analysisResult.aiResponse,
              responseWordCount: analysisResult.responseWordCount,
              competitorsMentioned: analysisResult.competitorsMentioned,
            });

            results.push({
              queryId: query.id,
              platform,
              isMentioned: analysisResult.isMentioned,
              mentionPosition: analysisResult.mentionPosition,
              sentimentScore: analysisResult.sentimentScore,
              hasCitation: analysisResult.hasCitation,
              competitorsMentioned: analysisResult.competitorsMentioned,
            });

            completedQueries++;
          } catch (e) {
            console.error(`[AI Visibility] Error analyzing ${platform}:`, e);
            errorCount++;
          }
        }
      }

      // Calculate summary metrics
      const totalResults = results.length;
      const mentionedCount = results.filter((r) => r.isMentioned).length;
      const citedCount = results.filter((r) => r.hasCitation).length;
      const avgSentiment = totalResults > 0
        ? results.reduce((sum, r) => sum + r.sentimentScore, 0) / totalResults
        : 0;

      // Update scan as completed
      await db
        .update(aiVisibilityScans)
        .set({
          status: "completed",
          completedAt: new Date(),
          completedQueries,
          errorCount,
          creditsUsed: Math.ceil(platformsToScan.length * 0.5), // 0.5 credits per platform
        })
        .where(eq(aiVisibilityScans.id, scan.id));

      // Deduct credits
      await deductCredits(userId, "ai_visibility_scan", `AI visibility scan: ${config.brandName}`);

      console.log(`[AI Visibility] Scan completed for ${config.brandName}`);

      return res.status(200).json({
        success: true,
        data: {
          scanId: scan.id,
          config: {
            id: config.id,
            brandName: config.brandName,
          },
          summary: {
            totalResults,
            mentionRate: totalResults > 0 ? Math.round((mentionedCount / totalResults) * 100) : 0,
            citationRate: totalResults > 0 ? Math.round((citedCount / totalResults) * 100) : 0,
            avgSentiment: Math.round(avgSentiment * 100) / 100,
          },
          results,
        },
      });
    } catch (error) {
      // Update scan as failed
      await db
        .update(aiVisibilityScans)
        .set({
          status: "failed",
          completedAt: new Date(),
          errorCount: errorCount + 1,
        })
        .where(eq(aiVisibilityScans.id, scan.id));

      throw error;
    }
  } catch (error) {
    console.error("AI visibility scan error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Scan failed",
    });
  }
}

// Analyze AI platform response for brand mentions
// In production, this would use BrightData scraping_browser MCP tools
async function analyzeAIPlatformResponse(
  platform: AIPlatform,
  queryText: string,
  brandName: string,
  brandDomain: string,
  alternateNames: string[]
): Promise<{
  isMentioned: boolean;
  mentionPosition: number | null;
  mentionContext: string | null;
  sentimentScore: number;
  hasCitation: boolean;
  citationUrl: string | null;
  citationPosition: number | null;
  hasHallucination: boolean;
  hallucinationDetails: string | null;
  aiResponse: string;
  responseWordCount: number;
  competitorsMentioned: string[];
}> {
  // This is a placeholder implementation
  // In production, this would:
  // 1. Use BrightData scraping_browser to navigate to the AI platform
  // 2. Submit the query
  // 3. Extract and analyze the response
  // 4. Check for brand mentions, citations, and hallucinations

  const queryLower = queryText.toLowerCase();
  const brandLower = brandName.toLowerCase();
  const allBrandNames = [brandLower, ...alternateNames.map(n => n.toLowerCase())];

  // Simulate different results based on platform and query
  const isBrandQuery = allBrandNames.some(name =>
    queryLower.includes(name) || queryLower.includes(brandDomain.toLowerCase())
  );

  // Simulate mention likelihood
  const mentionProbability = isBrandQuery ? 0.8 : 0.2;
  const isMentioned = Math.random() < mentionProbability;

  // Simulate position (1st, 2nd, 3rd mention)
  const mentionPosition = isMentioned ? Math.floor(Math.random() * 3) + 1 : null;

  // Simulate sentiment (-1 to 1)
  const sentimentScore = isMentioned
    ? (Math.random() * 1.2 - 0.2) // -0.2 to 1.0, skewed positive
    : (Math.random() * 0.6 - 0.1); // -0.1 to 0.5, neutral

  // Simulate citation
  const hasCitation = isMentioned && Math.random() < 0.4;
  const citationUrl = hasCitation ? `https://${brandDomain}` : null;
  const citationPosition = hasCitation ? Math.floor(Math.random() * 5) + 1 : null;

  // Simulate hallucination (rare)
  const hasHallucination = isMentioned && Math.random() < 0.1;
  const hallucinationDetails = hasHallucination
    ? "AI stated incorrect founding year for the company"
    : null;

  // Generate simulated response
  const aiResponse = isMentioned
    ? `Based on my analysis, ${brandName} is a notable option for "${queryText.substring(0, 50)}". They offer comprehensive solutions...`
    : `For "${queryText.substring(0, 50)}", there are several options to consider. Popular choices include...`;

  return {
    isMentioned,
    mentionPosition,
    mentionContext: isMentioned ? `${brandName} was mentioned as a recommended solution` : null,
    sentimentScore: Math.round(sentimentScore * 100) / 100,
    hasCitation,
    citationUrl,
    citationPosition,
    hasHallucination,
    hallucinationDetails,
    aiResponse,
    responseWordCount: aiResponse.split(/\s+/).length,
    competitorsMentioned: [], // Would detect competitors in production
  };
}
