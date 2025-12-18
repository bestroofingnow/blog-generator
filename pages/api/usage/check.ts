// pages/api/usage/check.ts
// Check current daily usage limits

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { getDailyUsage } from "../../../lib/database";

interface UsageResponse {
  success: boolean;
  date?: string;
  blogsGenerated?: number;
  limit?: number;
  remaining?: number;
  canGenerate?: boolean;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UsageResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const userId = (session.user as { id: string }).id;

  try {
    const usage = await getDailyUsage(userId);

    return res.status(200).json({
      success: true,
      date: usage.date,
      blogsGenerated: usage.blogsGenerated,
      limit: usage.limit,
      remaining: usage.remaining,
      canGenerate: usage.canGenerate,
    });
  } catch (error) {
    console.error("Error checking usage:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to check usage",
    });
  }
}
