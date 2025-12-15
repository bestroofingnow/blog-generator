// pages/api/research-keywords.ts
import { GoogleGenAI } from "@google/genai";
import type { NextApiRequest, NextApiResponse } from "next";

interface ResearchRequest {
  topic: string;
  location: string;
  companyName?: string;
  companyWebsite?: string;
  blogType: string;
}

interface KeywordSuggestion {
  primaryKeyword: string;
  secondaryKeywords: string[];
  metaTitle: string;
  metaDescription: string;
  competitorInsights: string[];
  contentAngles: string[];
  imageThemes: string[];
}

interface ResearchResponse {
  success: boolean;
  suggestions?: KeywordSuggestion;
  error?: string;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResearchResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      success: false,
      error: "GEMINI_API_KEY not configured",
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

    const researchPrompt = `You are an expert SEO researcher and content strategist. Analyze the following business topic and provide comprehensive keyword and content research.

BUSINESS DETAILS:
- Topic/Service: ${request.topic}
- Location: ${request.location}
- Company Name: ${request.companyName || "Local service provider"}
- Company Website: ${request.companyWebsite || "Not provided"}
- Blog Type: ${request.blogType}

RESEARCH TASKS:
1. Identify the best PRIMARY KEYWORD for this topic + location (should be high-intent, local search term)
2. Suggest 5-8 SECONDARY KEYWORDS (related terms, long-tail variations, LSI keywords)
3. Write an optimized META TITLE (under 60 characters, include primary keyword and location)
4. Write a compelling META DESCRIPTION (under 160 characters, include call to action)
5. Analyze what COMPETITORS are likely doing in this space
6. Suggest unique CONTENT ANGLES that would differentiate this blog
7. Recommend specific IMAGE THEMES that would visually represent each section (be specific about what the images should show)

For IMAGE THEMES, provide detailed, specific descriptions that will help generate relevant images. For example:
- For landscape lighting: "Elegant colonial home at dusk with warm pathway lights leading to front door, professional photography style"
- For roofing: "Aerial view of luxury home with new architectural shingle roof, lake visible in background, sunny day"
- Be specific about: time of day, weather, architectural style, camera angle, mood

Respond in this exact JSON format:
{
  "primaryKeyword": "main keyword phrase with location",
  "secondaryKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "metaTitle": "SEO optimized title under 60 chars",
  "metaDescription": "Compelling description under 160 chars with CTA",
  "competitorInsights": ["insight1", "insight2", "insight3"],
  "contentAngles": ["unique angle 1", "unique angle 2", "unique angle 3"],
  "imageThemes": [
    "Hero image: detailed description of main blog image",
    "Section 1: specific image description matching content",
    "Section 2: specific image description matching content",
    "Section 3: specific image description matching content",
    "Section 4: specific image description matching content",
    "Section 5: specific image description matching content"
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-05-20",
      contents: [{ role: "user", parts: [{ text: researchPrompt }] }],
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "";

    // Parse the JSON response
    let suggestions: KeywordSuggestion;
    try {
      // Clean up potential markdown formatting
      let cleanedText = text.trim();
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.slice(7);
      }
      if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.slice(3);
      }
      if (cleanedText.endsWith("```")) {
        cleanedText = cleanedText.slice(0, -3);
      }

      suggestions = JSON.parse(cleanedText.trim());
    } catch (parseError) {
      console.error("Failed to parse research response:", text);
      // Return fallback suggestions
      suggestions = {
        primaryKeyword: `${request.topic.toLowerCase()} ${request.location.toLowerCase()}`,
        secondaryKeywords: [
          `${request.topic.toLowerCase()} services`,
          `best ${request.topic.toLowerCase()} near me`,
          `${request.location} ${request.topic.toLowerCase()} company`,
          `professional ${request.topic.toLowerCase()}`,
          `${request.topic.toLowerCase()} installation`,
        ],
        metaTitle: `${request.topic} in ${request.location} | Expert Guide`,
        metaDescription: `Discover the best ${request.topic.toLowerCase()} solutions in ${request.location}. Expert tips, local insights, and professional services. Contact us today!`,
        competitorInsights: [
          "Focus on local expertise and knowledge",
          "Highlight quality and professionalism",
          "Emphasize customer service and support",
        ],
        contentAngles: [
          "Local neighborhood-specific recommendations",
          "Before and after transformations",
          "Expert tips from industry professionals",
        ],
        imageThemes: [
          `Hero: Beautiful ${request.location} home showcasing professional ${request.topic.toLowerCase()}, golden hour lighting`,
          `Section 1: Close-up of ${request.topic.toLowerCase()} details showing quality craftsmanship`,
          `Section 2: Before and after comparison of ${request.topic.toLowerCase()} project`,
          `Section 3: Professional team working on ${request.topic.toLowerCase()} installation`,
          `Section 4: Finished ${request.topic.toLowerCase()} project from multiple angles`,
          `Section 5: Happy homeowner enjoying their new ${request.topic.toLowerCase()}`,
        ],
      };
    }

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
  maxDuration: 30,
};
