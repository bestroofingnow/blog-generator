// pages/api/content/record-publish.ts
// Records published content for topic deduplication and history tracking

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { recordPublishedContent, loadImagesForDraft } from "../../../lib/database";
import { db, drafts, eq, and } from "../../../lib/db";

interface RecordPublishRequest {
  // Either provide draftId to load from database...
  draftId?: string;
  // ...or provide content directly for blogs published without saving as draft
  title?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  blogType?: string;
  featuredImageUrl?: string;
  // Common fields
  publishedUrl: string;
  publishedPlatform: "wordpress" | "ghl";
  topic?: string; // Original topic used to generate
  wordCount?: number;
  location?: string;
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
      draftId,
      title: directTitle,
      primaryKeyword: directPrimaryKeyword,
      secondaryKeywords: directSecondaryKeywords,
      blogType: directBlogType,
      featuredImageUrl: directFeaturedImageUrl,
      publishedUrl,
      publishedPlatform,
      topic,
      wordCount,
      location,
    } = req.body as RecordPublishRequest;

    let title: string;
    let primaryKeyword: string | undefined;
    let secondaryKeywords: string[] | undefined;
    let blogType: string | undefined;
    let featuredImageUrl: string | undefined;
    let featuredImageAlt: string | undefined;

    if (draftId) {
      // Load from draft
      const draftResult = await db
        .select()
        .from(drafts)
        .where(and(eq(drafts.id, draftId), eq(drafts.userId, userId)))
        .limit(1);

      if (draftResult.length === 0) {
        return res.status(404).json({ success: false, error: "Draft not found" });
      }

      const draft = draftResult[0];
      const seoData = draft.seoData as {
        primaryKeyword?: string;
        secondaryKeywords?: string[];
      } | null;

      title = draft.title;
      primaryKeyword = seoData?.primaryKeyword;
      secondaryKeywords = seoData?.secondaryKeywords;
      blogType = draft.type;

      // Get featured image for this draft (filtered by userId for security)
      const images = await loadImagesForDraft(userId, draftId);
      const featuredImage = images.find((img) => img.isFeatured) || images[0];
      featuredImageUrl = featuredImage?.storagePath;
      featuredImageAlt = featuredImage?.altText;
    } else if (directTitle) {
      // Use direct content (for blogs published without saving as draft)
      title = directTitle;
      primaryKeyword = directPrimaryKeyword;
      secondaryKeywords = directSecondaryKeywords;
      blogType = directBlogType;
      featuredImageUrl = directFeaturedImageUrl;
    } else {
      return res.status(400).json({ success: false, error: "Either draftId or title is required" });
    }

    // Record the published content
    const result = await recordPublishedContent(userId, {
      draftId: draftId || undefined,
      title,
      primaryKeyword,
      secondaryKeywords,
      topic,
      blogType,
      featuredImageUrl,
      featuredImageAlt,
      publishedUrl,
      publishedPlatform,
      wordCount,
      location,
      publishedAt: new Date(),
    });

    if (!result.success) {
      console.error("[record-publish] Failed to record:", result.error);
      return res.status(500).json({ success: false, error: result.error?.message || "Failed to record" });
    }

    console.log(`[record-publish] Recorded published content: ${title} -> ${publishedUrl}`);

    return res.status(200).json({
      success: true,
      id: result.id,
      message: "Published content recorded successfully",
    });
  } catch (error) {
    console.error("[record-publish] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
