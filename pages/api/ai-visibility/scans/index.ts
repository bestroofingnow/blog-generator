// pages/api/ai-visibility/scans/index.ts
// List all scans for a config

import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { db, aiVisibilityConfigs, aiVisibilityScans } from "../../../../lib/db";
import { eq, and, desc } from "drizzle-orm";

interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // Auth check
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return res.status(401).json({ success: false, error: "User ID not found" });
  }

  const { configId, limit = "10" } = req.query;

  if (!configId || typeof configId !== "string") {
    return res.status(400).json({ success: false, error: "Missing configId" });
  }

  try {
    // Verify config belongs to user
    const [config] = await db
      .select()
      .from(aiVisibilityConfigs)
      .where(and(eq(aiVisibilityConfigs.id, configId), eq(aiVisibilityConfigs.userId, userId)));

    if (!config) {
      return res.status(404).json({ success: false, error: "Config not found" });
    }

    const scans = await db
      .select()
      .from(aiVisibilityScans)
      .where(eq(aiVisibilityScans.configId, configId))
      .orderBy(desc(aiVisibilityScans.startedAt))
      .limit(parseInt(limit as string, 10));

    return res.status(200).json({ success: true, data: scans });
  } catch (error) {
    console.error("Error fetching scans:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch scans",
    });
  }
}
