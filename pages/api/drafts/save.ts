// pages/api/drafts/save.ts
// Save a generated blog to the drafts table for deduplication and history

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { saveDraft } from "../../../lib/database";

interface SaveDraftRequest {
  title: string;
  type: string;
  slug?: string;
  content?: string;
  seoData?: {
    primaryKeyword?: string;
    secondaryKeywords?: string[];
    metaTitle?: string;
    metaDescription?: string;
  };
  status?: "draft" | "ready" | "published";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Auth check
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const userId = (session.user as { id?: string }).id || session.user?.email || "";
  if (!userId) {
    return res.status(401).json({ success: false, error: "User ID not found" });
  }

  try {
    const {
      title,
      type,
      slug,
      content,
      seoData,
      status = "draft",
    } = req.body as SaveDraftRequest;

    if (!title) {
      return res.status(400).json({ success: false, error: "Title is required" });
    }

    console.log(`[drafts/save] Saving draft for user ${userId}: "${title}"`);

    const result = await saveDraft(userId, {
      title,
      type: type || "blog_post",
      slug,
      content,
      seoData,
      status,
    });

    if (result.error) {
      console.error("[drafts/save] Error saving draft:", result.error);
      return res.status(500).json({ success: false, error: result.error.message });
    }

    console.log(`[drafts/save] Draft saved with ID: ${result.id}`);

    return res.status(200).json({
      success: true,
      id: result.id,
      message: "Draft saved successfully",
    });
  } catch (error) {
    console.error("[drafts/save] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
