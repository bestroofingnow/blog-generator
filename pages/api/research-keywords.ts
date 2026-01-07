// pages/api/research-keywords.ts
// Enhanced SEO Research Tool with BrightData SERP analysis and Knowledge Base integration
// Provides detailed keyword research, competitor analysis, and content recommendations

import type { NextApiRequest, NextApiResponse } from "next";
import { researchKeywords, KeywordResearch } from "../../lib/ai-gateway";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import { loadUserProfile, loadDrafts } from "../../lib/database";
import { db, knowledgeBase } from "../../lib/db";
import { eq } from "drizzle-orm";
import { generateText } from "ai";
import { createGateway } from "@ai-sdk/gateway";
import { hasEnoughCredits, deductCredits } from "../../lib/credits";

// Create gateway instance for enhanced research
const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? "",
});

const BRIGHT_DATA_API_TOKEN = process.env.BRIGHT_DATA_API_TOKEN || "";
const BRIGHT_DATA_BASE_URL = "https://api.brightdata.com";

interface ResearchRequest {
  topic: string;
  location: string;
  companyName?: string;
  companyWebsite?: string;
  blogType: string;
}

interface EnhancedKeywordResearch extends KeywordResearch {
  serpData?: {
    topRankingPages: Array<{ title: string; url: string; snippet: string }>;
    paaQuestions: string[];
    relatedSearches: string[];
    featuredSnippet?: string;
  };
  knowledgeBaseInsights?: {
    relevantServices: string[];
    uspsToHighlight: string[];
    factsToInclude: string[];
  };
  localSEOData?: {
    targetCity: string;
    nearbyAreas: string[];
    localKeywords: string[];
  };
}

interface ResearchResponse {
  success: boolean;
  suggestions?: EnhancedKeywordResearch;
  creditsRemaining?: number;
  error?: string;
}

// BrightData SERP search for competitor analysis
async function searchWithBrightData(query: string, location?: string): Promise<{
  results: Array<{ position: number; title: string; url: string; snippet: string }>;
  paaQuestions: string[];
  relatedSearches: string[];
  featuredSnippet?: string;
} | null> {
  if (!BRIGHT_DATA_API_TOKEN) {
    console.log("[SEO Research] BrightData not configured, skipping SERP analysis");
    return null;
  }

  try {
    const params = new URLSearchParams({
      query,
      country: "us",
      language: "en",
    });

    if (location) {
      params.append("location", location);
    }

    const response = await fetch(`${BRIGHT_DATA_BASE_URL}/serp/google/search?${params}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${BRIGHT_DATA_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      console.log("[SEO Research] SERP search failed:", response.status);
      return null;
    }

    const data = await response.json();

    return {
      results: (data.organic || []).slice(0, 10).map((item: Record<string, unknown>, index: number) => ({
        position: index + 1,
        title: item.title as string || "",
        url: item.link as string || item.url as string || "",
        snippet: item.snippet as string || "",
      })),
      paaQuestions: (data.people_also_ask || []).map((q: Record<string, unknown>) => String(q.question || "")),
      relatedSearches: (data.related_searches || []).map((s: Record<string, unknown> | string) =>
        typeof s === "string" ? s : String(s.query || "")
      ),
      featuredSnippet: data.featured_snippet?.text as string || undefined,
    };
  } catch (error) {
    console.error("[SEO Research] SERP error:", error);
    return null;
  }
}

// Load knowledge base entries for context
async function loadKnowledgeBaseEntries(userId: string): Promise<{
  services: string[];
  usps: string[];
  facts: string[];
  faqs: string[];
  locations: string[];
}> {
  try {
    const entries = await db
      .select({
        category: knowledgeBase.category,
        title: knowledgeBase.title,
        content: knowledgeBase.content,
      })
      .from(knowledgeBase)
      .where(eq(knowledgeBase.userId, userId));

    const result = {
      services: [] as string[],
      usps: [] as string[],
      facts: [] as string[],
      faqs: [] as string[],
      locations: [] as string[],
    };

    for (const entry of entries) {
      const category = entry.category?.toLowerCase() || "";
      const content = `${entry.title}: ${entry.content}`.substring(0, 200);

      if (category === "services") result.services.push(content);
      else if (category === "usps") result.usps.push(content);
      else if (category === "facts") result.facts.push(content);
      else if (category === "faqs") result.faqs.push(content);
      else if (category === "locations") result.locations.push(content);
    }

    return result;
  } catch (error) {
    console.error("[SEO Research] Knowledge base load error:", error);
    return { services: [], usps: [], facts: [], faqs: [], locations: [] };
  }
}

// Extract competitor insights from SERP results
function analyzeCompetitorContent(results: Array<{ title: string; url: string; snippet: string }>): string[] {
  const insights: string[] = [];

  // Analyze title patterns
  const titlePatterns = results.map(r => r.title.toLowerCase());
  const commonPatterns: Record<string, number> = {};

  const patternKeywords = ["guide", "tips", "how to", "best", "top", "complete", "ultimate", "cost", "price", "near me"];
  for (const pattern of patternKeywords) {
    const count = titlePatterns.filter(t => t.includes(pattern)).length;
    if (count > 0) {
      commonPatterns[pattern] = count;
    }
  }

  // Top patterns
  const sortedPatterns = Object.entries(commonPatterns)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (sortedPatterns.length > 0) {
    insights.push(`Top-ranking content uses patterns: ${sortedPatterns.map(p => `"${p[0]}" (${p[1]} uses)`).join(", ")}`);
  }

  // Analyze content length from snippets
  const avgSnippetLength = results.reduce((sum, r) => sum + r.snippet.length, 0) / results.length;
  if (avgSnippetLength > 150) {
    insights.push("Competitors use detailed meta descriptions (150+ chars average)");
  }

  // Identify content types
  const hasListContent = results.some(r => r.title.match(/\d+\s+(tips|ways|steps|reasons)/i));
  const hasGuideContent = results.some(r => r.title.toLowerCase().includes("guide"));
  const hasCostContent = results.some(r => r.title.match(/cost|price|how much/i));

  if (hasListContent) insights.push("List-style content (X tips, X ways) is ranking well");
  if (hasGuideContent) insights.push("Comprehensive guides are performing in this niche");
  if (hasCostContent) insights.push("Cost/pricing content has high search visibility");

  // Identify local focus
  const hasLocalContent = results.some(r => r.title.toLowerCase().includes("near me") || r.snippet.toLowerCase().includes("local"));
  if (hasLocalContent) {
    insights.push("Local-focused content with 'near me' keywords is ranking");
  }

  return insights.slice(0, 5);
}

// Generate enhanced research with AI analysis
async function generateEnhancedResearch(
  baseResearch: KeywordResearch,
  serpData: {
    results: Array<{ position: number; title: string; url: string; snippet: string }>;
    paaQuestions: string[];
    relatedSearches: string[];
    featuredSnippet?: string;
  } | null,
  knowledgeBase: {
    services: string[];
    usps: string[];
    facts: string[];
    faqs: string[];
    locations: string[];
  },
  topic: string,
  location: string,
  industry: string
): Promise<EnhancedKeywordResearch> {
  const enhanced: EnhancedKeywordResearch = { ...baseResearch };

  // Add SERP data if available
  if (serpData) {
    enhanced.serpData = {
      topRankingPages: serpData.results.slice(0, 5).map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.snippet,
      })),
      paaQuestions: serpData.paaQuestions.slice(0, 8),
      relatedSearches: serpData.relatedSearches.slice(0, 10),
      featuredSnippet: serpData.featuredSnippet,
    };

    // Generate competitor insights
    const competitorInsights = analyzeCompetitorContent(serpData.results);
    if (competitorInsights.length > 0) {
      enhanced.competitorInsights = [
        ...competitorInsights,
        ...(baseResearch.competitorInsights || []),
      ].slice(0, 6);
    }

    // Enhance secondary keywords with related searches
    const relatedKeywords = serpData.relatedSearches
      .filter(s => !baseResearch.secondaryKeywords.some(k => k.toLowerCase() === s.toLowerCase()))
      .slice(0, 3);

    if (relatedKeywords.length > 0) {
      enhanced.secondaryKeywords = [
        ...baseResearch.secondaryKeywords,
        ...relatedKeywords,
      ].slice(0, 10);
    }

    // Add PAA questions as content angles
    const paaAngles = serpData.paaQuestions
      .slice(0, 3)
      .map(q => `Answer: "${q}"`);

    if (paaAngles.length > 0) {
      enhanced.contentAngles = [
        ...paaAngles,
        ...(baseResearch.contentAngles || []),
      ].slice(0, 6);
    }
  }

  // Add knowledge base insights
  if (knowledgeBase.services.length > 0 || knowledgeBase.usps.length > 0 || knowledgeBase.facts.length > 0) {
    // Find relevant services for this topic
    const topicLower = topic.toLowerCase();
    const relevantServices = knowledgeBase.services
      .filter(s => s.toLowerCase().includes(topicLower) || topicLower.includes(s.split(":")[0].toLowerCase()))
      .slice(0, 3);

    enhanced.knowledgeBaseInsights = {
      relevantServices: relevantServices.length > 0 ? relevantServices : knowledgeBase.services.slice(0, 2),
      uspsToHighlight: knowledgeBase.usps.slice(0, 3),
      factsToInclude: knowledgeBase.facts.slice(0, 3),
    };
  }

  // Add local SEO data
  if (location) {
    enhanced.localSEOData = {
      targetCity: location,
      nearbyAreas: knowledgeBase.locations.slice(0, 5).map(l => l.split(":")[0]),
      localKeywords: [
        `${topic} ${location}`,
        `${topic} near ${location}`,
        `best ${topic} in ${location}`,
        `${location} ${topic} services`,
        `${topic} company ${location}`,
      ],
    };
  }

  return enhanced;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResearchResponse>
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

  // Credit check
  const canResearch = await hasEnoughCredits(userId, "keyword_research");
  if (!canResearch) {
    return res.status(402).json({
      success: false,
      error: "Insufficient credits. Please purchase more credits or upgrade your plan.",
    });
  }

  if (!process.env.AI_GATEWAY_API_KEY) {
    return res.status(500).json({
      success: false,
      error: "AI_GATEWAY_API_KEY not configured",
    });
  }

  try {
    const request = req.body as ResearchRequest;

    if (!request.topic || !request.location) {
      return res.status(400).json({
        success: false,
        error: "Topic and location are required",
      });
    }

    // Load user profile and past blogs for context
    const userProfile = await loadUserProfile(userId);
    const pastBlogs = await loadDrafts(userId);

    // Extract profile context
    const companyProfile = userProfile?.companyProfile;
    const industry = companyProfile?.industryType || "general";

    // Get existing blog titles to avoid duplicates
    const existingBlogTitles = pastBlogs.map(blog => blog.title);

    console.log(`[SEO Research] Starting enhanced research for: ${request.topic} in ${request.location}`);

    // Parallel fetch: BrightData SERP + Knowledge Base + Base Research
    const [serpData, knowledgeBaseData, baseResearch] = await Promise.all([
      // BrightData SERP search
      searchWithBrightData(`${request.topic} ${request.location}`, request.location),

      // Knowledge Base entries
      loadKnowledgeBaseEntries(userId),

      // Base Perplexity research
      researchKeywords({
        topic: request.topic,
        location: request.location,
        companyName: request.companyName || companyProfile?.name,
        companyWebsite: request.companyWebsite || companyProfile?.website,
        blogType: request.blogType,
        profileContext: companyProfile ? {
          services: companyProfile.services || [],
          usps: companyProfile.usps || [],
          certifications: companyProfile.certifications || [],
          brandVoice: companyProfile.brandVoice,
          targetAudience: companyProfile.audience,
          industryType: companyProfile.industryType,
          primarySiteKeyword: companyProfile.primarySiteKeyword,
          secondarySiteKeywords: companyProfile.secondarySiteKeywords || [],
          siteDescription: companyProfile.siteDescription,
          businessPersonality: companyProfile.businessPersonality,
          valueProposition: companyProfile.valueProposition,
          competitorWebsites: companyProfile.competitorWebsites || [],
        } : undefined,
        existingBlogTitles: existingBlogTitles.slice(0, 20),
      }),
    ]);

    console.log(`[SEO Research] SERP data: ${serpData ? "Found" : "Not available"}`);
    console.log(`[SEO Research] Knowledge Base entries: ${Object.values(knowledgeBaseData).flat().length}`);

    // Generate enhanced research combining all sources
    const enhancedSuggestions = await generateEnhancedResearch(
      baseResearch,
      serpData,
      knowledgeBaseData,
      request.topic,
      request.location,
      industry
    );

    console.log(`[SEO Research] Enhanced research complete`);

    // Deduct credit after successful research
    const creditResult = await deductCredits(
      userId,
      "keyword_research",
      `Keyword research: ${request.topic} in ${request.location}`
    );
    if (!creditResult.success) {
      console.error("[SEO Research] Credit deduction failed:", creditResult.error);
    }

    return res.status(200).json({
      success: true,
      suggestions: enhancedSuggestions,
      creditsRemaining: creditResult.remainingCredits,
    });
  } catch (error) {
    console.error("[SEO Research] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Research failed",
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
  maxDuration: 90, // Allow more time for combined research
};
