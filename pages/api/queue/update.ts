// pages/api/queue/update.ts
// Update a queue item (status, priority, schedule, cancel, retry)

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { updateQueueItem, deleteQueueItem, getQueueItems } from "../../../lib/database";
import type { QueueStatus } from "../../../lib/db";

interface UpdateQueueRequest {
  id: string;
  action?: "cancel" | "retry" | "update";
  status?: QueueStatus;
  priority?: number;
  scheduledFor?: string | null;
}

interface UpdateQueueResponse {
  success: boolean;
  item?: {
    id: string;
    status: string;
    priority?: number;
    scheduledFor?: Date | null;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UpdateQueueResponse>
) {
  if (req.method !== "PATCH" && req.method !== "DELETE") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const userId = (session.user as { id: string }).id;

  // Handle DELETE - remove from queue
  if (req.method === "DELETE") {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        success: false,
        error: "Item ID is required",
      });
    }

    try {
      const result = await deleteQueueItem(userId, id);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error?.message || "Failed to delete item",
        });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting queue item:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete item",
      });
    }
  }

  // Handle PATCH - update item
  const { id, action, status, priority, scheduledFor } = req.body as UpdateQueueRequest;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: "Item ID is required",
    });
  }

  try {
    // Handle special actions
    if (action === "cancel") {
      const result = await updateQueueItem(userId, id, {
        status: "failed",
        errorMessage: "Cancelled by user",
      });

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error?.message || "Failed to cancel item",
        });
      }

      return res.status(200).json({
        success: true,
        item: { id, status: "failed" },
      });
    }

    if (action === "retry") {
      // Reset status to pending and clear error
      const result = await updateQueueItem(userId, id, {
        status: "pending",
        errorMessage: "",
        attempts: 0,
      });

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error?.message || "Failed to retry item",
        });
      }

      return res.status(200).json({
        success: true,
        item: { id, status: "pending" },
      });
    }

    // Build update object
    const updates: {
      status?: QueueStatus;
      priority?: number;
      scheduledFor?: Date | null;
    } = {};

    if (status !== undefined) {
      // Validate status
      const validStatuses: QueueStatus[] = ["pending", "generating", "generated", "scheduled", "published", "failed"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: "Invalid status",
        });
      }
      updates.status = status;
    }

    if (priority !== undefined) {
      if (typeof priority !== "number" || priority < 0) {
        return res.status(400).json({
          success: false,
          error: "Invalid priority. Must be a non-negative number.",
        });
      }
      updates.priority = priority;
    }

    if (scheduledFor !== undefined) {
      updates.scheduledFor = scheduledFor ? new Date(scheduledFor) : null;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No updates provided",
      });
    }

    const result = await updateQueueItem(userId, id, updates);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error?.message || "Failed to update item",
      });
    }

    return res.status(200).json({
      success: true,
      item: {
        id,
        status: updates.status || "pending",
        priority: updates.priority,
        scheduledFor: updates.scheduledFor,
      },
    });
  } catch (error) {
    console.error("Error updating queue item:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to update item",
    });
  }
}
