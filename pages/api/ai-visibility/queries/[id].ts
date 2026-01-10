// pages/api/ai-visibility/queries/[id].ts
// Get, update, or delete a specific tracking query

import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { db, aiVisibilityQueries } from "../../../../lib/db";
import { eq, and } from "drizzle-orm";

interface QueryUpdateRequest {
  queryText?: string;
  queryCategory?: string;
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
    return res.status(400).json({ success: false, error: "Missing query id" });
  }
  const queryId = idParam as string;

  // GET - Get query details
  if (req.method === "GET") {
    try {
      const [query] = await db
        .select()
        .from(aiVisibilityQueries)
        .where(and(eq(aiVisibilityQueries.id, queryId), eq(aiVisibilityQueries.userId, userId)));

      if (!query) {
        return res.status(404).json({ success: false, error: "Query not found" });
      }

      return res.status(200).json({ success: true, data: query });
    } catch (error) {
      console.error("Error fetching query:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch query",
      });
    }
  }

  // PUT - Update query
  if (req.method === "PUT") {
    const updates: QueryUpdateRequest = req.body;

    try {
      // Verify query exists and belongs to user
      const [existingQuery] = await db
        .select()
        .from(aiVisibilityQueries)
        .where(and(eq(aiVisibilityQueries.id, queryId), eq(aiVisibilityQueries.userId, userId)));

      if (!existingQuery) {
        return res.status(404).json({ success: false, error: "Query not found" });
      }

      const [updatedQuery] = await db
        .update(aiVisibilityQueries)
        .set({
          ...(updates.queryText !== undefined && { queryText: updates.queryText }),
          ...(updates.queryCategory !== undefined && { queryCategory: updates.queryCategory }),
          ...(updates.isActive !== undefined && { isActive: updates.isActive }),
        })
        .where(eq(aiVisibilityQueries.id, queryId))
        .returning();

      return res.status(200).json({ success: true, data: updatedQuery });
    } catch (error) {
      console.error("Error updating query:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to update query",
      });
    }
  }

  // DELETE - Delete query
  if (req.method === "DELETE") {
    try {
      // Verify query exists and belongs to user
      const [existingQuery] = await db
        .select()
        .from(aiVisibilityQueries)
        .where(and(eq(aiVisibilityQueries.id, queryId), eq(aiVisibilityQueries.userId, userId)));

      if (!existingQuery) {
        return res.status(404).json({ success: false, error: "Query not found" });
      }

      await db
        .delete(aiVisibilityQueries)
        .where(eq(aiVisibilityQueries.id, queryId));

      return res.status(200).json({
        success: true,
        data: { message: "Query deleted successfully" },
      });
    } catch (error) {
      console.error("Error deleting query:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete query",
      });
    }
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}
