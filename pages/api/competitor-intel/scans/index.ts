// pages/api/competitor-intel/scans/index.ts
// List all scans for a user (optionally filter by competitor)

import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { db, competitorProfiles, competitorScans } from "../../../../lib/db";
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

  const { competitorId, limit = "10" } = req.query;

  try {
    // Get all scans for this user
    const scans = await db
      .select()
      .from(competitorScans)
      .where(eq(competitorScans.userId, userId))
      .orderBy(desc(competitorScans.startedAt))
      .limit(parseInt(limit as string, 10) * 2); // Get more to filter

    // If competitorId is specified, filter scans that include this competitor
    let filteredScans = scans;
    if (competitorId && typeof competitorId === "string") {
      // Verify competitor belongs to user
      const [competitor] = await db
        .select()
        .from(competitorProfiles)
        .where(and(eq(competitorProfiles.id, competitorId), eq(competitorProfiles.userId, userId)));

      if (!competitor) {
        return res.status(404).json({ success: false, error: "Competitor not found" });
      }

      // Filter scans that include this competitorId
      filteredScans = scans.filter((scan) => {
        const ids = scan.competitorIds as string[] | null;
        return ids?.includes(competitorId);
      });
    }

    return res.status(200).json({
      success: true,
      data: filteredScans.slice(0, parseInt(limit as string, 10)),
    });
  } catch (error) {
    console.error("Error fetching scans:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch scans",
    });
  }
}
