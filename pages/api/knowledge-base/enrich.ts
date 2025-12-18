// pages/api/knowledge-base/enrich.ts
// AI-powered endpoint to extract and add knowledge base entries from company research
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { db, knowledgeBase, knowledgeBaseHistory, profiles, eq } from "../../../lib/db";
import { generateText } from "ai";
import { MODELS } from "../../../lib/ai-gateway";

interface EnrichResponse {
  success: boolean;
  entriesAdded?: number;
  entries?: Array<{
    category: string;
    title: string;
    content: string;
  }>;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EnrichResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const userId = (session.user as { id: string }).id;

  try {
    // Get the user's company profile
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId));

    if (!profile?.companyProfile) {
      return res.status(400).json({
        success: false,
        error: "No company profile found. Please complete company research first.",
      });
    }

    const companyProfile = profile.companyProfile as Record<string, unknown>;

    // Build context from company profile
    const profileContext = JSON.stringify(companyProfile, null, 2);

    // Use AI to extract knowledge base entries
    const { text } = await generateText({
      model: MODELS.contentWriter,
      messages: [
        {
          role: "system",
          content: `You are a Knowledge Base Assistant for a trade services company. Your job is to extract valuable, reusable information from company profiles and organize it into knowledge base entries.

Extract entries into these categories:
- services: Individual services offered (one entry per service)
- usps: Unique selling points and competitive advantages
- facts: Company facts, history, statistics
- locations: Service areas, office locations
- certifications: Licenses, certifications, awards
- team: Key team members, expertise
- faqs: Common questions and answers about the company

For each entry, provide:
- category: One of the categories above
- title: A short, descriptive title (3-8 words)
- content: Detailed content (2-4 sentences) that can be used in blog posts
- tags: 2-4 relevant keywords

Return ONLY valid JSON array. No markdown, no explanation.`,
        },
        {
          role: "user",
          content: `Extract knowledge base entries from this company profile:

${profileContext}

Return a JSON array of entries like:
[
  {
    "category": "services",
    "title": "Landscape Lighting Design",
    "content": "We specialize in custom landscape lighting designs that enhance your outdoor spaces. Our team creates stunning illumination plans that highlight architectural features and landscaping while improving safety.",
    "tags": ["lighting", "landscape", "design"]
  }
]`,
        },
      ],
      temperature: 0.3,
      maxOutputTokens: 4000,
    });

    // Parse the AI response
    let entries: Array<{
      category: string;
      title: string;
      content: string;
      tags?: string[];
    }> = [];

    try {
      // Clean up the response - remove any markdown formatting
      let cleanText = text.trim();
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.slice(7);
      }
      if (cleanText.startsWith("```")) {
        cleanText = cleanText.slice(3);
      }
      if (cleanText.endsWith("```")) {
        cleanText = cleanText.slice(0, -3);
      }
      entries = JSON.parse(cleanText.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", text);
      return res.status(500).json({
        success: false,
        error: "Failed to parse AI response",
      });
    }

    // Get existing entries to avoid duplicates
    const existingEntries = await db
      .select()
      .from(knowledgeBase)
      .where(eq(knowledgeBase.userId, userId));

    const existingTitles = new Set(
      existingEntries.map((e) => e.title.toLowerCase())
    );

    // Insert new entries
    let entriesAdded = 0;
    const addedEntries: Array<{ category: string; title: string; content: string }> = [];

    for (const entry of entries) {
      // Skip duplicates
      if (existingTitles.has(entry.title.toLowerCase())) {
        continue;
      }

      const [newEntry] = await db
        .insert(knowledgeBase)
        .values({
          userId,
          category: entry.category,
          title: entry.title,
          content: entry.content,
          tags: entry.tags || [],
          isAiGenerated: true,
          isVerified: false,
          priority: 0,
        })
        .returning();

      // Log to history
      await db.insert(knowledgeBaseHistory).values({
        entryId: newEntry.id,
        userId,
        action: "ai_suggested",
        newContent: entry.content,
        changeSource: "ai_research",
      });

      entriesAdded++;
      addedEntries.push({
        category: entry.category,
        title: entry.title,
        content: entry.content,
      });
      existingTitles.add(entry.title.toLowerCase());
    }

    return res.status(200).json({
      success: true,
      entriesAdded,
      entries: addedEntries,
    });
  } catch (error) {
    console.error("Knowledge Base enrich error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}

export const config = {
  maxDuration: 60,
};
