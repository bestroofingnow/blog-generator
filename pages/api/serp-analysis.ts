// pages/api/serp-analysis.ts
// Full-featured SERP analysis using Bright Data SERP API

import { NextApiRequest, NextApiResponse } from "next";
import { gateway } from "@ai-sdk/gateway";
import { generateText } from "ai";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";

export const maxDuration = 120;

interface SerpAnalysisRequest {
  keyword: string;
  location?: string;
  country?: string; // gl parameter (e.g., "us", "uk", "ca")
  language?: string; // hl parameter (e.g., "en", "es", "fr")
  device?: "desktop" | "mobile" | "tablet";
  searchType?: "web" | "images" | "news" | "shopping" | "videos";
  numResults?: number; // 10-100
  industry?: string;
  companyName?: string;
}

interface OrganicResult {
  title: string;
  link: string;
  domain: string;
  snippet: string;
  position: number;
  sitelinks?: { title: string; link: string }[];
  date?: string;
  rating?: { value: number; count: number };
}

interface FeaturedSnippet {
  type: string;
  title: string;
  content: string;
  source: string;
  link: string;
}

interface KnowledgePanel {
  title: string;
  type: string;
  description: string;
  source: string;
  attributes: Record<string, string>;
  images?: string[];
}

interface LocalResult {
  title: string;
  address: string;
  rating?: number;
  reviews?: number;
  phone?: string;
  category?: string;
  hours?: string;
}

interface PeopleAlsoAsk {
  question: string;
  answer?: string;
  source?: string;
  link?: string;
}

interface RelatedSearch {
  query: string;
}

interface ShoppingResult {
  title: string;
  price: string;
  source: string;
  link: string;
  rating?: number;
  reviews?: number;
  image?: string;
}

interface NewsResult {
  title: string;
  source: string;
  link: string;
  date: string;
  snippet: string;
  thumbnail?: string;
}

interface ImageResult {
  title: string;
  source: string;
  link: string;
  thumbnail: string;
  originalImage: string;
  dimensions?: { width: number; height: number };
}

interface VideoResult {
  title: string;
  link: string;
  source: string;
  duration?: string;
  date?: string;
  thumbnail?: string;
  views?: string;
}

interface SerpData {
  organic: OrganicResult[];
  featuredSnippet?: FeaturedSnippet;
  knowledgePanel?: KnowledgePanel;
  localPack: LocalResult[];
  peopleAlsoAsk: PeopleAlsoAsk[];
  relatedSearches: RelatedSearch[];
  shopping: ShoppingResult[];
  news: NewsResult[];
  images: ImageResult[];
  videos: VideoResult[];
  ads: {
    top: OrganicResult[];
    bottom: OrganicResult[];
  };
  searchInfo: {
    totalResults?: string;
    searchTime?: string;
    correctedQuery?: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Auth check
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const {
    keyword,
    location,
    country = "us",
    language = "en",
    device = "desktop",
    searchType = "web",
    numResults = 20,
    industry,
    companyName,
  }: SerpAnalysisRequest = req.body;

  if (!keyword) {
    return res.status(400).json({ error: "Keyword is required" });
  }

  // Use SERP_API1 env variable (user's Bright Data SERP zone)
  const apiKey = process.env.SERP_API1 || process.env.BRIGHTDATA_API_KEY;
  const serpZone = "serp_api1";

  // If no API key, return mock data for development
  if (!apiKey) {
    console.warn("BRIGHTDATA_API_KEY not configured - returning mock SERP data");
    return res.status(200).json({
      keyword,
      location,
      country,
      language,
      device,
      searchType,
      serpData: {
        organic: [],
        localPack: [],
        peopleAlsoAsk: [],
        relatedSearches: [],
        shopping: [],
        news: [],
        images: [],
        videos: [],
        ads: { top: [], bottom: [] },
        searchInfo: {},
      },
      analysis: {
        error: "SERP API not configured. Please add BRIGHTDATA_API_KEY to environment variables.",
        searchIntent: { primary: "unknown", signals: [], recommendation: "Configure Bright Data API key" },
        difficulty: { score: 0, level: "unknown", factors: ["API not configured"] },
      },
      generatedAt: new Date().toISOString(),
    });
  }

  try {
    // Build Google search URL with all parameters
    const searchParams = new URLSearchParams();

    // Base query
    let searchQuery = keyword;
    if (location) {
      searchQuery += ` ${location}`;
    }
    searchParams.set("q", searchQuery);

    // Geolocation and language
    searchParams.set("gl", country);
    searchParams.set("hl", language);

    // Number of results
    searchParams.set("num", Math.min(Math.max(numResults, 10), 100).toString());

    // Search type
    const tbmMap: Record<string, string> = {
      images: "isch",
      news: "nws",
      shopping: "shop",
      videos: "vid",
    };
    if (searchType !== "web" && tbmMap[searchType]) {
      searchParams.set("tbm", tbmMap[searchType]);
    }

    // Enable JSON parsing
    searchParams.set("brd_json", "1");

    // Device targeting
    if (device === "mobile") {
      searchParams.set("brd_mobile", "1");
    } else if (device === "tablet") {
      searchParams.set("brd_mobile", "tablet");
    }

    const searchUrl = `https://www.google.com/search?${searchParams.toString()}`;

    // Try Bright Data SERP API with Web Scraper zone first
    let serpResponse: Response;
    let fetchError: Error | null = null;

    // Try Web Scraper Browser API format
    try {
      serpResponse = await fetch("https://api.brightdata.com/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          zone: serpZone,
          url: searchUrl,
          format: "raw",
        }),
      });
    } catch (e) {
      fetchError = e as Error;
      // Fallback: try basic proxy format
      const proxyUrl = `https://brd-customer-${process.env.BRIGHTDATA_CUSTOMER_ID || "customer"}-zone-${serpZone}:${apiKey}@brd.superproxy.io:22225`;

      try {
        serpResponse = await fetch(searchUrl, {
          headers: {
            "User-Agent": device === "mobile"
              ? "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1"
              : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });
      } catch (e2) {
        throw new Error(`SERP API connection failed: ${(fetchError || e2 as Error).message}`);
      }
    }

    if (!serpResponse!.ok) {
      const errorText = await serpResponse!.text();
      throw new Error(`SERP API error: ${serpResponse!.status} - ${errorText.substring(0, 200)}`);
    }

    const responseText = await serpResponse.text();

    // Try to parse as JSON first (brd_json=1 response)
    let serpData: SerpData;
    let rawHtml = "";

    try {
      const jsonData = JSON.parse(responseText);
      serpData = parseJsonResponse(jsonData);
    } catch {
      // Fallback to HTML parsing if JSON parsing fails
      rawHtml = responseText;
      serpData = parseHtmlResponse(rawHtml);
    }

    // Generate AI analysis based on the SERP data
    const analysis = await generateSerpAnalysis(
      keyword,
      location,
      industry,
      companyName,
      serpData,
      searchType
    );

    return res.status(200).json({
      keyword,
      location,
      country,
      language,
      device,
      searchType,
      serpData,
      analysis,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("SERP analysis error:", error);
    return res.status(500).json({
      error: "Failed to analyze search results",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

function parseJsonResponse(json: Record<string, unknown>): SerpData {
  const data: SerpData = {
    organic: [],
    localPack: [],
    peopleAlsoAsk: [],
    relatedSearches: [],
    shopping: [],
    news: [],
    images: [],
    videos: [],
    ads: { top: [], bottom: [] },
    searchInfo: {},
  };

  // Parse organic results
  if (Array.isArray(json.organic)) {
    data.organic = json.organic.map((item: Record<string, unknown>, index: number) => ({
      title: String(item.title || ""),
      link: String(item.link || ""),
      domain: extractDomain(String(item.link || "")),
      snippet: String(item.snippet || item.description || ""),
      position: index + 1,
      sitelinks: Array.isArray(item.sitelinks)
        ? item.sitelinks.map((s: Record<string, unknown>) => ({
            title: String(s.title || ""),
            link: String(s.link || ""),
          }))
        : undefined,
      date: item.date ? String(item.date) : undefined,
      rating: item.rating
        ? {
            value: Number((item.rating as Record<string, unknown>).value || 0),
            count: Number((item.rating as Record<string, unknown>).count || 0),
          }
        : undefined,
    }));
  }

  // Parse featured snippet
  if (json.featured_snippet || json.featuredSnippet) {
    const fs = (json.featured_snippet || json.featuredSnippet) as Record<string, unknown>;
    data.featuredSnippet = {
      type: String(fs.type || "paragraph"),
      title: String(fs.title || ""),
      content: String(fs.content || fs.snippet || ""),
      source: String(fs.source || ""),
      link: String(fs.link || ""),
    };
  }

  // Parse knowledge panel
  if (json.knowledge_panel || json.knowledgePanel) {
    const kp = (json.knowledge_panel || json.knowledgePanel) as Record<string, unknown>;
    data.knowledgePanel = {
      title: String(kp.title || ""),
      type: String(kp.type || kp.subtitle || ""),
      description: String(kp.description || ""),
      source: String(kp.source || ""),
      attributes: (kp.attributes || {}) as Record<string, string>,
      images: Array.isArray(kp.images) ? kp.images.map(String) : undefined,
    };
  }

  // Parse local pack
  if (Array.isArray(json.local_pack || json.localPack || json.local_results)) {
    const localResults = json.local_pack || json.localPack || json.local_results;
    data.localPack = (localResults as Record<string, unknown>[]).map((item) => ({
      title: String(item.title || item.name || ""),
      address: String(item.address || ""),
      rating: item.rating ? Number(item.rating) : undefined,
      reviews: item.reviews ? Number(item.reviews) : undefined,
      phone: item.phone ? String(item.phone) : undefined,
      category: item.category ? String(item.category) : undefined,
      hours: item.hours ? String(item.hours) : undefined,
    }));
  }

  // Parse People Also Ask
  if (Array.isArray(json.people_also_ask || json.peopleAlsoAsk || json.related_questions)) {
    const paa = json.people_also_ask || json.peopleAlsoAsk || json.related_questions;
    data.peopleAlsoAsk = (paa as Record<string, unknown>[]).map((item) => ({
      question: String(item.question || item.title || ""),
      answer: item.answer ? String(item.answer) : undefined,
      source: item.source ? String(item.source) : undefined,
      link: item.link ? String(item.link) : undefined,
    }));
  }

  // Parse related searches
  if (Array.isArray(json.related_searches || json.relatedSearches)) {
    const rs = json.related_searches || json.relatedSearches;
    data.relatedSearches = (rs as Record<string, unknown>[]).map((item) => ({
      query: String(item.query || item.text || item),
    }));
  }

  // Parse shopping results
  if (Array.isArray(json.shopping || json.shopping_results)) {
    const shopping = json.shopping || json.shopping_results;
    data.shopping = (shopping as Record<string, unknown>[]).map((item) => ({
      title: String(item.title || ""),
      price: String(item.price || ""),
      source: String(item.source || item.merchant || ""),
      link: String(item.link || ""),
      rating: item.rating ? Number(item.rating) : undefined,
      reviews: item.reviews ? Number(item.reviews) : undefined,
      image: item.image ? String(item.image) : undefined,
    }));
  }

  // Parse news results
  if (Array.isArray(json.news || json.news_results || json.top_stories)) {
    const news = json.news || json.news_results || json.top_stories;
    data.news = (news as Record<string, unknown>[]).map((item) => ({
      title: String(item.title || ""),
      source: String(item.source || item.publisher || ""),
      link: String(item.link || ""),
      date: String(item.date || item.published || ""),
      snippet: String(item.snippet || item.description || ""),
      thumbnail: item.thumbnail ? String(item.thumbnail) : undefined,
    }));
  }

  // Parse image results
  if (Array.isArray(json.images || json.image_results)) {
    const images = json.images || json.image_results;
    data.images = (images as Record<string, unknown>[]).map((item) => ({
      title: String(item.title || ""),
      source: String(item.source || ""),
      link: String(item.link || ""),
      thumbnail: String(item.thumbnail || ""),
      originalImage: String(item.original || item.image || ""),
      dimensions: item.width && item.height
        ? { width: Number(item.width), height: Number(item.height) }
        : undefined,
    }));
  }

  // Parse video results
  if (Array.isArray(json.videos || json.video_results)) {
    const videos = json.videos || json.video_results;
    data.videos = (videos as Record<string, unknown>[]).map((item) => ({
      title: String(item.title || ""),
      link: String(item.link || ""),
      source: String(item.source || item.platform || ""),
      duration: item.duration ? String(item.duration) : undefined,
      date: item.date ? String(item.date) : undefined,
      thumbnail: item.thumbnail ? String(item.thumbnail) : undefined,
      views: item.views ? String(item.views) : undefined,
    }));
  }

  // Parse ads
  if (Array.isArray(json.ads || json.top_ads)) {
    const topAds = json.ads || json.top_ads;
    data.ads.top = (topAds as Record<string, unknown>[]).map((item, index) => ({
      title: String(item.title || ""),
      link: String(item.link || ""),
      domain: extractDomain(String(item.link || "")),
      snippet: String(item.snippet || item.description || ""),
      position: index + 1,
    }));
  }
  if (Array.isArray(json.bottom_ads)) {
    data.ads.bottom = (json.bottom_ads as Record<string, unknown>[]).map((item, index) => ({
      title: String(item.title || ""),
      link: String(item.link || ""),
      domain: extractDomain(String(item.link || "")),
      snippet: String(item.snippet || item.description || ""),
      position: index + 1,
    }));
  }

  // Parse search info
  if (json.search_information || json.searchInfo) {
    const si = (json.search_information || json.searchInfo) as Record<string, unknown>;
    data.searchInfo = {
      totalResults: si.total_results ? String(si.total_results) : undefined,
      searchTime: si.time_taken_displayed ? String(si.time_taken_displayed) : undefined,
      correctedQuery: si.spelling_fix ? String(si.spelling_fix) : undefined,
    };
  }

  return data;
}

function parseHtmlResponse(html: string): SerpData {
  const data: SerpData = {
    organic: [],
    localPack: [],
    peopleAlsoAsk: [],
    relatedSearches: [],
    shopping: [],
    news: [],
    images: [],
    videos: [],
    ads: { top: [], bottom: [] },
    searchInfo: {},
  };

  // Extract organic results from HTML
  const titleMatches = Array.from(html.matchAll(/<h3[^>]*>(.*?)<\/h3>/gi));
  const urlMatches = Array.from(html.matchAll(/<a[^>]*href="(https?:\/\/(?!www\.google)[^"]+)"[^>]*>/gi));
  const snippetMatches = Array.from(html.matchAll(/<div[^>]*class="[^"]*VwiC3b[^"]*"[^>]*>([\s\S]*?)<\/div>/gi));

  const seenDomains = new Set<string>();
  let position = 1;

  for (const match of titleMatches) {
    const title = match[1]?.replace(/<[^>]+>/g, "").trim();
    if (title && title.length > 10) {
      // Find corresponding URL
      const urlMatch = urlMatches.find((u) => {
        const domain = extractDomain(u[1]);
        return !seenDomains.has(domain);
      });

      if (urlMatch) {
        const domain = extractDomain(urlMatch[1]);
        seenDomains.add(domain);

        // Find corresponding snippet
        const snippetMatch = snippetMatches[position - 1];
        const snippet = snippetMatch
          ? snippetMatch[1]?.replace(/<[^>]+>/g, "").trim().substring(0, 300)
          : "";

        data.organic.push({
          title,
          link: urlMatch[1],
          domain,
          snippet,
          position: position++,
        });

        if (position > 20) break;
      }
    }
  }

  // Extract People Also Ask
  const paaMatches = Array.from(html.matchAll(/data-q="([^"]+)"/gi));
  for (const match of paaMatches) {
    if (match[1] && !data.peopleAlsoAsk.some((p) => p.question === match[1])) {
      data.peopleAlsoAsk.push({ question: match[1] });
    }
  }

  // Extract Related Searches
  const relatedMatches = Array.from(html.matchAll(/<a[^>]*href="\/search\?[^"]*q=([^&"]+)/gi));
  for (const match of relatedMatches) {
    const query = decodeURIComponent(match[1].replace(/\+/g, " "));
    if (query && !data.relatedSearches.some((r) => r.query === query)) {
      data.relatedSearches.push({ query });
    }
  }

  return data;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

async function generateSerpAnalysis(
  keyword: string,
  location: string | undefined,
  industry: string | undefined,
  companyName: string | undefined,
  serpData: SerpData,
  searchType: string
): Promise<Record<string, unknown>> {
  const analysisPrompt = `Analyze these Google ${searchType} search results for "${keyword}"${location ? ` in ${location}` : ""}${industry ? ` (${industry} industry)` : ""}${companyName ? ` for ${companyName}` : ""}.

## ORGANIC RESULTS (Top ${serpData.organic.length})
${serpData.organic
  .slice(0, 10)
  .map((r) => `${r.position}. [${r.domain}] "${r.title}"\n   ${r.snippet}`)
  .join("\n")}

${serpData.featuredSnippet ? `## FEATURED SNIPPET\nType: ${serpData.featuredSnippet.type}\nSource: ${serpData.featuredSnippet.source}\nContent: ${serpData.featuredSnippet.content}` : ""}

${serpData.knowledgePanel ? `## KNOWLEDGE PANEL\nTitle: ${serpData.knowledgePanel.title}\nType: ${serpData.knowledgePanel.type}\nDescription: ${serpData.knowledgePanel.description}` : ""}

${serpData.localPack.length > 0 ? `## LOCAL PACK (${serpData.localPack.length} results)\n${serpData.localPack.map((l) => `- ${l.title} (${l.rating || "N/A"} stars, ${l.reviews || 0} reviews)`).join("\n")}` : ""}

## PEOPLE ALSO ASK (${serpData.peopleAlsoAsk.length})
${serpData.peopleAlsoAsk.slice(0, 8).map((p) => `- ${p.question}`).join("\n")}

## RELATED SEARCHES
${serpData.relatedSearches.slice(0, 10).map((r) => r.query).join(", ")}

${serpData.ads.top.length > 0 ? `## PAID ADS (${serpData.ads.top.length} top ads)\n${serpData.ads.top.map((a) => `- [${a.domain}] ${a.title}`).join("\n")}` : ""}

${serpData.shopping.length > 0 ? `## SHOPPING RESULTS\n${serpData.shopping.slice(0, 5).map((s) => `- ${s.title} - ${s.price} (${s.source})`).join("\n")}` : ""}

${serpData.news.length > 0 ? `## NEWS RESULTS\n${serpData.news.slice(0, 5).map((n) => `- [${n.source}] ${n.title} (${n.date})`).join("\n")}` : ""}

${serpData.videos.length > 0 ? `## VIDEO RESULTS\n${serpData.videos.slice(0, 5).map((v) => `- ${v.title} (${v.source}, ${v.duration || "N/A"})`).join("\n")}` : ""}

Provide comprehensive SEO analysis as JSON:
{
  "searchIntent": {
    "primary": "informational|transactional|navigational|commercial|local",
    "signals": ["list of intent signals observed"],
    "recommendation": "content strategy based on intent"
  },
  "difficulty": {
    "score": 1-100,
    "level": "easy|medium|hard|very_hard",
    "factors": ["reasons for this rating"]
  },
  "competitors": {
    "topDomains": [{"domain": "", "position": 1, "strength": "", "weakness": ""}],
    "domainAuthorityMix": "high|medium|low|mixed",
    "contentTypes": ["blog", "product page", "service page", etc.]
  },
  "serpFeatures": {
    "present": ["list of SERP features found"],
    "opportunities": ["features you could target"],
    "featuredSnippetStrategy": "how to win the featured snippet if present"
  },
  "contentStrategy": {
    "recommendedType": "blog|guide|listicle|how-to|comparison|landing_page|video|infographic",
    "targetWordCount": "range based on competition",
    "mustIncludeTopics": ["essential topics from top results"],
    "uniqueAngles": ["differentiation opportunities"],
    "titleSuggestions": ["5 optimized title options"],
    "metaDescriptionTemplate": "suggested meta description"
  },
  "keywordStrategy": {
    "primaryKeyword": "${keyword}",
    "secondaryKeywords": ["from related searches"],
    "longTailOpportunities": ["from PAA"],
    "localKeywords": ["if location relevant"],
    "semanticKeywords": ["LSI keywords to include"]
  },
  "technicalSEO": {
    "schemaMarkupRecommended": ["types of schema to implement"],
    "pageSpeedImportance": "high|medium|low based on competition",
    "mobileOptimization": "critical|important|standard"
  },
  "quickWins": ["5 fast optimizations to outrank competition"],
  "estimatedTimeToRank": "realistic timeline with milestones",
  "riskFactors": ["potential challenges"]
}`;

  try {
    const aiResult = await generateText({
      model: gateway("anthropic/claude-sonnet-4"),
      prompt: analysisPrompt,
    });

    const jsonMatch = aiResult.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { rawAnalysis: aiResult.text };
  } catch (error) {
    console.error("AI analysis error:", error);
    return { error: "Failed to generate AI analysis" };
  }
}
