// pages/api/profile/quick-research.ts
// One-click research API - uses existing profile context to find missing information

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { db, profiles, eq } from "../../../lib/db";
import { generateText } from "ai";
import { MODELS } from "../../../lib/ai-gateway";
import { BrightData, isBrightDataConfigured } from "../../../lib/brightdata";
import type { CompanyProfile } from "../../../lib/page-types";

interface QuickResearchResult {
  success: boolean;
  suggestions?: Record<string, unknown>;
  fieldsFound?: string[];
  sourcesUsed?: string[];
  error?: string;
}

// Fields to check and research
const RESEARCHABLE_FIELDS = [
  { field: "name", label: "Company Name" },
  { field: "phone", label: "Phone Number" },
  { field: "email", label: "Email" },
  { field: "address", label: "Address" },
  { field: "services", label: "Services" },
  { field: "usps", label: "Unique Selling Points" },
  { field: "certifications", label: "Certifications" },
  { field: "cities", label: "Service Areas" },
  { field: "competitors", label: "Competitors" },
  { field: "primarySiteKeyword", label: "Primary Keyword" },
  { field: "secondarySiteKeywords", label: "Secondary Keywords" },
  { field: "valueProposition", label: "Value Proposition" },
  { field: "brandVoice", label: "Brand Voice" },
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<QuickResearchResult>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return res.status(401).json({ success: false, error: "User ID not found" });
  }

  try {
    // Get current profile
    const profileRecords = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (profileRecords.length === 0) {
      return res.status(404).json({ success: false, error: "Profile not found" });
    }

    const profile = (profileRecords[0].companyProfile as Partial<CompanyProfile>) || {};

    // Check what we have to work with
    const hasCompanyName = !!profile.name;
    const hasWebsite = !!profile.website;
    const hasLocation = !!(profile.headquarters || profile.state);
    const hasIndustry = !!profile.industryType;

    if (!hasCompanyName && !hasWebsite) {
      return res.status(400).json({
        success: false,
        error: "Please add your company name or website first to enable quick research",
      });
    }

    console.log("\n========================================");
    console.log("🔍 QUICK RESEARCH INITIATED");
    console.log("========================================");
    console.log(`Company: ${profile.name || "Unknown"}`);
    console.log(`Website: ${profile.website || "Not set"}`);
    console.log(`Location: ${profile.headquarters || profile.state || "Unknown"}`);

    // Identify missing fields
    const missingFields = RESEARCHABLE_FIELDS.filter((f) => {
      const value = profile[f.field as keyof CompanyProfile];
      return !value || (Array.isArray(value) && value.length === 0);
    });

    console.log(`Missing fields: ${missingFields.map((f) => f.field).join(", ")}`);

    if (missingFields.length === 0) {
      return res.status(200).json({
        success: true,
        suggestions: {},
        fieldsFound: [],
        sourcesUsed: [],
      });
    }

    // Build context for research
    const contextStr = buildContextString(profile);
    const sourcesUsed: string[] = [];
    const suggestions: Record<string, unknown> = {};
    const fieldsFound: string[] = [];

    // PHASE 1: Web search if Bright Data is configured
    if (isBrightDataConfigured() && (hasCompanyName || hasWebsite)) {
      console.log("\n📡 Running web search for additional info...");

      try {
        // Search for company information
        const searchQuery = profile.name
          ? `"${profile.name}" ${profile.headquarters || ""} ${profile.state || ""} ${profile.industryType || ""}`
          : profile.website || "";

        const searchResult = await BrightData.search(searchQuery, { numResults: 5 });

        if (searchResult.results.length > 0) {
          sourcesUsed.push(...searchResult.results.slice(0, 3).map((r) => r.url));
        }

        // If we have a website, try to scrape it for social links
        if (profile.website && (!profile.socialLinks || Object.keys(profile.socialLinks || {}).length === 0)) {
          try {
            const websiteData = await BrightData.scrape(profile.website);
            if (websiteData.socialLinks && Object.keys(websiteData.socialLinks).length > 0) {
              suggestions.socialLinks = websiteData.socialLinks;
              fieldsFound.push("socialLinks");
            }
            sourcesUsed.push(profile.website);
          } catch (e) {
            console.log("Website scrape failed:", e);
          }
        }
      } catch (searchError) {
        console.log("Search error:", searchError);
      }
    }

    // PHASE 2: AI-powered research to fill remaining gaps
    const remainingMissing = missingFields.filter((f) => !fieldsFound.includes(f.field));

    if (remainingMissing.length > 0) {
      console.log("\n🤖 AI research for remaining fields...");

      const aiSuggestions = await generateAISuggestions({
        context: contextStr,
        currentProfile: profile,
        missingFields: remainingMissing.map((f) => f.field),
      });

      if (aiSuggestions) {
        for (const [key, value] of Object.entries(aiSuggestions)) {
          if (value && !suggestions[key]) {
            suggestions[key] = value;
            fieldsFound.push(key);
          }
        }
      }
    }

    console.log("\n========================================");
    console.log("✅ QUICK RESEARCH COMPLETE");
    console.log(`Fields found: ${fieldsFound.join(", ") || "None"}`);
    console.log("========================================\n");

    return res.status(200).json({
      success: true,
      suggestions,
      fieldsFound,
      sourcesUsed,
    });
  } catch (error) {
    console.error("Quick research error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Research failed",
    });
  }
}

function buildContextString(profile: Partial<CompanyProfile>): string {
  const parts: string[] = [];

  if (profile.name) parts.push(`Company: ${profile.name}`);
  if (profile.website) parts.push(`Website: ${profile.website}`);
  if (profile.industryType) parts.push(`Industry: ${profile.industryType}`);
  if (profile.headquarters) parts.push(`City: ${profile.headquarters}`);
  if (profile.state) parts.push(`State: ${profile.state}`);
  if (profile.services?.length) parts.push(`Services: ${profile.services.join(", ")}`);
  if (profile.tagline) parts.push(`Tagline: ${profile.tagline}`);

  return parts.join("\n");
}

async function generateAISuggestions(params: {
  context: string;
  currentProfile: Partial<CompanyProfile>;
  missingFields: string[];
}): Promise<Record<string, unknown> | null> {
  const { context, currentProfile, missingFields } = params;

  const prompt = `Based on this company profile information, suggest realistic values for the missing fields.

KNOWN INFORMATION:
${context}

MISSING FIELDS TO FILL:
${missingFields.join(", ")}

Based on the company type and location, provide realistic suggestions for the missing fields.
For services: suggest common services for this industry type.
For USPs: suggest differentiators common for this industry.
For certifications: suggest relevant industry certifications.
For cities: suggest nearby cities if headquarters is known.
For competitors: suggest common competitor types in the area.
For keywords: suggest SEO keywords based on services and location.
For value proposition: craft a compelling value statement.
For brand voice: suggest appropriate tone (professional, friendly, etc.).

Respond with JSON only:
{
  "services": ["service1", "service2"] or null,
  "usps": ["usp1", "usp2"] or null,
  "certifications": ["cert1"] or null,
  "cities": ["city1", "city2"] or null,
  "competitors": ["competitor type 1"] or null,
  "primarySiteKeyword": "main keyword" or null,
  "secondarySiteKeywords": ["keyword1", "keyword2"] or null,
  "valueProposition": "value statement" or null,
  "brandVoice": "suggested voice" or null
}

Only include fields that are in the missing list. Use null for fields you cannot reasonably suggest.`;

  try {
    const result = await generateText({
      model: MODELS.researcher,
      system: "You are a business research assistant. Respond with valid JSON only.",
      prompt,
      maxOutputTokens: 1500,
      temperature: 0.7,
    });

    let cleaned = result.text.trim();
    if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
    if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
    if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);

    const suggestions = JSON.parse(cleaned.trim());

    // Filter out null values and fields not in missing list
    const filtered: Record<string, unknown> = {};
    for (const field of missingFields) {
      if (suggestions[field] !== null && suggestions[field] !== undefined) {
        filtered[field] = suggestions[field];
      }
    }

    return filtered;
  } catch (error) {
    console.error("AI suggestion error:", error);
    return null;
  }
}
