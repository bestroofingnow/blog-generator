// pages/api/geo-grid/scans/[id].ts
// Get scan details with results

import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { db, geoGridScans, geoGridRankSnapshots, geoGridKeywords } from "../../../../lib/db";
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
  const scanId = req.query.id as string;

  if (!scanId) {
    return res.status(400).json({ error: "Scan ID required" });
  }

  try {
    if (req.method === "GET") {
      // Get scan with ownership check
      const [scan] = await db
        .select()
        .from(geoGridScans)
        .where(
          and(
            eq(geoGridScans.id, scanId),
            eq(geoGridScans.userId, userId)
          )
        );

      if (!scan) {
        return res.status(404).json({ error: "Scan not found" });
      }

      // Get all rank snapshots for this scan
      const snapshots = await db
        .select({
          snapshot: geoGridRankSnapshots,
          keyword: geoGridKeywords.keyword
        })
        .from(geoGridRankSnapshots)
        .leftJoin(geoGridKeywords, eq(geoGridRankSnapshots.keywordId, geoGridKeywords.id))
        .where(eq(geoGridRankSnapshots.scanId, scanId));

      // Group snapshots by keyword
      const resultsByKeyword: Record<string, {
        keywordId: string;
        keyword: string;
        points: Array<{
          row: number;
          col: number;
          lat: number;
          lng: number;
          rankPosition: number | null;
          serpUrl: string | null;
          serpTitle: string | null;
          localPackPosition: number | null;
          isInLocalPack: boolean;
          topCompetitors: unknown;
          serpFeatures: unknown;
        }>;
      }> = {};

      for (const { snapshot, keyword } of snapshots) {
        const keywordId = snapshot.keywordId;

        if (!resultsByKeyword[keywordId]) {
          resultsByKeyword[keywordId] = {
            keywordId,
            keyword: keyword || "Unknown",
            points: []
          };
        }

        resultsByKeyword[keywordId].points.push({
          row: snapshot.gridRow,
          col: snapshot.gridCol,
          lat: parseFloat(snapshot.pointLat as string),
          lng: parseFloat(snapshot.pointLng as string),
          rankPosition: snapshot.rankPosition,
          serpUrl: snapshot.serpUrl,
          serpTitle: snapshot.serpTitle,
          localPackPosition: snapshot.localPackPosition,
          isInLocalPack: snapshot.isInLocalPack || false,
          topCompetitors: snapshot.top3Competitors,
          serpFeatures: snapshot.serpFeatures
        });
      }

      return res.status(200).json({
        scan,
        results: Object.values(resultsByKeyword)
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Geo-grid scan API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
