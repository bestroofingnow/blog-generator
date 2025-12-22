// pages/api/research-keywords.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { researchKeywords, KeywordResearch } from "../../lib/ai-gateway";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import { loadUserProfile, loadDrafts } from "../../lib/database";

interface ResearchRequest {
  topic: string;
  location: string;
  companyName?: string;
  companyWebsite?: string;
  blogType: string;
}

interface ResearchResponse {
  success: boolean;
  suggestions?: KeywordResearch;
  error?: string;
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
    const userId = (session.user as { id?: string }).id || session.user?.email || "";
    const userProfile = await loadUserProfile(userId);
    const pastBlogs = await loadDrafts(userId);

    // Extract profile context
    const companyProfile = userProfile?.companyProfile;

    // Get existing blog titles to avoid duplicates
    const existingBlogTitles = pastBlogs.map(blog => blog.title);

    const suggestions = await researchKeywords({
      topic: request.topic,
      location: request.location,
      companyName: request.companyName || companyProfile?.name,
      companyWebsite: request.companyWebsite || companyProfile?.website,
      blogType: request.blogType,
      // Additional profile context
      profileContext: companyProfile ? {
        services: companyProfile.services || [],
        usps: companyProfile.usps || [],
        certifications: companyProfile.certifications || [],
        brandVoice: companyProfile.brandVoice,
        targetAudience: companyProfile.audience,
        industryType: companyProfile.industryType,
      } : undefined,
      existingBlogTitles: existingBlogTitles.slice(0, 20),
    });

    return res.status(200).json({
      success: true,
      suggestions,
    });
  } catch (error) {
    console.error("Research error:", error);
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
  maxDuration: 60, // Perplexity research may take longer
};
