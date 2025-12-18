// pages/api/profile/research-links.ts
// AI-powered discovery of business directory and profile links

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import type { AdditionalLink, LinkCategory } from "../../../lib/page-types";

interface ResearchLinksResponse {
  success: boolean;
  suggestedLinks?: AdditionalLink[];
  error?: string;
}

// Known directory patterns to search for
const DIRECTORY_PATTERNS: {
  name: string;
  domain: string;
  category: LinkCategory;
  searchPattern: string;
}[] = [
  { name: "Better Business Bureau", domain: "bbb.org", category: "directory", searchPattern: "bbb.org/us" },
  { name: "Angi", domain: "angi.com", category: "directory", searchPattern: "angi.com/companylist" },
  { name: "HomeAdvisor", domain: "homeadvisor.com", category: "directory", searchPattern: "homeadvisor.com/rated" },
  { name: "Thumbtack", domain: "thumbtack.com", category: "directory", searchPattern: "thumbtack.com" },
  { name: "Houzz", domain: "houzz.com", category: "directory", searchPattern: "houzz.com/pro" },
  { name: "Porch", domain: "porch.com", category: "directory", searchPattern: "porch.com/pro" },
  { name: "Trustpilot", domain: "trustpilot.com", category: "review_platform", searchPattern: "trustpilot.com/review" },
  { name: "BuildZoom", domain: "buildzoom.com", category: "directory", searchPattern: "buildzoom.com/contractor" },
  { name: "GAF Certified", domain: "gaf.com", category: "manufacturer", searchPattern: "gaf.com/roofing/residential/contractors" },
  { name: "Owens Corning", domain: "owenscorning.com", category: "manufacturer", searchPattern: "owenscorning.com/roofing/contractors" },
  { name: "CertainTeed", domain: "certainteed.com", category: "manufacturer", searchPattern: "certainteed.com/find-a-contractor" },
  { name: "Chamber of Commerce", domain: "chamberofcommerce.com", category: "networking", searchPattern: "chamberofcommerce.com/united-states" },
  { name: "Manta", domain: "manta.com", category: "directory", searchPattern: "manta.com/c" },
  { name: "Yellow Pages", domain: "yellowpages.com", category: "directory", searchPattern: "yellowpages.com" },
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResearchLinksResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    return res.status(401).json({
      success: false,
      error: "Not authenticated",
    });
  }

  const { companyName, location, industryType } = req.body;

  if (!companyName) {
    return res.status(400).json({
      success: false,
      error: "Company name is required",
    });
  }

  try {
    const suggestedLinks: AdditionalLink[] = [];

    // Build search queries based on company info
    const searchQuery = [companyName, location].filter(Boolean).join(" ");

    // For each directory pattern, try to find potential links
    for (const pattern of DIRECTORY_PATTERNS) {
      // Skip manufacturer patterns if not in relevant industry
      if (pattern.category === "manufacturer") {
        const relevantIndustries = ["roofing", "hvac", "solar", "windows_doors"];
        if (!relevantIndustries.includes(industryType || "")) {
          continue;
        }
      }

      // Generate a suggested URL pattern
      const suggestedUrl = generateSuggestedUrl(pattern, companyName, location);

      if (suggestedUrl) {
        suggestedLinks.push({
          id: `ai-${pattern.domain.replace(/\./g, "-")}-${Date.now()}`,
          name: pattern.name,
          url: suggestedUrl,
          category: pattern.category,
          isVerified: false,
          isAiSuggested: true,
          addedAt: new Date().toISOString(),
          description: `Suggested ${pattern.name} profile`,
        });
      }
    }

    // Limit to most relevant links
    const limitedLinks = suggestedLinks.slice(0, 10);

    return res.status(200).json({
      success: true,
      suggestedLinks: limitedLinks,
    });
  } catch (error) {
    console.error("Research links error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to research links",
    });
  }
}

// Generate a suggested URL for a directory
function generateSuggestedUrl(
  pattern: { name: string; domain: string; searchPattern: string },
  companyName: string,
  location?: string
): string | null {
  // Normalize company name for URL
  const normalizedName = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const normalizedLocation = location
    ? location
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    : "";

  // Generate pattern-specific URLs
  switch (pattern.domain) {
    case "bbb.org":
      return `https://www.bbb.org/search?find_text=${encodeURIComponent(companyName)}`;

    case "angi.com":
      return `https://www.angi.com/companylist/${normalizedName}.htm`;

    case "homeadvisor.com":
      return `https://www.homeadvisor.com/rated.${normalizedName}.html`;

    case "thumbtack.com":
      return `https://www.thumbtack.com/${normalizedLocation}/${normalizedName}`;

    case "houzz.com":
      return `https://www.houzz.com/pro/${normalizedName}`;

    case "yelp.com":
      return `https://www.yelp.com/biz/${normalizedName}${normalizedLocation ? `-${normalizedLocation}` : ""}`;

    case "gaf.com":
      return "https://www.gaf.com/en-us/roofing/residential/contractors";

    case "owenscorning.com":
      return "https://www.owenscorning.com/en-us/roofing/find-a-contractor";

    case "certainteed.com":
      return "https://www.certainteed.com/find-a-contractor/";

    case "chamberofcommerce.com":
      return location
        ? `https://www.chamberofcommerce.com/search?q=${encodeURIComponent(companyName)}&location=${encodeURIComponent(location)}`
        : null;

    case "trustpilot.com":
      return `https://www.trustpilot.com/review/${normalizedName}.com`;

    case "buildzoom.com":
      return `https://www.buildzoom.com/contractor/${normalizedName}`;

    case "porch.com":
      return `https://porch.com/search?q=${encodeURIComponent(companyName)}`;

    case "manta.com":
      return `https://www.manta.com/search?search=${encodeURIComponent(companyName)}`;

    case "yellowpages.com":
      return `https://www.yellowpages.com/search?search_terms=${encodeURIComponent(companyName)}`;

    default:
      return `https://${pattern.domain}/search?q=${encodeURIComponent(companyName)}`;
  }
}
