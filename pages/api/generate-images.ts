// pages/api/generate-images.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { generateBlogImage, remakeBlogImage, reviewImageQuality, GeneratedImage } from "../../lib/ai-gateway";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";

interface ImageGenerationRequest {
  prompts: string[];
  sectionContexts?: string[]; // Optional context for each section to improve relevance
  enableQualityReview?: boolean; // Whether to review and potentially remake images
}

interface ImageGenerationResponse {
  success: boolean;
  images?: GeneratedImage[];
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ImageGenerationResponse>
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
      const sectionContext = request.sectionContexts?.[i] || "";
      console.log(`Generating image ${i + 1}/${request.prompts.length}: ${prompt.substring(0, 50)}...`);

      let image = await generateBlogImage({ prompt, index: i });

      // If quality review is enabled and we got an image, review it
      if (image && image.base64 && request.enableQualityReview) {
        console.log(`Reviewing image quality for ${i + 1}...`);
        const review = await reviewImageQuality({
          imageBase64: image.base64,
          originalPrompt: prompt,
          sectionContext,
        });

        if (!review.approved && review.remakePrompt) {
          console.log(`Image ${i + 1} not approved, remaking with improved prompt...`);
          const remadeImage = await remakeBlogImage({
            improvedPrompt: review.remakePrompt,
            index: i,
          });

          if (remadeImage && remadeImage.base64) {
            image = remadeImage;
          }
        }
      }

      if (image && image.base64) {
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
  maxDuration: 180, // 3 minutes for multiple images with quality review
};
