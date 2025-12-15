// pages/api/generate-images.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { NextApiRequest, NextApiResponse } from "next";

interface ImageGenerationRequest {
  prompts: string[];
}

interface GeneratedImage {
  index: number;
  prompt: string;
  base64: string;
  mimeType: string;
}

interface ImageGenerationResponse {
  success: boolean;
  images?: GeneratedImage[];
  error?: string;
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function generateImage(prompt: string, index: number): Promise<GeneratedImage | null> {
  try {
    // Use Gemini's image generation model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp", // Experimental model with image generation
    });

    // Enhanced prompt for better image quality
    const enhancedPrompt = `Generate a high-quality, photorealistic image for a professional landscape lighting blog post.

IMAGE REQUIREMENTS:
- Style: Professional marketing photography
- Quality: High resolution, sharp details
- Lighting: Warm, inviting evening/dusk atmosphere
- Subject: ${prompt}

Make the image look like it was taken by a professional architectural photographer for a luxury home magazine. The lighting should be warm and inviting, showcasing the beauty of landscape lighting at dusk or evening.`;

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: enhancedPrompt }],
        },
      ],
      generationConfig: {
        responseModalities: ["image", "text"],
      } as any, // Type assertion needed for image generation config
    });

    const response = result.response;

    // Extract image from response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if ((part as any).inlineData) {
        const inlineData = (part as any).inlineData;
        return {
          index,
          prompt,
          base64: `data:${inlineData.mimeType};base64,${inlineData.data}`,
          mimeType: inlineData.mimeType,
        };
      }
    }

    // If no image was generated, return null
    console.log(`No image generated for prompt ${index}`);
    return null;
  } catch (error) {
    console.error(`Error generating image ${index}:`, error);
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ImageGenerationResponse>
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
    const request = req.body as ImageGenerationRequest;

    if (!request.prompts || request.prompts.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No image prompts provided",
      });
    }

    const images: GeneratedImage[] = [];

    // Generate images sequentially to avoid rate limiting
    for (let i = 0; i < request.prompts.length; i++) {
      const prompt = request.prompts[i];
      console.log(`Generating image ${i + 1}/${request.prompts.length}: ${prompt.substring(0, 50)}...`);

      const image = await generateImage(prompt, i);

      if (image) {
        images.push(image);
      } else {
        // Create placeholder for failed images
        images.push({
          index: i,
          prompt,
          base64: "", // Empty - will use placeholder
          mimeType: "image/png",
        });
      }

      // Small delay between requests to avoid rate limiting
      if (i < request.prompts.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return res.status(200).json({
      success: true,
      images,
    });
  } catch (error) {
    console.error("Image generation error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Image generation failed",
    });
  }
}

// Increase timeout for image generation
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
    responseLimit: false,
  },
  maxDuration: 60, // 60 seconds timeout for Vercel
};
