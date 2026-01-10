// pages/api/competitor-intel/competitors/[id].ts
// Get, update, or delete a specific competitor

import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { db, competitorProfiles } from "../../../../lib/db";
import { eq, and } from "drizzle-orm";

interface CompetitorUpdateRequest {
  name?: string;
  domain?: string;
  industry?: string;
  description?: string;
  socialLinks?: Record<string, string>;
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
    return res.status(400).json({ success: false, error: "Missing competitor ID" });
  }
  // Type-safe extraction after guard
  const competitorId = idParam as string;

  // Helper to verify ownership
  async function getCompetitorIfOwned() {
    const [competitor] = await db
      .select()
      .from(competitorProfiles)
      .where(and(eq(competitorProfiles.id, competitorId), eq(competitorProfiles.userId, userId as string)));
    return competitor;
  }

  if (req.method === "GET") {
    try {
      const competitor = await getCompetitorIfOwned();
      if (!competitor) {
        return res.status(404).json({ success: false, error: "Competitor not found" });
      }
      return res.status(200).json({ success: true, data: competitor });
    } catch (error) {
      console.error("Error fetching competitor:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch competitor",
      });
    }
  }

  if (req.method === "PUT" || req.method === "PATCH") {
    try {
      const competitor = await getCompetitorIfOwned();
      if (!competitor) {
        return res.status(404).json({ success: false, error: "Competitor not found" });
      }

      const updates: CompetitorUpdateRequest = req.body;

      // Clean domain if provided
      if (updates.domain) {
        let cleanDomain = updates.domain.toLowerCase().trim();
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
        updates.domain = cleanDomain;
      }

      const [updated] = await db
        .update(competitorProfiles)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(and(eq(competitorProfiles.id, competitorId), eq(competitorProfiles.userId, userId as string)))
        .returning();

      return res.status(200).json({ success: true, data: updated });
    } catch (error) {
      console.error("Error updating competitor:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to update competitor",
      });
    }
  }

  if (req.method === "DELETE") {
    try {
      const competitor = await getCompetitorIfOwned();
      if (!competitor) {
        return res.status(404).json({ success: false, error: "Competitor not found" });
      }

      await db
        .delete(competitorProfiles)
        .where(and(eq(competitorProfiles.id, competitorId), eq(competitorProfiles.userId, userId as string)));

      return res.status(200).json({ success: true, data: { deleted: true } });
    } catch (error) {
      console.error("Error deleting competitor:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete competitor",
      });
    }
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}
