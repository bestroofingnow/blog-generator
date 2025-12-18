// pages/api/usage/increment.ts
// Increment daily usage count after successful blog generation

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { incrementDailyUsage } from "../../../lib/database";

interface IncrementResponse {
  success: boolean;
  newCount?: number;
  remaining?: number;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IncrementResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const userId = (session.user as { id: string }).id;
  const { count = 1 } = req.body;

  // Validate count
  if (typeof count !== "number" || count < 1 || count > 5) {
    return res.status(400).json({
      success: false,
      error: "Invalid count. Must be between 1 and 5.",
    });
  }

  try {
    const result = await incrementDailyUsage(userId, count);

    if (!result.success) {
      return res.status(429).json({
        success: false,
        error: "Daily limit exceeded. You can generate more blogs tomorrow.",
        newCount: result.newCount,
        remaining: result.remaining,
      });
    }

    return res.status(200).json({
      success: true,
      newCount: result.newCount,
      remaining: result.remaining,
    });
  } catch (error) {
    console.error("Error incrementing usage:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to update usage",
    });
  }
}
