// pages/api/research-deep.ts
// Combined deep research using Perplexity + Bright Data
// This is the enhanced version that pulls data from multiple sources

import { NextApiRequest, NextApiResponse } from "next";
import { gateway } from "@ai-sdk/gateway";
import { generateText } from "ai";
import { BrightData } from "../../lib/brightdata";

export const maxDuration = 180;

interface DeepResearchRequest {
  topic: string;
  industry: string;
  location?: string;
  companyName?: string;
  competitorUrls?: string[];
  socialLinks?: Record<string, string>;
  includeSerp?: boolean;
  includeSocial?: boolean;
  includeCompetitors?: boolean;
}

interface BrightDataResults {
  serp?: {
    results: Array<{
      position: number;
      title: string;
      url: string;
      domain: string;
      snippet: string;
    }>;
    paaQuestions?: string[];
    relatedSearches?: string[];
  };
  competitors?: Array<{
    url: string;
    title?: string;
    description?: string;
    socialLinks?: Record<string, string>;
  }>;
  social?: Array<{
    platform: string;
    followers?: number;
    posts?: number;
    engagement?: number;
  }>;
  reviews?: {
    rating: number;
    reviewCount: number;
    recentReviews: Array<{ rating: number; text: string }>;
  };
}

interface DeepResearchResult {
  success: boolean;
  data?: {
    // Perplexity AI research
    aiResearch: {
      keywords: {
        primary: Array<{ keyword: string; volume: string; difficulty: string; intent: string }>;
        longTail: string[];
        questions: string[];
        local: string[];
      };
      competitors: Array<{ name: string; website: string; strategy: string; gaps: string[] }>;
      contentStrategy: {
        formats: string[];
        uniqueAngles: string[];
        statistics: Array<{ stat: string; source: string }>;
        expertSources: string[];
      };
      recommendations: string[];
    };
    // Bright Data real-time data
    brightData?: BrightDataResults;
    // Combined insights
    insights: {
      topOpportunities: string[];
      contentGaps: string[];
      competitorWeaknesses: string[];
      quickWins: string[];
    };
    researchedAt: string;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DeepResearchResult>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const {
    topic,
    industry,
    location,
    companyName,
    competitorUrls = [],
    socialLinks = {},
    includeSerp = true,
    includeSocial = true,
    includeCompetitors = true,
  }: DeepResearchRequest = req.body;

  if (!topic || !industry) {
    return res.status(400).json({
      success: false,
      error: "Missing required parameters: topic and industry",
    });
  }

  try {
    // Phase 1: Fetch Bright Data (real-time data) in parallel
    const brightDataPromises: Promise<unknown>[] = [];
    const brightDataResults: BrightDataResults = {};

    if (BrightData.isConfigured()) {
      // SERP data
      if (includeSerp) {
        brightDataPromises.push(
          BrightData.search(topic, { country: "us", numResults: 10 })
            .then((serp) => {
              brightDataResults.serp = serp;
            })
            .catch((e) => console.error("SERP error:", e))
        );
      }

      // Competitor scraping
      if (includeCompetitors && competitorUrls.length > 0) {
        brightDataPromises.push(
          BrightData.scrapeMultiple(competitorUrls)
            .then((competitors) => {
              brightDataResults.competitors = competitors;
            })
            .catch((e) => console.error("Competitor error:", e))
        );
      }

      // Social profiles
      if (includeSocial && Object.keys(socialLinks).length > 0) {
        brightDataPromises.push(
          BrightData.social.getProfiles(socialLinks)
            .then((profiles) => {
              brightDataResults.social = profiles.map((p) => ({
                platform: p.platform,
                followers: p.followers,
                posts: p.posts,
                engagement: p.engagement,
              }));
            })
            .catch((e) => console.error("Social error:", e))
        );
      }

      // Google reviews
      if (companyName) {
        brightDataPromises.push(
          BrightData.reviews.google(companyName, location)
            .then((reviews) => {
              brightDataResults.reviews = {
                rating: reviews.rating,
                reviewCount: reviews.reviewCount,
                recentReviews: reviews.reviews.slice(0, 5).map((r) => ({
                  rating: r.rating,
                  text: r.text,
                })),
              };
            })
            .catch((e) => console.error("Reviews error:", e))
        );
      }

      await Promise.all(brightDataPromises);
    }

    // Phase 2: Build enriched context for AI
    let enrichedContext = "";

    if (brightDataResults.serp?.results?.length) {
      enrichedContext += "\n\nREAL SERP DATA:\n";
      for (let i = 0; i < Math.min(5, brightDataResults.serp.results.length); i++) {
        const r = brightDataResults.serp.results[i];
        enrichedContext += `${i + 1}. ${r.title} (${r.domain}): ${r.snippet}\n`;
      }
      if (brightDataResults.serp.paaQuestions?.length) {
        enrichedContext += `\nPeople Also Ask: ${brightDataResults.serp.paaQuestions.slice(0, 5).join("; ")}`;
      }
    }

    if (brightDataResults.competitors?.length) {
      enrichedContext += "\n\nCOMPETITOR DATA:\n";
      for (const c of brightDataResults.competitors) {
        enrichedContext += `- ${c.url}: ${c.title || "N/A"}\n`;
      }
    }

    if (brightDataResults.reviews) {
      enrichedContext += `\n\nBUSINESS REVIEWS: ${brightDataResults.reviews.rating}/5 (${brightDataResults.reviews.reviewCount} reviews)`;
    }

    // Phase 3: AI Research with Perplexity
    const aiPrompt = `Conduct comprehensive SEO research for ${companyName || `a ${industry} business`}${location ? ` in ${location}` : ""} on "${topic}".
${enrichedContext}

Analyze and provide strategic recommendations. Return JSON:
{
  "keywords": {
    "primary": [{"keyword": "", "volume": "high/medium/low", "difficulty": "easy/medium/hard", "intent": "informational/transactional/navigational"}],
    "longTail": ["keyword phrase 1", "keyword phrase 2"],
    "questions": ["question 1?", "question 2?"],
    "local": ["local keyword 1", "local keyword 2"]
  },
  "competitors": [{"name": "", "website": "", "strategy": "", "gaps": [""]}],
  "contentStrategy": {
    "formats": ["blog", "video", "infographic"],
    "uniqueAngles": ["angle 1", "angle 2"],
    "statistics": [{"stat": "", "source": ""}],
    "expertSources": ["source 1"]
  },
  "recommendations": ["actionable recommendation 1", "actionable recommendation 2"]
}`;

    const aiResult = await generateText({
      model: gateway("perplexity/sonar-reasoning-pro"),
      prompt: aiPrompt,
    });

    // Parse AI response
    let aiResearch;
    try {
      const jsonMatch = aiResult.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResearch = JSON.parse(jsonMatch[0]);
      } else {
        aiResearch = {
          keywords: { primary: [], longTail: [], questions: [], local: [] },
          competitors: [],
          contentStrategy: { formats: [], uniqueAngles: [], statistics: [], expertSources: [] },
          recommendations: [aiResult.text],
        };
      }
    } catch {
      aiResearch = {
        keywords: { primary: [], longTail: [], questions: [], local: [] },
        competitors: [],
        contentStrategy: { formats: [], uniqueAngles: [], statistics: [], expertSources: [] },
        recommendations: [aiResult.text],
      };
    }

    // Phase 4: Generate combined insights
    const insights = {
      topOpportunities: [] as string[],
      contentGaps: [] as string[],
      competitorWeaknesses: [] as string[],
      quickWins: [] as string[],
    };

    // Extract opportunities from SERP PAA questions
    if (brightDataResults.serp?.paaQuestions) {
      insights.topOpportunities.push(
        ...brightDataResults.serp.paaQuestions.slice(0, 3).map((q: string) => `Answer: "${q}"`)
      );
    }

    // Add AI-generated recommendations as quick wins
    if (aiResearch.recommendations) {
      insights.quickWins.push(...aiResearch.recommendations.slice(0, 3));
    }

    // Extract content gaps from competitor analysis
    if (aiResearch.competitors) {
      aiResearch.competitors.forEach((c: { gaps?: string[] }) => {
        if (c.gaps) insights.contentGaps.push(...c.gaps);
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        aiResearch,
        brightData: Object.keys(brightDataResults).length > 0 ? brightDataResults : undefined,
        insights,
        researchedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Deep research error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Research failed",
    });
  }
}
