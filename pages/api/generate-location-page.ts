// pages/api/generate-location-page.ts
// API endpoint to generate location pages using the Relentless Digital template system
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import { db, profiles, eq } from "../../lib/db";
import {
  LocationPageConfig,
  generateLocationPageTemplate,
  generateBatchLocationTemplates,
  templateToHtml,
  LocationPageTemplate,
} from "../../lib/location-templates";

interface GenerateLocationPageRequest {
  cities: string[];
  service: string;
  includeDirections?: boolean;
  includeFAQ?: boolean;
  includeTestimonials?: boolean;
  outputFormat?: "html" | "template" | "both";
}

interface GenerateLocationPageResponse {
  success: boolean;
  templates?: LocationPageTemplate[];
  html?: Record<string, string>;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateLocationPageResponse>
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
    // Get user's company profile
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId));

    if (!profile?.companyProfile) {
      return res.status(400).json({
        success: false,
        error: "Company profile not found. Please complete your profile first.",
      });
    }

    const companyProfile = profile.companyProfile as Record<string, unknown>;

    const {
      cities,
      service,
      includeDirections = true,
      includeFAQ = true,
      includeTestimonials = true,
      outputFormat = "both",
    } = req.body as GenerateLocationPageRequest;

    if (!cities || cities.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one city is required",
      });
    }

    if (!service) {
      return res.status(400).json({
        success: false,
        error: "Service type is required",
      });
    }

    // Extract data from company profile
    const state = (companyProfile.state as string) || "";
    const stateAbbrev = getStateAbbreviation(state);
    const companyName = (companyProfile.companyName as string) || profile.companyName || "";
    const phone = (companyProfile.phone as string) || "";
    const email = (companyProfile.email as string) || "";
    const address = (companyProfile.address as string) || "";
    const zipCode = (companyProfile.zip as string) || "";
    const yearsInBusiness = companyProfile.yearFounded
      ? new Date().getFullYear() - parseInt(companyProfile.yearFounded as string)
      : undefined;

    // Extract review data if available
    const reviewData = companyProfile.reviews as Record<string, Record<string, unknown>> | undefined;
    const googleReviews = reviewData?.google;
    const googleRating = googleReviews?.rating as number | undefined;
    const reviewCount = googleReviews?.reviewCount as number | undefined;

    // Extract services and certifications
    const services = (companyProfile.services as string[]) || [];
    const certifications = (companyProfile.certifications as string[]) || [];

    // Extract neighborhoods/cities
    const neighborhoods = (companyProfile.cities as string[])?.slice(0, 10) || [];

    // Create testimonials from review data if available
    const testimonials = [];
    if (reviewData?.testimonials) {
      const rawTestimonials = reviewData.testimonials as unknown as Array<Record<string, unknown>>;
      if (Array.isArray(rawTestimonials)) {
        for (const t of rawTestimonials.slice(0, 3)) {
          testimonials.push({
            name: (t.author as string) || "Customer",
            rating: (t.rating as number) || 5,
            text: (t.text as string) || "",
            location: cities[0],
          });
        }
      }
    }

    // Build base config
    const baseConfig: Omit<LocationPageConfig, "city"> = {
      state,
      stateAbbrev,
      service,
      companyName,
      phone,
      email,
      address,
      zipCode,
      yearsInBusiness,
      googleRating,
      reviewCount,
      certifications,
      services,
      neighborhoods,
      testimonials,
      includeDirections,
      includeFAQ,
      includeTestimonials,
      officeAddress: address,
    };

    // Generate templates for all cities
    const templates = generateBatchLocationTemplates(cities, baseConfig);

    // Prepare response based on output format
    const response: GenerateLocationPageResponse = { success: true };

    if (outputFormat === "template" || outputFormat === "both") {
      response.templates = templates;
    }

    if (outputFormat === "html" || outputFormat === "both") {
      response.html = {};
      for (const template of templates) {
        response.html[template.slug] = templateToHtml(template);
      }
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error("Generate location page error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}

// Helper to get state abbreviation
function getStateAbbreviation(state: string): string {
  const stateAbbreviations: Record<string, string> = {
    "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
    "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
    "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
    "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
    "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
    "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS",
    "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV",
    "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
    "north carolina": "NC", "north dakota": "ND", "ohio": "OH", "oklahoma": "OK",
    "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
    "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT",
    "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV",
    "wisconsin": "WI", "wyoming": "WY", "district of columbia": "DC",
    // Canadian provinces
    "british columbia": "BC", "alberta": "AB", "ontario": "ON", "quebec": "QC",
  };

  // Check if it's already an abbreviation
  if (state.length === 2) {
    return state.toUpperCase();
  }

  return stateAbbreviations[state.toLowerCase()] || state.slice(0, 2).toUpperCase();
}

export const config = {
  maxDuration: 60,
};
