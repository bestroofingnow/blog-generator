// pages/api/content/backfill.ts
// Backfills published content history from existing published drafts

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { backfillPublishedContent } from "../../../lib/database";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Auth check
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const userId = (session.user as { id?: string }).id || session.user?.email || "";
  if (!userId) {
    return res.status(401).json({ success: false, error: "User ID not found" });
  }

  try {
    const result = await backfillPublishedContent(userId);

    if (!result.success) {
      console.error("[backfill] Failed:", result.error);
      return res.status(500).json({ success: false, error: result.error?.message || "Backfill failed" });
    }

    console.log(`[backfill] Backfilled ${result.count} published content records for user ${userId}`);

    return res.status(200).json({
      success: true,
      count: result.count,
      message: `Successfully backfilled ${result.count} published content records`,
    });
  } catch (error) {
    console.error("[backfill] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
