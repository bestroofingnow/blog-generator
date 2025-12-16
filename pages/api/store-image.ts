// pages/api/store-image.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { put } from "@vercel/blob";

interface StoreImageRequest {
  base64: string;
  filename: string;
  contentType?: string;
}

interface StoreImageResponse {
  success: boolean;
  url?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StoreImageResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // Check if Vercel Blob is configured
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({
      success: false,
      error: "BLOB_READ_WRITE_TOKEN not configured. Please set up Vercel Blob Storage.",
    });
  }

  try {
    const { base64, filename, contentType = "image/png" } = req.body as StoreImageRequest;

    if (!base64 || !filename) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: base64 and filename",
      });
    }

    // Strip data URI prefix if present
    let cleanBase64 = base64;
    if (cleanBase64.includes(",")) {
      cleanBase64 = cleanBase64.split(",")[1];
    }

    // Convert base64 to Buffer
    const buffer = Buffer.from(cleanBase64, "base64");

    // Upload to Vercel Blob
    const blob = await put(filename, buffer, {
      access: "public",
      contentType,
    });

    console.log("Image stored successfully:", blob.url);

    return res.status(200).json({
      success: true,
      url: blob.url,
    });
  } catch (error) {
    console.error("Image storage error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to store image",
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
  },
};
