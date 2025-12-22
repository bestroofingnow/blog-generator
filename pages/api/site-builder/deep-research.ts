// pages/api/site-builder/deep-research.ts
// Deep industry research using Perplexity + Claude for unique site recommendations

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { generateText } from "ai";
import { MODELS } from "../../../lib/ai-gateway";

interface DeepResearchRequest {
  industry: string;
  businessName: string;
  city: string;
  state: string;
  existingServices?: string[];
}

interface Competitor {
  name: string;
  services: string[];
  strengths: string[];
}

interface ServiceRecommendation {
  name: string;
  rationale: string;
  priority: "high" | "medium" | "low";
  estimatedDemand: string;
}

interface LocationPage {
  area: string;
  rationale: string;
  targetServices: string[];
}

interface BlogTopic {
  title: string;
  angle: string;
  targetKeyword: string;
  priority: number;
}

interface DeepResearchResponse {
  success: boolean;
  research?: {
    competitors: Competitor[];
    industryTrends: string[];
    localMarketInsights: string[];
    searchTerms: string[];
  };
  recommendations?: {
    services: ServiceRecommendation[];
    locationPages: LocationPage[];
    blogTopics: BlogTopic[];
    uniqueSellingPoints: string[];
    contentStrategy: string;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DeepResearchResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const { industry, businessName, city, state, existingServices } = req.body as DeepResearchRequest;

  if (!industry || !city || !state) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: industry, city, state",
    });
  }

  try {
    console.log(`[Deep Research] Starting research for ${industry} in ${city}, ${state}`);

    // Step 1: Use Perplexity to research the market
    const marketResearch = await researchMarketWithPerplexity({
      industry,
      businessName,
      city,
      state,
    });

    console.log("[Deep Research] Market research complete");

    // Step 2: Use Claude to analyze research and generate recommendations
    const recommendations = await analyzeWithClaude({
      industry,
      businessName,
      city,
      state,
      existingServices: existingServices || [],
      marketResearch,
    });

    console.log("[Deep Research] Claude analysis complete");

    return res.status(200).json({
      success: true,
      research: marketResearch,
      recommendations,
    });
  } catch (error) {
    console.error("[Deep Research] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Research failed",
    });
  }
}

interface MarketResearchParams {
  industry: string;
  businessName: string;
  city: string;
  state: string;
}

interface MarketResearch {
  competitors: Competitor[];
  industryTrends: string[];
  localMarketInsights: string[];
  searchTerms: string[];
}

async function researchMarketWithPerplexity(params: MarketResearchParams): Promise<MarketResearch> {
  const { industry, city, state } = params;

  const prompt = `Research the ${industry} market in ${city}, ${state}. I need comprehensive market intelligence for a local business.

Provide detailed research on:

1. TOP COMPETITORS: List 3-5 major ${industry} companies in the ${city}, ${state} area. For each include:
   - Company name
   - Their main services (list 3-5 specific services)
   - Their competitive strengths (what they do well)

2. INDUSTRY TRENDS: What are the top 5 trends in the ${industry} industry for 2024-2025? Focus on:
   - New services that are growing in demand
   - Technology or techniques being adopted
   - Customer preferences changing

3. LOCAL MARKET INSIGHTS: What is unique about the ${city}, ${state} market for ${industry}?
   - Local climate/environment factors
   - Demographics and typical customer profile
   - Seasonal demand patterns
   - Local regulations or requirements
   - Common problems homeowners/businesses face

4. POPULAR SEARCH TERMS: What are the top 10 search phrases people use when looking for ${industry} services in ${city}?

Format your response as JSON:
{
  "competitors": [
    {"name": "Company Name", "services": ["service1", "service2"], "strengths": ["strength1", "strength2"]}
  ],
  "industryTrends": ["trend1", "trend2", "trend3", "trend4", "trend5"],
  "localMarketInsights": ["insight1", "insight2", "insight3"],
  "searchTerms": ["search term 1", "search term 2"]
}`;

  try {
    console.log("[Scout] Researching market with perplexity/sonar...");
    const result = await generateText({
      model: MODELS.researcher,
      prompt,
      maxOutputTokens: 3000,
      temperature: 0.3,
    });

    // Parse the response
    let cleanedText = result.text.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.slice(7);
    }
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.slice(3);
    }
    if (cleanedText.endsWith("```")) {
      cleanedText = cleanedText.slice(0, -3);
    }

    try {
      return JSON.parse(cleanedText.trim());
    } catch {
      console.error("[Scout] Failed to parse market research JSON, using fallback");
      return createFallbackResearch(industry, city, state);
    }
  } catch (error) {
    console.error("[Scout] Perplexity research failed:", error);
    return createFallbackResearch(industry, city, state);
  }
}

function createFallbackResearch(industry: string, city: string, state: string): MarketResearch {
  return {
    competitors: [
      {
        name: `${city} ${industry} Pros`,
        services: ["General Services", "Emergency Services", "Maintenance"],
        strengths: ["Local presence", "Quick response"],
      },
    ],
    industryTrends: [
      "Growing demand for eco-friendly solutions",
      "Smart home integration",
      "Subscription-based maintenance plans",
      "Online booking and digital payments",
      "Focus on energy efficiency",
    ],
    localMarketInsights: [
      `${city} has a mix of residential and commercial demand`,
      "Seasonal peaks during spring and fall",
      "Homeowners prefer local, established companies",
    ],
    searchTerms: [
      `${industry.toLowerCase()} ${city.toLowerCase()}`,
      `best ${industry.toLowerCase()} near me`,
      `${industry.toLowerCase()} services ${state}`,
      `emergency ${industry.toLowerCase()} ${city.toLowerCase()}`,
    ],
  };
}

interface AnalyzeParams {
  industry: string;
  businessName: string;
  city: string;
  state: string;
  existingServices: string[];
  marketResearch: MarketResearch;
}

interface Recommendations {
  services: ServiceRecommendation[];
  locationPages: LocationPage[];
  blogTopics: BlogTopic[];
  uniqueSellingPoints: string[];
  contentStrategy: string;
}

async function analyzeWithClaude(params: AnalyzeParams): Promise<Recommendations> {
  const { industry, businessName, city, state, existingServices, marketResearch } = params;

  const prompt = `You are a strategic marketing consultant specializing in local service businesses. Analyze this market research and create a unique website strategy.

BUSINESS: ${businessName || "Local " + industry + " Company"}
INDUSTRY: ${industry}
LOCATION: ${city}, ${state}
EXISTING SERVICES: ${existingServices.length > 0 ? existingServices.join(", ") : "None specified"}

MARKET RESEARCH:
${JSON.stringify(marketResearch, null, 2)}

Based on this research, create a UNIQUE website strategy that will help this business stand out from competitors. Consider:
- Services that competitors are missing or underserving
- Local-specific opportunities (climate, demographics, regulations)
- Content gaps in the market
- Ways to differentiate from the competition

Provide your recommendations in this exact JSON format:
{
  "services": [
    {
      "name": "Service Name",
      "rationale": "Why this service based on market research",
      "priority": "high|medium|low",
      "estimatedDemand": "Based on search trends and market gaps"
    }
  ],
  "locationPages": [
    {
      "area": "Nearby city/neighborhood name",
      "rationale": "Why target this area",
      "targetServices": ["service1", "service2"]
    }
  ],
  "blogTopics": [
    {
      "title": "Blog Post Title",
      "angle": "Unique angle that differentiates from competitors",
      "targetKeyword": "Primary keyword to target",
      "priority": 1
    }
  ],
  "uniqueSellingPoints": [
    "USP 1 based on market gaps",
    "USP 2 based on local insights",
    "USP 3 based on competitor weaknesses"
  ],
  "contentStrategy": "Brief 2-3 sentence strategy summary"
}

REQUIREMENTS:
- Include 6-8 service pages based on market demand
- Include 4-6 location pages targeting nearby areas
- Include 10-12 blog topics with unique angles
- Focus on gaps in competitor coverage
- Make recommendations specific to ${city}, ${state}
- Prioritize services with high search volume but low competition`;

  try {
    console.log("[Craftsman] Analyzing market research with Claude...");
    const result = await generateText({
      model: MODELS.contentWriter,
      system: "You are a strategic marketing consultant. Analyze market research and provide actionable website recommendations. Always respond with valid JSON only.",
      prompt,
      maxOutputTokens: 4000,
      temperature: 0.6,
    });

    // Parse the response
    let cleanedText = result.text.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.slice(7);
    }
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.slice(3);
    }
    if (cleanedText.endsWith("```")) {
      cleanedText = cleanedText.slice(0, -3);
    }

    try {
      return JSON.parse(cleanedText.trim());
    } catch {
      console.error("[Craftsman] Failed to parse recommendations JSON, using fallback");
      return createFallbackRecommendations(industry, city, state);
    }
  } catch (error) {
    console.error("[Craftsman] Claude analysis failed:", error);
    return createFallbackRecommendations(industry, city, state);
  }
}

function createFallbackRecommendations(industry: string, city: string, state: string): Recommendations {
  return {
    services: [
      { name: "Emergency Services", rationale: "High demand, 24/7 availability differentiator", priority: "high", estimatedDemand: "High" },
      { name: "Preventive Maintenance", rationale: "Recurring revenue, builds customer relationships", priority: "high", estimatedDemand: "Medium-High" },
      { name: "Commercial Services", rationale: "Higher ticket values, less competition", priority: "medium", estimatedDemand: "Medium" },
      { name: "New Installation", rationale: "Core service offering", priority: "high", estimatedDemand: "High" },
      { name: "Repair Services", rationale: "Immediate need, high conversion", priority: "high", estimatedDemand: "High" },
      { name: "Inspection Services", rationale: "Lead generation, upsell opportunity", priority: "medium", estimatedDemand: "Medium" },
    ],
    locationPages: [
      { area: city, rationale: "Primary market", targetServices: ["All Services"] },
      { area: `Greater ${city} Area`, rationale: "Expand reach", targetServices: ["Emergency Services", "Repair"] },
    ],
    blogTopics: [
      { title: `${industry} Tips for ${city} Homeowners`, angle: "Local-specific advice", targetKeyword: `${industry.toLowerCase()} ${city.toLowerCase()}`, priority: 1 },
      { title: `How to Choose a ${industry} Company in ${state}`, angle: "Buyer's guide", targetKeyword: `best ${industry.toLowerCase()} ${city.toLowerCase()}`, priority: 2 },
      { title: `Common ${industry} Problems in ${city}`, angle: "Problem/solution", targetKeyword: `${industry.toLowerCase()} problems ${city.toLowerCase()}`, priority: 3 },
      { title: `${industry} Maintenance Checklist`, angle: "Helpful resource", targetKeyword: `${industry.toLowerCase()} maintenance`, priority: 4 },
      { title: `Emergency ${industry} Services: What to Expect`, angle: "Service education", targetKeyword: `emergency ${industry.toLowerCase()}`, priority: 5 },
    ],
    uniqueSellingPoints: [
      "Local expertise with deep knowledge of the area",
      "Fast response times for emergencies",
      "Transparent pricing with no hidden fees",
    ],
    contentStrategy: `Focus on local SEO by creating location-specific content for ${city} and surrounding areas. Emphasize emergency availability and local expertise to differentiate from larger competitors.`,
  };
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};
