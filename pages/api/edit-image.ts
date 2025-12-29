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

// Use Gemini 2.5 Flash for image analysis (more reliable than 3 Pro preview)
// Falls back to Claude if Gemini fails
const geminiFlash = gateway("google/gemini-2.5-flash-preview-09-2025");
const claudeSonnet = gateway("anthropic/claude-sonnet-4");
const imageGenerator = gateway.imageModel("google/imagen-4.0-generate");

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

    console.log("[Image Edit] Starting image edit...");
    console.log("[Image Edit] Edit instructions:", editInstructions);
    console.log("[Image Edit] Image input type:", imageUrl.startsWith("data:") ? "base64" : "url");
    console.log("[Image Edit] Image input length:", imageUrl.length);

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
    console.log("[Image Edit] Extracted base64 length:", imageBase64.length);

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

    console.log("[Image Edit] Step 1: Analyzing image with Gemini 2.5 Flash...");

    let analysisResult;
    let enhancedPrompt: string;

    // Try Gemini first, then Claude as fallback for image analysis
    try {
      analysisResult = await generateText({
        model: geminiFlash,
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
      enhancedPrompt = analysisResult.text.trim();
      console.log("[Image Edit] Gemini analysis successful");
    } catch (geminiError) {
      console.log("[Image Edit] Gemini failed, trying Claude...");

      try {
        analysisResult = await generateText({
          model: claudeSonnet,
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
        enhancedPrompt = analysisResult.text.trim();
        console.log("[Image Edit] Claude analysis successful");
      } catch (claudeError) {
        console.error("[Image Edit] Both analysis models failed:", geminiError, claudeError);
        // Create a fallback prompt without image analysis
        enhancedPrompt = `Professional marketing photograph: ${editInstructions}. ${originalPrompt || ""}

Style: High-quality commercial photography, perfect lighting, sharp focus, professional composition.
CRITICAL: ABSOLUTELY NO TEXT, WORDS, LETTERS, OR NUMBERS anywhere in the image. NO signs, labels, banners, logos, watermarks, or brand names. Pure visual imagery only - ZERO text elements.`;
        console.log("[Image Edit] Using fallback prompt without analysis");
      }
    }

    console.log("[Image Edit] Enhanced prompt:", enhancedPrompt.substring(0, 200) + "...");
    console.log("[Image Edit] Step 2: Generating new image with Imagen 4.0...");

    // Step 2: Generate the new image with the enhanced prompt
    const imageResult = await generateImageAI({
      model: imageGenerator,
      prompt: enhancedPrompt,
      n: 1,
    });

    console.log("[Image Edit] Image generation result:", {
      hasImages: !!imageResult.images,
      imageCount: imageResult.images?.length || 0,
    });

    if (imageResult.images && imageResult.images.length > 0) {
      const image = imageResult.images[0];
      const base64Data = image.base64;
      const outputMediaType = image.mediaType || "image/png";

      console.log("[Image Edit] Image generated successfully");
      console.log("[Image Edit] Output size:", base64Data?.length || 0);

      return res.status(200).json({
        success: true,
        editedImage: {
          base64: `data:${outputMediaType};base64,${base64Data}`,
          mimeType: outputMediaType,
        },
      });
    }

    console.error("[Image Edit] No images in result");
    return res.status(500).json({
      success: false,
      error: "Failed to generate edited image - no output returned",
    });
  } catch (error) {
    console.error("[Image Edit] Error:", error);
    console.error("[Image Edit] Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
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
