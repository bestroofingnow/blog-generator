// pages/api/knowledge-base/sync-to-profile.ts
// Sync knowledge base entries back to company profile for missing fields
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { db, knowledgeBase, profiles, eq } from "../../../lib/db";
import type { CompanyProfile } from "../../../lib/page-types";

interface SyncResponse {
  success: boolean;
  updatedFields?: string[];
  suggestions?: Array<{
    field: string;
    currentValue: unknown;
    suggestedValue: unknown;
    source: string;
  }>;
  error?: string;
}

// Map knowledge categories to profile fields
const CATEGORY_TO_FIELD_MAP: Record<string, keyof CompanyProfile> = {
  services: "services",
  usps: "usps",
  locations: "cities",
  certifications: "certifications",
  facts: "yearsInBusiness", // facts might contain years, etc.
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SyncResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const userId = (session.user as { id: string }).id;
  const { action = "suggest" } = req.body; // "suggest" or "apply"

  try {
    // Get user's knowledge entries
    const entries = await db
      .select()
      .from(knowledgeBase)
      .where(eq(knowledgeBase.userId, userId));

    // Get user's profile
    const profileResults = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId));

    const profile = profileResults[0];

    if (!profile) {
      // No profile yet - return empty suggestions (profile will be created when user saves settings)
      return res.status(200).json({
        success: true,
        suggestions: [],
      });
    }

    const companyProfile = (profile.companyProfile || {}) as Partial<CompanyProfile>;

    // Aggregate knowledge by category
    const knowledgeByCategory: Record<string, string[]> = {};
    for (const entry of entries) {
      if (!knowledgeByCategory[entry.category]) {
        knowledgeByCategory[entry.category] = [];
      }
      // Add title or content based on category
      if (entry.category === "services" || entry.category === "certifications") {
        knowledgeByCategory[entry.category].push(entry.title);
      } else if (entry.category === "locations") {
        // Extract location names from content
        knowledgeByCategory[entry.category].push(entry.title);
      } else if (entry.category === "usps") {
        knowledgeByCategory[entry.category].push(entry.content);
      }
    }

    // Find what's missing in profile but exists in knowledge
    const suggestions: SyncResponse["suggestions"] = [];
    const updates: Partial<CompanyProfile> = {};

    // Services
    if (knowledgeByCategory.services?.length > 0) {
      const profileServices = companyProfile.services || [];
      const newServices = knowledgeByCategory.services.filter(
        (s) => !profileServices.some((ps) => ps.toLowerCase() === s.toLowerCase())
      );
      if (newServices.length > 0) {
        const combined = [...profileServices, ...newServices];
        suggestions.push({
          field: "services",
          currentValue: profileServices,
          suggestedValue: combined,
          source: `${newServices.length} new service(s) from Knowledge Base`,
        });
        if (action === "apply") {
          updates.services = combined;
        }
      }
    }

    // USPs
    if (knowledgeByCategory.usps?.length > 0) {
      const profileUsps = companyProfile.usps || [];
      const newUsps = knowledgeByCategory.usps.filter(
        (u) => !profileUsps.some((pu) => pu.toLowerCase().includes(u.toLowerCase().slice(0, 20)))
      );
      if (newUsps.length > 0 && profileUsps.length < 5) {
        const combined = [...profileUsps, ...newUsps].slice(0, 5);
        suggestions.push({
          field: "usps",
          currentValue: profileUsps,
          suggestedValue: combined,
          source: `${newUsps.length} new USP(s) from Knowledge Base`,
        });
        if (action === "apply") {
          updates.usps = combined;
        }
      }
    }

    // Cities/Locations
    if (knowledgeByCategory.locations?.length > 0) {
      const profileCities = companyProfile.cities || [];
      const newCities = knowledgeByCategory.locations.filter(
        (l) => !profileCities.some((pc) => pc.toLowerCase() === l.toLowerCase())
      );
      if (newCities.length > 0) {
        const combined = [...profileCities, ...newCities];
        suggestions.push({
          field: "cities",
          currentValue: profileCities,
          suggestedValue: combined,
          source: `${newCities.length} new location(s) from Knowledge Base`,
        });
        if (action === "apply") {
          updates.cities = combined;
        }
      }
    }

    // Certifications
    if (knowledgeByCategory.certifications?.length > 0) {
      const profileCerts = companyProfile.certifications || [];
      const newCerts = knowledgeByCategory.certifications.filter(
        (c) => !profileCerts.some((pc) => pc.toLowerCase() === c.toLowerCase())
      );
      if (newCerts.length > 0) {
        const combined = [...profileCerts, ...newCerts];
        suggestions.push({
          field: "certifications",
          currentValue: profileCerts,
          suggestedValue: combined,
          source: `${newCerts.length} new certification(s) from Knowledge Base`,
        });
        if (action === "apply") {
          updates.certifications = combined;
        }
      }
    }

    // Apply updates if requested
    if (action === "apply" && Object.keys(updates).length > 0) {
      const updatedProfile = { ...companyProfile, ...updates };
      await db
        .update(profiles)
        .set({
          companyProfile: updatedProfile,
          updatedAt: new Date(),
        })
        .where(eq(profiles.userId, userId));

      return res.status(200).json({
        success: true,
        updatedFields: Object.keys(updates),
        suggestions,
      });
    }

    return res.status(200).json({
      success: true,
      suggestions,
    });
  } catch (error) {
    console.error("Sync to profile error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
