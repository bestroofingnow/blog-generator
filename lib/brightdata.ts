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
      paaQuestions: (data.people_also_ask || []).map((q: Record<string, unknown>) => q.question as string),
      relatedSearches: (data.related_searches || []).map((s: Record<string, unknown>) => s.query as string || s as string),
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
    getProfiles: getSocialProfiles,
  },
  reviews: {
    google: getGoogleReviews,
  },
  competitors: analyzeCompetitors,
};

export default BrightData;
