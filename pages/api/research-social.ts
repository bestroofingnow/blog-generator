// pages/api/research-social.ts
// Social media research endpoint using Bright Data MCP for profile and engagement data

import type { NextApiRequest, NextApiResponse } from "next";

// Bright Data API configuration
const BRIGHT_DATA_API_TOKEN = process.env.BRIGHT_DATA_API_TOKEN || "";
const BRIGHT_DATA_BASE_URL = "https://api.brightdata.com/datasets/v3";

interface SocialProfile {
  platform: string;
  url: string;
  username?: string;
  displayName?: string;
  bio?: string;
  followers?: number;
  following?: number;
  posts?: number;
  engagement?: {
    avgLikes?: number;
    avgComments?: number;
    avgShares?: number;
    engagementRate?: number;
  };
  verified?: boolean;
  profileImage?: string;
  recentPosts?: Array<{
    id?: string;
    content?: string;
    likes?: number;
    comments?: number;
    shares?: number;
    date?: string;
    url?: string;
  }>;
  error?: string;
}

interface SocialResearchResult {
  success: boolean;
  data?: {
    profiles: SocialProfile[];
    summary?: {
      totalFollowers: number;
      totalPosts: number;
      avgEngagementRate: number;
      strongestPlatform: string;
      weakestPlatform: string;
      recommendations: string[];
    };
    researchedAt: string;
  };
  error?: string;
}

// Platform-specific data fetchers using Bright Data Web Data APIs
async function fetchInstagramProfile(url: string): Promise<SocialProfile> {
  try {
    const response = await fetch(`${BRIGHT_DATA_BASE_URL}/trigger?dataset_id=gd_lyclm20il4r5helnj&include_errors=true`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${BRIGHT_DATA_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ url }]),
    });

    if (!response.ok) {
      throw new Error(`Bright Data API error: ${response.status}`);
    }

    const data = await response.json();

    // Parse Instagram response
    if (data && data[0]) {
      const profile = data[0];
      return {
        platform: "instagram",
        url,
        username: profile.username,
        displayName: profile.full_name || profile.name,
        bio: profile.biography || profile.bio,
        followers: profile.followers_count || profile.followers,
        following: profile.following_count || profile.following,
        posts: profile.media_count || profile.posts_count,
        verified: profile.is_verified,
        profileImage: profile.profile_pic_url || profile.profile_image,
        engagement: {
          avgLikes: profile.avg_likes,
          avgComments: profile.avg_comments,
          engagementRate: profile.engagement_rate,
        },
        recentPosts: profile.recent_posts?.slice(0, 5).map((post: Record<string, unknown>) => ({
          content: post.caption as string,
          likes: post.likes_count as number || post.likes as number,
          comments: post.comments_count as number || post.comments as number,
          date: post.taken_at as string || post.date as string,
          url: post.url as string,
        })),
      };
    }

    return { platform: "instagram", url, error: "No data returned" };
  } catch (error) {
    return { platform: "instagram", url, error: error instanceof Error ? error.message : "Failed to fetch" };
  }
}

async function fetchTikTokProfile(url: string): Promise<SocialProfile> {
  try {
    const response = await fetch(`${BRIGHT_DATA_BASE_URL}/trigger?dataset_id=gd_l7q7dkf244hwjntr0&include_errors=true`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${BRIGHT_DATA_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ url }]),
    });

    if (!response.ok) {
      throw new Error(`Bright Data API error: ${response.status}`);
    }

    const data = await response.json();

    if (data && data[0]) {
      const profile = data[0];
      return {
        platform: "tiktok",
        url,
        username: profile.unique_id || profile.username,
        displayName: profile.nickname || profile.name,
        bio: profile.signature || profile.bio,
        followers: profile.follower_count || profile.followers,
        following: profile.following_count || profile.following,
        posts: profile.video_count || profile.posts,
        verified: profile.verified,
        profileImage: profile.avatar_url || profile.profile_image,
        engagement: {
          avgLikes: profile.avg_likes,
          avgComments: profile.avg_comments,
          avgShares: profile.avg_shares,
          engagementRate: profile.engagement_rate,
        },
        recentPosts: profile.recent_videos?.slice(0, 5).map((video: Record<string, unknown>) => ({
          content: video.desc as string || video.description as string,
          likes: video.digg_count as number || video.likes as number,
          comments: video.comment_count as number || video.comments as number,
          shares: video.share_count as number || video.shares as number,
          date: video.create_time as string || video.date as string,
          url: video.url as string,
        })),
      };
    }

    return { platform: "tiktok", url, error: "No data returned" };
  } catch (error) {
    return { platform: "tiktok", url, error: error instanceof Error ? error.message : "Failed to fetch" };
  }
}

async function fetchLinkedInProfile(url: string, type: "person" | "company" = "company"): Promise<SocialProfile> {
  try {
    const datasetId = type === "company" ? "gd_l1viktl72bvl7bjuj0" : "gd_l1viktl72bvl7bjv10";
    const response = await fetch(`${BRIGHT_DATA_BASE_URL}/trigger?dataset_id=${datasetId}&include_errors=true`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${BRIGHT_DATA_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ url }]),
    });

    if (!response.ok) {
      throw new Error(`Bright Data API error: ${response.status}`);
    }

    const data = await response.json();

    if (data && data[0]) {
      const profile = data[0];
      return {
        platform: "linkedin",
        url,
        username: profile.universal_name || profile.vanity_name,
        displayName: profile.name || profile.company_name,
        bio: profile.description || profile.tagline || profile.headline,
        followers: profile.follower_count || profile.followers,
        posts: profile.updates_count,
        verified: profile.is_verified,
        profileImage: profile.logo_url || profile.profile_pic_url,
        engagement: {
          engagementRate: profile.engagement_rate,
        },
        recentPosts: profile.recent_posts?.slice(0, 5).map((post: Record<string, unknown>) => ({
          content: post.text as string || post.commentary as string,
          likes: post.num_likes as number || post.likes as number,
          comments: post.num_comments as number || post.comments as number,
          date: post.posted_date as string || post.date as string,
          url: post.url as string,
        })),
      };
    }

    return { platform: "linkedin", url, error: "No data returned" };
  } catch (error) {
    return { platform: "linkedin", url, error: error instanceof Error ? error.message : "Failed to fetch" };
  }
}

async function fetchYouTubeProfile(url: string): Promise<SocialProfile> {
  try {
    const response = await fetch(`${BRIGHT_DATA_BASE_URL}/trigger?dataset_id=gd_lk5ns7kz21pck8jpis&include_errors=true`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${BRIGHT_DATA_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ url }]),
    });

    if (!response.ok) {
      throw new Error(`Bright Data API error: ${response.status}`);
    }

    const data = await response.json();

    if (data && data[0]) {
      const profile = data[0];
      return {
        platform: "youtube",
        url,
        username: profile.channel_id || profile.handle,
        displayName: profile.channel_name || profile.title,
        bio: profile.description,
        followers: profile.subscriber_count || profile.subscribers,
        posts: profile.video_count || profile.videos,
        verified: profile.is_verified,
        profileImage: profile.avatar_url || profile.thumbnail,
        engagement: {
          avgLikes: profile.avg_likes,
          avgComments: profile.avg_comments,
          engagementRate: profile.engagement_rate,
        },
        recentPosts: profile.recent_videos?.slice(0, 5).map((video: Record<string, unknown>) => ({
          id: video.video_id as string,
          content: video.title as string,
          likes: video.likes as number,
          comments: video.comments as number,
          date: video.published_at as string || video.date as string,
          url: video.url as string || `https://youtube.com/watch?v=${video.video_id}`,
        })),
      };
    }

    return { platform: "youtube", url, error: "No data returned" };
  } catch (error) {
    return { platform: "youtube", url, error: error instanceof Error ? error.message : "Failed to fetch" };
  }
}

async function fetchFacebookProfile(url: string): Promise<SocialProfile> {
  try {
    // Facebook pages/profiles - using posts endpoint for page data
    const response = await fetch(`${BRIGHT_DATA_BASE_URL}/trigger?dataset_id=gd_lyy77x9w1hgbm2s2e3&include_errors=true`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${BRIGHT_DATA_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ url }]),
    });

    if (!response.ok) {
      throw new Error(`Bright Data API error: ${response.status}`);
    }

    const data = await response.json();

    if (data && data[0]) {
      const profile = data[0];
      return {
        platform: "facebook",
        url,
        username: profile.page_id || profile.username,
        displayName: profile.page_name || profile.name,
        bio: profile.about || profile.description,
        followers: profile.followers_count || profile.likes_count,
        verified: profile.is_verified,
        profileImage: profile.profile_pic,
        recentPosts: profile.posts?.slice(0, 5).map((post: Record<string, unknown>) => ({
          content: post.text as string || post.message as string,
          likes: post.likes as number || post.reactions as number,
          comments: post.comments as number,
          shares: post.shares as number,
          date: post.date as string || post.created_time as string,
          url: post.url as string,
        })),
      };
    }

    return { platform: "facebook", url, error: "No data returned" };
  } catch (error) {
    return { platform: "facebook", url, error: error instanceof Error ? error.message : "Failed to fetch" };
  }
}

async function fetchTwitterProfile(url: string): Promise<SocialProfile> {
  try {
    const response = await fetch(`${BRIGHT_DATA_BASE_URL}/trigger?dataset_id=gd_lwxkxvnf1cynvib9co&include_errors=true`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${BRIGHT_DATA_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ url }]),
    });

    if (!response.ok) {
      throw new Error(`Bright Data API error: ${response.status}`);
    }

    const data = await response.json();

    if (data && data[0]) {
      const profile = data[0];
      return {
        platform: "twitter",
        url,
        username: profile.screen_name || profile.username,
        displayName: profile.name,
        bio: profile.description || profile.bio,
        followers: profile.followers_count || profile.followers,
        following: profile.friends_count || profile.following,
        posts: profile.statuses_count || profile.tweets,
        verified: profile.verified,
        profileImage: profile.profile_image_url,
        recentPosts: profile.recent_tweets?.slice(0, 5).map((tweet: Record<string, unknown>) => ({
          id: tweet.id_str as string || tweet.id as string,
          content: tweet.full_text as string || tweet.text as string,
          likes: tweet.favorite_count as number || tweet.likes as number,
          comments: tweet.reply_count as number,
          shares: tweet.retweet_count as number,
          date: tweet.created_at as string,
          url: tweet.url as string,
        })),
      };
    }

    return { platform: "twitter", url, error: "No data returned" };
  } catch (error) {
    return { platform: "twitter", url, error: error instanceof Error ? error.message : "Failed to fetch" };
  }
}

// Generate recommendations based on social data
function generateRecommendations(profiles: SocialProfile[]): string[] {
  const recommendations: string[] = [];
  const validProfiles = profiles.filter(p => !p.error);

  if (validProfiles.length === 0) {
    recommendations.push("No social profiles found. Consider establishing presence on Instagram, LinkedIn, and Facebook for your industry.");
    return recommendations;
  }

  // Check for missing platforms
  const platforms = validProfiles.map(p => p.platform);
  if (!platforms.includes("instagram")) {
    recommendations.push("Consider creating an Instagram presence for visual content and broader reach.");
  }
  if (!platforms.includes("linkedin")) {
    recommendations.push("LinkedIn is essential for B2B credibility and professional networking.");
  }
  if (!platforms.includes("youtube")) {
    recommendations.push("Video content on YouTube can significantly boost SEO and engagement.");
  }

  // Engagement analysis
  for (const profile of validProfiles) {
    if (profile.followers && profile.followers < 1000) {
      recommendations.push(`Grow your ${profile.platform} following with consistent posting and engagement.`);
    }
    if (profile.engagement?.engagementRate && profile.engagement.engagementRate < 2) {
      recommendations.push(`Improve ${profile.platform} engagement with more interactive content (polls, questions, stories).`);
    }
    if (profile.posts && profile.posts < 50) {
      recommendations.push(`Increase posting frequency on ${profile.platform} to build content library.`);
    }
  }

  // Cross-platform consistency
  if (validProfiles.length > 1) {
    const bios = validProfiles.filter(p => p.bio).map(p => p.bio);
    if (bios.length > 1 && new Set(bios).size === bios.length) {
      recommendations.push("Consider aligning messaging across platforms for consistent branding.");
    }
  }

  return recommendations.slice(0, 5); // Limit to 5 recommendations
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<SocialResearchResult>) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { socialLinks, platforms } = req.body;

  if (!socialLinks || typeof socialLinks !== "object") {
    return res.status(400).json({ success: false, error: "socialLinks object is required" });
  }

  if (!BRIGHT_DATA_API_TOKEN) {
    return res.status(500).json({ success: false, error: "Bright Data API token not configured" });
  }

  try {
    const profiles: SocialProfile[] = [];
    const fetchPromises: Promise<SocialProfile>[] = [];

    // Determine which platforms to fetch
    const platformsToFetch = platforms || Object.keys(socialLinks);

    for (const platform of platformsToFetch) {
      const url = socialLinks[platform];
      if (!url) continue;

      switch (platform.toLowerCase()) {
        case "instagram":
          fetchPromises.push(fetchInstagramProfile(url));
          break;
        case "tiktok":
          fetchPromises.push(fetchTikTokProfile(url));
          break;
        case "linkedin":
          const isCompany = url.includes("/company/");
          fetchPromises.push(fetchLinkedInProfile(url, isCompany ? "company" : "person"));
          break;
        case "youtube":
          fetchPromises.push(fetchYouTubeProfile(url));
          break;
        case "facebook":
          fetchPromises.push(fetchFacebookProfile(url));
          break;
        case "twitter":
        case "x":
          fetchPromises.push(fetchTwitterProfile(url));
          break;
      }
    }

    // Fetch all profiles in parallel
    const results = await Promise.all(fetchPromises);
    profiles.push(...results);

    // Calculate summary statistics
    const validProfiles = profiles.filter(p => !p.error);
    const totalFollowers = validProfiles.reduce((sum, p) => sum + (p.followers || 0), 0);
    const totalPosts = validProfiles.reduce((sum, p) => sum + (p.posts || 0), 0);

    const engagementRates = validProfiles
      .filter(p => p.engagement?.engagementRate)
      .map(p => p.engagement!.engagementRate!);
    const avgEngagementRate = engagementRates.length > 0
      ? engagementRates.reduce((a, b) => a + b, 0) / engagementRates.length
      : 0;

    // Find strongest/weakest platforms by follower count
    const sortedByFollowers = [...validProfiles].sort((a, b) => (b.followers || 0) - (a.followers || 0));
    const strongestPlatform = sortedByFollowers[0]?.platform || "none";
    const weakestPlatform = sortedByFollowers[sortedByFollowers.length - 1]?.platform || "none";

    const recommendations = generateRecommendations(profiles);

    return res.status(200).json({
      success: true,
      data: {
        profiles,
        summary: {
          totalFollowers,
          totalPosts,
          avgEngagementRate: Math.round(avgEngagementRate * 100) / 100,
          strongestPlatform,
          weakestPlatform,
          recommendations,
        },
        researchedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Social research error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to research social profiles",
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
  maxDuration: 120,
};
