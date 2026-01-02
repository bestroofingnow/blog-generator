// pages/api/setup/create-published-content-table.ts
// One-time setup endpoint to create the published_content table

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { sql } from "@vercel/postgres";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Auth check - only authenticated users can run this
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  try {
    // Create the published_content table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS published_content (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        draft_id UUID,
        title TEXT NOT NULL,
        primary_keyword TEXT,
        secondary_keywords JSONB,
        topic TEXT,
        blog_type TEXT,
        featured_image_url TEXT,
        featured_image_alt TEXT,
        published_url TEXT,
        published_platform TEXT,
        published_at TIMESTAMP DEFAULT NOW(),
        word_count INTEGER,
        location TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create index for faster lookups by user_id
    await sql`
      CREATE INDEX IF NOT EXISTS idx_published_content_user_id
      ON published_content(user_id)
    `;

    console.log("[Setup] Created published_content table successfully");

    return res.status(200).json({
      success: true,
      message: "published_content table created successfully",
    });
  } catch (error) {
    console.error("[Setup] Error creating table:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
