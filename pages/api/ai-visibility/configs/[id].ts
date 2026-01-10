// pages/api/ai-visibility/configs/[id].ts
// Get, update, or delete a specific AI visibility config

import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { db, aiVisibilityConfigs, AIPlatform } from "../../../../lib/db";
import { eq, and } from "drizzle-orm";

interface ConfigUpdateRequest {
  name?: string;
  brandName?: string;
  brandDomain?: string;
  alternateNames?: string[];
  platforms?: AIPlatform[];
  isActive?: boolean;
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

  const idParam = req.query.id;
  if (!idParam || typeof idParam !== "string") {
    return res.status(400).json({ success: false, error: "Missing config id" });
  }
  const configId = idParam as string;

  // GET - Get config details
  if (req.method === "GET") {
    try {
      const [config] = await db
        .select()
        .from(aiVisibilityConfigs)
        .where(and(eq(aiVisibilityConfigs.id, configId), eq(aiVisibilityConfigs.userId, userId)));

      if (!config) {
        return res.status(404).json({ success: false, error: "Config not found" });
      }

      return res.status(200).json({ success: true, data: config });
    } catch (error) {
      console.error("Error fetching config:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch config",
      });
    }
  }

  // PUT - Update config
  if (req.method === "PUT") {
    const updates: ConfigUpdateRequest = req.body;

    try {
      // Verify config exists and belongs to user
      const [existingConfig] = await db
        .select()
        .from(aiVisibilityConfigs)
        .where(and(eq(aiVisibilityConfigs.id, configId), eq(aiVisibilityConfigs.userId, userId)));

      if (!existingConfig) {
        return res.status(404).json({ success: false, error: "Config not found" });
      }

      // Clean domain if provided
      let cleanDomain = updates.brandDomain;
      if (cleanDomain) {
        cleanDomain = cleanDomain.toLowerCase().trim();
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
      }

      const [updatedConfig] = await db
        .update(aiVisibilityConfigs)
        .set({
          ...(updates.name !== undefined && { name: updates.name }),
          ...(updates.brandName !== undefined && { brandName: updates.brandName }),
          ...(cleanDomain && { brandDomain: cleanDomain }),
          ...(updates.alternateNames !== undefined && { alternateNames: updates.alternateNames }),
          ...(updates.platforms !== undefined && { platforms: updates.platforms }),
          ...(updates.isActive !== undefined && { isActive: updates.isActive }),
          updatedAt: new Date(),
        })
        .where(eq(aiVisibilityConfigs.id, configId))
        .returning();

      return res.status(200).json({ success: true, data: updatedConfig });
    } catch (error) {
      console.error("Error updating config:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to update config",
      });
    }
  }

  // DELETE - Delete config
  if (req.method === "DELETE") {
    try {
      // Verify config exists and belongs to user
      const [existingConfig] = await db
        .select()
        .from(aiVisibilityConfigs)
        .where(and(eq(aiVisibilityConfigs.id, configId), eq(aiVisibilityConfigs.userId, userId)));

      if (!existingConfig) {
        return res.status(404).json({ success: false, error: "Config not found" });
      }

      await db
        .delete(aiVisibilityConfigs)
        .where(eq(aiVisibilityConfigs.id, configId));

      return res.status(200).json({
        success: true,
        data: { message: "Config deleted successfully" },
      });
    } catch (error) {
      console.error("Error deleting config:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete config",
      });
    }
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}
