// pages/api/ai-visibility/configs/index.ts
// List all AI visibility configs or create a new one

import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { db, aiVisibilityConfigs, AIPlatform } from "../../../../lib/db";
import { eq, desc } from "drizzle-orm";

interface ConfigCreateRequest {
  name: string;
  brandName: string;
  brandDomain: string;
  alternateNames?: string[];
  platforms?: AIPlatform[];
}

interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // Auth check
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return res.status(401).json({ success: false, error: "User ID not found" });
  }

  if (req.method === "GET") {
    try {
      const configs = await db
        .select()
        .from(aiVisibilityConfigs)
        .where(eq(aiVisibilityConfigs.userId, userId))
        .orderBy(desc(aiVisibilityConfigs.createdAt));

      return res.status(200).json({ success: true, data: configs });
    } catch (error) {
      console.error("Error fetching AI visibility configs:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch configs",
      });
    }
  }

  if (req.method === "POST") {
    const {
      name,
      brandName,
      brandDomain,
      alternateNames = [],
      platforms = ["chatgpt", "perplexity", "google_aio", "claude", "gemini"],
    }: ConfigCreateRequest = req.body;

    if (!name || !brandName || !brandDomain) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name, brandName, and brandDomain",
      });
    }

    // Clean domain
    let cleanDomain = brandDomain.toLowerCase().trim();
    if (cleanDomain.startsWith("http://") || cleanDomain.startsWith("https://")) {
      try {
        cleanDomain = new URL(cleanDomain).hostname;
      } catch {
        return res.status(400).json({
          success: false,
          error: "Invalid domain URL",
        });
      }
    }

    try {
      const [config] = await db
        .insert(aiVisibilityConfigs)
        .values({
          userId,
          name,
          brandName,
          brandDomain: cleanDomain,
          alternateNames,
          platforms,
          isActive: true,
        })
        .returning();

      return res.status(201).json({ success: true, data: config });
    } catch (error) {
      console.error("Error creating AI visibility config:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to create config",
      });
    }
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}
