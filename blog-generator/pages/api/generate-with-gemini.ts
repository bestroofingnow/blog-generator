// pages/api/generate-with-gemini.ts
import { GoogleGenerativeAI } from "@google/generativeai";
import type { NextApiRequest, NextApiResponse } from "next";

interface GeminiGeneratorRequest {
  topic: string;
  location: string;
  blogType: string;
  numberOfSections?: number;
  generationType?: "content" | "images" | "both";
}

interface ImageGenerationRequest {
  descriptions: string[];
}

interface GeminiResponse {
  success: boolean;
  content?: string;
  images?: string[];
  error?: string;
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function generateWithGemini(
  request: GeminiGeneratorRequest
): Promise<string> {
  const {
    topic,
    location,
    blogType,
    numberOfSections = 5,
  } = request;

  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `You are a professional real estate and landscape marketing content writer.

Generate a detailed, engaging blog post in HTML format for:
Topic: ${topic}
Location: ${location}
Type: ${blogType}
Sections: ${numberOfSections}

Requirements:
1. Start with <h1> title including location and topic
2. Include 2-3 paragraph introduction
3. Create ${numberOfSections} detailed sections with <h2> headers
4. Each section has 2-3 paragraphs with specific local references
5. Include [IMAGE:description] placeholders between sections
6. Use <strong> for key concepts
7. End with compelling CTA section
8. Professional yet conversational tone
9. Address reader as "you"
10. Include specific neighborhood/landmark names

Output ONLY valid HTML content.`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text();
}

async function generateImagePrompts(
  blogContent: string
): Promise<string[]> {
  // Extract image descriptions from content
  const imageMatches = blogContent.match(/\[IMAGE:(.*?)\]/g) || [];
  return imageMatches.map((match) =>
    match.replace(/\[IMAGE:(.*?)\]/, "$1")
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GeminiResponse>
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  try {
    const request = req.body as GeminiGeneratorRequest;

    if (!request.topic || !request.location || !request.blogType) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    const generationType = request.generationType || "content";
    let content: string | undefined;
    let images: string[] | undefined;

    if (generationType === "content" || generationType === "both") {
      content = await generateWithGemini(request);
    }

    if (generationType === "images" || generationType === "both") {
      if (!content) {
        content = await generateWithGemini(request);
      }
      const imagePrompts = await generateImagePrompts(content);
      images = imagePrompts.map((prompt) => ({
        prompt,
        // In production, you'd call an image generation API
        // For now, we just return the prompts
      })) as any;
    }

    return res.status(200).json({
      success: true,
      content,
      images,
    });
  } catch (error) {
    console.error("Gemini generation error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate content with Gemini",
    });
  }
}
