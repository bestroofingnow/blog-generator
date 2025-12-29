// pages/api/keyword-research.ts
// Keyword research API using AI to generate keyword suggestions

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import { createGateway } from "@ai-sdk/gateway";
import { generateText } from "ai";

const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? "",
});

interface KeywordSuggestion {
  keyword: string;
  searchVolume: number;
  difficulty: number;
  cpc: number;
  trend: "up" | "down" | "stable";
  intent: "informational" | "commercial" | "transactional" | "navigational";
}

interface RelatedKeyword {
  keyword: string;
  relevance: number;
}

interface KeywordAnalysis {
  primaryKeyword: string;
  suggestions: KeywordSuggestion[];
  relatedKeywords: RelatedKeyword[];
  questions: string[];
  longTail: string[];
}

interface APIResponse {
  success: boolean;
  analysis?: KeywordAnalysis;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const { keyword } = req.body;

  if (!keyword || typeof keyword !== "string") {
    return res.status(400).json({ success: false, error: "Keyword is required" });
  }

  try {
    const model = gateway("google/gemini-2.5-flash-preview-09-2025");

    const prompt = `You are an expert SEO keyword researcher. Analyze the seed keyword "${keyword}" and provide comprehensive keyword research data.

Return a JSON object with the following structure:
{
  "primaryKeyword": "${keyword}",
  "suggestions": [
    // 10-15 keyword variations with estimated metrics
    {
      "keyword": "related keyword phrase",
      "searchVolume": 1000, // estimated monthly search volume (100-50000)
      "difficulty": 45, // SEO difficulty score (1-100)
      "cpc": 2.50, // estimated cost per click in USD
      "trend": "up", // "up", "down", or "stable"
      "intent": "informational" // "informational", "commercial", "transactional", or "navigational"
    }
  ],
  "relatedKeywords": [
    // 10-15 semantically related keywords
    {
      "keyword": "semantically related term",
      "relevance": 85 // relevance score (1-100)
    }
  ],
  "questions": [
    // 8-12 questions people ask about this topic
    "What is the best way to...",
    "How much does ... cost?",
    "When should I..."
  ],
  "longTail": [
    // 10-15 long-tail keyword variations (3+ words)
    "best ${keyword} service near me",
    "how to choose ${keyword} contractor"
  ]
}

Important guidelines:
1. Make search volumes and CPC realistic for the industry
2. Higher difficulty for competitive terms, lower for specific niches
3. Questions should be actual questions people search for
4. Long-tail keywords should be 3-6 words
5. Intent should accurately reflect the search purpose
6. Include local variations if applicable (e.g., "near me", "[city] [service]")

Return ONLY valid JSON, no markdown code blocks or explanations.`;

    const response = await generateText({
      model,
      prompt,
      maxOutputTokens: 4000,
    });

    // Parse the JSON response
    let analysisText = response.text.trim();

    // Remove markdown code blocks if present
    if (analysisText.startsWith("```json")) {
      analysisText = analysisText.slice(7);
    }
    if (analysisText.startsWith("```")) {
      analysisText = analysisText.slice(3);
    }
    if (analysisText.endsWith("```")) {
      analysisText = analysisText.slice(0, -3);
    }
    analysisText = analysisText.trim();

    const analysis: KeywordAnalysis = JSON.parse(analysisText);

    // Validate and sanitize the response
    if (!analysis.suggestions) analysis.suggestions = [];
    if (!analysis.relatedKeywords) analysis.relatedKeywords = [];
    if (!analysis.questions) analysis.questions = [];
    if (!analysis.longTail) analysis.longTail = [];

    // Ensure suggestions have all required fields
    analysis.suggestions = analysis.suggestions.map((s) => ({
      keyword: s.keyword || "",
      searchVolume: Math.max(10, Math.min(100000, s.searchVolume || 100)),
      difficulty: Math.max(1, Math.min(100, s.difficulty || 50)),
      cpc: Math.max(0.1, Math.min(50, s.cpc || 1)),
      trend: ["up", "down", "stable"].includes(s.trend) ? s.trend : "stable",
      intent: ["informational", "commercial", "transactional", "navigational"].includes(s.intent)
        ? s.intent
        : "informational",
    }));

    // Sort suggestions by search volume (descending)
    analysis.suggestions.sort((a, b) => b.searchVolume - a.searchVolume);

    // Ensure related keywords have all required fields
    analysis.relatedKeywords = analysis.relatedKeywords.map((r) => ({
      keyword: r.keyword || "",
      relevance: Math.max(1, Math.min(100, r.relevance || 50)),
    }));

    // Sort related keywords by relevance (descending)
    analysis.relatedKeywords.sort((a, b) => b.relevance - a.relevance);

    return res.status(200).json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("Keyword research error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to research keyword",
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
