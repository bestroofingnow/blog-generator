// lib/brightdata.ts
// Bright Data MCP integration helpers for SEO and marketing research

const BRIGHT_DATA_API_TOKEN = process.env.BRIGHT_DATA_API_TOKEN || "";
const BRIGHT_DATA_BASE_URL = "https://api.brightdata.com";

export interface ScrapedPage {
  url: string;
  title?: string;
  description?: string;
  content: string;
  html?: string;
  socialLinks?: Record<string, string>;
}

export interface SERPData {
  keyword: string;
  results: Array<{
    position: number;
    title: string;
    url: string;
    domain: string;
    snippet: string;
  }>;
  paaQuestions?: string[];
  relatedSearches?: string[];
  features?: string[];
}

export interface SocialProfileData {
  platform: string;
  url: string;
  username?: string;
  displayName?: string;
  followers?: number;
  posts?: number;
  engagement?: number;
  bio?: string;
  recentContent?: Array<{
    text: string;
    likes: number;
    comments: number;
    date: string;
  }>;
}

export interface ReviewData {
  source: string;
  rating: number;
  reviewCount: number;
  reviews: Array<{
    author: string;
    rating: number;
    text: string;
    date: string;
  }>;
}

// Check if Bright Data is configured
export function isBrightDataConfigured(): boolean {
  return !!BRIGHT_DATA_API_TOKEN;
}

// Scrape a webpage and return markdown content
export async function scrapeAsMarkdown(url: string): Promise<ScrapedPage> {
  if (!BRIGHT_DATA_API_TOKEN) {
    throw new Error("Bright Data API token not configured");
  }

  try {
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
      throw new Error(`Scrape failed: ${response.status}`);
    }

    const html = await response.text();

    // Extract metadata
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);

    // Extract social links
    const socialPatterns: Record<string, RegExp> = {
      facebook: /facebook\.com\/[a-zA-Z0-9._-]+/gi,
      instagram: /instagram\.com\/[a-zA-Z0-9._-]+/gi,
      linkedin: /linkedin\.com\/(?:company|in)\/[a-zA-Z0-9._-]+/gi,
      twitter: /(?:twitter|x)\.com\/[a-zA-Z0-9._-]+/gi,
      youtube: /youtube\.com\/(?:channel|c|user|@)[a-zA-Z0-9._-]+/gi,
      tiktok: /tiktok\.com\/@[a-zA-Z0-9._-]+/gi,
    };

    const socialLinks: Record<string, string> = {};
    for (const [platform, pattern] of Object.entries(socialPatterns)) {
      const match = html.match(pattern);
      if (match) {
        socialLinks[platform] = "https://" + match[0];
      }
    }

    // Convert to clean text
    const content = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<(h[1-6]|p|div|li|td|th|br|hr)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();

    return {
      url: normalizedUrl,
      title: titleMatch ? titleMatch[1].trim() : undefined,
      description: descMatch ? descMatch[1].trim() : undefined,
      content,
      html,
      socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
    };
  } catch (error) {
    console.error("Bright Data scrape error:", error);
    throw error;
  }
}

// Batch scrape multiple URLs
export async function scrapeMultiple(urls: string[]): Promise<ScrapedPage[]> {
  const results = await Promise.all(
    urls.slice(0, 10).map(async (url) => {
      try {
        return await scrapeAsMarkdown(url);
      } catch {
        return { url, content: "" };
      }
    })
  );
  return results;
}

// Search engine results
export async function searchGoogle(query: string, options?: {
  country?: string;
  language?: string;
  numResults?: number;
}): Promise<SERPData> {
  if (!BRIGHT_DATA_API_TOKEN) {
    throw new Error("Bright Data API token not configured");
  }

  try {
    const params = new URLSearchParams({
      query,
      country: options?.country || "us",
      language: options?.language || "en",
      num: String(options?.numResults || 10),
    });

    const response = await fetch(`${BRIGHT_DATA_BASE_URL}/serp/google/search?${params}`, {
      headers: {
        "Authorization": `Bearer ${BRIGHT_DATA_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`SERP search failed: ${response.status}`);
    }

    const data = await response.json();

    return {
      keyword: query,
      results: (data.organic || []).map((item: Record<string, unknown>, index: number) => ({
        position: index + 1,
        title: item.title as string || "",
        url: item.link as string || item.url as string || "",
        domain: new URL(item.link as string || item.url as string || "https://example.com").hostname,
        snippet: item.snippet as string || "",
      })),
      paaQuestions: (data.people_also_ask || []).map((q: Record<string, unknown>) => String(q.question || "")),
      relatedSearches: (data.related_searches || []).map((s: Record<string, unknown> | string) => typeof s === "string" ? s : String(s.query || "")),
      features: data.serp_features as string[] || [],
    };
  } catch (error) {
    console.error("SERP search error:", error);
    return { keyword: query, results: [] };
  }
}

// Batch search multiple keywords
export async function searchMultipleKeywords(keywords: string[]): Promise<SERPData[]> {
  const results = await Promise.all(
    keywords.slice(0, 10).map(keyword => searchGoogle(keyword))
  );
  return results;
}

// Get Instagram profile data
export async function getInstagramProfile(url: string): Promise<SocialProfileData> {
  if (!BRIGHT_DATA_API_TOKEN) {
    throw new Error("Bright Data API token not configured");
  }

  try {
    const response = await fetch(`${BRIGHT_DATA_BASE_URL}/datasets/v3/trigger?dataset_id=gd_lyclm20il4r5helnj`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${BRIGHT_DATA_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ url }]),
    });

    if (!response.ok) {
      throw new Error(`Instagram fetch failed: ${response.status}`);
    }

    const data = await response.json();
    const profile = data[0] || {};

    return {
      platform: "instagram",
      url,
      username: profile.username,
      displayName: profile.full_name,
      followers: profile.followers_count,
      posts: profile.media_count,
      engagement: profile.engagement_rate,
      bio: profile.biography,
      recentContent: (profile.recent_posts || []).slice(0, 5).map((p: Record<string, unknown>) => ({
        text: p.caption as string,
        likes: p.likes_count as number,
        comments: p.comments_count as number,
        date: p.taken_at as string,
      })),
    };
  } catch (error) {
    console.error("Instagram profile error:", error);
    return { platform: "instagram", url };
  }
}

// Get LinkedIn company profile
export async function getLinkedInCompany(url: string): Promise<SocialProfileData> {
  if (!BRIGHT_DATA_API_TOKEN) {
    throw new Error("Bright Data API token not configured");
  }

  try {
    const response = await fetch(`${BRIGHT_DATA_BASE_URL}/datasets/v3/trigger?dataset_id=gd_l1viktl72bvl7bjuj0`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${BRIGHT_DATA_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ url }]),
    });

    if (!response.ok) {
      throw new Error(`LinkedIn fetch failed: ${response.status}`);
    }

    const data = await response.json();
    const profile = data[0] || {};

    return {
      platform: "linkedin",
      url,
      username: profile.universal_name,
      displayName: profile.name,
      followers: profile.follower_count,
      bio: profile.description,
      recentContent: (profile.recent_posts || []).slice(0, 5).map((p: Record<string, unknown>) => ({
        text: p.text as string,
        likes: p.num_likes as number,
        comments: p.num_comments as number,
        date: p.posted_date as string,
      })),
    };
  } catch (error) {
    console.error("LinkedIn company error:", error);
    return { platform: "linkedin", url };
  }
}

// Get YouTube channel data
export async function getYouTubeChannel(url: string): Promise<SocialProfileData> {
  if (!BRIGHT_DATA_API_TOKEN) {
    throw new Error("Bright Data API token not configured");
  }

  try {
    const response = await fetch(`${BRIGHT_DATA_BASE_URL}/datasets/v3/trigger?dataset_id=gd_lk5ns7kz21pck8jpis`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${BRIGHT_DATA_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ url }]),
    });

    if (!response.ok) {
      throw new Error(`YouTube fetch failed: ${response.status}`);
    }

    const data = await response.json();
    const profile = data[0] || {};

    return {
      platform: "youtube",
      url,
      username: profile.channel_id,
      displayName: profile.channel_name,
      followers: profile.subscriber_count,
      posts: profile.video_count,
      bio: profile.description,
      recentContent: (profile.recent_videos || []).slice(0, 5).map((v: Record<string, unknown>) => ({
        text: v.title as string,
        likes: v.likes as number,
        comments: v.comments as number,
        date: v.published_at as string,
      })),
    };
  } catch (error) {
    console.error("YouTube channel error:", error);
    return { platform: "youtube", url };
  }
}

// Get Google Maps reviews
export async function getGoogleReviews(businessName: string, location?: string): Promise<ReviewData> {
  if (!BRIGHT_DATA_API_TOKEN) {
    throw new Error("Bright Data API token not configured");
  }

  try {
    const query = location ? `${businessName} ${location}` : businessName;

    const response = await fetch(`${BRIGHT_DATA_BASE_URL}/datasets/v3/trigger?dataset_id=gd_lz13ixf88hg13safs9`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${BRIGHT_DATA_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ query, days_limit: "90" }]),
    });

    if (!response.ok) {
      throw new Error(`Google reviews fetch failed: ${response.status}`);
    }

    const data = await response.json();
    const business = data[0] || {};

    return {
      source: "google",
      rating: business.rating || 0,
      reviewCount: business.reviews_count || 0,
      reviews: (business.reviews || []).slice(0, 20).map((r: Record<string, unknown>) => ({
        author: r.author as string || r.reviewer_name as string || "Anonymous",
        rating: r.rating as number || 0,
        text: r.text as string || r.review_text as string || "",
        date: r.date as string || r.review_date as string || "",
      })),
    };
  } catch (error) {
    console.error("Google reviews error:", error);
    return { source: "google", rating: 0, reviewCount: 0, reviews: [] };
  }
}

// Get multiple social profiles at once
export async function getSocialProfiles(socialLinks: Record<string, string>): Promise<SocialProfileData[]> {
  const profiles: SocialProfileData[] = [];
  const promises: Promise<SocialProfileData>[] = [];

  for (const [platform, url] of Object.entries(socialLinks)) {
    if (!url) continue;

    switch (platform.toLowerCase()) {
      case "instagram":
        promises.push(getInstagramProfile(url));
        break;
      case "linkedin":
        promises.push(getLinkedInCompany(url));
        break;
      case "youtube":
        promises.push(getYouTubeChannel(url));
        break;
      // Add more platforms as needed
    }
  }

  const results = await Promise.all(promises);
  profiles.push(...results);

  return profiles;
}

// Comprehensive competitor analysis
export async function analyzeCompetitors(urls: string[]): Promise<{
  competitors: ScrapedPage[];
  commonKeywords: string[];
  contentPatterns: string[];
}> {
  const competitors = await scrapeMultiple(urls);

  // Extract common patterns
  const allContent = competitors.map(c => c.content).join(" ").toLowerCase();

  // Simple keyword extraction (in production, use NLP)
  const words = allContent.split(/\s+/);
  const wordFreq: Record<string, number> = {};
  for (const word of words) {
    if (word.length > 4) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  }

  const commonKeywords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);

  return {
    competitors,
    commonKeywords,
    contentPatterns: [],
  };
}

// ============ DEEP RESEARCH FUNCTIONS ============

export interface ScrapedSource {
  url: string;
  domain: string;
  title: string;
  content: string;
  wordCount: number;
  headings: string[];
  mainTopics: string[];
  publishDate?: string;
  author?: string;
  relevanceScore?: number;
}

export interface ExtractedFact {
  fact: string;
  source: string;
  sourceUrl: string;
  confidence: number; // 0-1
  category: "statistic" | "definition" | "claim" | "quote" | "fact";
}

export interface CompetitorInsight {
  domain: string;
  rankPosition: number;
  title: string;
  contentStrategy: string;
  mainTopics: string[];
  keywordDensity: Record<string, number>;
  wordCount: number;
  strengths: string[];
  weaknesses: string[];
}

export interface DeepResearchResult {
  serpResults: SERPData[];
  sources: ScrapedSource[];
  facts: ExtractedFact[];
  competitorInsights: CompetitorInsight[];
  suggestedTopics: string[];
  suggestedKeywords: string[];
  contentGaps: string[];
  creditsUsed: number;
}

export type ResearchDepth = "light" | "standard" | "deep";

const DEPTH_CONFIGS = {
  light: { serpCount: 3, scrapeCount: 3 },
  standard: { serpCount: 5, scrapeCount: 5 },
  deep: { serpCount: 10, scrapeCount: 10 },
};

// Perform deep research for content generation
export async function performDeepResearch(params: {
  topic: string;
  location?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  depth?: ResearchDepth;
}): Promise<DeepResearchResult> {
  const depth = params.depth || "standard";
  const config = DEPTH_CONFIGS[depth];
  let creditsUsed = 0;

  // Build search queries
  const queries: string[] = [];
  if (params.primaryKeyword) {
    queries.push(params.primaryKeyword);
  }
  queries.push(params.topic);
  if (params.location) {
    queries.push(`${params.topic} ${params.location}`);
  }
  if (params.secondaryKeywords) {
    queries.push(...params.secondaryKeywords.slice(0, 3));
  }

  // 1. Run SERP searches
  const serpQueries = queries.slice(0, config.serpCount);
  const serpResults = await Promise.all(
    serpQueries.map(async (query) => {
      try {
        creditsUsed += 1;
        return await searchGoogle(query, {
          country: "us",
          numResults: 10,
        });
      } catch {
        return { keyword: query, results: [] };
      }
    })
  );

  // 2. Extract top URLs to scrape
  const urlsToScrape = new Set<string>();
  for (const serp of serpResults) {
    for (const result of serp.results.slice(0, 5)) {
      if (urlsToScrape.size < config.scrapeCount) {
        // Skip PDFs, videos, and social media
        if (!result.url.match(/\.(pdf|mp4|youtube\.com|facebook\.com|twitter\.com)/i)) {
          urlsToScrape.add(result.url);
        }
      }
    }
  }

  // 3. Scrape competitor content
  const scrapedPages = await scrapeMultiple(Array.from(urlsToScrape));
  creditsUsed += scrapedPages.length;

  // 4. Process scraped content into structured sources
  const sources: ScrapedSource[] = scrapedPages
    .filter(p => p.content && p.content.length > 200)
    .map(page => {
      const headings = extractHeadings(page.html || "");
      const mainTopics = extractTopics(page.content);
      return {
        url: page.url,
        domain: new URL(page.url).hostname,
        title: page.title || "",
        content: page.content.slice(0, 5000), // Limit content size
        wordCount: page.content.split(/\s+/).length,
        headings,
        mainTopics,
        relevanceScore: calculateRelevance(page.content, params.topic, params.primaryKeyword),
      };
    })
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

  // 5. Extract facts from top sources
  const facts: ExtractedFact[] = [];
  for (const source of sources.slice(0, 5)) {
    const extractedFacts = extractFactsFromContent(source.content, source.url, source.domain);
    facts.push(...extractedFacts);
  }

  // 6. Analyze competitors
  const competitorInsights: CompetitorInsight[] = sources.slice(0, 5).map((source, index) => {
    const keywords = extractKeywordDensity(source.content);
    return {
      domain: source.domain,
      rankPosition: index + 1,
      title: source.title,
      contentStrategy: determineContentStrategy(source),
      mainTopics: source.mainTopics,
      keywordDensity: keywords,
      wordCount: source.wordCount,
      strengths: identifyStrengths(source),
      weaknesses: identifyWeaknesses(source),
    };
  });

  // 7. Generate suggested topics and keywords
  const suggestedTopics = generateSuggestedTopics(serpResults, sources);
  const suggestedKeywords = generateSuggestedKeywords(serpResults, sources, params.topic);
  const contentGaps = identifyContentGaps(sources, params.topic);

  return {
    serpResults,
    sources,
    facts,
    competitorInsights,
    suggestedTopics,
    suggestedKeywords,
    contentGaps,
    creditsUsed,
  };
}

// Helper: Extract headings from HTML
function extractHeadings(html: string): string[] {
  const headings: string[] = [];
  const matches = Array.from(html.matchAll(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi));
  for (const match of matches) {
    if (match[1]) {
      headings.push(match[1].trim());
    }
  }
  return headings.slice(0, 20);
}

// Helper: Extract main topics from content
function extractTopics(content: string): string[] {
  const words = content.toLowerCase().split(/\s+/);
  const freq: Record<string, number> = {};

  // Count word frequency, excluding common words
  const stopWords = new Set(["the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "can", "must", "and", "or", "but", "if", "then", "else", "when", "where", "why", "how", "what", "which", "who", "whom", "this", "that", "these", "those", "to", "for", "with", "by", "from", "at", "in", "on", "of", "as", "it", "its", "you", "your", "we", "our", "they", "their", "he", "she", "his", "her"]);

  for (const word of words) {
    const cleaned = word.replace(/[^a-z]/g, "");
    if (cleaned.length > 4 && !stopWords.has(cleaned)) {
      freq[cleaned] = (freq[cleaned] || 0) + 1;
    }
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

// Helper: Calculate relevance score
function calculateRelevance(content: string, topic: string, keyword?: string): number {
  const lowerContent = content.toLowerCase();
  const topicWords = topic.toLowerCase().split(/\s+/);

  let score = 0;
  for (const word of topicWords) {
    if (word.length > 3) {
      const matches = (lowerContent.match(new RegExp(word, "gi")) || []).length;
      score += Math.min(matches * 0.1, 2); // Cap contribution per word
    }
  }

  if (keyword) {
    const keywordMatches = (lowerContent.match(new RegExp(keyword, "gi")) || []).length;
    score += Math.min(keywordMatches * 0.2, 3);
  }

  return Math.min(score, 10); // Cap at 10
}

// Helper: Extract facts from content
function extractFactsFromContent(content: string, url: string, domain: string): ExtractedFact[] {
  const facts: ExtractedFact[] = [];

  // Extract sentences with numbers (likely statistics)
  const sentences = content.split(/[.!?]+/);
  for (const sentence of sentences) {
    if (sentence.match(/\d+%|\$\d+|\d+\s*(million|billion|thousand|percent)/i)) {
      facts.push({
        fact: sentence.trim().slice(0, 300),
        source: domain,
        sourceUrl: url,
        confidence: 0.7,
        category: "statistic",
      });
    }
    // Extract quotes
    const quoteMatch = sentence.match(/"([^"]{20,200})"/);
    if (quoteMatch) {
      facts.push({
        fact: quoteMatch[1],
        source: domain,
        sourceUrl: url,
        confidence: 0.8,
        category: "quote",
      });
    }
  }

  return facts.slice(0, 5); // Limit facts per source
}

// Helper: Extract keyword density
function extractKeywordDensity(content: string): Record<string, number> {
  const words = content.toLowerCase().split(/\s+/);
  const total = words.length;
  const freq: Record<string, number> = {};

  for (const word of words) {
    const cleaned = word.replace(/[^a-z]/g, "");
    if (cleaned.length > 4) {
      freq[cleaned] = (freq[cleaned] || 0) + 1;
    }
  }

  const density: Record<string, number> = {};
  for (const [word, count] of Object.entries(freq).slice(0, 20)) {
    density[word] = Math.round((count / total) * 10000) / 100; // Percentage with 2 decimals
  }

  return density;
}

// Helper: Determine content strategy
function determineContentStrategy(source: ScrapedSource): string {
  if (source.wordCount > 3000) return "long-form comprehensive guide";
  if (source.wordCount > 1500) return "detailed article";
  if (source.headings.length > 10) return "well-structured listicle";
  if (source.wordCount < 500) return "brief overview";
  return "standard article";
}

// Helper: Identify strengths
function identifyStrengths(source: ScrapedSource): string[] {
  const strengths: string[] = [];
  if (source.wordCount > 2000) strengths.push("Comprehensive coverage");
  if (source.headings.length > 8) strengths.push("Well-organized structure");
  if (source.mainTopics.length > 5) strengths.push("Covers multiple topics");
  return strengths;
}

// Helper: Identify weaknesses
function identifyWeaknesses(source: ScrapedSource): string[] {
  const weaknesses: string[] = [];
  if (source.wordCount < 800) weaknesses.push("May lack depth");
  if (source.headings.length < 3) weaknesses.push("Poor structure");
  return weaknesses;
}

// Helper: Generate suggested topics
function generateSuggestedTopics(serpResults: SERPData[], sources: ScrapedSource[]): string[] {
  const topics = new Set<string>();

  // From PAA questions
  for (const serp of serpResults) {
    for (const question of serp.paaQuestions || []) {
      topics.add(question);
    }
  }

  // From related searches
  for (const serp of serpResults) {
    for (const related of serp.relatedSearches || []) {
      topics.add(related);
    }
  }

  // From source headings
  for (const source of sources.slice(0, 3)) {
    for (const heading of source.headings.slice(0, 5)) {
      if (heading.length > 10 && heading.length < 100) {
        topics.add(heading);
      }
    }
  }

  return Array.from(topics).slice(0, 15);
}

// Helper: Generate suggested keywords
function generateSuggestedKeywords(serpResults: SERPData[], sources: ScrapedSource[], topic: string): string[] {
  const keywords = new Set<string>();

  // From source topics
  for (const source of sources) {
    for (const t of source.mainTopics) {
      if (t !== topic.toLowerCase()) {
        keywords.add(t);
      }
    }
  }

  return Array.from(keywords).slice(0, 20);
}

// Helper: Identify content gaps
function identifyContentGaps(sources: ScrapedSource[], topic: string): string[] {
  const gaps: string[] = [];

  // Analyze what competitors are missing
  const allTopics = new Set<string>();
  sources.forEach(s => s.mainTopics.forEach(t => allTopics.add(t)));

  // Suggest gaps based on common missing elements
  const hasDefinition = sources.some(s => s.content.toLowerCase().includes("what is"));
  if (!hasDefinition) gaps.push("Add clear definition/explanation section");

  const hasExamples = sources.some(s => s.content.toLowerCase().includes("example") || s.content.toLowerCase().includes("case study"));
  if (!hasExamples) gaps.push("Include real-world examples or case studies");

  const hasHowTo = sources.some(s => s.content.toLowerCase().includes("how to") || s.content.toLowerCase().includes("step"));
  if (!hasHowTo) gaps.push("Add step-by-step instructions");

  const hasStats = sources.some(s => s.content.match(/\d+%/));
  if (!hasStats) gaps.push("Include statistics and data points");

  return gaps;
}

// ============ COMPETITOR INTELLIGENCE FUNCTIONS ============

export interface CompetitorWebsiteAnalysis {
  domain: string;
  title: string;
  description: string;
  content: string;
  socialLinks: Record<string, string>;
  headings: string[];
  mainKeywords: string[];
  wordCount: number;
  hasSchema: boolean;
  schemaTypes: string[];
}

// Analyze competitor website
export async function analyzeCompetitorWebsite(url: string): Promise<CompetitorWebsiteAnalysis> {
  const scraped = await scrapeAsMarkdown(url);
  const headings = extractHeadings(scraped.html || "");
  const mainKeywords = extractTopics(scraped.content);

  // Check for schema markup
  const hasSchema = (scraped.html || "").includes("application/ld+json");
  const schemaTypes: string[] = [];
  if (hasSchema) {
    const schemaMatches = Array.from((scraped.html || "").matchAll(/"@type"\s*:\s*"([^"]+)"/g));
    for (const match of schemaMatches) {
      if (match[1]) schemaTypes.push(match[1]);
    }
  }

  return {
    domain: new URL(url).hostname,
    title: scraped.title || "",
    description: scraped.description || "",
    content: scraped.content,
    socialLinks: scraped.socialLinks || {},
    headings,
    mainKeywords,
    wordCount: scraped.content.split(/\s+/).length,
    hasSchema,
    schemaTypes: Array.from(new Set(schemaTypes)),
  };
}

// Discover competitor info from domain
export async function discoverCompetitorInfo(domain: string): Promise<{
  socialLinks: Record<string, string>;
  contactInfo: { phone?: string; email?: string; address?: string };
  industry?: string;
}> {
  const url = domain.startsWith("http") ? domain : `https://${domain}`;
  const scraped = await scrapeAsMarkdown(url);

  // Extract contact info from content
  const phoneMatch = scraped.content.match(/(\+?1?\s*[-.(]?\d{3}[-.)]\s*\d{3}[-.]?\d{4})/);
  const emailMatch = scraped.content.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const addressMatch = scraped.content.match(/(\d+\s+[A-Za-z\s]+,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5})/);

  return {
    socialLinks: scraped.socialLinks || {},
    contactInfo: {
      phone: phoneMatch ? phoneMatch[1] : undefined,
      email: emailMatch ? emailMatch[1] : undefined,
      address: addressMatch ? addressMatch[1] : undefined,
    },
  };
}

// Get TikTok profile data
export async function getTikTokProfile(url: string): Promise<SocialProfileData> {
  if (!BRIGHT_DATA_API_TOKEN) {
    throw new Error("Bright Data API token not configured");
  }

  try {
    const response = await fetch(`${BRIGHT_DATA_BASE_URL}/datasets/v3/trigger?dataset_id=gd_tu14ogs16e04uyv0i`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${BRIGHT_DATA_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ url }]),
    });

    if (!response.ok) {
      throw new Error(`TikTok fetch failed: ${response.status}`);
    }

    const data = await response.json();
    const profile = data[0] || {};

    return {
      platform: "tiktok",
      url,
      username: profile.unique_id,
      displayName: profile.nickname,
      followers: profile.follower_count,
      posts: profile.video_count,
      bio: profile.signature,
      recentContent: (profile.recent_videos || []).slice(0, 5).map((v: Record<string, unknown>) => ({
        text: v.desc as string,
        likes: v.digg_count as number,
        comments: v.comment_count as number,
        date: v.create_time as string,
      })),
    };
  } catch (error) {
    console.error("TikTok profile error:", error);
    return { platform: "tiktok", url };
  }
}

// Get Facebook page data
export async function getFacebookPage(url: string): Promise<SocialProfileData> {
  if (!BRIGHT_DATA_API_TOKEN) {
    throw new Error("Bright Data API token not configured");
  }

  try {
    const response = await fetch(`${BRIGHT_DATA_BASE_URL}/datasets/v3/trigger?dataset_id=gd_l1vikfch18du810do`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${BRIGHT_DATA_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ url }]),
    });

    if (!response.ok) {
      throw new Error(`Facebook fetch failed: ${response.status}`);
    }

    const data = await response.json();
    const profile = data[0] || {};

    return {
      platform: "facebook",
      url,
      displayName: profile.name,
      followers: profile.followers,
      bio: profile.about,
      recentContent: (profile.recent_posts || []).slice(0, 5).map((p: Record<string, unknown>) => ({
        text: p.text as string,
        likes: p.likes as number,
        comments: p.comments as number,
        date: p.date as string,
      })),
    };
  } catch (error) {
    console.error("Facebook page error:", error);
    return { platform: "facebook", url };
  }
}

// Get Reddit post data
export async function getRedditPost(url: string): Promise<{
  title: string;
  content: string;
  subreddit: string;
  upvotes: number;
  comments: number;
  topComments: Array<{ author: string; text: string; upvotes: number }>;
}> {
  if (!BRIGHT_DATA_API_TOKEN) {
    throw new Error("Bright Data API token not configured");
  }

  try {
    const response = await fetch(`${BRIGHT_DATA_BASE_URL}/datasets/v3/trigger?dataset_id=gd_l1vikd0n8jexu6p5y`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${BRIGHT_DATA_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ url }]),
    });

    if (!response.ok) {
      throw new Error(`Reddit fetch failed: ${response.status}`);
    }

    const data = await response.json();
    const post = data[0] || {};

    return {
      title: post.title || "",
      content: post.selftext || "",
      subreddit: post.subreddit || "",
      upvotes: post.score || 0,
      comments: post.num_comments || 0,
      topComments: (post.comments || []).slice(0, 10).map((c: Record<string, unknown>) => ({
        author: c.author as string,
        text: c.body as string,
        upvotes: c.score as number,
      })),
    };
  } catch (error) {
    console.error("Reddit post error:", error);
    return { title: "", content: "", subreddit: "", upvotes: 0, comments: 0, topComments: [] };
  }
}

// Export all functions as a unified API
export const BrightData = {
  isConfigured: isBrightDataConfigured,
  scrape: scrapeAsMarkdown,
  scrapeMultiple,
  search: searchGoogle,
  searchMultiple: searchMultipleKeywords,
  social: {
    instagram: getInstagramProfile,
    linkedin: getLinkedInCompany,
    youtube: getYouTubeChannel,
    tiktok: getTikTokProfile,
    facebook: getFacebookPage,
    getProfiles: getSocialProfiles,
  },
  reviews: {
    google: getGoogleReviews,
  },
  competitors: analyzeCompetitors,
  // New deep research
  research: {
    deep: performDeepResearch,
    analyzeWebsite: analyzeCompetitorWebsite,
    discoverInfo: discoverCompetitorInfo,
  },
  // Community data
  community: {
    reddit: getRedditPost,
  },
};

export default BrightData;
