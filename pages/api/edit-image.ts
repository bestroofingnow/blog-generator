// pages/api/edit-image.ts
// Image editing using Gemini 3 Pro ("Nana Banana Pro") for analysis
// and Imagen 4.0 for regeneration
import type { NextApiRequest, NextApiResponse } from "next";
import { createGateway } from "@ai-sdk/gateway";
import { generateText, experimental_generateImage as generateImageAI } from "ai";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";

const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? "",
});

// Gemini 3 Pro for image analysis ("Nana Banana Pro")
// Try multiple model IDs as availability may vary
const geminiPro = gateway("google/gemini-3-pro-preview");
const imageGenerator = gateway.imageModel("google/imagen-4.0-generate-001");

interface EditImageRequest {
  imageUrl: string; // Base64 or URL of the current image
  editInstructions: string; // What the user wants to change
  originalPrompt?: string; // Optional context about the original image
}

interface EditImageResponse {
  success: boolean;
  editedImage?: {
    base64: string;
    mimeType: string;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EditImageResponse>
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
    const { imageUrl, editInstructions, originalPrompt } = req.body as EditImageRequest;

    if (!imageUrl || !editInstructions) {
      return res.status(400).json({
        success: false,
        error: "Image URL and edit instructions are required",
      });
    }

    console.log("[Nana Banana Pro] Starting image edit...");
    console.log("[Nana Banana Pro] Edit instructions:", editInstructions);
    console.log("[Nana Banana Pro] Image input type:", imageUrl.startsWith("data:") ? "base64" : "url");
    console.log("[Nana Banana Pro] Image input length:", imageUrl.length);

    // Extract base64 data if it's a data URI
    let imageBase64 = imageUrl;
    let mimeType = "image/png";
    if (imageUrl.startsWith("data:")) {
      const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        imageBase64 = match[2];
      } else {
        imageBase64 = imageUrl.split(",")[1] || imageUrl;
      }
    }
    console.log("[Nana Banana Pro] Extracted base64 length:", imageBase64.length);

    // Step 1: Use Gemini 3 Pro to analyze the image and create an enhanced edit prompt
    const analyzePrompt = `You are an expert image editor. Analyze the current image and the user's edit request.

USER'S EDIT REQUEST: "${editInstructions}"

${originalPrompt ? `ORIGINAL IMAGE CONTEXT: ${originalPrompt}` : ""}

Your task:
1. Describe what you see in the current image (composition, subject, style, colors)
2. Create a detailed, professional image generation prompt that:
   - Maintains the core subject and composition of the original
   - Incorporates the user's requested changes
   - Ensures professional marketing-quality output
   - Specifies lighting, style, mood, and technical quality

CRITICAL TEXT RESTRICTIONS - Your prompt MUST include these exact instructions:
"ABSOLUTELY NO TEXT, WORDS, LETTERS, OR NUMBERS anywhere in the image. NO signs, labels, banners, logos, watermarks, or brand names. If text would naturally appear, blur or exclude it. Pure visual imagery only - ZERO text elements."

Return ONLY the new image generation prompt, nothing else. Make it detailed and specific. The prompt MUST contain the no-text instructions above.`;

    console.log("[Nana Banana Pro] Step 1: Analyzing image with Gemini 3 Pro...");

    let analysisResult;
    try {
      analysisResult = await generateText({
        model: geminiPro,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: analyzePrompt },
              { type: "image", image: imageBase64 },
            ],
          },
        ],
        maxOutputTokens: 1000,
      });
    } catch (analysisError) {
      console.error("[Nana Banana Pro] Analysis failed:", analysisError);
      // If Gemini analysis fails, create a fallback prompt
      const fallbackPrompt = `Professional marketing photograph: ${editInstructions}. ${originalPrompt || ""}

CRITICAL: ABSOLUTELY NO TEXT, WORDS, LETTERS, OR NUMBERS anywhere in the image. NO signs, labels, banners, logos, watermarks, or brand names. Pure visual imagery only - ZERO text elements. High quality, sharp focus, professional lighting.`;

      console.log("[Nana Banana Pro] Using fallback prompt for image generation");

      const fallbackResult = await generateImageAI({
        model: imageGenerator,
        prompt: fallbackPrompt,
        n: 1,
      });

      if (fallbackResult.images && fallbackResult.images.length > 0) {
        const image = fallbackResult.images[0];
        return res.status(200).json({
          success: true,
          editedImage: {
            base64: `data:${image.mediaType || "image/png"};base64,${image.base64}`,
            mimeType: image.mediaType || "image/png",
          },
        });
      }

      throw new Error("Both analysis and fallback image generation failed");
    }

    const enhancedPrompt = analysisResult.text.trim();
    console.log("[Nana Banana Pro] Enhanced prompt:", enhancedPrompt.substring(0, 200) + "...");
    console.log("[Nana Banana Pro] Step 2: Generating edited image with Imagen 4.0...");

    // Step 2: Generate the new image with the enhanced prompt
    const imageResult = await generateImageAI({
      model: imageGenerator,
      prompt: enhancedPrompt,
      n: 1,
    });

    console.log("[Nana Banana Pro] Image generation result:", {
      hasImages: !!imageResult.images,
      imageCount: imageResult.images?.length || 0,
    });

    if (imageResult.images && imageResult.images.length > 0) {
      const image = imageResult.images[0];
      const base64Data = image.base64;
      const outputMediaType = image.mediaType || "image/png";

      console.log("[Nana Banana Pro] Image edited successfully");
      console.log("[Nana Banana Pro] Output size:", base64Data?.length || 0);

      return res.status(200).json({
        success: true,
        editedImage: {
          base64: `data:${outputMediaType};base64,${base64Data}`,
          mimeType: outputMediaType,
        },
      });
    }

    console.error("[Nana Banana Pro] No images in result");
    return res.status(500).json({
      success: false,
      error: "Failed to generate edited image - no output returned",
    });
  } catch (error) {
    console.error("[Nana Banana Pro] Error:", error);
    console.error("[Nana Banana Pro] Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Image editing failed",
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
    responseLimit: false,
  },
  maxDuration: 120,
};
