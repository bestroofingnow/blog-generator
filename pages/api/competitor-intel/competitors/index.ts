// pages/api/competitor-intel/competitors/index.ts
// List all competitors or create a new one

import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { db, competitorProfiles } from "../../../../lib/db";
import { eq, desc } from "drizzle-orm";

interface CompetitorCreateRequest {
  name: string;
  domain: string;
  industry?: string;
  description?: string;
  competitorType?: string;
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

  if (req.method === "GET") {
    // List all competitors for this user
    try {
      const competitors = await db
        .select()
        .from(competitorProfiles)
        .where(eq(competitorProfiles.userId, userId))
        .orderBy(desc(competitorProfiles.createdAt));

      return res.status(200).json({ success: true, data: competitors });
    } catch (error) {
      console.error("Error fetching competitors:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch competitors",
      });
    }
  }

  if (req.method === "POST") {
    // Create new competitor
    const { name, domain, industry, description, competitorType, socialLinks }: CompetitorCreateRequest = req.body;

    if (!name || !domain) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name and domain",
      });
    }

    // Validate and clean domain
    let cleanDomain = domain.toLowerCase().trim();
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

    try {
      const [competitor] = await db
        .insert(competitorProfiles)
        .values({
          userId,
          name,
          domain: cleanDomain,
          industry: industry || null,
          description: description || null,
          competitorType: competitorType || "direct",
          socialLinks: socialLinks || {},
        })
        .returning();

      return res.status(201).json({ success: true, data: competitor });
    } catch (error) {
      console.error("Error creating competitor:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to create competitor",
      });
    }
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}
