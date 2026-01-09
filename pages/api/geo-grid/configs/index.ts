// pages/api/geo-grid/configs/index.ts
// List and create grid configurations

import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { db, geoGridConfigs } from "../../../../lib/db";
import { eq, desc } from "drizzle-orm";

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
      // List all configs for the user
      const configs = await db
        .select()
        .from(geoGridConfigs)
        .where(eq(geoGridConfigs.userId, userId))
        .orderBy(desc(geoGridConfigs.createdAt));

      return res.status(200).json({ configs });
    }

    if (req.method === "POST") {
      // Create a new config
      const {
        name,
        centerLat,
        centerLng,
        centerCity,
        centerState,
        gridSize,
        radiusMiles,
        targetDomain
      } = req.body;

      // Validation
      if (!name || !centerLat || !centerLng || !gridSize || !radiusMiles || !targetDomain) {
        return res.status(400).json({
          error: "Missing required fields: name, centerLat, centerLng, gridSize, radiusMiles, targetDomain"
        });
      }

      if (![3, 5, 7].includes(gridSize)) {
        return res.status(400).json({ error: "gridSize must be 3, 5, or 7" });
      }

      if (![1, 3, 5, 10, 15, 25].includes(radiusMiles)) {
        return res.status(400).json({ error: "radiusMiles must be 1, 3, 5, 10, 15, or 25" });
      }

      const [config] = await db
        .insert(geoGridConfigs)
        .values({
          userId,
          name,
          centerLat: centerLat.toString(),
          centerLng: centerLng.toString(),
          centerCity,
          centerState,
          gridSize,
          radiusMiles: radiusMiles.toString(),
          targetDomain
        })
        .returning();

      return res.status(201).json({ config });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Geo-grid configs API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
