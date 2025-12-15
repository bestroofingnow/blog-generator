// pages/api/generate-images.ts
import { GoogleGenAI } from "@google/genai";
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

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function generateImage(prompt: string, index: number): Promise<GeneratedImage | null> {
  try {
    // Enhanced prompt for better image quality
    const enhancedPrompt = `Create a high-quality, photorealistic image for a professional blog post.

IMAGE REQUIREMENTS:
- Style: Professional marketing photography
- Quality: High resolution, sharp details
- Composition: Well-balanced, visually appealing
- Subject: ${prompt}

Make the image look like it was taken by a professional photographer for a magazine or marketing material. Focus on high quality and visual appeal.`;

    // Use Gemini 2.0 Flash for image generation
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: enhancedPrompt }] }],
      config: {
        responseModalities: ["image", "text"],
      },
    });

    // Check for image in response
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) {
        return {
          index,
          prompt,
          base64: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
          mimeType: part.inlineData.mimeType || "image/png",
        };
      }
    }

    console.log(`No image generated for prompt ${index}, trying Imagen...`);

    // Fallback to Imagen model
    try {
      const imagenResponse = await ai.models.generateImages({
        model: "imagen-3.0-generate-002",
        prompt: enhancedPrompt,
        config: {
          numberOfImages: 1,
        },
      });

      if (imagenResponse.generatedImages && imagenResponse.generatedImages.length > 0) {
        const img = imagenResponse.generatedImages[0];
        if (img.image?.imageBytes) {
          return {
            index,
            prompt,
            base64: `data:image/png;base64,${img.image.imageBytes}`,
            mimeType: "image/png",
          };
        }
      }
    } catch (imagenError) {
      console.log(`Imagen fallback failed for prompt ${index}:`, imagenError);
    }

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
        await new Promise((resolve) => setTimeout(resolve, 1500));
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
  maxDuration: 120, // 120 seconds timeout for multiple images
};
