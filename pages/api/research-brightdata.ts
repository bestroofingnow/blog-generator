// pages/api/research-brightdata.ts
// Unified Bright Data research endpoint for comprehensive SEO and marketing intelligence
// Combines SERP analysis, competitor scraping, business data, and social insights

import type { NextApiRequest, NextApiResponse } from "next";
import { generateText } from "ai";
import { MODELS } from "../../lib/ai-gateway";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";

const BRIGHT_DATA_API_TOKEN = process.env.BRIGHT_DATA_API_TOKEN || "";
const BRIGHT_DATA_BASE_URL = "https://api.brightdata.com";

interface CompetitorData {
  url: string;
  domain: string;
  title?: string;
  description?: string;
  content?: string;
  socialLinks?: Record<string, string>;
  estimatedTraffic?: string;
  topKeywords?: string[];
}

interface SERPResult {
  position: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  features?: string[];
}

interface GoogleReview {
  author: string;
  rating: number;
  text: string;
  date: string;
  response?: string;
}

interface BusinessData {
  name?: string;
  rating?: number;
  reviewCount?: number;
  reviews?: GoogleReview[];
  address?: string;
  phone?: string;
  hours?: string[];
  categories?: string[];
}

interface SERPData {
  keyword: string;
  results: SERPResult[];
  totalResults?: string;
  features?: string[];
  paaQuestions?: string[];
  relatedSearches?: string[];
}

interface MarketIntelligence {
  competitorStrengths: string[];
  contentGaps: string[];
  keywordOpportunities: string[];
  marketTrends: string[];
  recommendations: string[];
}

interface ResearchResult {
  success: boolean;
  data?: {
    serp?: SERPData;
    competitors?: CompetitorData[];
    businessData?: BusinessData;
    marketIntelligence?: MarketIntelligence;
    researchedAt: string;
  };
  error?: string;
}

// SERP search using Bright Data
async function searchSERP(keyword: string, location?: string): Promise<SERPData | null> {
  try {
    const params = new URLSearchParams({
      query: keyword,
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
      // Fallback to web scraping approach
      return await searchSERPFallback(keyword);
    }

    const data = await response.json();

    const results: SERPResult[] = (data.organic || []).slice(0, 10).map((item: Record<string, unknown>, index: number) => ({
      position: index + 1,
      title: item.title as string || "",
      url: item.link as string || item.url as string || "",
      domain: new URL(item.link as string || item.url as string || "https://example.com").hostname,
      snippet: item.snippet as string || item.description as string || "",
      features: item.features as string[] || [],
    }));

    return {
      keyword,
      results,
      totalResults: data.total_results as string,
      features: data.serp_features as string[] || [],
      paaQuestions: (data.people_also_ask || []).map((q: Record<string, unknown>) => String(q.question || "")),
      relatedSearches: (data.related_searches || []).map((s: Record<string, unknown> | string) => typeof s === "string" ? s : String(s.query || "")),
    };
  } catch (error) {
    console.error("SERP search error:", error);
    return await searchSERPFallback(keyword);
  }
}

// Fallback SERP search using scraping
async function searchSERPFallback(keyword: string): Promise<SERPData> {
  try {
    const response = await fetch(`${BRIGHT_DATA_BASE_URL}/datasets/v3/trigger?dataset_id=gd_l1viktl72bvl7bjv10`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${BRIGHT_DATA_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ keyword, country: "us" }]),
    });

    if (!response.ok) {
      throw new Error("SERP fallback failed");
    }

    const data = await response.json();
    return {
      keyword,
      results: [],
      totalResults: "N/A",
      features: [],
      paaQuestions: [],
      relatedSearches: [],
    };
  } catch {
    return {
      keyword,
      results: [],
    };
  }
}

// Scrape competitor website content
async function scrapeCompetitor(url: string): Promise<CompetitorData> {
  try {
    // Normalize URL
    let normalizedUrl = url;
    if (!normalizedUrl.startsWith("http")) {
      normalizedUrl = "https://" + normalizedUrl;
    }

    const response = await fetch(`${BRIGHT_DATA_BASE_URL}/request`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${BRIGHT_DATA_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: normalizedUrl,
        format: "raw",
        zone: "web_unlocker",
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to scrape: ${response.status}`);
    }

    const html = await response.text();
    const domain = new URL(normalizedUrl).hostname;

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : undefined;

    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const description = descMatch ? descMatch[1].trim() : undefined;

    // Extract social links
    const socialPatterns: Record<string, RegExp> = {
      facebook: /facebook\.com\/[a-zA-Z0-9._-]+/gi,
      instagram: /instagram\.com\/[a-zA-Z0-9._-]+/gi,
      linkedin: /linkedin\.com\/(?:company|in)\/[a-zA-Z0-9._-]+/gi,
      twitter: /(?:twitter|x)\.com\/[a-zA-Z0-9._-]+/gi,
      youtube: /youtube\.com\/(?:channel|c|user|@)[a-zA-Z0-9._-]+/gi,
    };

    const socialLinks: Record<string, string> = {};
    for (const [platform, pattern] of Object.entries(socialPatterns)) {
      const match = html.match(pattern);
      if (match) {
        socialLinks[platform] = "https://" + match[0];
      }
    }

    // Clean content for analysis
    const content = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 10000);

    return {
      url: normalizedUrl,
      domain,
      title,
      description,
      content,
      socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
    };
  } catch (error) {
    console.error("Competitor scrape error:", error);
    return {
      url,
      domain: new URL(url.startsWith("http") ? url : "https://" + url).hostname,
    };
  }
}

// Fetch Google Maps/Business reviews
async function fetchBusinessReviews(query: string, location?: string): Promise<BusinessData> {
  try {
    const searchQuery = location ? `${query} ${location}` : query;

    const response = await fetch(`${BRIGHT_DATA_BASE_URL}/datasets/v3/trigger?dataset_id=gd_lz13ixf88hg13safs9`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${BRIGHT_DATA_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ query: searchQuery, days_limit: "30" }]),
    });

    if (!response.ok) {
      throw new Error(`Business data fetch failed: ${response.status}`);
    }

    const data = await response.json();

    if (data && data[0]) {
      const business = data[0];
      return {
        name: business.name,
        rating: business.rating,
        reviewCount: business.reviews_count || business.review_count,
        reviews: (business.reviews || []).slice(0, 10).map((r: Record<string, unknown>) => ({
          author: r.author as string || r.reviewer_name as string,
          rating: r.rating as number,
          text: r.text as string || r.review_text as string,
          date: r.date as string || r.review_date as string,
          response: r.owner_response as string,
        })),
        address: business.address,
        phone: business.phone,
        hours: business.hours,
        categories: business.categories,
      };
    }

    return {};
  } catch (error) {
    console.error("Business reviews error:", error);
    return {};
  }
}

// AI-powered market intelligence analysis
async function analyzeMarketIntelligence(
  keyword: string,
  serpResults: SERPResult[],
  competitors: CompetitorData[],
  businessData: BusinessData
): Promise<MarketIntelligence> {
  try {
    const competitorInfo = competitors
      .filter(c => c.content)
      .map(c => `Domain: ${c.domain}\nTitle: ${c.title}\nDescription: ${c.description}\nContent snippet: ${c.content?.substring(0, 500)}`)
      .join("\n\n---\n\n");

    const serpInfo = serpResults
      .map(r => `${r.position}. ${r.title} (${r.domain}): ${r.snippet}`)
      .join("\n");

    const prompt = `You are an expert SEO and market analyst. Analyze the following competitive landscape for the keyword "${keyword}":

SERP Results (Top 10):
${serpInfo}

Competitor Analysis:
${competitorInfo || "No competitor data available"}

Business Reviews:
Rating: ${businessData.rating || "N/A"}/5 (${businessData.reviewCount || 0} reviews)
${businessData.reviews?.slice(0, 3).map(r => `- ${r.rating}/5: "${r.text?.substring(0, 100)}..."`).join("\n") || "No reviews available"}

Provide a JSON analysis with:
{
  "competitorStrengths": ["What competitors are doing well - 3-5 points"],
  "contentGaps": ["Topics/content competitors are missing - 3-5 opportunities"],
  "keywordOpportunities": ["Related keywords to target based on this analysis - 5-10 keywords"],
  "marketTrends": ["Current trends observed in the market - 3-5 trends"],
  "recommendations": ["Actionable SEO/content recommendations - 5-7 specific actions"]
}

Return ONLY the JSON object.`;

    const result = await generateText({
      model: MODELS.conductor,
      prompt,
      temperature: 0.3,
    });

    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return {
      competitorStrengths: [],
      contentGaps: [],
      keywordOpportunities: [],
      marketTrends: [],
      recommendations: ["Unable to generate detailed analysis. Try with more specific keywords."],
    };
  } catch (error) {
    console.error("Market intelligence error:", error);
    return {
      competitorStrengths: [],
      contentGaps: [],
      keywordOpportunities: [],
      marketTrends: [],
      recommendations: [],
    };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResearchResult>) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // Auth check
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const {
    keyword,
    location,
    businessName,
    competitorUrls = [],
    includeSerp = true,
    includeCompetitors = true,
    includeBusinessData = true,
    includeMarketIntelligence = true,
  } = req.body;

  if (!keyword) {
    return res.status(400).json({ success: false, error: "keyword is required" });
  }

  if (!BRIGHT_DATA_API_TOKEN) {
    return res.status(500).json({ success: false, error: "Bright Data API token not configured" });
  }

  try {
    const researchData: ResearchResult["data"] = {
      researchedAt: new Date().toISOString(),
    };

    // Parallel fetch operations
    const promises: Promise<void>[] = [];

    // SERP Research
    if (includeSerp) {
      promises.push(
        searchSERP(keyword, location).then(serp => {
          researchData.serp = serp || undefined;
        })
      );
    }

    // Competitor scraping
    if (includeCompetitors && competitorUrls.length > 0) {
      promises.push(
        Promise.all(competitorUrls.slice(0, 5).map((url: string) => scrapeCompetitor(url))).then(competitors => {
          researchData.competitors = competitors;
        })
      );
    } else if (includeCompetitors && includeSerp) {
      // Auto-scrape top SERP results as competitors after SERP completes
      // This will be handled after the first batch
    }

    // Business data
    if (includeBusinessData && businessName) {
      promises.push(
        fetchBusinessReviews(businessName, location).then(business => {
          researchData.businessData = business;
        })
      );
    }

    // Execute first batch
    await Promise.all(promises);

    // If no competitor URLs provided, scrape top SERP results
    if (includeCompetitors && competitorUrls.length === 0 && researchData.serp?.results) {
      const topUrls = researchData.serp.results.slice(0, 5).map(r => r.url);
      const competitors = await Promise.all(topUrls.map(url => scrapeCompetitor(url)));
      researchData.competitors = competitors;
    }

    // Market intelligence analysis (requires other data)
    if (includeMarketIntelligence) {
      researchData.marketIntelligence = await analyzeMarketIntelligence(
        keyword,
        researchData.serp?.results || [],
        researchData.competitors || [],
        researchData.businessData || {}
      );
    }

    return res.status(200).json({
      success: true,
      data: researchData,
    });
  } catch (error) {
    console.error("Bright Data research error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Research failed",
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "2mb",
    },
  },
  maxDuration: 180, // 3 minutes for comprehensive research
};
