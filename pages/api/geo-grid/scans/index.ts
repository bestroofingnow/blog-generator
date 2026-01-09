// pages/api/geo-grid/scans/index.ts
// List scan history and initiate new scans

import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { db, geoGridScans, geoGridConfigs, geoGridKeywords } from "../../../../lib/db";
import { eq, and, desc, count } from "drizzle-orm";
import { getISOWeek, getGridPointCount } from "../../../../lib/geo-grid";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = session.user.id;

  try {
    if (req.method === "GET") {
      // List scans for a config
      const configId = req.query.configId as string;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!configId) {
        return res.status(400).json({ error: "configId query parameter required" });
      }

      // Verify config ownership
      const [config] = await db
        .select()
        .from(geoGridConfigs)
        .where(
          and(
            eq(geoGridConfigs.id, configId),
            eq(geoGridConfigs.userId, userId)
          )
        );

      if (!config) {
        return res.status(404).json({ error: "Config not found" });
      }

      const scans = await db
        .select()
        .from(geoGridScans)
        .where(eq(geoGridScans.configId, configId))
        .orderBy(desc(geoGridScans.createdAt))
        .limit(limit);

      return res.status(200).json({ scans });
    }

    if (req.method === "POST") {
      // Create a new scan record (pending status)
      const { configId } = req.body;

      if (!configId) {
        return res.status(400).json({ error: "configId required" });
      }

      // Get config and verify ownership
      const [config] = await db
        .select()
        .from(geoGridConfigs)
        .where(
          and(
            eq(geoGridConfigs.id, configId),
            eq(geoGridConfigs.userId, userId)
          )
        );

      if (!config) {
        return res.status(404).json({ error: "Config not found" });
      }

      // Check if there's already a running scan for this config
      const [runningScan] = await db
        .select()
        .from(geoGridScans)
        .where(
          and(
            eq(geoGridScans.configId, configId),
            eq(geoGridScans.status, "running")
          )
        );

      if (runningScan) {
        return res.status(409).json({
          error: "A scan is already running for this configuration",
          scanId: runningScan.id
        });
      }

      // Check there are keywords to scan
      const [keywordCount] = await db
        .select({ count: count() })
        .from(geoGridKeywords)
        .where(
          and(
            eq(geoGridKeywords.configId, configId),
            eq(geoGridKeywords.isActive, true)
          )
        );

      if (!keywordCount?.count || keywordCount.count === 0) {
        return res.status(400).json({ error: "No active keywords to scan" });
      }

      // Get current week info
      const { weekNumber, year } = getISOWeek();
      const totalPoints = getGridPointCount(config.gridSize as 3 | 5 | 7);

      // Create scan record
      const [scan] = await db
        .insert(geoGridScans)
        .values({
          configId,
          userId,
          status: "pending",
          gridSize: config.gridSize,
          radiusMiles: config.radiusMiles,
          centerLat: config.centerLat,
          centerLng: config.centerLng,
          totalPoints,
          weekNumber,
          year
        })
        .returning();

      return res.status(201).json({
        scan,
        totalPoints,
        keywordCount: keywordCount.count
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Geo-grid scans API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
