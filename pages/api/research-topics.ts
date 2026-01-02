// pages/api/research-topics.ts
// SEO-focused topic research using Bright Data for real SERP analysis
// Generates blog topics based on what customers actually search for

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import { loadUserProfile, loadDrafts, getUsedTopicsAndKeywords } from "../../lib/database";
import { generateText } from "ai";
import { createGateway } from "@ai-sdk/gateway";

// Create gateway instance
const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? "",
});

const BRIGHT_DATA_API_TOKEN = process.env.BRIGHT_DATA_API_TOKEN || "";
const BRIGHT_DATA_BASE_URL = "https://api.brightdata.com";

// Direct Bright Data SERP search
async function searchWithBrightData(query: string): Promise<{
  results: Array<{ position: number; title: string; url: string; snippet: string }>;
  paaQuestions: string[];
  relatedSearches: string[];
} | null> {
  if (!BRIGHT_DATA_API_TOKEN) {
    console.log("[Topic Research] Bright Data not configured, skipping SERP");
    return null;
  }

  try {
    const params = new URLSearchParams({
      query,
      country: "us",
      language: "en",
    });

    const response = await fetch(`${BRIGHT_DATA_BASE_URL}/serp/google/search?${params}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${BRIGHT_DATA_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      console.log("[Topic Research] SERP search failed:", response.status);
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
    };
  } catch (error) {
    console.error("[Topic Research] SERP error:", error);
    return null;
  }
}

interface SuggestedTopic {
  topic: string;
  primaryKeyword: string;
  blogType: string;
  wordCount: string;
  location: string;
  reason: string;
  searchIntent: "informational" | "transactional" | "navigational" | "local";
  estimatedDifficulty: "easy" | "medium" | "hard";
}

interface TopicResearchResponse {
  success: boolean;
  topics?: SuggestedTopic[];
  serpInsights?: {
    topRankingTopics: string[];
    paaQuestions: string[];
    contentGaps: string[];
  };
  error?: string;
}

// Industry-specific seed keywords for SERP research
const INDUSTRY_SEED_KEYWORDS: Record<string, string[]> = {
  realtor: [
    "homes for sale",
    "real estate agent",
    "buying a house",
    "selling my home",
    "best neighborhoods",
    "home value",
    "real estate market",
    "first time home buyer",
  ],
  equestrian: [
    "horse property for sale",
    "equestrian real estate",
    "horse farm",
    "land for horses",
    "horse boarding",
    "equestrian community",
  ],
  roofing: [
    "roof repair",
    "roof replacement",
    "roofing contractor",
    "roof inspection",
    "shingle replacement",
    "roof leak repair",
    "new roof cost",
    "metal roofing",
  ],
  hvac: [
    "ac repair",
    "heating repair",
    "hvac installation",
    "furnace replacement",
    "air conditioning service",
    "hvac maintenance",
  ],
  plumbing: [
    "plumber near me",
    "drain cleaning",
    "water heater repair",
    "pipe repair",
    "emergency plumber",
    "sewer line repair",
  ],
  landscaping: [
    "landscaping service",
    "lawn care",
    "landscape design",
    "irrigation installation",
    "tree trimming",
    "outdoor lighting",
  ],
  general: [
    "local service",
    "professional contractor",
    "home improvement",
    "licensed contractor",
  ],
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TopicResearchResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // Auth check
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  try {
    const userId = (session.user as { id?: string }).id || session.user?.email || "";
    const userProfile = await loadUserProfile(userId);
    const pastBlogs = await loadDrafts(userId);
    const companyProfile = userProfile?.companyProfile;

    if (!companyProfile?.industryType && !companyProfile?.name) {
      return res.status(400).json({
        success: false,
        error: "Company profile required. Please set up your profile first.",
      });
    }

    // Get comprehensive list of used topics, keywords, and titles for deduplication
    const usedContent = await getUsedTopicsAndKeywords(userId);
    const existingBlogTitles = pastBlogs.map(blog => blog.title);

    // Combine for comprehensive deduplication
    const allUsedTitles = Array.from(new Set([...existingBlogTitles, ...usedContent.titles]));
    const allUsedKeywords = usedContent.keywords;
    const allUsedTopics = usedContent.topics;

    console.log(`[Topic Research] User ${userId} deduplication data:`);
    console.log(`[Topic Research] - Draft titles: ${existingBlogTitles.length}`);
    console.log(`[Topic Research] - Published titles: ${usedContent.titles.length}`);
    console.log(`[Topic Research] - Published keywords: ${usedContent.keywords.length}`);
    console.log(`[Topic Research] - Published topics: ${usedContent.topics.length}`);
    console.log(`[Topic Research] - Combined unique titles: ${allUsedTitles.length}`);
    if (allUsedKeywords.length > 0) {
      console.log(`[Topic Research] - Keywords to avoid: ${allUsedKeywords.slice(0, 5).join(", ")}...`);
    }

    // Use custom industry name when industryType is "custom"
    const industry = companyProfile.industryType === "custom" && companyProfile.customIndustryName
      ? companyProfile.customIndustryName
      : (companyProfile.industryType || "general");
    const industryForKeywords = companyProfile.industryType || "general"; // For seed keyword lookup
    const location = companyProfile.headquarters || req.body.location || "United States";
    const services = companyProfile.services || [];

    // Get seed keywords for this industry (use dropdown value for keyword lookup, not custom name)
    const seedKeywords = INDUSTRY_SEED_KEYWORDS[industryForKeywords] || INDUSTRY_SEED_KEYWORDS.general;

    // Build search queries combining industry keywords with location
    const searchQueries = seedKeywords.slice(0, 4).map(kw => `${kw} ${location}`);

    console.log("[Topic Research] Searching for:", searchQueries);

    // Fetch real SERP data from Bright Data (parallel)
    const serpResults = await Promise.all(
      searchQueries.map(async (query) => {
        try {
          const result = await searchWithBrightData(query);
          return { query, data: result };
        } catch {
          return { query, data: null };
        }
      })
    );

    // Collect SERP insights
    const allTitles: string[] = [];
    const allPaaQuestions: string[] = [];
    const allRelatedSearches: string[] = [];

    serpResults.forEach(({ data }) => {
      if (data) {
        allTitles.push(...data.results.map(r => r.title));
        allPaaQuestions.push(...(data.paaQuestions || []));
        allRelatedSearches.push(...(data.relatedSearches || []));
      }
    });

    // Deduplicate
    const uniquePaa = Array.from(new Set(allPaaQuestions)).slice(0, 10);
    const uniqueRelated = Array.from(new Set(allRelatedSearches)).slice(0, 10);
    const uniqueTitles = Array.from(new Set(allTitles)).slice(0, 15);

    console.log("[Topic Research] Found PAA questions:", uniquePaa.length);
    console.log("[Topic Research] Found related searches:", uniqueRelated.length);

    // Build comprehensive prompt with real SERP data
    const prompt = `You are an expert SEO content strategist. Based on REAL search engine data, generate 5 highly targeted blog topics for a ${industry} business in ${location}.

COMPANY CONTEXT:
- Industry: ${industry}${companyProfile.customIndustryName ? ` (${companyProfile.customIndustryName})` : ""}
- Location: ${location}${companyProfile.state ? `, ${companyProfile.state}` : ""}
- Company: ${companyProfile.name || "Local business"}
- Services: ${services.join(", ") || "General services"}
${companyProfile.primarySiteKeyword ? `- Primary Site Keyword: ${companyProfile.primarySiteKeyword}` : ""}
${companyProfile.valueProposition ? `- Value Proposition: ${companyProfile.valueProposition}` : ""}
${companyProfile.audience ? `- Target Audience: ${companyProfile.audience}` : ""}
${companyProfile.usps?.length ? `- Unique Selling Points: ${companyProfile.usps.join(", ")}` : ""}
${companyProfile.cities?.length ? `- Service Areas: ${companyProfile.cities.join(", ")}` : ""}
${companyProfile.competitorWebsites?.length ? `- Competitors: ${companyProfile.competitorWebsites.join(", ")}` : ""}

REAL SERP DATA (What people are actually searching for):
${uniqueTitles.length > 0 ? `
Top Ranking Content Titles:
${uniqueTitles.map(t => `- ${t}`).join("\n")}
` : ""}
${uniquePaa.length > 0 ? `
People Also Ask Questions:
${uniquePaa.map(q => `- ${q}`).join("\n")}
` : ""}
${uniqueRelated.length > 0 ? `
Related Searches:
${uniqueRelated.map(s => `- ${s}`).join("\n")}
` : ""}

🚫 CONTENT ALREADY USED - NEVER SUGGEST THESE AGAIN:

Previously Used Titles (AVOID similar topics):
${allUsedTitles.slice(0, 15).map(t => `- ${t}`).join("\n") || "None yet"}

Previously Used Primary Keywords (NEVER repeat these exact keywords):
${allUsedKeywords.slice(0, 15).map(k => `- "${k}"`).join("\n") || "None yet"}

Previously Used Topics (AVOID these topic areas):
${allUsedTopics.slice(0, 10).map(t => `- ${t}`).join("\n") || "None yet"}

CRITICAL: You MUST check every suggestion against the lists above.
- Do NOT suggest topics with similar titles to those already used
- Do NOT use the same primary keywords - find NEW keyword variations
- Do NOT repeat topic themes that have been covered

CRITICAL SEO RULES:
1. PRIMARY KEYWORDS must be actual search terms people type into Google
2. Keywords should be 2-5 words, including location when relevant
3. NO meta keywords like "blog topics", "marketing tips", "content ideas"
4. Focus on HIGH-INTENT searches that lead to business
5. Include question-based topics (How, What, Why, When, Best, Top)
6. Mix informational (guides, tips) with transactional (services, costs, quotes)

EXAMPLES OF GOOD vs BAD:
${industry === "realtor" ? `
GOOD: "homes for sale in Charlotte NC", "best neighborhoods Charlotte", "Charlotte real estate market 2024"
BAD: "realtor blog topics", "real estate marketing ideas", "content for realtors"
` : industry === "roofing" ? `
GOOD: "roof replacement cost Charlotte", "signs you need a new roof", "best roofing materials for NC weather"
BAD: "roofing blog topics", "marketing for roofers", "roofing company content ideas"
` : `
GOOD: "[service] cost [location]", "best [service] near me", "how to choose [service] provider"
BAD: "[industry] blog topics", "[industry] marketing tips", "content ideas for [industry]"
`}

Generate exactly 5 blog topics as JSON array:
[
  {
    "topic": "Compelling blog title that matches search intent (50-60 chars)",
    "primaryKeyword": "actual search term people use (2-5 words, include location if local)",
    "blogType": "How-To Guide | Expert Tips | Neighborhood Guide | Cost Guide | Comparison | FAQ",
    "wordCount": "1000-1400 | 1400-1800 | 1800-2400",
    "location": "SPECIFIC location used in this topic/keyword (e.g., if topic mentions Lake Norman, return Lake Norman, not ${location})",
    "reason": "Why this topic will rank and convert",
    "searchIntent": "informational | transactional | local",
    "estimatedDifficulty": "easy | medium | hard"
  }
]

IMPORTANT: The "location" field must match the SPECIFIC location mentioned in the topic/keyword.
- If the topic is "Top Roofing Contractors Near Lake Norman" → location should be "Lake Norman"
- If the topic is "Charlotte Home Buying Guide" → location should be "Charlotte"
- Use the exact location from the topic, not the general service area

Return ONLY the JSON array, no other text.`;

    console.log("[Topic Research] Generating topics with AI...");

    const result = await generateText({
      model: gateway("anthropic/claude-sonnet-4"),
      prompt,
      maxOutputTokens: 2000,
      temperature: 0.7,
    });

    // Parse the response
    let topics: SuggestedTopic[] = [];
    try {
      let cleanedText = result.text.trim();
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.slice(7);
      }
      if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.slice(3);
      }
      if (cleanedText.endsWith("```")) {
        cleanedText = cleanedText.slice(0, -3);
      }

      const parsed = JSON.parse(cleanedText.trim());
      topics = Array.isArray(parsed) ? parsed : [];
    } catch (parseError) {
      console.error("[Topic Research] Failed to parse AI response:", parseError);
      // Generate fallback topics based on SERP data
      topics = generateFallbackTopics(industry, location, uniquePaa, uniqueRelated);
    }

    return res.status(200).json({
      success: true,
      topics,
      serpInsights: {
        topRankingTopics: uniqueTitles,
        paaQuestions: uniquePaa,
        contentGaps: uniqueRelated,
      },
    });
  } catch (error) {
    console.error("[Topic Research] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Topic research failed",
    });
  }
}

// Generate fallback topics from real SERP data
function generateFallbackTopics(
  industry: string,
  location: string,
  paaQuestions: string[],
  relatedSearches: string[]
): SuggestedTopic[] {
  const topics: SuggestedTopic[] = [];
  const blogTypes = ["How-To Guide", "Expert Tips", "Cost Guide", "FAQ", "Comparison"];
  const wordCounts = ["1400-1800", "1000-1400", "1800-2400"];

  // Convert PAA questions to topics
  paaQuestions.slice(0, 3).forEach((question, i) => {
    const cleanQuestion = question.replace(/\?$/, "").trim();
    topics.push({
      topic: cleanQuestion.length > 60 ? cleanQuestion.substring(0, 57) + "..." : cleanQuestion,
      primaryKeyword: cleanQuestion.toLowerCase().substring(0, 40),
      blogType: blogTypes[i % blogTypes.length],
      wordCount: wordCounts[i % wordCounts.length],
      location,
      reason: "Based on real 'People Also Ask' search data",
      searchIntent: "informational",
      estimatedDifficulty: "medium",
    });
  });

  // Convert related searches to topics
  relatedSearches.slice(0, 2).forEach((search, i) => {
    const title = `Complete Guide to ${search.charAt(0).toUpperCase() + search.slice(1)}`;
    topics.push({
      topic: title.length > 60 ? title.substring(0, 57) + "..." : title,
      primaryKeyword: search.toLowerCase(),
      blogType: "How-To Guide",
      wordCount: "1800-2400",
      location,
      reason: "Based on real related search data",
      searchIntent: i === 0 ? "transactional" : "informational",
      estimatedDifficulty: "medium",
    });
  });

  return topics.slice(0, 5);
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
  maxDuration: 90, // Allow more time for SERP research
};
