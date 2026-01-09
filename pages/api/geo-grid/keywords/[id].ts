// pages/api/geo-grid/keywords/[id].ts
// Update or delete a single keyword

import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { db, geoGridKeywords } from "../../../../lib/db";
import { eq, and } from "drizzle-orm";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = session.user.id;
  const keywordId = req.query.id as string;

  if (!keywordId) {
    return res.status(400).json({ error: "Keyword ID required" });
  }

  try {
    // Verify ownership
    const [existing] = await db
      .select()
      .from(geoGridKeywords)
      .where(
        and(
          eq(geoGridKeywords.id, keywordId),
          eq(geoGridKeywords.userId, userId)
        )
      );

    if (!existing) {
      return res.status(404).json({ error: "Keyword not found" });
    }

    if (req.method === "PUT") {
      // Update keyword
      const { keyword, isActive } = req.body;

      const updates: Record<string, unknown> = { updatedAt: new Date() };

      if (keyword !== undefined) {
        const cleanedKeyword = keyword.trim();
        if (cleanedKeyword.length === 0) {
          return res.status(400).json({ error: "Keyword cannot be empty" });
        }
        updates.keyword = cleanedKeyword;
      }

      if (isActive !== undefined) {
        updates.isActive = isActive;
      }

      const [updated] = await db
        .update(geoGridKeywords)
        .set(updates)
        .where(eq(geoGridKeywords.id, keywordId))
        .returning();

      return res.status(200).json({ keyword: updated });
    }

    if (req.method === "DELETE") {
      // Delete keyword (cascades to rank snapshots)
      await db
        .delete(geoGridKeywords)
        .where(eq(geoGridKeywords.id, keywordId));

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Geo-grid keyword API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
