// pages/api/ai-visibility/queries/index.ts
// List all queries for a config or create a new one

import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { db, aiVisibilityConfigs, aiVisibilityQueries } from "../../../../lib/db";
import { eq, and, desc } from "drizzle-orm";

interface QueryCreateRequest {
  configId: string;
  queryText: string;
  queryCategory?: string;
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
    const { configId } = req.query;

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

      const queries = await db
        .select()
        .from(aiVisibilityQueries)
        .where(eq(aiVisibilityQueries.configId, configId))
        .orderBy(desc(aiVisibilityQueries.createdAt));

      return res.status(200).json({ success: true, data: queries });
    } catch (error) {
      console.error("Error fetching queries:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch queries",
      });
    }
  }

  if (req.method === "POST") {
    const { configId, queryText, queryCategory }: QueryCreateRequest = req.body;

    if (!configId || !queryText) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: configId and queryText",
      });
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

      const [newQuery] = await db
        .insert(aiVisibilityQueries)
        .values({
          configId,
          userId,
          queryText,
          queryCategory: queryCategory || "general",
          isActive: true,
        })
        .returning();

      return res.status(201).json({ success: true, data: newQuery });
    } catch (error) {
      console.error("Error creating query:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to create query",
      });
    }
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}
