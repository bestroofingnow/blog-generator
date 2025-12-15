// pages/api/research-keywords.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { researchKeywords, KeywordResearch } from "../../lib/ai-gateway";

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

    const suggestions = await researchKeywords({
      topic: request.topic,
      location: request.location,
      companyName: request.companyName,
      companyWebsite: request.companyWebsite,
      blogType: request.blogType,
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
