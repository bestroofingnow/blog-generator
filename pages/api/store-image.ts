// pages/api/store-image.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";

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

  // Auth check
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
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

    // Validate content type - only allow images
    const allowedContentTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
    if (!allowedContentTypes.includes(contentType)) {
      return res.status(400).json({
        success: false,
        error: "Invalid content type. Only images are allowed.",
      });
    }

    // Sanitize filename - remove path traversal attempts and special characters
    const sanitizedFilename = filename
      .replace(/\.\./g, "") // Remove path traversal
      .replace(/[/\\]/g, "") // Remove slashes
      .replace(/[^a-zA-Z0-9._-]/g, "-") // Replace special chars with dash
      .substring(0, 255); // Limit filename length

    if (!sanitizedFilename || sanitizedFilename.length < 3) {
      return res.status(400).json({
        success: false,
        error: "Invalid filename",
      });
    }

    // Strip data URI prefix if present
    let cleanBase64 = base64;
    if (cleanBase64.includes(",")) {
      cleanBase64 = cleanBase64.split(",")[1];
    }

    // Convert base64 to Buffer
    const buffer = Buffer.from(cleanBase64, "base64");

    // Validate buffer size (max 10MB for images)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (buffer.length > maxSize) {
      return res.status(400).json({
        success: false,
        error: "Image too large. Maximum size is 10MB.",
      });
    }

    // Upload to Vercel Blob
    const blob = await put(sanitizedFilename, buffer, {
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
