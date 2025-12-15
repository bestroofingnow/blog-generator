// pages/api/wordpress-upload.ts
import type { NextApiRequest, NextApiResponse } from "next";
import {
  testConnection,
  uploadImage,
  uploadImages,
  WordPressCredentials,
  UploadedImage,
} from "../../lib/wordpress";

interface UploadRequest {
  action: "test" | "upload" | "uploadMultiple";
  credentials: WordPressCredentials;
  image?: {
    base64: string;
    filename: string;
    altText: string;
    caption?: string;
  };
  images?: Array<{
    base64: string;
    filename: string;
    altText: string;
    caption?: string;
  }>;
}

interface UploadResponse {
  success: boolean;
  error?: string;
  siteName?: string;
  image?: UploadedImage;
  images?: UploadedImage[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UploadResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const request = req.body as UploadRequest;

    if (!request.credentials?.siteUrl || !request.credentials?.username || !request.credentials?.appPassword) {
      return res.status(400).json({
        success: false,
        error: "Missing WordPress credentials",
      });
    }

    switch (request.action) {
      case "test": {
        const result = await testConnection(request.credentials);
        return res.status(200).json({
          success: result.success,
          error: result.error,
          siteName: result.siteName,
        });
      }

      case "upload": {
        if (!request.image) {
          return res.status(400).json({
            success: false,
            error: "No image provided",
          });
        }

        const uploaded = await uploadImage(request.credentials, request.image);
        return res.status(200).json({
          success: true,
          image: uploaded,
        });
      }

      case "uploadMultiple": {
        if (!request.images || request.images.length === 0) {
          return res.status(400).json({
            success: false,
            error: "No images provided",
          });
        }

        const uploaded = await uploadImages(request.credentials, request.images);
        return res.status(200).json({
          success: true,
          images: uploaded,
        });
      }

      default:
        return res.status(400).json({
          success: false,
          error: "Invalid action",
        });
    }
  } catch (error) {
    console.error("WordPress upload error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    });
  }
}

// Increase body size limit for image uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
  },
};
