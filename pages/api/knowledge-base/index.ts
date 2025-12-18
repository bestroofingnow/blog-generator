// pages/api/knowledge-base/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { db, knowledgeBase, knowledgeBaseHistory, eq, desc } from "../../../lib/db";
import { and } from "drizzle-orm";

export type KnowledgeBaseCategory =
  | "services"
  | "usps"
  | "facts"
  | "locations"
  | "certifications"
  | "team"
  | "faqs"
  | "testimonials"
  | "custom";

interface KnowledgeBaseResponse {
  success: boolean;
  entries?: Array<{
    id: string;
    category: string;
    title: string;
    content: string;
    tags: string[];
    isAiGenerated: boolean;
    isVerified: boolean;
    priority: number;
    usageCount: number;
    createdAt: string;
    updatedAt: string;
  }>;
  entry?: {
    id: string;
    category: string;
    title: string;
    content: string;
    tags: string[];
    isAiGenerated: boolean;
    isVerified: boolean;
    priority: number;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<KnowledgeBaseResponse>
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const userId = (session.user as { id: string }).id;

  try {
    switch (req.method) {
      case "GET": {
        // Get all entries, optionally filtered by category
        const { category } = req.query;

        let entries;
        if (category && typeof category === "string") {
          entries = await db
            .select()
            .from(knowledgeBase)
            .where(
              and(
                eq(knowledgeBase.userId, userId),
                eq(knowledgeBase.category, category)
              )
            )
            .orderBy(desc(knowledgeBase.priority), desc(knowledgeBase.updatedAt));
        } else {
          entries = await db
            .select()
            .from(knowledgeBase)
            .where(eq(knowledgeBase.userId, userId))
            .orderBy(desc(knowledgeBase.priority), desc(knowledgeBase.updatedAt));
        }

        return res.status(200).json({
          success: true,
          entries: entries.map((e) => ({
            id: e.id,
            category: e.category,
            title: e.title,
            content: e.content,
            tags: (e.tags as string[]) || [],
            isAiGenerated: e.isAiGenerated || false,
            isVerified: e.isVerified || false,
            priority: e.priority || 0,
            usageCount: e.usageCount || 0,
            createdAt: e.createdAt?.toISOString() || "",
            updatedAt: e.updatedAt?.toISOString() || "",
          })),
        });
      }

      case "POST": {
        // Create a new entry
        const { category, title, content, tags, isAiGenerated, priority } = req.body;

        if (!category || !title || !content) {
          return res.status(400).json({
            success: false,
            error: "Missing required fields: category, title, content",
          });
        }

        const [newEntry] = await db
          .insert(knowledgeBase)
          .values({
            userId,
            category,
            title,
            content,
            tags: tags || [],
            isAiGenerated: isAiGenerated || false,
            isVerified: !isAiGenerated, // Auto-verify user-created entries
            priority: priority || 0,
          })
          .returning();

        // Log to history
        await db.insert(knowledgeBaseHistory).values({
          entryId: newEntry.id,
          userId,
          action: "created",
          newContent: content,
          changeSource: isAiGenerated ? "ai_research" : "user",
        });

        return res.status(201).json({
          success: true,
          entry: {
            id: newEntry.id,
            category: newEntry.category,
            title: newEntry.title,
            content: newEntry.content,
            tags: (newEntry.tags as string[]) || [],
            isAiGenerated: newEntry.isAiGenerated || false,
            isVerified: newEntry.isVerified || false,
            priority: newEntry.priority || 0,
          },
        });
      }

      case "PUT": {
        // Update an existing entry
        const { id, category, title, content, tags, isVerified, priority } = req.body;

        if (!id) {
          return res.status(400).json({
            success: false,
            error: "Missing required field: id",
          });
        }

        // Get existing entry for history
        const [existing] = await db
          .select()
          .from(knowledgeBase)
          .where(and(eq(knowledgeBase.id, id), eq(knowledgeBase.userId, userId)));

        if (!existing) {
          return res.status(404).json({
            success: false,
            error: "Entry not found",
          });
        }

        // Build update object with only provided fields
        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        if (category !== undefined) updateData.category = category;
        if (title !== undefined) updateData.title = title;
        if (content !== undefined) updateData.content = content;
        if (tags !== undefined) updateData.tags = tags;
        if (isVerified !== undefined) updateData.isVerified = isVerified;
        if (priority !== undefined) updateData.priority = priority;

        const [updatedEntry] = await db
          .update(knowledgeBase)
          .set(updateData)
          .where(and(eq(knowledgeBase.id, id), eq(knowledgeBase.userId, userId)))
          .returning();

        // Log to history
        await db.insert(knowledgeBaseHistory).values({
          entryId: id,
          userId,
          action: isVerified && !existing.isVerified ? "verified" : "updated",
          previousContent: existing.content,
          newContent: content || existing.content,
          changeSource: "user",
        });

        return res.status(200).json({
          success: true,
          entry: {
            id: updatedEntry.id,
            category: updatedEntry.category,
            title: updatedEntry.title,
            content: updatedEntry.content,
            tags: (updatedEntry.tags as string[]) || [],
            isAiGenerated: updatedEntry.isAiGenerated || false,
            isVerified: updatedEntry.isVerified || false,
            priority: updatedEntry.priority || 0,
          },
        });
      }

      case "DELETE": {
        // Delete an entry
        const { id } = req.query;

        if (!id || typeof id !== "string") {
          return res.status(400).json({
            success: false,
            error: "Missing required query parameter: id",
          });
        }

        // Get existing entry for history
        const [existing] = await db
          .select()
          .from(knowledgeBase)
          .where(and(eq(knowledgeBase.id, id), eq(knowledgeBase.userId, userId)));

        if (!existing) {
          return res.status(404).json({
            success: false,
            error: "Entry not found",
          });
        }

        // Log deletion to history before deleting
        await db.insert(knowledgeBaseHistory).values({
          entryId: id,
          userId,
          action: "deleted",
          previousContent: existing.content,
          changeSource: "user",
        });

        // Delete the entry (history will cascade delete)
        await db
          .delete(knowledgeBase)
          .where(and(eq(knowledgeBase.id, id), eq(knowledgeBase.userId, userId)));

        return res.status(200).json({ success: true });
      }

      default:
        res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
        return res.status(405).json({
          success: false,
          error: `Method ${req.method} not allowed`,
        });
    }
  } catch (error) {
    console.error("Knowledge Base API error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
