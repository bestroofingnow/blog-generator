// pages/api/research-topics.ts
// SEO-focused topic research using Bright Data for real SERP analysis
// Generates blog topics based on sitemap analysis, knowledge base, and what customers search for
// Features: Sitemap duplicate prevention, Knowledge Base integration, City rotation

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import { loadUserProfile, loadDrafts, getUsedTopicsAndKeywords } from "../../lib/database";
import { generateText } from "ai";
import { createGateway } from "@ai-sdk/gateway";
import { db, knowledgeBase } from "../../lib/db";
import { eq } from "drizzle-orm";

// Create gateway instance
const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? "",
});

const BRIGHT_DATA_API_TOKEN = process.env.BRIGHT_DATA_API_TOKEN || "";
const BRIGHT_DATA_BASE_URL = "https://api.brightdata.com";

// Fetch sitemap from company website
async function fetchSitemap(websiteUrl: string): Promise<string[]> {
  if (!websiteUrl) return [];

  try {
    // Try common sitemap locations
    const baseUrl = websiteUrl.replace(/\/$/, "");
    const sitemapUrls = [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/sitemap_index.xml`,
      `${baseUrl}/sitemap-index.xml`,
      `${baseUrl}/post-sitemap.xml`,
      `${baseUrl}/page-sitemap.xml`,
    ];

    const existingUrls: string[] = [];

    for (const sitemapUrl of sitemapUrls) {
      try {
        const response = await fetch(sitemapUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; BlogGenerator/1.0)" },
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          const xml = await response.text();

          // Extract URLs from sitemap
          const urlMatches = xml.match(/<loc>(.*?)<\/loc>/gi) || [];
          for (const match of urlMatches) {
            const url = match.replace(/<\/?loc>/gi, "").trim();
            if (url && !url.includes("sitemap")) {
              existingUrls.push(url);
            }
          }

          console.log(`[Topic Research] Found ${urlMatches.length} URLs in ${sitemapUrl}`);
        }
      } catch {
        // Continue to next sitemap URL
      }
    }

    return Array.from(new Set(existingUrls));
  } catch (error) {
    console.error("[Topic Research] Sitemap fetch error:", error);
    return [];
  }
}

// Extract page/post titles from sitemap URLs
function extractTitlesFromUrls(urls: string[]): string[] {
  const titles: string[] = [];

  for (const url of urls) {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;

      // Skip home, category, tag, author pages
      if (path === "/" || path.includes("/category/") || path.includes("/tag/") ||
          path.includes("/author/") || path.includes("/page/")) {
        continue;
      }

      // Extract the last segment as potential title
      const segments = path.split("/").filter(Boolean);
      const lastSegment = segments[segments.length - 1];

      if (lastSegment && lastSegment.length > 3) {
        // Convert slug to readable title
        const title = lastSegment
          .replace(/-/g, " ")
          .replace(/_/g, " ")
          .replace(/\d{4}$/, "") // Remove year suffixes
          .trim();

        if (title.length > 5) {
          titles.push(title.toLowerCase());
        }
      }
    } catch {
      // Invalid URL, skip
    }
  }

  return Array.from(new Set(titles));
}

// Load knowledge base entries for the user
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

    console.log(`[Topic Research] Knowledge Base: ${entries.length} entries loaded`);
    return result;
  } catch (error) {
    console.error("[Topic Research] Knowledge base load error:", error);
    return { services: [], usps: [], facts: [], faqs: [], locations: [] };
  }
}

// Distribute cities across topic suggestions
function distributeCities(cities: string[], count: number = 5): string[] {
  if (!cities || cities.length === 0) return [];
  if (cities.length === 1) return Array(count).fill(cities[0]);

  // Shuffle cities for variety
  const shuffled = [...cities].sort(() => Math.random() - 0.5);

  // Distribute evenly, cycling through if needed
  const distributed: string[] = [];
  for (let i = 0; i < count; i++) {
    distributed.push(shuffled[i % shuffled.length]);
  }

  return distributed;
}

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
    "luxury homes",
    "new construction homes",
    "condos for sale",
    "townhomes for sale",
  ],
  equestrian: [
    "horse property for sale",
    "equestrian real estate",
    "horse farm",
    "land for horses",
    "horse boarding",
    "equestrian community",
    "horse barn",
    "riding arena",
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
    "asphalt shingles",
    "roof damage",
    "storm damage roof",
    "roof estimate",
  ],
  hvac: [
    "ac repair",
    "heating repair",
    "hvac installation",
    "furnace replacement",
    "air conditioning service",
    "hvac maintenance",
    "heat pump",
    "ductless mini split",
    "hvac tune up",
    "emergency ac repair",
  ],
  plumbing: [
    "plumber near me",
    "drain cleaning",
    "water heater repair",
    "pipe repair",
    "emergency plumber",
    "sewer line repair",
    "toilet repair",
    "faucet installation",
    "garbage disposal",
    "water leak repair",
  ],
  landscaping: [
    "landscaping service",
    "lawn care",
    "landscape design",
    "irrigation installation",
    "tree trimming",
    "outdoor lighting",
    "hardscaping",
    "patio design",
    "garden design",
    "lawn maintenance",
  ],
  electrical: [
    "electrician near me",
    "electrical repair",
    "panel upgrade",
    "outlet installation",
    "ceiling fan installation",
    "lighting installation",
    "electrical inspection",
    "generator installation",
  ],
  pest_control: [
    "pest control service",
    "termite treatment",
    "rodent control",
    "bed bug treatment",
    "ant control",
    "mosquito control",
    "wildlife removal",
    "pest inspection",
  ],
  cleaning: [
    "house cleaning service",
    "commercial cleaning",
    "deep cleaning",
    "move out cleaning",
    "carpet cleaning",
    "window cleaning",
    "janitorial service",
    "office cleaning",
  ],
  moving: [
    "moving company",
    "local movers",
    "long distance moving",
    "packing services",
    "storage solutions",
    "commercial moving",
    "piano moving",
    "furniture moving",
  ],
  auto: [
    "auto repair",
    "oil change",
    "brake repair",
    "tire service",
    "car maintenance",
    "transmission repair",
    "auto body shop",
    "car inspection",
  ],
  dental: [
    "dentist near me",
    "teeth cleaning",
    "dental implants",
    "cosmetic dentistry",
    "teeth whitening",
    "dental emergency",
    "family dentist",
    "invisalign",
  ],
  legal: [
    "attorney near me",
    "personal injury lawyer",
    "family law attorney",
    "criminal defense lawyer",
    "estate planning attorney",
    "business lawyer",
    "divorce attorney",
    "bankruptcy lawyer",
  ],
  restaurant: [
    "best restaurants",
    "food delivery",
    "catering service",
    "private dining",
    "brunch spots",
    "happy hour",
    "outdoor dining",
    "fine dining",
  ],
  fitness: [
    "gym near me",
    "personal trainer",
    "yoga classes",
    "fitness center",
    "crossfit gym",
    "pilates studio",
    "group fitness classes",
    "weight loss program",
  ],
  general: [
    "local service",
    "professional contractor",
    "home improvement",
    "licensed contractor",
    "best service provider",
    "trusted local business",
    "quality service",
    "affordable service",
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

    // SITEMAP ANALYSIS - Fetch existing content from website sitemap
    const websiteUrl = companyProfile.website || "";
    const sitemapUrls = await fetchSitemap(websiteUrl);
    const sitemapTitles = extractTitlesFromUrls(sitemapUrls);

    console.log(`[Topic Research] Sitemap: Found ${sitemapUrls.length} URLs, extracted ${sitemapTitles.length} titles`);

    // KNOWLEDGE BASE - Load company facts, services, USPs
    const knowledgeBaseData = await loadKnowledgeBaseEntries(userId);

    // CITY ROTATION - Get available cities and distribute
    const serviceCities = companyProfile.cities || [];
    const headquartersCity = companyProfile.headquarters || "";
    const allCities = Array.from(new Set([headquartersCity, ...serviceCities].filter(Boolean)));
    const distributedCities = distributeCities(allCities, 5);

    console.log(`[Topic Research] Cities available: ${allCities.length} (will rotate across 5 topics)`);

    // Combine ALL sources for comprehensive deduplication
    const allUsedTitles = Array.from(new Set([
      ...existingBlogTitles.map(t => t.toLowerCase()),
      ...usedContent.titles.map(t => t.toLowerCase()),
      ...sitemapTitles, // Already lowercase from extraction
    ]));
    const allUsedKeywords = usedContent.keywords;
    const allUsedTopics = usedContent.topics;

    console.log(`[Topic Research] User ${userId} deduplication data:`);
    console.log(`[Topic Research] - Draft titles: ${existingBlogTitles.length}`);
    console.log(`[Topic Research] - Published titles: ${usedContent.titles.length}`);
    console.log(`[Topic Research] - Sitemap titles: ${sitemapTitles.length}`);
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

    // Build search queries combining industry keywords with different cities for variety
    const searchCities = distributedCities.length > 0 ? distributedCities.slice(0, 4) : [location];
    const searchQueries = seedKeywords.slice(0, 4).map((kw, i) => `${kw} ${searchCities[i % searchCities.length]}`);

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

    // Build comprehensive prompt with real SERP data, knowledge base, and city rotation
    const prompt = `You are an expert SEO content strategist. Based on REAL search engine data, company knowledge base, and sitemap analysis, generate 5 highly targeted blog topics for a ${industry} business.

COMPANY CONTEXT:
- Industry: ${industry}${companyProfile.customIndustryName ? ` (${companyProfile.customIndustryName})` : ""}
- Headquarters: ${location}${companyProfile.state ? `, ${companyProfile.state}` : ""}
- Company: ${companyProfile.name || "Local business"}
- Services: ${services.join(", ") || "General services"}
${companyProfile.primarySiteKeyword ? `- Primary Site Keyword: ${companyProfile.primarySiteKeyword}` : ""}
${companyProfile.valueProposition ? `- Value Proposition: ${companyProfile.valueProposition}` : ""}
${companyProfile.audience ? `- Target Audience: ${companyProfile.audience}` : ""}
${companyProfile.usps?.length ? `- Unique Selling Points: ${companyProfile.usps.join(", ")}` : ""}
${companyProfile.competitorWebsites?.length ? `- Competitors: ${companyProfile.competitorWebsites.join(", ")}` : ""}

🏙️ SERVICE AREAS - MANDATORY CITY ROTATION:
Available Cities: ${allCities.join(", ") || location}

**CRITICAL RULE**: Each of the 5 topics MUST use a DIFFERENT city from this list:
${distributedCities.map((city, i) => `- Topic ${i + 1}: Must target "${city}"`).join("\n")}

📚 KNOWLEDGE BASE (Use this company-specific information):
${knowledgeBaseData.services.length > 0 ? `
Services Offered:
${knowledgeBaseData.services.slice(0, 5).map(s => `- ${s}`).join("\n")}` : ""}
${knowledgeBaseData.usps.length > 0 ? `
Unique Selling Points:
${knowledgeBaseData.usps.slice(0, 5).map(u => `- ${u}`).join("\n")}` : ""}
${knowledgeBaseData.facts.length > 0 ? `
Company Facts:
${knowledgeBaseData.facts.slice(0, 5).map(f => `- ${f}`).join("\n")}` : ""}
${knowledgeBaseData.faqs.length > 0 ? `
Common FAQs:
${knowledgeBaseData.faqs.slice(0, 5).map(f => `- ${f}`).join("\n")}` : ""}

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

🚫 EXISTING WEBSITE CONTENT FROM SITEMAP (NEVER DUPLICATE):
${sitemapTitles.slice(0, 20).map(t => `- ${t}`).join("\n") || "No sitemap data available"}

🚫 PREVIOUSLY CREATED CONTENT (AVOID similar topics):
${allUsedTitles.slice(0, 15).map(t => `- ${t}`).join("\n") || "None yet"}

🚫 PREVIOUSLY USED KEYWORDS (NEVER repeat these exact keywords):
${allUsedKeywords.slice(0, 15).map(k => `- "${k}"`).join("\n") || "None yet"}

🚫 PREVIOUSLY COVERED TOPICS (AVOID these topic areas):
${allUsedTopics.slice(0, 10).map(t => `- ${t}`).join("\n") || "None yet"}

CRITICAL DEDUPLICATION RULES:
- Do NOT suggest topics similar to ANYTHING in the sitemap
- Do NOT suggest topics similar to previously created content
- Do NOT use the same primary keywords - find NEW keyword variations
- Do NOT repeat topic themes that have been covered
- Each topic MUST target a DIFFERENT service city as specified above

CRITICAL SEO RULES:
1. PRIMARY KEYWORDS must be actual search terms people type into Google
2. Keywords should be 2-5 words, ALWAYS including the target city
3. NO meta keywords like "blog topics", "marketing tips", "content ideas"
4. Focus on HIGH-INTENT searches that lead to business
5. Include question-based topics (How, What, Why, When, Best, Top)
6. Mix informational (guides, tips) with transactional (services, costs, quotes)
7. Titles should be 50-60 characters, compelling, and SEO-optimized
8. Include the city name naturally in both title and keyword

EXAMPLES OF GOOD vs BAD:
${industry === "realtor" ? `
GOOD: "homes for sale in Charlotte NC", "best neighborhoods Matthews", "Huntersville real estate market"
BAD: "realtor blog topics", "real estate marketing ideas", "content for realtors"
` : industry === "roofing" ? `
GOOD: "roof replacement cost Charlotte", "signs you need a new roof Matthews", "metal roofing Huntersville"
BAD: "roofing blog topics", "marketing for roofers", "roofing company content ideas"
` : `
GOOD: "[service] cost [city]", "best [service] [city]", "how to choose [service] provider in [city]"
BAD: "[industry] blog topics", "[industry] marketing tips", "content ideas for [industry]"
`}

Generate exactly 5 blog topics as JSON array. EACH TOPIC MUST USE A DIFFERENT CITY:
[
  {
    "topic": "Compelling blog title with city name (50-60 chars)",
    "primaryKeyword": "search term with city (2-5 words)",
    "blogType": "How-To Guide | Expert Tips | Local Guide | Cost Guide | Comparison | FAQ | Service Spotlight",
    "wordCount": "1000-1400 | 1400-1800 | 1800-2400",
    "location": "THE SPECIFIC CITY for this topic from the mandatory rotation list",
    "reason": "Why this topic will rank and convert for this specific city",
    "searchIntent": "informational | transactional | local",
    "estimatedDifficulty": "easy | medium | hard"
  }
]

IMPORTANT LOCATION RULES:
- Topic 1 MUST have location: "${distributedCities[0] || location}"
- Topic 2 MUST have location: "${distributedCities[1] || location}"
- Topic 3 MUST have location: "${distributedCities[2] || location}"
- Topic 4 MUST have location: "${distributedCities[3] || location}"
- Topic 5 MUST have location: "${distributedCities[4] || location}"

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
      // Generate fallback topics based on SERP data with city rotation
      topics = generateFallbackTopics(industry, location, uniquePaa, uniqueRelated, allCities);
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

// Generate fallback topics from real SERP data with city rotation
function generateFallbackTopics(
  _industry: string,
  location: string,
  paaQuestions: string[],
  relatedSearches: string[],
  cities: string[] = []
): SuggestedTopic[] {
  const topics: SuggestedTopic[] = [];
  const blogTypes = ["How-To Guide", "Expert Tips", "Cost Guide", "FAQ", "Comparison"];
  const wordCounts = ["1400-1800", "1000-1400", "1800-2400"];

  // Use city rotation if available
  const rotatedCities = cities.length > 0 ? distributeCities(cities, 5) : Array(5).fill(location);

  // Convert PAA questions to topics
  paaQuestions.slice(0, 3).forEach((question, i) => {
    const city = rotatedCities[i];
    const cleanQuestion = question.replace(/\?$/, "").trim();
    const topicWithCity = cleanQuestion.includes(city) ? cleanQuestion : `${cleanQuestion} in ${city}`;
    topics.push({
      topic: topicWithCity.length > 60 ? topicWithCity.substring(0, 57) + "..." : topicWithCity,
      primaryKeyword: `${cleanQuestion.toLowerCase().substring(0, 30)} ${city}`.trim(),
      blogType: blogTypes[i % blogTypes.length],
      wordCount: wordCounts[i % wordCounts.length],
      location: city,
      reason: `Based on 'People Also Ask' data for ${city}`,
      searchIntent: "informational",
      estimatedDifficulty: "medium",
    });
  });

  // Convert related searches to topics
  relatedSearches.slice(0, 2).forEach((search, i) => {
    const city = rotatedCities[3 + i];
    const title = `Complete Guide to ${search.charAt(0).toUpperCase() + search.slice(1)} in ${city}`;
    topics.push({
      topic: title.length > 60 ? title.substring(0, 57) + "..." : title,
      primaryKeyword: `${search.toLowerCase()} ${city}`.trim(),
      blogType: "How-To Guide",
      wordCount: "1800-2400",
      location: city,
      reason: `Based on related search data for ${city}`,
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
