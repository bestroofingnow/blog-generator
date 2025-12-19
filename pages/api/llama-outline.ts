// pages/api/llama-outline.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { generateOutline, BlogOutline } from "../../lib/ai-gateway";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";

interface OutlineRequest {
  topic: string;
  location: string;
  blogType: string;
  numberOfSections?: number;
  tone?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  imageThemes?: string[];
}

interface OutlineResponse {
  success: boolean;
  outline?: BlogOutline;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OutlineResponse>
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
    const request = req.body as OutlineRequest;

    if (!request.topic || !request.location || !request.blogType) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: topic, location, blogType",
      });
    }

    const outline = await generateOutline({
      topic: request.topic,
      location: request.location,
      blogType: request.blogType,
      numberOfSections: request.numberOfSections,
      tone: request.tone,
      primaryKeyword: request.primaryKeyword,
      secondaryKeywords: request.secondaryKeywords,
      imageThemes: request.imageThemes,
    });

    return res.status(200).json({
      success: true,
      outline,
    });
  } catch (error) {
    console.error("Llama outline error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate outline",
    });
  }
}

export const config = {
  maxDuration: 60,
};
