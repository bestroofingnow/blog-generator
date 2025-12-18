// pages/api/batch/generate.ts
// Start batch blog generation - adds up to 5 topics to the queue

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { getDailyUsage, addToQueue } from "../../../lib/database";
import { v4 as uuidv4 } from "uuid";

interface BatchGenerateRequest {
  topics: Array<{
    topic: string;
    keywords?: string;
  }>;
  type?: "blog" | "service_page" | "location_page";
}

interface BatchGenerateResponse {
  success: boolean;
  batchId?: string;
  queued?: number;
  queuedIds?: string[];
  error?: string;
  usage?: {
    blogsGenerated: number;
    remaining: number;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BatchGenerateResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const userId = (session.user as { id: string }).id;
  const { topics, type = "blog" } = req.body as BatchGenerateRequest;

  // Validate topics
  if (!topics || !Array.isArray(topics) || topics.length === 0) {
    return res.status(400).json({
      success: false,
      error: "At least one topic is required",
    });
  }

  if (topics.length > 5) {
    return res.status(400).json({
      success: false,
      error: "Maximum 5 topics per batch",
    });
  }

  // Validate each topic
  for (const item of topics) {
    if (!item.topic || typeof item.topic !== "string" || item.topic.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Each topic must have a valid topic string",
      });
    }
  }

  try {
    // Check daily usage limit
    const usage = await getDailyUsage(userId);

    if (!usage.canGenerate) {
      return res.status(429).json({
        success: false,
        error: "Daily limit reached. You can generate more blogs tomorrow.",
        usage: {
          blogsGenerated: usage.blogsGenerated,
          remaining: usage.remaining,
        },
      });
    }

    // Calculate how many we can actually queue
    const maxCanQueue = Math.min(topics.length, usage.remaining);

    if (maxCanQueue < topics.length) {
      // Only queue what's within the limit
      topics.splice(maxCanQueue);
    }

    // Generate a batch ID to group these items
    const batchId = uuidv4();

    // Add topics to queue
    const queueItems = topics.map((item, index) => ({
      type: type as "blog" | "service_page" | "location_page",
      topic: item.topic.trim(),
      keywords: item.keywords || undefined,
      priority: topics.length - index, // Earlier items have higher priority
      batchId,
    }));

    const result = await addToQueue(userId, queueItems);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error?.message || "Failed to add items to queue",
      });
    }

    // Fetch updated usage
    const updatedUsage = await getDailyUsage(userId);

    return res.status(200).json({
      success: true,
      batchId,
      queued: result.insertedIds.length,
      queuedIds: result.insertedIds,
      usage: {
        blogsGenerated: updatedUsage.blogsGenerated,
        remaining: updatedUsage.remaining,
      },
    });
  } catch (error) {
    console.error("Error starting batch generation:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to start batch generation",
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};
