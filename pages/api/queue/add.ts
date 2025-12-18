// pages/api/queue/add.ts
// Add item(s) to the generation queue

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { getDailyUsage, addToQueue } from "../../../lib/database";

interface AddToQueueRequest {
  type: "blog" | "service_page" | "location_page";
  topic: string;
  keywords?: string;
  priority?: number;
  scheduledFor?: string;
}

interface AddToQueueResponse {
  success: boolean;
  item?: {
    id: string;
    topic: string;
    type: string;
    status: string;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AddToQueueResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const userId = (session.user as { id: string }).id;
  const { type, topic, keywords, priority, scheduledFor } = req.body as AddToQueueRequest;

  // Validate required fields
  if (!type || !["blog", "service_page", "location_page"].includes(type)) {
    return res.status(400).json({
      success: false,
      error: "Invalid type. Must be 'blog', 'service_page', or 'location_page'",
    });
  }

  if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: "Topic is required",
    });
  }

  try {
    // Check daily limit
    const usage = await getDailyUsage(userId);
    if (!usage.canGenerate) {
      return res.status(429).json({
        success: false,
        error: "Daily limit reached. You can generate more blogs tomorrow.",
      });
    }

    // Add to queue
    const result = await addToQueue(userId, [
      {
        type,
        topic: topic.trim(),
        keywords: keywords || undefined,
        priority: priority || 0,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      },
    ]);

    if (!result.success || result.insertedIds.length === 0) {
      return res.status(500).json({
        success: false,
        error: result.error?.message || "Failed to add to queue",
      });
    }

    return res.status(200).json({
      success: true,
      item: {
        id: result.insertedIds[0],
        topic: topic.trim(),
        type,
        status: "pending",
      },
    });
  } catch (error) {
    console.error("Error adding to queue:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to add to queue",
    });
  }
}
