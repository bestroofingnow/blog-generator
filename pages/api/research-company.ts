// pages/api/research-company.ts
// Deep research endpoint that analyzes a company website and extracts profile data

import type { NextApiRequest, NextApiResponse } from "next";
import { generateText } from "ai";
import { MODELS } from "../../lib/ai-gateway";

interface SuggestedContent {
  type: "blog" | "service_page" | "location_page";
  title: string;
  primaryKeyword: string;
  priority: "high" | "medium" | "low";
  reason: string;
}

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
      tiktok?: string;
      pinterest?: string;
      nextdoor?: string;
      bbb?: string;
      angieslist?: string;
      homeadvisor?: string;
      thumbtack?: string;
    };
    audience?: "homeowners" | "commercial" | "both" | "property";
    brandVoice?: string;
    writingStyle?: string;
    // Deep research additions
    competitors?: string[];
    keywords?: string[];
    suggestedContent?: SuggestedContent[];
    seoInsights?: {
      missingPages: string[];
      contentGaps: string[];
      localSEOOpportunities: string[];
    };
    researchedAt?: string;
    pagesAnalyzed?: string[];
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

// Social media patterns to extract from HTML
const SOCIAL_PATTERNS: Record<string, RegExp> = {
  facebook: /(?:https?:\/\/)?(?:www\.)?facebook\.com\/[a-zA-Z0-9._-]+\/?/gi,
  instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/[a-zA-Z0-9._-]+\/?/gi,
  linkedin: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9._-]+\/?/gi,
  twitter: /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/[a-zA-Z0-9._-]+\/?/gi,
  youtube: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:channel|c|user|@)[a-zA-Z0-9._-]+\/?/gi,
  yelp: /(?:https?:\/\/)?(?:www\.)?yelp\.com\/biz\/[a-zA-Z0-9._-]+\/?/gi,
  tiktok: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[a-zA-Z0-9._-]+\/?/gi,
  pinterest: /(?:https?:\/\/)?(?:www\.)?pinterest\.com\/[a-zA-Z0-9._-]+\/?/gi,
  nextdoor: /(?:https?:\/\/)?(?:www\.)?nextdoor\.com\/[a-zA-Z0-9._/-]+\/?/gi,
  bbb: /(?:https?:\/\/)?(?:www\.)?bbb\.org\/[a-zA-Z0-9._/-]+\/?/gi,
  angieslist: /(?:https?:\/\/)?(?:www\.)?angi\.com\/[a-zA-Z0-9._/-]+\/?/gi,
  homeadvisor: /(?:https?:\/\/)?(?:www\.)?homeadvisor\.com\/[a-zA-Z0-9._/-]+\/?/gi,
  thumbtack: /(?:https?:\/\/)?(?:www\.)?thumbtack\.com\/[a-zA-Z0-9._/-]+\/?/gi,
  googleBusiness: /(?:https?:\/\/)?(?:www\.)?(?:google\.com\/maps|g\.page|maps\.app\.goo\.gl)\/[a-zA-Z0-9._/-]+\/?/gi,
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

// Extract social links from raw HTML
function extractSocialLinks(html: string): Record<string, string> {
  const socialLinks: Record<string, string> = {};

  for (const [platform, pattern] of Object.entries(SOCIAL_PATTERNS)) {
    const matches = html.match(pattern);
    if (matches && matches.length > 0) {
      // Get the first match and ensure it has https://
      let url = matches[0];
      if (!url.startsWith("http")) {
        url = "https://" + url;
      }
      socialLinks[platform] = url;
    }
  }

  return socialLinks;
}

// Find internal page links
function findInternalPages(html: string, baseUrl: string): string[] {
  const pagePatterns = [
    /href=["']([^"']*(?:about|about-us|company|who-we-are)[^"']*)["']/gi,
    /href=["']([^"']*(?:services|our-services|what-we-do)[^"']*)["']/gi,
    /href=["']([^"']*(?:contact|contact-us|get-in-touch)[^"']*)["']/gi,
    /href=["']([^"']*(?:areas|locations|service-areas|cities)[^"']*)["']/gi,
    /href=["']([^"']*(?:testimonials|reviews|customers)[^"']*)["']/gi,
  ];

  const foundPages = new Set<string>();
  const baseUrlObj = new URL(baseUrl);

  for (const pattern of pagePatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      let href = match[1];
      // Skip external links, anchors, javascript, etc.
      if (href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        continue;
      }
      // Convert relative URLs to absolute
      try {
        const fullUrl = new URL(href, baseUrl);
        // Only include same-domain pages
        if (fullUrl.hostname === baseUrlObj.hostname) {
          foundPages.add(fullUrl.href);
        }
      } catch {
        // Skip invalid URLs
      }
    }
  }

  return Array.from(foundPages).slice(0, 5); // Limit to 5 additional pages
}

async function fetchWebsiteContent(url: string): Promise<{ text: string; html: string }> {
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

    return { text, html };
  } catch (error) {
    console.error("Error fetching website:", error);
    throw error;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResearchResult>) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { url, deepResearch = true } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: "URL is required" });
  }

  try {
    // Normalize base URL
    let baseUrl = url.trim();
    if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
      baseUrl = "https://" + baseUrl;
    }

    // Fetch homepage content
    const homePageData = await fetchWebsiteContent(baseUrl);

    if (!homePageData.text || homePageData.text.length < 100) {
      return res.status(400).json({
        success: false,
        error: "Could not extract enough content from the website. The site may be blocking automated access."
      });
    }

    // Extract social links from HTML
    const extractedSocialLinks = extractSocialLinks(homePageData.html);

    // Find and crawl additional pages if deep research is enabled
    const pagesAnalyzed: string[] = [baseUrl];
    let allContent = homePageData.text;

    if (deepResearch) {
      const additionalPages = findInternalPages(homePageData.html, baseUrl);

      for (const pageUrl of additionalPages) {
        try {
          const pageData = await fetchWebsiteContent(pageUrl);
          if (pageData.text && pageData.text.length > 100) {
            allContent += `\n\n--- PAGE: ${pageUrl} ---\n\n${pageData.text}`;
            pagesAnalyzed.push(pageUrl);
            // Also extract social links from additional pages
            const pageSocialLinks = extractSocialLinks(pageData.html);
            Object.assign(extractedSocialLinks, pageSocialLinks);
          }
        } catch {
          // Skip pages that fail to load
        }
      }
    }

    // Limit total content for AI processing
    if (allContent.length > 30000) {
      allContent = allContent.substring(0, 30000) + "...";
    }

    // Use AI to analyze all collected content
    const analysisPrompt = `You are an expert SEO analyst and business researcher. Analyze the following website content from multiple pages and extract comprehensive information about this business.

WEBSITE CONTENT FROM ${pagesAnalyzed.length} PAGES:
${allContent}

Extract and return a JSON object with the following fields (use null for any fields you cannot determine):

{
  "name": "Company name (official business name)",
  "tagline": "Company tagline or slogan if mentioned",
  "phone": "Main phone number (format: (XXX) XXX-XXXX)",
  "email": "Main contact email",
  "address": "Full street address if available",
  "city": "City/headquarters location",
  "state": "Full state name (e.g., 'California')",
  "stateAbbr": "State abbreviation (e.g., 'CA')",
  "serviceCities": ["Array of ALL cities/areas they explicitly mention serving"],
  "industry": "Primary industry/trade (e.g., 'Roofing', 'HVAC', 'Plumbing')",
  "services": ["Array of ALL specific services offered - be comprehensive and detailed"],
  "usps": ["Array of unique selling points, guarantees, differentiators (e.g., 'Licensed & Insured', '24/7 Emergency Service', 'Family Owned Since 1985', 'Satisfaction Guaranteed')"],
  "certifications": ["Array of ALL certifications, licenses, memberships, manufacturer certifications"],
  "yearsInBusiness": "Number of years in business if mentioned (as integer)",
  "targetAudience": "One of: 'homeowners', 'commercial', 'both', or 'property'",
  "brandVoice": "Detected tone: 'professional', 'friendly', 'authoritative', 'educational', 'innovative', 'local', 'luxury', or 'value'",
  "writingStyle": "Detected style: 'conversational', 'formal', 'storytelling', 'data-driven', 'actionable', or 'persuasive'",
  "competitors": ["Names of any competitors mentioned or implied"],
  "keywords": ["Top 10 relevant SEO keywords this business should target based on their services and location"],
  "suggestedContent": [
    {
      "type": "blog or service_page or location_page",
      "title": "Suggested page/blog title",
      "primaryKeyword": "Target keyword for this content",
      "priority": "high or medium or low",
      "reason": "Brief explanation of why this content would help their SEO"
    }
  ],
  "seoInsights": {
    "missingPages": ["Pages they should have but don't seem to (e.g., 'Individual service pages', 'City-specific landing pages')"],
    "contentGaps": ["Topics they should cover but haven't (based on common industry content)"],
    "localSEOOpportunities": ["Local SEO improvements they could make"]
  }
}

CRITICAL INSTRUCTIONS:
1. Extract REAL information from the content - don't make things up
2. For services, be COMPREHENSIVE - list every specific service mentioned
3. For cities, include ALL areas/neighborhoods/cities mentioned
4. For USPs, look for guarantees, warranties, certifications, awards, response times, etc.
5. For suggestedContent, provide 5-10 actionable content ideas based on their services and location
6. Return ONLY the JSON object, no other text`;

    const analysisResult = await generateText({
      model: MODELS.conductor,
      prompt: analysisPrompt,
      temperature: 0.3,
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

    // Merge AI-extracted social links with regex-extracted ones (prefer AI if it found valid URLs)
    const mergedSocialLinks = { ...extractedSocialLinks };
    if (extractedData.socialLinks) {
      for (const [key, value] of Object.entries(extractedData.socialLinks)) {
        if (value && typeof value === "string" && value !== "null" && value.includes("http")) {
          mergedSocialLinks[key] = value as string;
        }
      }
    }

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
      socialLinks: Object.keys(mergedSocialLinks).length > 0 ? mergedSocialLinks : undefined,
      audience: extractedData.targetAudience || "both",
      brandVoice: extractedData.brandVoice || undefined,
      writingStyle: extractedData.writingStyle || undefined,
      // Deep research data
      competitors: extractedData.competitors || [],
      keywords: extractedData.keywords || [],
      suggestedContent: extractedData.suggestedContent || [],
      seoInsights: extractedData.seoInsights || undefined,
      researchedAt: new Date().toISOString(),
      pagesAnalyzed: pagesAnalyzed,
    };

    // Clean up undefined/null values in socialLinks
    if (responseData.socialLinks) {
      const cleanedSocial: Record<string, string> = {};
      for (const [key, value] of Object.entries(responseData.socialLinks)) {
        if (value && value !== "null" && typeof value === "string") {
          cleanedSocial[key] = value;
        }
      }
      responseData.socialLinks = Object.keys(cleanedSocial).length > 0 ? cleanedSocial as typeof responseData.socialLinks : undefined;
    }

    return res.status(200).json({
      success: true,
      data: responseData,
      pagesAnalyzed: pagesAnalyzed,
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
  maxDuration: 120, // Increased for deep research
};
