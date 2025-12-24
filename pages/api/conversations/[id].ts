// pages/api/conversations/[id].ts
// Get, update, or delete a specific conversation

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import {
  getConversation,
  updateConversation,
  deleteConversation,
  getConversationMessages,
} from "../../../lib/database";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Authenticate
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = (session.user as { id?: string }).id || session.user?.email || "";
  const { id: conversationId } = req.query;

  if (!conversationId || typeof conversationId !== "string") {
    return res.status(400).json({ error: "Conversation ID is required" });
  }

  if (req.method === "GET") {
    // Get conversation with messages
    try {
      const conversation = await getConversation(userId, conversationId);

      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Get messages with optional pagination
      const { limit, beforeId } = req.query;
      const messages = await getConversationMessages(userId, conversationId, {
        limit: limit ? parseInt(limit as string, 10) : 50,
        beforeId: beforeId as string | undefined,
      });

      return res.status(200).json({
        success: true,
        conversation: {
          id: conversation.id,
          title: conversation.title,
          status: conversation.status,
          metadata: conversation.metadata,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        },
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          metadata: m.metadata,
          createdAt: m.createdAt,
        })),
      });
    } catch (error) {
      console.error("[Conversation] Get error:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get conversation",
      });
    }
  }

  if (req.method === "PATCH") {
    // Update conversation (title, status)
    try {
      const { title, status } = req.body;

      const updates: { title?: string; status?: "active" | "archived" } = {};
      if (title !== undefined) updates.title = title;
      if (status !== undefined) updates.status = status;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No updates provided" });
      }

      const result = await updateConversation(userId, conversationId, updates);

      if (!result.success) {
        return res.status(500).json({ error: "Failed to update conversation" });
      }

      return res.status(200).json({
        success: true,
        message: "Conversation updated",
      });
    } catch (error) {
      console.error("[Conversation] Update error:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to update conversation",
      });
    }
  }

  if (req.method === "DELETE") {
    // Delete conversation
    try {
      const result = await deleteConversation(userId, conversationId);

      if (!result.success) {
        return res.status(500).json({ error: "Failed to delete conversation" });
      }

      return res.status(200).json({
        success: true,
        message: "Conversation deleted",
      });
    } catch (error) {
      console.error("[Conversation] Delete error:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to delete conversation",
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
