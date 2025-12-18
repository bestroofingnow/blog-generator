// pages/api/edit-image.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createGateway } from "@ai-sdk/gateway";
import { generateText, experimental_generateImage as generateImageAI } from "ai";

const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? "",
});

// Gemini 3 Pro for image editing ("Nana Banana Pro")
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

    // Extract base64 data if it's a data URI
    let imageBase64 = imageUrl;
    if (imageUrl.startsWith("data:")) {
      imageBase64 = imageUrl.split(",")[1] || imageUrl;
    }

    // Step 1: Use Gemini 3 Pro to analyze the image and create an enhanced edit prompt
    const analyzePrompt = `You are an expert image editor. Analyze the current image and the user's edit request.

USER'S EDIT REQUEST: "${editInstructions}"

${originalPrompt ? `ORIGINAL IMAGE CONTEXT: ${originalPrompt}` : ""}

Your task:
1. Describe what you see in the current image
2. Create a detailed, professional image generation prompt that:
   - Maintains the core subject and composition of the original
   - Incorporates the user's requested changes
   - Ensures professional marketing-quality output
   - CRITICAL: Does NOT include any text, words, letters, numbers, signs, logos, or watermarks
   - Specifies lighting, style, mood, and technical quality

Return ONLY the new image generation prompt, nothing else. Make it detailed and specific.`;

    const analysisResult = await generateText({
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

    const enhancedPrompt = analysisResult.text.trim();
    console.log("[Nana Banana Pro] Enhanced prompt:", enhancedPrompt.substring(0, 200) + "...");

    // Step 2: Generate the new image with the enhanced prompt
    const imageResult = await generateImageAI({
      model: imageGenerator,
      prompt: enhancedPrompt,
      n: 1,
    });

    if (imageResult.images && imageResult.images.length > 0) {
      const image = imageResult.images[0];
      const base64Data = image.base64;
      const mediaType = image.mediaType || "image/png";

      console.log("[Nana Banana Pro] Image edited successfully");

      return res.status(200).json({
        success: true,
        editedImage: {
          base64: `data:${mediaType};base64,${base64Data}`,
          mimeType: mediaType,
        },
      });
    }

    return res.status(500).json({
      success: false,
      error: "Failed to generate edited image",
    });
  } catch (error) {
    console.error("[Nana Banana Pro] Error:", error);
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
