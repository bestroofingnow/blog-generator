// pages/api/knowledge-base/parse-and-fill.ts
// Parse knowledge content and auto-fill missing profile fields
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { db, knowledgeBase, profiles, eq, and } from "../../../lib/db";
import { createGateway } from "@ai-sdk/gateway";
import { generateText } from "ai";
import type { CompanyProfile } from "../../../lib/page-types";

const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? "",
});

const profileExtractor = gateway("anthropic/claude-sonnet-4");

interface ParseResponse {
  success: boolean;
  entriesCreated?: number;
  profileFieldsUpdated?: string[];
  extractedData?: Record<string, unknown>;
  error?: string;
}

// Fields we can extract and map to profile
const PROFILE_FIELD_MAP = {
  companyName: "name",
  tagline: "tagline",
  phone: "phone",
  email: "email",
  address: "address",
  headquarters: "headquarters",
  state: "state",
  industryType: "industryType",
  yearsInBusiness: "yearsInBusiness",
  audience: "audience",
  brandVoice: "brandVoice",
  writingStyle: "writingStyle",
  businessPersonality: "businessPersonality",
  valueProposition: "valueProposition",
  missionStatement: "missionStatement",
  website: "website",
  primarySiteKeyword: "primarySiteKeyword",
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ParseResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const userId = (session.user as { id: string }).id;
  const { content, title, source = "document", autoFillProfile = true } = req.body;

  if (!content || typeof content !== "string") {
    return res.status(400).json({ success: false, error: "Content is required" });
  }

  try {
    // Get current profile to identify missing fields
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId));

    const currentProfile = (profile?.companyProfile || {}) as Partial<CompanyProfile>;

    // Build list of missing fields
    const missingFields: string[] = [];
    for (const [, profileKey] of Object.entries(PROFILE_FIELD_MAP)) {
      const value = currentProfile[profileKey as keyof CompanyProfile];
      if (!value || (Array.isArray(value) && value.length === 0)) {
        missingFields.push(profileKey);
      }
    }

    // Also check array fields
    if (!currentProfile.services?.length) missingFields.push("services");
    if (!currentProfile.usps?.length) missingFields.push("usps");
    if (!currentProfile.cities?.length) missingFields.push("cities");
    if (!currentProfile.certifications?.length) missingFields.push("certifications");
    if (!currentProfile.competitors?.length) missingFields.push("competitors");
    if (!currentProfile.secondarySiteKeywords?.length) missingFields.push("secondarySiteKeywords");

    // Use AI to extract profile information AND knowledge entries
    const extractionPrompt = `You are analyzing a business document to extract company information and knowledge for content generation.

DOCUMENT TITLE: ${title || "Unknown"}
SOURCE: ${source}

DOCUMENT CONTENT:
${content.substring(0, 20000)}

MISSING PROFILE FIELDS: ${missingFields.join(", ")}

Extract the following:

1. PROFILE DATA - Any information that can fill these profile fields:
   - name: Company name
   - tagline: Company tagline/slogan
   - phone: Phone number
   - email: Contact email
   - address: Physical address
   - headquarters: City of main office
   - state: State/region
   - industryType: Type of industry
   - yearsInBusiness: Years operating (number)
   - audience: Target audience description
   - brandVoice: Brand voice style (professional, friendly, etc)
   - writingStyle: Writing style preference
   - businessPersonality: How business presents itself
   - valueProposition: Main value proposition
   - missionStatement: Company mission
   - website: Company website
   - primarySiteKeyword: Main SEO keyword
   - services: Array of services offered
   - usps: Array of unique selling points
   - cities: Array of service areas/cities
   - certifications: Array of certifications/awards
   - competitors: Array of competitor names
   - secondarySiteKeywords: Array of secondary keywords

2. KNOWLEDGE ENTRIES - Create categorized knowledge entries for content generation:
   Categories: services, usps, facts, locations, certifications, team, faqs, testimonials, custom

Respond in JSON format:
{
  "profileData": {
    "name": "if found",
    "phone": "if found",
    "services": ["service1", "service2"],
    ...only include fields where you found clear data
  },
  "knowledgeEntries": [
    {
      "category": "services",
      "title": "Brief title",
      "content": "Detailed content for AI to use",
      "tags": ["tag1", "tag2"]
    }
  ],
  "confidence": {
    "fieldName": 90,
    ...confidence score 0-100 for each extracted field
  }
}

Only include fields where you found clear, reliable data. Be conservative - if unsure, don't include it.`;

    const result = await generateText({
      model: profileExtractor,
      prompt: extractionPrompt,
      maxOutputTokens: 4000,
    });

    // Parse AI response
    let extracted: {
      profileData: Partial<CompanyProfile>;
      knowledgeEntries: Array<{
        category: string;
        title: string;
        content: string;
        tags: string[];
      }>;
      confidence: Record<string, number>;
    };

    try {
      let cleanedText = result.text.trim();
      if (cleanedText.startsWith("```json")) cleanedText = cleanedText.slice(7);
      if (cleanedText.startsWith("```")) cleanedText = cleanedText.slice(3);
      if (cleanedText.endsWith("```")) cleanedText = cleanedText.slice(0, -3);
      extracted = JSON.parse(cleanedText.trim());
    } catch {
      return res.status(500).json({
        success: false,
        error: "Failed to parse AI extraction response",
      });
    }

    const updatedFields: string[] = [];
    const entriesCreated: string[] = [];

    // Auto-fill profile with high-confidence extractions
    if (autoFillProfile && extracted.profileData) {
      const profileUpdates: Partial<CompanyProfile> = {};

      for (const [field, value] of Object.entries(extracted.profileData)) {
        if (!value) continue;

        // Check if field is missing in current profile
        const currentValue = currentProfile[field as keyof CompanyProfile];
        const isMissing = !currentValue || (Array.isArray(currentValue) && currentValue.length === 0);

        // Get confidence for this field
        const confidence = extracted.confidence?.[field] ?? 50;

        // Only update if missing and confidence > 60
        if (isMissing && confidence > 60) {
          // For arrays, merge with existing
          if (Array.isArray(value)) {
            const existing = (currentProfile[field as keyof CompanyProfile] as string[]) || [];
            const combined = [...existing, ...value];
            profileUpdates[field as keyof CompanyProfile] = Array.from(new Set(combined)) as never;
          } else {
            profileUpdates[field as keyof CompanyProfile] = value as never;
          }
          updatedFields.push(field);
        }
      }

      // Save profile updates
      if (Object.keys(profileUpdates).length > 0) {
        const mergedProfile = { ...currentProfile, ...profileUpdates };
        await db
          .update(profiles)
          .set({
            companyProfile: mergedProfile,
            updatedAt: new Date(),
          })
          .where(eq(profiles.userId, userId));
      }
    }

    // Create knowledge base entries
    if (extracted.knowledgeEntries?.length > 0) {
      for (const entry of extracted.knowledgeEntries) {
        // Check for duplicates by title/category
        const existing = await db
          .select()
          .from(knowledgeBase)
          .where(
            and(
              eq(knowledgeBase.userId, userId),
              eq(knowledgeBase.category, entry.category),
              eq(knowledgeBase.title, entry.title)
            )
          );

        if (existing.length === 0) {
          await db.insert(knowledgeBase).values({
            userId,
            category: entry.category,
            title: entry.title,
            content: entry.content,
            tags: entry.tags || [],
            source,
            isAiGenerated: true,
            isVerified: false,
            confidence: extracted.confidence?.[entry.title] ?? 70,
          });
          entriesCreated.push(entry.title);
        }
      }
    }

    return res.status(200).json({
      success: true,
      entriesCreated: entriesCreated.length,
      profileFieldsUpdated: updatedFields,
      extractedData: extracted.profileData,
    });
  } catch (error) {
    console.error("Parse and fill error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
  maxDuration: 120,
};
