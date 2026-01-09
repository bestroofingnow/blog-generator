// pages/api/geo-grid/configs/[id].ts
// Get, update, or delete a single grid configuration

import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { db, geoGridConfigs, geoGridKeywords, geoGridScans } from "../../../../lib/db";
import { eq, and, count } from "drizzle-orm";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = session.user.id;
  const configId = req.query.id as string;

  if (!configId) {
    return res.status(400).json({ error: "Config ID required" });
  }

  try {
    // Verify ownership
    const [existing] = await db
      .select()
      .from(geoGridConfigs)
      .where(
        and(
          eq(geoGridConfigs.id, configId),
          eq(geoGridConfigs.userId, userId)
        )
      );

    if (!existing) {
      return res.status(404).json({ error: "Config not found" });
    }

    if (req.method === "GET") {
      // Get config with keyword count and last scan
      const [keywordCount] = await db
        .select({ count: count() })
        .from(geoGridKeywords)
        .where(eq(geoGridKeywords.configId, configId));

      const [lastScan] = await db
        .select()
        .from(geoGridScans)
        .where(eq(geoGridScans.configId, configId))
        .orderBy(geoGridScans.createdAt);

      return res.status(200).json({
        config: existing,
        keywordCount: keywordCount?.count || 0,
        lastScan: lastScan || null
      });
    }

    if (req.method === "PUT") {
      // Update config
      const {
        name,
        centerLat,
        centerLng,
        centerCity,
        centerState,
        gridSize,
        radiusMiles,
        targetDomain,
        isActive
      } = req.body;

      // Build update object with only provided fields
      const updates: Record<string, unknown> = { updatedAt: new Date() };

      if (name !== undefined) updates.name = name;
      if (centerLat !== undefined) updates.centerLat = centerLat.toString();
      if (centerLng !== undefined) updates.centerLng = centerLng.toString();
      if (centerCity !== undefined) updates.centerCity = centerCity;
      if (centerState !== undefined) updates.centerState = centerState;
      if (targetDomain !== undefined) updates.targetDomain = targetDomain;
      if (isActive !== undefined) updates.isActive = isActive;

      if (gridSize !== undefined) {
        if (![3, 5, 7].includes(gridSize)) {
          return res.status(400).json({ error: "gridSize must be 3, 5, or 7" });
        }
        updates.gridSize = gridSize;
      }

      if (radiusMiles !== undefined) {
        if (![1, 3, 5, 10, 15, 25].includes(radiusMiles)) {
          return res.status(400).json({ error: "radiusMiles must be 1, 3, 5, 10, 15, or 25" });
        }
        updates.radiusMiles = radiusMiles.toString();
      }

      const [updated] = await db
        .update(geoGridConfigs)
        .set(updates)
        .where(eq(geoGridConfigs.id, configId))
        .returning();

      return res.status(200).json({ config: updated });
    }

    if (req.method === "DELETE") {
      // Delete config (cascades to keywords, scans, snapshots)
      await db
        .delete(geoGridConfigs)
        .where(eq(geoGridConfigs.id, configId));

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Geo-grid config API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
