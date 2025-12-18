// pages/api/queue/list.ts
// List queue items for a user with optional filters

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { getQueueItems } from "../../../lib/database";
import type { QueueStatus, GenerationQueueItem } from "../../../lib/db";

interface QueueListResponse {
  success: boolean;
  items?: Array<{
    id: string;
    type: string;
    topic: string;
    keywords: string | null;
    status: string;
    priority: number;
    scheduledFor: Date | null;
    draftId: string | null;
    errorMessage: string | null;
    attempts: number;
    createdAt: Date | null;
    updatedAt: Date | null;
    batchId: string | null;
  }>;
  total?: number;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<QueueListResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const userId = (session.user as { id: string }).id;
  const { status, type, limit } = req.query;

  try {
    // Parse status filter (can be single or comma-separated)
    let statusFilter: QueueStatus | QueueStatus[] | undefined;
    if (status && typeof status === "string") {
      const statuses = status.split(",").map((s) => s.trim() as QueueStatus);
      statusFilter = statuses.length === 1 ? statuses[0] : statuses;
    }

    const items = await getQueueItems(userId, {
      status: statusFilter,
      type: type as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    return res.status(200).json({
      success: true,
      items: items.map((item) => ({
        id: item.id,
        type: item.type,
        topic: item.topic,
        keywords: item.keywords,
        status: item.status || "pending",
        priority: item.priority || 0,
        scheduledFor: item.scheduledFor,
        draftId: item.generatedDraftId,
        errorMessage: item.errorMessage,
        attempts: item.attempts || 0,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        batchId: item.batchId,
      })),
      total: items.length,
    });
  } catch (error) {
    console.error("Error listing queue items:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to list queue items",
    });
  }
}
