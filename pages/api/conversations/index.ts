// pages/api/conversations/index.ts
// List and create conversations

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import {
  createConversation,
  getUserConversations,
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

  if (req.method === "GET") {
    // List conversations
    try {
      const { status, limit, offset } = req.query;

      const conversations = await getUserConversations(userId, {
        status: status === "archived" ? "archived" : status === "active" ? "active" : undefined,
        limit: limit ? parseInt(limit as string, 10) : 50,
        offset: offset ? parseInt(offset as string, 10) : 0,
      });

      return res.status(200).json({
        success: true,
        conversations: conversations.map((c) => ({
          id: c.id,
          title: c.title,
          status: c.status,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
      });
    } catch (error) {
      console.error("[Conversations] List error:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to list conversations",
      });
    }
  }

  if (req.method === "POST") {
    // Create new conversation
    try {
      const { title } = req.body;

      const result = await createConversation(userId, { title });

      if (!result.success) {
        return res.status(500).json({ error: "Failed to create conversation" });
      }

      return res.status(201).json({
        success: true,
        conversationId: result.conversationId,
      });
    } catch (error) {
      console.error("[Conversations] Create error:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to create conversation",
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
