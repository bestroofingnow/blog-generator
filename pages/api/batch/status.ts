// pages/api/batch/status.ts
// Get status of a batch generation

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { getQueueItems } from "../../../lib/database";

interface BatchStatusResponse {
  success: boolean;
  batchId?: string;
  total?: number;
  completed?: number;
  failed?: number;
  pending?: number;
  generating?: number;
  items?: Array<{
    id: string;
    topic: string;
    status: string;
    draftId?: string;
    errorMessage?: string;
  }>;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BatchStatusResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const userId = (session.user as { id: string }).id;
  const { batchId } = req.query;

  if (!batchId || typeof batchId !== "string") {
    return res.status(400).json({
      success: false,
      error: "Batch ID is required",
    });
  }

  try {
    const items = await getQueueItems(userId, { batchId });

    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Batch not found",
      });
    }

    const total = items.length;
    const completed = items.filter((i) => i.status === "generated" || i.status === "scheduled" || i.status === "published").length;
    const failed = items.filter((i) => i.status === "failed").length;
    const pending = items.filter((i) => i.status === "pending").length;
    const generating = items.filter((i) => i.status === "generating").length;

    return res.status(200).json({
      success: true,
      batchId,
      total,
      completed,
      failed,
      pending,
      generating,
      items: items.map((item) => ({
        id: item.id,
        topic: item.topic,
        status: item.status || "pending",
        draftId: item.generatedDraftId || undefined,
        errorMessage: item.errorMessage || undefined,
      })),
    });
  } catch (error) {
    console.error("Error getting batch status:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get batch status",
    });
  }
}
