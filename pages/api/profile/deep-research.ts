// pages/api/profile/deep-research.ts
// Deep company research API - KIMI2 + LLAMA 4 Maverick orchestrate comprehensive research

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { generateText } from "ai";
import { MODELS } from "../../../lib/ai-gateway";
import type { CompanyProfile, SocialLinks, AdditionalLink } from "../../../lib/page-types";

// AI Crew Personas - Trade Services Themed
const AI_MANAGERS = {
  blueprint: {
    name: "Blueprint",
    role: "Chief Strategy Officer",
    model: MODELS.conductor,
    description: "LLAMA 4 Blueprint - Orchestrates research strategy and SEO planning",
  },
  foreman: {
    name: "Foreman",
    role: "Data Intelligence Director",
    model: MODELS.codeWriter,
    description: "Foreman (K2) - Analyzes data, structures findings, ensures quality",
  },
  scout: {
    name: "Scout",
    role: "Research Specialist",
    model: MODELS.researcher,
    description: "Scout (Perplexity) - Deep web research and competitive analysis",
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

    // PHASE 1: Maverick creates research strategy
    console.log("\n📋 PHASE 1: Blueprint creating research strategy...");
    const strategy = await createResearchStrategy({
      websiteUrl,
      companyName,
      location,
      industryType,
    });

    // PHASE 2: Scout executes deep research
    console.log("\n🔍 PHASE 2: Scout executing deep research...");
    const researchData = await executeDeepResearch({
      websiteUrl,
      companyName: companyName || strategy.suggestedCompanyName,
      location: location || strategy.suggestedLocation,
      industryType: industryType || strategy.suggestedIndustry,
      strategy,
    });

    // PHASE 3: Foreman analyzes and structures data
    console.log("\n📊 PHASE 3: Foreman analyzing and structuring data...");
    const structuredData = await analyzeAndStructureData({
      rawResearch: researchData,
      websiteUrl,
      companyName: companyName || strategy.suggestedCompanyName,
    });

    // PHASE 4: Blueprint provides final SEO recommendations
    console.log("\n🎯 PHASE 4: Blueprint providing SEO recommendations...");
    const seoRecommendations = await generateSEORecommendations({
      profile: structuredData.profile,
      competitorData: structuredData.competitorAnalysis,
    });

    // Combine all research results
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
      researchSources: researchData.sources,
      aiTeamNotes: {
        maverick: strategy.maverickNotes + " | " + seoRecommendations.maverickNotes,
        kimi: structuredData.kimiNotes,
      },
    };

    console.log("\n========================================");
    console.log("✅ DEEP RESEARCH COMPLETE");
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
  maverickNotes: string;
}> {
  const prompt = `You are Maverick, the Chief Strategy Officer for an AI research team. Your job is to create a comprehensive research strategy to gather ALL available information about a company for SEO domination.

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
  "maverickNotes": "Strategic observations and recommendations"
}`;

  try {
    const result = await generateText({
      model: AI_MANAGERS.blueprint.model,
      system: "You are Blueprint, an AI strategist. Always respond with valid JSON only.",
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
      maverickNotes: "Using fallback strategy due to AI error",
    };
  }
}

// Phase 2: Scout executes deep research
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
  const researchPrompt = `You are Scout, an expert research investigator for trade services. Conduct COMPREHENSIVE research on this company to gather ALL available information for SEO and conversion optimization.

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
      model: AI_MANAGERS.scout.model,
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

// Phase 3: Foreman analyzes and structures the data
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
  kimiNotes: string;
}> {
  const analysisPrompt = `You are KIMI, the Data Intelligence Director. Analyze this research data and structure it for optimal SEO and conversion performance.

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
  "kimiNotes": "Data quality assessment and recommendations"
}`;

  try {
    const result = await generateText({
      model: AI_MANAGERS.foreman.model,
      system: "You are Foreman, a data analyst. Always respond with valid JSON only, no markdown.",
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
    console.error("KIMI analysis error:", error);
    return {
      profile: { name: params.companyName, website: params.websiteUrl },
      socialLinks: {},
      additionalLinks: [],
      competitorAnalysis: { competitors: [], strengthsWeaknesses: [], opportunities: [] },
      conversionInsights: { uspStrength: 5, trustSignals: [], ctaRecommendations: [] },
      kimiNotes: "Analysis failed - using raw data",
    };
  }
}

// Phase 4: Maverick provides SEO recommendations
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
  maverickNotes: string;
}> {
  const seoPrompt = `You are Maverick, the Chief Strategy Officer. Based on this company profile, provide strategic SEO recommendations for market domination.

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
  "maverickNotes": "Strategic summary and priority actions"
}`;

  try {
    const result = await generateText({
      model: AI_MANAGERS.blueprint.model,
      system: "You are Blueprint, an SEO strategist. Respond with valid JSON only.",
      prompt: seoPrompt,
      maxOutputTokens: 2000,
      temperature: 0.6,
    });

    const cleaned = cleanJsonResponse(result.text);
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Blueprint SEO error:", error);
    return {
      seoInsights: {
        primaryKeywords: [],
        contentGaps: [],
        localSEOScore: 50,
        recommendations: ["Complete company profile", "Add social media links", "Gather reviews"],
      },
      maverickNotes: "Using fallback recommendations",
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
