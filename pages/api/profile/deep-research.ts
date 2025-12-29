// pages/api/profile/deep-research.ts
// Deep company research API - KIMI2 + LLAMA 4 Maverick orchestrate comprehensive research
// Uses Bright Data for real social media discovery and competitor analysis

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { generateText } from "ai";
import { MODELS } from "../../../lib/ai-gateway";
import type { CompanyProfile, SocialLinks, AdditionalLink } from "../../../lib/page-types";
import { BrightData, isBrightDataConfigured, SocialProfileData } from "../../../lib/brightdata";

// AI Models for different research phases
const AI_MODELS = {
  strategy: {
    model: MODELS.conductor,
  },
  analysis: {
    model: MODELS.codeWriter,
  },
  research: {
    model: MODELS.researcher,
  },
};

// Research result structure
export interface DeepResearchResult {
  success: boolean;
  profile?: Partial<CompanyProfile>;
  socialLinks?: SocialLinks;
  additionalLinks?: AdditionalLink[];
  competitorAnalysis?: {
    competitors: string[];
    strengthsWeaknesses: string[];
    opportunities: string[];
  };
  seoInsights?: {
    primaryKeywords: string[];
    contentGaps: string[];
    localSEOScore: number;
    recommendations: string[];
  };
  conversionInsights?: {
    uspStrength: number;
    trustSignals: string[];
    ctaRecommendations: string[];
  };
  researchSources?: string[];
  aiTeamNotes?: {
    maverick: string;
    kimi: string;
  };
  // NEW: Missing fields detection and user prompts
  missingFields?: {
    field: string;
    label: string;
    priority: "high" | "medium" | "low";
    prompt: string; // AI-generated prompt to ask user
  }[];
  dataQuality?: {
    score: number; // 0-100 confidence in data found
    limitedInfo: boolean; // True if little info was found
    usedCompetitorResearch: boolean; // True if we fell back to competitor research
    recommendedActions: string[];
  };
  error?: string;
}

// Directory search patterns for various platforms
const DIRECTORY_PLATFORMS = [
  { name: "Better Business Bureau", domain: "bbb.org", category: "directory" as const },
  { name: "Angi (Angie's List)", domain: "angi.com", category: "directory" as const },
  { name: "HomeAdvisor", domain: "homeadvisor.com", category: "directory" as const },
  { name: "Thumbtack", domain: "thumbtack.com", category: "directory" as const },
  { name: "Houzz", domain: "houzz.com", category: "directory" as const },
  { name: "Porch", domain: "porch.com", category: "directory" as const },
  { name: "Yelp", domain: "yelp.com", category: "review_platform" as const },
  { name: "Google Business Profile", domain: "google.com/maps", category: "review_platform" as const },
  { name: "Trustpilot", domain: "trustpilot.com", category: "review_platform" as const },
  { name: "BuildZoom", domain: "buildzoom.com", category: "directory" as const },
  { name: "Manta", domain: "manta.com", category: "directory" as const },
  { name: "Yellow Pages", domain: "yellowpages.com", category: "directory" as const },
];

const SOCIAL_PLATFORMS = [
  { name: "Facebook", key: "facebook", domain: "facebook.com" },
  { name: "Instagram", key: "instagram", domain: "instagram.com" },
  { name: "LinkedIn", key: "linkedin", domain: "linkedin.com" },
  { name: "Twitter/X", key: "twitter", domain: "twitter.com" },
  { name: "YouTube", key: "youtube", domain: "youtube.com" },
  { name: "TikTok", key: "tiktok", domain: "tiktok.com" },
  { name: "Pinterest", key: "pinterest", domain: "pinterest.com" },
  { name: "Nextdoor", key: "nextdoor", domain: "nextdoor.com" },
];

const MANUFACTURER_PLATFORMS = [
  { name: "GAF Certified Contractor", domain: "gaf.com", industry: ["roofing"] },
  { name: "Owens Corning Preferred", domain: "owenscorning.com", industry: ["roofing"] },
  { name: "CertainTeed SELECT", domain: "certainteed.com", industry: ["roofing", "siding"] },
  { name: "James Hardie Elite", domain: "jameshardie.com", industry: ["siding"] },
  { name: "Trane Comfort Specialist", domain: "trane.com", industry: ["hvac"] },
  { name: "Carrier Factory Authorized", domain: "carrier.com", industry: ["hvac"] },
  { name: "Lennox Premier Dealer", domain: "lennox.com", industry: ["hvac"] },
  { name: "Kohler Registered", domain: "kohler.com", industry: ["plumbing"] },
];

// Critical fields that should prompt user if missing
const CRITICAL_FIELDS = [
  { field: "name", label: "Company Name", prompt: "What is your company's official name?" },
  { field: "industryType", label: "Industry", prompt: "What industry does your company operate in?" },
  { field: "phone", label: "Phone Number", prompt: "What is your business phone number?" },
  { field: "headquarters", label: "City/Location", prompt: "What city is your business located in?" },
  { field: "state", label: "State", prompt: "What state is your business located in?" },
  { field: "services", label: "Services", prompt: "What are the main services you offer?" },
  { field: "audience", label: "Target Audience", prompt: "Who is your ideal customer? (homeowners, commercial, both)" },
  { field: "valueProposition", label: "Value Proposition", prompt: "What makes your business unique? Why should customers choose you?" },
];

// Bright Data-powered social media discovery
async function discoverSocialWithBrightData(params: {
  websiteUrl?: string;
  companyName?: string;
  location?: string;
}): Promise<{
  socialLinks: SocialLinks;
  socialProfiles: SocialProfileData[];
  sources: string[];
}> {
  const socialLinks: SocialLinks = {};
  const socialProfiles: SocialProfileData[] = [];
  const sources: string[] = [];

  if (!isBrightDataConfigured()) {
    console.log("[Deep Research] Bright Data not configured, skipping social discovery");
    return { socialLinks, socialProfiles, sources };
  }

  try {
    // Step 1: Scrape the company website to extract social links
    if (params.websiteUrl) {
      console.log("[Deep Research] Scraping website for social links...");
      try {
        const websiteData = await BrightData.scrape(params.websiteUrl);
        if (websiteData.socialLinks) {
          Object.assign(socialLinks, websiteData.socialLinks);
          sources.push(`Website: ${params.websiteUrl}`);
          console.log("[Deep Research] Found social links from website:", Object.keys(websiteData.socialLinks));
        }
      } catch (scrapeError) {
        console.log("[Deep Research] Website scrape failed:", scrapeError);
      }
    }

    // Step 2: Search Google for social profiles if not found from website
    if (params.companyName) {
      const searchQueries = [
        `"${params.companyName}" site:facebook.com`,
        `"${params.companyName}" site:instagram.com`,
        `"${params.companyName}" site:linkedin.com/company`,
        `"${params.companyName}" site:youtube.com`,
      ];

      for (const query of searchQueries) {
        try {
          const searchResult = await BrightData.search(query, { numResults: 3 });
          if (searchResult.results.length > 0) {
            const url = searchResult.results[0].url;

            // Extract platform and add to socialLinks
            if (url.includes("facebook.com") && !socialLinks.facebook) {
              socialLinks.facebook = url;
              sources.push(`Google search: ${query}`);
            } else if (url.includes("instagram.com") && !socialLinks.instagram) {
              socialLinks.instagram = url;
              sources.push(`Google search: ${query}`);
            } else if (url.includes("linkedin.com") && !socialLinks.linkedin) {
              socialLinks.linkedin = url;
              sources.push(`Google search: ${query}`);
            } else if (url.includes("youtube.com") && !socialLinks.youtube) {
              socialLinks.youtube = url;
              sources.push(`Google search: ${query}`);
            }
          }
        } catch (searchError) {
          console.log(`[Deep Research] Search failed for ${query}:`, searchError);
        }
      }
    }

    // Step 3: Get detailed social profile data for found profiles
    const profilePromises: Promise<SocialProfileData>[] = [];

    if (socialLinks.instagram) {
      profilePromises.push(BrightData.social.instagram(socialLinks.instagram));
    }
    if (socialLinks.linkedin) {
      profilePromises.push(BrightData.social.linkedin(socialLinks.linkedin));
    }
    if (socialLinks.youtube) {
      profilePromises.push(BrightData.social.youtube(socialLinks.youtube));
    }

    if (profilePromises.length > 0) {
      console.log("[Deep Research] Fetching detailed social profile data...");
      const profiles = await Promise.all(profilePromises);
      socialProfiles.push(...profiles.filter(p => p.displayName || p.followers));
    }

    console.log("[Deep Research] Social discovery complete:", {
      linksFound: Object.keys(socialLinks).length,
      profilesEnriched: socialProfiles.length,
    });

  } catch (error) {
    console.error("[Deep Research] Bright Data social discovery error:", error);
  }

  return { socialLinks, socialProfiles, sources };
}

// Competitor research fallback when limited info is available
async function researchCompetitors(params: {
  industryType: string;
  location: string;
  companyName?: string;
}): Promise<{
  competitors: string[];
  competitorInsights: {
    commonServices: string[];
    commonUsps: string[];
    suggestedKeywords: string[];
  };
  sources: string[];
}> {
  const result = {
    competitors: [] as string[],
    competitorInsights: {
      commonServices: [] as string[],
      commonUsps: [] as string[],
      suggestedKeywords: [] as string[],
    },
    sources: [] as string[],
  };

  try {
    console.log("[Deep Research] Running competitor research fallback...");

    // Search for competitors in the area
    const searchQuery = `best ${params.industryType} companies in ${params.location}`;

    if (isBrightDataConfigured()) {
      const searchResult = await BrightData.search(searchQuery, { numResults: 10 });

      // Extract competitor names and domains
      for (const item of searchResult.results.slice(0, 5)) {
        if (item.domain && !item.domain.includes("yelp") && !item.domain.includes("yellowpages")) {
          result.competitors.push(item.title.split("|")[0].trim());
          result.sources.push(item.url);
        }
      }

      // Get People Also Ask questions for keyword ideas
      if (searchResult.paaQuestions) {
        result.competitorInsights.suggestedKeywords = searchResult.paaQuestions.slice(0, 5);
      }

      // Related searches can help identify common services
      if (searchResult.relatedSearches) {
        result.competitorInsights.commonServices = searchResult.relatedSearches
          .filter(s => s.includes(params.industryType) || s.includes("service"))
          .slice(0, 5);
      }
    }

    // Use AI to analyze and suggest common industry USPs
    const uspPrompt = `List 5 common unique selling points for ${params.industryType} companies in ${params.location}. Format as JSON array of strings.`;

    try {
      const uspResult = await generateText({
        model: AI_MODELS.strategy.model,
        system: "You are a marketing expert. Respond with valid JSON only.",
        prompt: uspPrompt,
        maxOutputTokens: 500,
        temperature: 0.7,
      });

      const cleaned = cleanJsonResponse(uspResult.text);
      const usps = JSON.parse(cleaned);
      if (Array.isArray(usps)) {
        result.competitorInsights.commonUsps = usps;
      }
    } catch (e) {
      console.log("[Deep Research] USP generation failed:", e);
    }

    console.log("[Deep Research] Competitor research complete:", {
      competitorsFound: result.competitors.length,
      servicesFound: result.competitorInsights.commonServices.length,
    });

  } catch (error) {
    console.error("[Deep Research] Competitor research error:", error);
  }

  return result;
}

// Calculate data quality score and detect missing fields
function analyzeDataQuality(profile: Partial<CompanyProfile>): {
  score: number;
  limitedInfo: boolean;
  missingFields: { field: string; label: string; priority: "high" | "medium" | "low"; prompt: string }[];
  recommendedActions: string[];
} {
  let foundFields = 0;
  const missingFields: { field: string; label: string; priority: "high" | "medium" | "low"; prompt: string }[] = [];
  const recommendedActions: string[] = [];

  // Check critical fields
  for (const { field, label, prompt } of CRITICAL_FIELDS) {
    const value = profile[field as keyof CompanyProfile];
    const isMissing = !value || (Array.isArray(value) && value.length === 0);

    if (isMissing) {
      const priority = ["name", "industryType", "services"].includes(field) ? "high" :
                       ["phone", "headquarters", "state"].includes(field) ? "medium" : "low";
      missingFields.push({ field, label, priority, prompt });
    } else {
      foundFields++;
    }
  }

  // Calculate score
  const score = Math.round((foundFields / CRITICAL_FIELDS.length) * 100);
  const limitedInfo = score < 40;

  // Generate recommended actions
  if (limitedInfo) {
    recommendedActions.push("Consider researching competitors to understand industry standards");
    recommendedActions.push("Fill in missing high-priority fields for better content generation");
  }

  const highPriorityMissing = missingFields.filter(f => f.priority === "high");
  if (highPriorityMissing.length > 0) {
    recommendedActions.push(`Complete these critical fields: ${highPriorityMissing.map(f => f.label).join(", ")}`);
  }

  if (!profile.socialLinks || Object.keys(profile.socialLinks).length === 0) {
    recommendedActions.push("Add social media links for better brand visibility");
  }

  return { score, limitedInfo, missingFields, recommendedActions };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DeepResearchResult>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }

  const { websiteUrl, companyName, location, industryType } = req.body;

  if (!websiteUrl && !companyName) {
    return res.status(400).json({
      success: false,
      error: "Website URL or company name is required",
    });
  }

  try {
    console.log("\n========================================");
    console.log("🎯 DEEP RESEARCH INITIATED");
    console.log("========================================");
    console.log(`Target: ${websiteUrl || companyName}`);

    // PHASE 1: Create research strategy
    console.log("\n📋 PHASE 1: Creating research strategy...");
    const strategy = await createResearchStrategy({
      websiteUrl,
      companyName,
      location,
      industryType,
    });

    // PHASE 1.5: Bright Data Social Discovery (NEW)
    console.log("\n📱 PHASE 1.5: Bright Data social media discovery...");
    const socialDiscovery = await discoverSocialWithBrightData({
      websiteUrl,
      companyName: companyName || strategy.suggestedCompanyName,
      location: location || strategy.suggestedLocation,
    });

    // PHASE 2: Execute deep research
    console.log("\n🔍 PHASE 2: Executing deep research...");
    const researchData = await executeDeepResearch({
      websiteUrl,
      companyName: companyName || strategy.suggestedCompanyName,
      location: location || strategy.suggestedLocation,
      industryType: industryType || strategy.suggestedIndustry,
      strategy,
    });

    // Merge Bright Data social links with AI-discovered links
    const mergedSocialProfiles = {
      ...researchData.socialProfiles,
      ...socialDiscovery.socialLinks,
    };

    // PHASE 3: Analyze and structure data
    console.log("\n📊 PHASE 3: Analyzing and structuring data...");
    const structuredData = await analyzeAndStructureData({
      rawResearch: {
        ...researchData,
        socialProfiles: mergedSocialProfiles,
      },
      websiteUrl,
      companyName: companyName || strategy.suggestedCompanyName,
    });

    // Merge social links from Bright Data into structured data
    if (Object.keys(socialDiscovery.socialLinks).length > 0) {
      structuredData.socialLinks = {
        ...structuredData.socialLinks,
        ...socialDiscovery.socialLinks,
      };
    }

    // PHASE 3.5: Check data quality and run competitor research if needed
    console.log("\n📈 PHASE 3.5: Analyzing data quality...");
    const initialQuality = analyzeDataQuality(structuredData.profile);
    let competitorResearchResult = null;
    let usedCompetitorFallback = false;

    if (initialQuality.limitedInfo && (industryType || strategy.suggestedIndustry) && (location || strategy.suggestedLocation)) {
      console.log("\n🔄 PHASE 3.6: Limited info detected - running competitor research...");
      usedCompetitorFallback = true;
      competitorResearchResult = await researchCompetitors({
        industryType: industryType || strategy.suggestedIndustry || "general",
        location: location || strategy.suggestedLocation || "United States",
        companyName: companyName || strategy.suggestedCompanyName,
      });

      // Merge competitor insights into structured data
      if (competitorResearchResult.competitors.length > 0) {
        structuredData.competitorAnalysis = {
          ...structuredData.competitorAnalysis,
          competitors: [
            ...(structuredData.competitorAnalysis?.competitors || []),
            ...competitorResearchResult.competitors,
          ].slice(0, 10),
          opportunities: [
            ...(structuredData.competitorAnalysis?.opportunities || []),
            ...competitorResearchResult.competitorInsights.suggestedKeywords,
          ],
        };

        // Suggest services based on competitor research if missing
        if (!structuredData.profile.services || structuredData.profile.services.length === 0) {
          structuredData.profile.services = competitorResearchResult.competitorInsights.commonServices;
        }

        // Suggest USPs if missing
        if (!structuredData.profile.usps || structuredData.profile.usps.length === 0) {
          structuredData.profile.usps = competitorResearchResult.competitorInsights.commonUsps;
        }
      }
    }

    // PHASE 4: Generate SEO recommendations
    console.log("\n🎯 PHASE 4: Generating SEO recommendations...");
    const seoRecommendations = await generateSEORecommendations({
      profile: structuredData.profile,
      competitorData: structuredData.competitorAnalysis,
    });

    // PHASE 5: Final data quality assessment
    console.log("\n✅ PHASE 5: Final data quality assessment...");
    const finalQuality = analyzeDataQuality({
      ...structuredData.profile,
      socialLinks: structuredData.socialLinks,
    });

    // Combine all research results
    const allSources = [
      ...(researchData.sources || []),
      ...socialDiscovery.sources,
      ...(competitorResearchResult?.sources || []),
    ];

    const finalResult: DeepResearchResult = {
      success: true,
      profile: {
        ...structuredData.profile,
        lastResearchedAt: new Date().toISOString(),
      },
      socialLinks: structuredData.socialLinks,
      additionalLinks: structuredData.additionalLinks,
      competitorAnalysis: structuredData.competitorAnalysis,
      seoInsights: seoRecommendations.seoInsights,
      conversionInsights: structuredData.conversionInsights,
      researchSources: allSources,
      aiTeamNotes: {
        maverick: strategy.strategyNotes + " | " + seoRecommendations.strategyNotes,
        kimi: structuredData.analysisNotes,
      },
      // NEW: Missing fields and data quality
      missingFields: finalQuality.missingFields,
      dataQuality: {
        score: finalQuality.score,
        limitedInfo: finalQuality.limitedInfo,
        usedCompetitorResearch: usedCompetitorFallback,
        recommendedActions: finalQuality.recommendedActions,
      },
    };

    console.log("\n========================================");
    console.log("✅ DEEP RESEARCH COMPLETE");
    console.log(`Data Quality Score: ${finalQuality.score}%`);
    console.log(`Missing Fields: ${finalQuality.missingFields.length}`);
    console.log(`Used Competitor Fallback: ${usedCompetitorFallback}`);
    console.log("========================================\n");

    return res.status(200).json(finalResult);
  } catch (error) {
    console.error("Deep research error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Research failed",
    });
  }
}

// Phase 1: Maverick creates the research strategy
async function createResearchStrategy(params: {
  websiteUrl?: string;
  companyName?: string;
  location?: string;
  industryType?: string;
}): Promise<{
  searchQueries: string[];
  priorityPlatforms: string[];
  competitorKeywords: string[];
  suggestedCompanyName?: string;
  suggestedLocation?: string;
  suggestedIndustry?: string;
  strategyNotes: string;
}> {
  const prompt = `You are a strategic research analyst. Your job is to create a comprehensive research strategy to gather ALL available information about a company for SEO domination.

TARGET COMPANY:
- Website: ${params.websiteUrl || "Not provided"}
- Company Name: ${params.companyName || "Unknown - need to discover"}
- Location: ${params.location || "Unknown - need to discover"}
- Industry: ${params.industryType || "Unknown - need to discover"}

CREATE A RESEARCH STRATEGY that covers:
1. What search queries to use to find ALL social media profiles
2. What search queries to use to find ALL directory listings (BBB, Angi, Yelp, HomeAdvisor, etc.)
3. What search queries to use to find manufacturer certifications
4. What keywords to use to find competitors
5. What to look for on their website for SEO analysis

Respond in this JSON format:
{
  "searchQueries": [
    "company name + facebook",
    "company name + reviews",
    "company name + bbb",
    "company name + city + service"
  ],
  "priorityPlatforms": ["facebook", "google business", "bbb", "yelp", "angi"],
  "competitorKeywords": ["keyword + city", "service + near me"],
  "suggestedCompanyName": "if discoverable from website",
  "suggestedLocation": "city, state if discoverable",
  "suggestedIndustry": "industry type if discoverable",
  "strategyNotes": "Strategic observations and recommendations"
}`;

  try {
    const result = await generateText({
      model: AI_MODELS.strategy.model,
      system: "You are a strategic analyst. Always respond with valid JSON only.",
      prompt,
      maxOutputTokens: 2000,
      temperature: 0.7,
    });

    const cleaned = cleanJsonResponse(result.text);
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Blueprint strategy error:", error);
    return {
      searchQueries: [
        `"${params.companyName || ""}" site:facebook.com`,
        `"${params.companyName || ""}" site:bbb.org`,
        `"${params.companyName || ""}" reviews`,
      ],
      priorityPlatforms: ["facebook", "google", "bbb", "yelp"],
      competitorKeywords: [`${params.industryType || "service"} ${params.location || ""}`],
      strategyNotes: "Using fallback strategy due to AI error",
    };
  }
}

// Phase 2: Execute deep research
async function executeDeepResearch(params: {
  websiteUrl?: string;
  companyName?: string;
  location?: string;
  industryType?: string;
  strategy: { searchQueries: string[]; priorityPlatforms: string[] };
}): Promise<{
  companyInfo: Record<string, unknown>;
  socialProfiles: Record<string, string>;
  directoryListings: { name: string; url: string; category: string }[];
  reviews: { platform: string; rating?: number; count?: number }[];
  competitors: string[];
  websiteAnalysis: Record<string, unknown>;
  sources: string[];
}> {
  const researchPrompt = `You are an expert research investigator for trade services. Conduct COMPREHENSIVE research on this company to gather ALL available information for SEO and conversion optimization.

TARGET:
- Website: ${params.websiteUrl || "Not provided"}
- Company Name: ${params.companyName}
- Location: ${params.location}
- Industry: ${params.industryType}

RESEARCH MISSION:
1. Find ALL social media profiles (Facebook, Instagram, LinkedIn, Twitter, YouTube, TikTok, Pinterest, Nextdoor)
2. Find ALL directory listings (BBB, Angi, HomeAdvisor, Yelp, Google Business, Houzz, Thumbtack, Porch)
3. Find manufacturer certifications if applicable
4. Identify main competitors in the area
5. Analyze website for SEO factors
6. Find review ratings across platforms
7. Identify USPs and trust signals
8. Find contact information (phone, email, address)
9. Find service areas and services offered

Search using these strategies: ${params.strategy.searchQueries.slice(0, 5).join(", ")}

Respond with comprehensive JSON:
{
  "companyInfo": {
    "name": "official company name",
    "tagline": "company tagline if found",
    "phone": "phone number",
    "email": "email address",
    "address": "full address",
    "city": "city",
    "state": "state",
    "stateAbbr": "XX",
    "zipCode": "zip",
    "services": ["service1", "service2"],
    "serviceAreas": ["city1", "city2"],
    "yearsInBusiness": number,
    "employeeCount": "range",
    "certifications": ["cert1", "cert2"],
    "awards": ["award1"],
    "usps": ["unique selling point 1", "usp 2"]
  },
  "socialProfiles": {
    "facebook": "full URL or null",
    "instagram": "full URL or null",
    "linkedin": "full URL or null",
    "twitter": "full URL or null",
    "youtube": "full URL or null",
    "tiktok": "full URL or null",
    "pinterest": "full URL or null",
    "nextdoor": "full URL or null"
  },
  "directoryListings": [
    {"name": "BBB", "url": "full url", "category": "directory"},
    {"name": "Yelp", "url": "full url", "category": "review_platform"}
  ],
  "reviews": [
    {"platform": "Google", "rating": 4.8, "count": 150},
    {"platform": "Yelp", "rating": 4.5, "count": 45}
  ],
  "competitors": ["competitor 1", "competitor 2", "competitor 3"],
  "websiteAnalysis": {
    "hasSSL": true,
    "mobileOptimized": true,
    "pageSpeed": "estimate",
    "contentQuality": "assessment",
    "localSEO": "assessment",
    "missingElements": ["element1", "element2"]
  },
  "sources": ["source URL 1", "source URL 2"]
}`;

  try {
    const result = await generateText({
      model: AI_MODELS.research.model,
      prompt: researchPrompt,
      maxOutputTokens: 4000,
      temperature: 0.5,
    });

    const cleaned = cleanJsonResponse(result.text);
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Scout research error:", error);
    return {
      companyInfo: { name: params.companyName },
      socialProfiles: {},
      directoryListings: [],
      reviews: [],
      competitors: [],
      websiteAnalysis: {},
      sources: [],
    };
  }
}

// Phase 3: Analyze and structure the data
async function analyzeAndStructureData(params: {
  rawResearch: Record<string, unknown>;
  websiteUrl?: string;
  companyName?: string;
}): Promise<{
  profile: Partial<CompanyProfile>;
  socialLinks: SocialLinks;
  additionalLinks: AdditionalLink[];
  competitorAnalysis: {
    competitors: string[];
    strengthsWeaknesses: string[];
    opportunities: string[];
  };
  conversionInsights: {
    uspStrength: number;
    trustSignals: string[];
    ctaRecommendations: string[];
  };
  analysisNotes: string;
}> {
  const analysisPrompt = `You are a data intelligence analyst. Analyze this research data and structure it for optimal SEO and conversion performance.

RAW RESEARCH DATA:
${JSON.stringify(params.rawResearch, null, 2)}

ANALYSIS TASKS:
1. Clean and validate all data
2. Identify strengths and weaknesses vs competitors
3. Calculate USP strength score (1-10)
4. Identify trust signals for conversions
5. Recommend CTAs based on industry
6. Note any data quality issues or gaps

Respond with structured JSON:
{
  "profile": {
    "name": "cleaned company name",
    "tagline": "tagline",
    "website": "${params.websiteUrl}",
    "phone": "formatted phone",
    "email": "email",
    "address": "formatted address",
    "state": "full state name",
    "stateAbbr": "XX",
    "headquarters": "city",
    "cities": ["service area cities"],
    "industryType": "detected industry",
    "services": ["cleaned services list"],
    "usps": ["unique selling points"],
    "certifications": ["certifications"],
    "awards": ["awards"],
    "yearsInBusiness": number,
    "audience": "homeowners|commercial|both",
    "brandVoice": "professional|friendly|etc",
    "writingStyle": "suggested style"
  },
  "socialLinks": {
    "facebook": "url or null",
    "instagram": "url or null",
    "linkedin": "url or null",
    "twitter": "url or null",
    "youtube": "url or null",
    "tiktok": "url or null",
    "yelp": "url or null",
    "googleBusiness": "url or null"
  },
  "additionalLinks": [
    {
      "id": "unique-id",
      "name": "Platform Name",
      "url": "full url",
      "category": "directory|manufacturer|networking|review_platform",
      "isVerified": false,
      "isAiSuggested": true,
      "addedAt": "ISO date"
    }
  ],
  "competitorAnalysis": {
    "competitors": ["competitor names"],
    "strengthsWeaknesses": ["Our strength: X", "Our weakness: Y"],
    "opportunities": ["opportunity 1", "opportunity 2"]
  },
  "conversionInsights": {
    "uspStrength": 8,
    "trustSignals": ["BBB Accredited", "5-star Google rating", "Licensed & Insured"],
    "ctaRecommendations": ["Get Free Estimate", "Schedule Consultation", "View Our Work"]
  },
  "analysisNotes": "Data quality assessment and recommendations"
}`;

  try {
    const result = await generateText({
      model: AI_MODELS.analysis.model,
      system: "You are a data analyst. Always respond with valid JSON only, no markdown.",
      prompt: analysisPrompt,
      maxOutputTokens: 4000,
      temperature: 0.4,
    });

    const cleaned = cleanJsonResponse(result.text);
    const data = JSON.parse(cleaned);

    // Add timestamps to additional links
    if (data.additionalLinks) {
      data.additionalLinks = data.additionalLinks.map((link: AdditionalLink, i: number) => ({
        ...link,
        id: link.id || `ai-${Date.now()}-${i}`,
        addedAt: link.addedAt || new Date().toISOString(),
        isAiSuggested: true,
        isVerified: false,
      }));
    }

    return data;
  } catch (error) {
    console.error("Data analysis error:", error);
    return {
      profile: { name: params.companyName, website: params.websiteUrl },
      socialLinks: {},
      additionalLinks: [],
      competitorAnalysis: { competitors: [], strengthsWeaknesses: [], opportunities: [] },
      conversionInsights: { uspStrength: 5, trustSignals: [], ctaRecommendations: [] },
      analysisNotes: "Analysis failed - using raw data",
    };
  }
}

// Phase 4: Generate SEO recommendations
async function generateSEORecommendations(params: {
  profile: Partial<CompanyProfile>;
  competitorData?: { competitors: string[]; opportunities: string[] };
}): Promise<{
  seoInsights: {
    primaryKeywords: string[];
    contentGaps: string[];
    localSEOScore: number;
    recommendations: string[];
  };
  strategyNotes: string;
}> {
  const seoPrompt = `You are a strategic SEO analyst. Based on this company profile, provide strategic SEO recommendations for market domination.

COMPANY PROFILE:
${JSON.stringify(params.profile, null, 2)}

COMPETITOR DATA:
${JSON.stringify(params.competitorData, null, 2)}

PROVIDE:
1. Top 10 primary keywords to target (include location-based)
2. Content gaps to exploit
3. Local SEO score (1-100) based on available data
4. Top 5 actionable SEO recommendations

Respond in JSON:
{
  "seoInsights": {
    "primaryKeywords": ["keyword 1", "keyword 2", "location + service", etc],
    "contentGaps": ["missing blog topic 1", "underserved keyword"],
    "localSEOScore": 75,
    "recommendations": [
      "Create service area pages for each city",
      "Add more customer reviews",
      "Optimize Google Business Profile",
      "Build backlinks from local directories",
      "Create before/after content"
    ]
  },
  "strategyNotes": "Strategic summary and priority actions"
}`;

  try {
    const result = await generateText({
      model: AI_MODELS.strategy.model,
      system: "You are an SEO strategist. Respond with valid JSON only.",
      prompt: seoPrompt,
      maxOutputTokens: 2000,
      temperature: 0.6,
    });

    const cleaned = cleanJsonResponse(result.text);
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("SEO analysis error:", error);
    return {
      seoInsights: {
        primaryKeywords: [],
        contentGaps: [],
        localSEOScore: 50,
        recommendations: ["Complete company profile", "Add social media links", "Gather reviews"],
      },
      strategyNotes: "Using fallback recommendations",
    };
  }
}

// Helper to clean JSON from AI responses
function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
  return cleaned.trim();
}
