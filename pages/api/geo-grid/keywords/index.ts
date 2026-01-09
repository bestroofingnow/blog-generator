// pages/api/geo-grid/keywords/index.ts
// List and add keywords for a grid configuration

import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { db, geoGridKeywords, geoGridConfigs } from "../../../../lib/db";
import { eq, and, desc } from "drizzle-orm";

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
      // Get keywords for a config
      const configId = req.query.configId as string;

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

      const keywords = await db
        .select()
        .from(geoGridKeywords)
        .where(eq(geoGridKeywords.configId, configId))
        .orderBy(desc(geoGridKeywords.createdAt));

      return res.status(200).json({ keywords });
    }

    if (req.method === "POST") {
      // Add keyword(s) to a config
      const { configId, keyword, keywords: keywordList } = req.body;

      if (!configId) {
        return res.status(400).json({ error: "configId required" });
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

      // Handle single keyword or array of keywords
      const keywordsToAdd: string[] = keywordList || (keyword ? [keyword] : []);

      if (keywordsToAdd.length === 0) {
        return res.status(400).json({ error: "At least one keyword required" });
      }

      // Filter empty strings and trim
      const cleanedKeywords = keywordsToAdd
        .map((k: string) => k.trim())
        .filter((k: string) => k.length > 0);

      if (cleanedKeywords.length === 0) {
        return res.status(400).json({ error: "At least one valid keyword required" });
      }

      // Insert keywords (ignore duplicates)
      const insertedKeywords = [];
      const skippedKeywords = [];

      for (const kw of cleanedKeywords) {
        try {
          const [inserted] = await db
            .insert(geoGridKeywords)
            .values({
              configId,
              userId,
              keyword: kw
            })
            .returning();

          insertedKeywords.push(inserted);
        } catch (error: unknown) {
          // Skip duplicates (unique constraint violation)
          if ((error as { code?: string }).code === "23505") {
            skippedKeywords.push(kw);
          } else {
            throw error;
          }
        }
      }

      return res.status(201).json({
        keywords: insertedKeywords,
        skipped: skippedKeywords
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Geo-grid keywords API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
