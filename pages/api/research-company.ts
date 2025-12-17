// pages/api/research-company.ts
// Deep research endpoint that analyzes a company website and extracts profile data

import type { NextApiRequest, NextApiResponse } from "next";
import { generateText } from "ai";
import { MODELS } from "../../lib/ai-gateway";

interface ResearchResult {
  success: boolean;
  data?: {
    name?: string;
    tagline?: string;
    phone?: string;
    email?: string;
    address?: string;
    state?: string;
    stateAbbr?: string;
    headquarters?: string;
    cities?: string[];
    industryType?: string;
    customIndustryName?: string;
    services?: string[];
    usps?: string[];
    certifications?: string[];
    yearsInBusiness?: number;
    socialLinks?: {
      facebook?: string;
      instagram?: string;
      linkedin?: string;
      twitter?: string;
      youtube?: string;
      yelp?: string;
      googleBusiness?: string;
    };
    audience?: "homeowners" | "commercial" | "both" | "property";
    brandVoice?: string;
    writingStyle?: string;
  };
  error?: string;
  pagesAnalyzed?: string[];
}

// Known industry mappings
const INDUSTRY_MAPPINGS: Record<string, string> = {
  "roofing": "roofing",
  "roof": "roofing",
  "hvac": "hvac",
  "heating": "hvac",
  "cooling": "hvac",
  "air conditioning": "hvac",
  "plumbing": "plumbing",
  "plumber": "plumbing",
  "electrical": "electrical",
  "electrician": "electrical",
  "landscaping": "landscaping",
  "lawn": "landscaping",
  "pest control": "pest",
  "exterminator": "pest",
  "cleaning": "cleaning",
  "maid": "cleaning",
  "janitorial": "cleaning",
  "painting": "painting",
  "painter": "painting",
  "flooring": "flooring",
  "floor": "flooring",
  "garage door": "garage",
  "window": "windows",
  "door": "windows",
  "solar": "solar",
  "pool": "pool",
  "swimming pool": "pool",
  "general contractor": "general",
  "remodeling": "general",
  "renovation": "general",
  "tree": "tree_service",
  "arborist": "tree_service",
  "pressure washing": "pressure_washing",
  "power washing": "pressure_washing",
  "fence": "fencing",
  "fencing": "fencing",
  "concrete": "concrete",
  "masonry": "masonry",
  "brick": "masonry",
  "drywall": "drywall",
  "insulation": "insulation",
  "carpet cleaning": "carpet_cleaning",
  "junk removal": "junk_removal",
  "hauling": "junk_removal",
  "locksmith": "locksmith",
  "appliance repair": "appliance_repair",
  "handyman": "handyman",
  "septic": "septic",
  "chimney": "chimney",
  "gutter": "gutter",
  "moving": "moving",
  "mover": "moving",
  "glass": "glass",
  "mirror": "glass",
  "security": "security",
  "alarm": "security",
  "waterproofing": "waterproofing",
  "basement": "waterproofing",
  "foundation": "foundation",
  "mold": "mold",
  "restoration": "restoration",
  "water damage": "restoration",
  "fire damage": "restoration",
  "cabinet": "cabinet",
  "countertop": "countertop",
  "granite": "countertop",
  "awning": "awning",
  "canopy": "awning",
  "demolition": "demolition",
  "excavation": "excavation",
  "welding": "welding",
  "siding": "siding",
  "real estate": "realtor",
  "realtor": "realtor",
  "equestrian": "equestrian",
  "horse": "equestrian",
};

function detectIndustry(text: string): { industryType: string; customIndustryName?: string } {
  const lowerText = text.toLowerCase();

  for (const [keyword, industry] of Object.entries(INDUSTRY_MAPPINGS)) {
    if (lowerText.includes(keyword)) {
      return { industryType: industry };
    }
  }

  return { industryType: "custom", customIndustryName: undefined };
}

async function fetchWebsiteContent(url: string): Promise<string> {
  try {
    // Normalize URL
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = "https://" + normalizedUrl;
    }

    const response = await fetch(normalizedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BlogGenerator/1.0; +https://github.com/bestroofingnow/blog-generator)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();

    // Basic HTML to text conversion - strip tags but keep structure
    let text = html
      // Remove script and style content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      // Convert common elements to preserve structure
      .replace(/<(h[1-6]|p|div|li|td|th|br|hr)[^>]*>/gi, "\n")
      .replace(/<\/?(h[1-6]|p|div|li|td|th)[^>]*>/gi, "\n")
      // Remove remaining HTML tags
      .replace(/<[^>]+>/g, " ")
      // Decode HTML entities
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Clean up whitespace
      .replace(/\s+/g, " ")
      .trim();

    // Limit content length for AI processing
    if (text.length > 15000) {
      text = text.substring(0, 15000) + "...";
    }

    return text;
  } catch (error) {
    console.error("Error fetching website:", error);
    throw error;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResearchResult>) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: "URL is required" });
  }

  try {
    // Fetch website content
    const websiteContent = await fetchWebsiteContent(url);

    if (!websiteContent || websiteContent.length < 100) {
      return res.status(400).json({
        success: false,
        error: "Could not extract enough content from the website. The site may be blocking automated access."
      });
    }

    // Use AI to analyze the content
    const analysisPrompt = `You are an expert at analyzing business websites and extracting company information.

Analyze the following website content and extract as much information as possible about this business.

WEBSITE CONTENT:
${websiteContent}

Extract and return a JSON object with the following fields (use null for any fields you cannot determine):

{
  "name": "Company name",
  "tagline": "Company tagline or slogan if mentioned",
  "phone": "Main phone number (format: (XXX) XXX-XXXX)",
  "email": "Main contact email",
  "address": "Full street address if available",
  "city": "City/headquarters location",
  "state": "Full state name (e.g., 'California')",
  "stateAbbr": "State abbreviation (e.g., 'CA')",
  "serviceCities": ["Array of cities/areas they serve"],
  "industry": "Primary industry/trade (e.g., 'Roofing', 'HVAC', 'Plumbing', 'Electrical', 'Landscaping', etc.)",
  "services": ["Array of specific services offered - be detailed"],
  "usps": ["Array of unique selling points, certifications, or differentiators mentioned (e.g., 'Licensed & Insured', '24/7 Emergency Service', 'Family Owned Since 1985')"],
  "certifications": ["Array of certifications, licenses, or memberships mentioned"],
  "yearsInBusiness": "Number of years in business if mentioned (as integer)",
  "socialLinks": {
    "facebook": "Facebook URL if found",
    "instagram": "Instagram URL if found",
    "linkedin": "LinkedIn URL if found",
    "twitter": "Twitter/X URL if found",
    "youtube": "YouTube URL if found",
    "yelp": "Yelp URL if found"
  },
  "targetAudience": "One of: 'homeowners', 'commercial', 'both', or 'property'",
  "brandVoice": "Detected tone: 'professional', 'friendly', 'authoritative', 'educational', 'innovative', 'local', 'luxury', or 'value'",
  "writingStyle": "Detected style: 'conversational', 'formal', 'storytelling', 'data-driven', 'actionable', or 'persuasive'"
}

Important:
- Extract REAL information from the content, don't make things up
- For services, list specific services mentioned (e.g., "Roof Repair", "AC Installation")
- For USPs, look for guarantees, certifications, awards, years in business, etc.
- If you can't find information for a field, use null
- Return ONLY the JSON object, no other text`;

    const analysisResult = await generateText({
      model: MODELS.conductor,
      prompt: analysisPrompt,
      temperature: 0.3, // Lower temperature for more accurate extraction
    });

    // Parse the AI response
    let extractedData;
    try {
      const jsonMatch = analysisResult.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      return res.status(500).json({
        success: false,
        error: "Failed to parse website analysis results"
      });
    }

    // Detect industry type from the extracted industry name
    const industryName = extractedData.industry || "";
    const { industryType, customIndustryName } = detectIndustry(industryName);

    // Build the response data
    const responseData: ResearchResult["data"] = {
      name: extractedData.name || undefined,
      tagline: extractedData.tagline || undefined,
      phone: extractedData.phone || undefined,
      email: extractedData.email || undefined,
      address: extractedData.address || undefined,
      state: extractedData.state || undefined,
      stateAbbr: extractedData.stateAbbr || undefined,
      headquarters: extractedData.city || undefined,
      cities: extractedData.serviceCities || [],
      industryType: industryType,
      customIndustryName: industryType === "custom" ? (industryName || customIndustryName) : undefined,
      services: extractedData.services || [],
      usps: extractedData.usps || [],
      certifications: extractedData.certifications || [],
      yearsInBusiness: extractedData.yearsInBusiness ? parseInt(extractedData.yearsInBusiness) : undefined,
      socialLinks: {
        facebook: extractedData.socialLinks?.facebook || undefined,
        instagram: extractedData.socialLinks?.instagram || undefined,
        linkedin: extractedData.socialLinks?.linkedin || undefined,
        twitter: extractedData.socialLinks?.twitter || undefined,
        youtube: extractedData.socialLinks?.youtube || undefined,
        yelp: extractedData.socialLinks?.yelp || undefined,
      },
      audience: extractedData.targetAudience || "both",
      brandVoice: extractedData.brandVoice || undefined,
      writingStyle: extractedData.writingStyle || undefined,
    };

    // Clean up undefined social links
    if (responseData.socialLinks) {
      const cleanedSocial: typeof responseData.socialLinks = {};
      for (const [key, value] of Object.entries(responseData.socialLinks)) {
        if (value && value !== "null") {
          cleanedSocial[key as keyof typeof responseData.socialLinks] = value;
        }
      }
      responseData.socialLinks = Object.keys(cleanedSocial).length > 0 ? cleanedSocial : undefined;
    }

    return res.status(200).json({
      success: true,
      data: responseData,
      pagesAnalyzed: [url],
    });

  } catch (error) {
    console.error("Research error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to research website",
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
  maxDuration: 60,
};
