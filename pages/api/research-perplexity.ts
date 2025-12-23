// pages/api/research-perplexity.ts
// Deep research using Perplexity Sonar Reasoning Pro via Vercel AI Gateway

import { NextApiRequest, NextApiResponse } from "next";
import { gateway } from "@ai-sdk/gateway";
import { generateText } from "ai";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import { loadUserProfile, loadDrafts } from "../../lib/database";

export const maxDuration = 120;

interface ResearchRequest {
  topic: string;
  industry: string;
  location?: string;
  companyName?: string;
  researchType: "keyword" | "competitor" | "content" | "local" | "comprehensive";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Auth check
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { topic, industry, location, companyName, researchType }: ResearchRequest = req.body;

  if (!topic || !industry) {
    return res.status(400).json({ error: "Missing required parameters: topic and industry" });
  }

  // Load user profile and past blogs for context
  const userId = (session.user as { id?: string }).id || session.user?.email || "";
  const userProfile = await loadUserProfile(userId);
  const pastBlogs = await loadDrafts(userId);

  // Extract profile context
  const companyProfile = userProfile?.companyProfile;
  let profileContextStr = "";
  if (companyProfile) {
    profileContextStr = "\n\nCOMPANY PROFILE CONTEXT:";
    if (companyProfile.services && companyProfile.services.length > 0) {
      profileContextStr += `\n- Services: ${companyProfile.services.join(", ")}`;
    }
    if (companyProfile.usps && companyProfile.usps.length > 0) {
      profileContextStr += `\n- Unique Selling Points: ${companyProfile.usps.join(", ")}`;
    }
    if (companyProfile.certifications && companyProfile.certifications.length > 0) {
      profileContextStr += `\n- Certifications: ${companyProfile.certifications.join(", ")}`;
    }
    if (companyProfile.brandVoice) {
      profileContextStr += `\n- Brand Voice: ${companyProfile.brandVoice}`;
    }
    if (companyProfile.audience) {
      profileContextStr += `\n- Target Audience: ${companyProfile.audience}`;
    }
    if (companyProfile.cities && companyProfile.cities.length > 0) {
      profileContextStr += `\n- Service Areas: ${companyProfile.cities.slice(0, 10).join(", ")}`;
    }
  }

  // Build existing content context
  let existingContentStr = "";
  if (pastBlogs.length > 0) {
    existingContentStr = "\n\nEXISTING CONTENT (avoid suggesting similar topics):";
    pastBlogs.slice(0, 15).forEach(blog => {
      existingContentStr += `\n- "${blog.title}"`;
    });
  }

  // Build research prompt based on type
  const prompts: Record<string, string> = {
    keyword: `Research the most effective SEO keywords for "${topic}" in the ${industry} industry${location ? ` in ${location}` : ""}.

Provide a comprehensive analysis including:
1. Primary keywords with estimated monthly search volume
2. Long-tail keyword variations (at least 10)
3. Related questions people ask (PAA keywords)
4. Keyword difficulty assessment
5. Search intent categorization (informational, transactional, navigational)
6. Seasonal trends if applicable
7. Competitor keywords to target

Format the response as JSON with the following structure:
{
  "primaryKeywords": [{"keyword": "", "volume": "", "difficulty": "", "intent": ""}],
  "longTailKeywords": [{"keyword": "", "estimatedVolume": ""}],
  "questions": [""],
  "seasonalTrends": "",
  "recommendations": [""]
}`,

    competitor: `Research the top competitors for a ${industry} business${location ? ` in ${location}` : ""} targeting "${topic}".

Analyze:
1. Top 5-10 competitors ranking for this topic
2. Their content strategies
3. Keywords they rank for
4. Content gaps and opportunities
5. Backlink opportunities
6. Social media presence

Format as JSON:
{
  "competitors": [{"name": "", "website": "", "strengths": [], "weaknesses": []}],
  "contentGaps": [""],
  "opportunities": [""],
  "recommendedStrategy": ""
}`,

    content: `Research content ideas and strategies for "${topic}" in the ${industry} industry${location ? ` targeting ${location}` : ""}.

Provide:
1. Top-performing content formats for this topic
2. Unique angles and perspectives not commonly covered
3. Statistics and data points to include
4. Expert sources to reference
5. Trending subtopics
6. Content structure recommendations
7. Internal linking opportunities

Format as JSON:
{
  "contentFormats": [""],
  "uniqueAngles": [""],
  "statistics": [{"stat": "", "source": ""}],
  "trendingSubtopics": [""],
  "structureRecommendation": "",
  "internalLinkingOpportunities": [""]
}`,

    local: `Research local SEO opportunities for a ${industry} business in ${location || "the target area"} focusing on "${topic}".

Analyze:
1. Local keyword opportunities
2. "Near me" search variations
3. Local competitor analysis
4. Google Business Profile optimization tips
5. Local citation opportunities
6. Community engagement opportunities
7. Local content ideas

Format as JSON:
{
  "localKeywords": [{"keyword": "", "intent": ""}],
  "nearMeVariations": [""],
  "localCompetitors": [""],
  "gbpTips": [""],
  "citationOpportunities": [""],
  "localContentIdeas": [""]
}`,

    comprehensive: `Conduct comprehensive SEO research for ${companyName || `a ${industry} business`}${location ? ` in ${location}` : ""} on the topic: "${topic}".

Provide an in-depth analysis covering:

1. KEYWORD RESEARCH
- Primary target keywords with search volume estimates
- Long-tail variations
- Question-based keywords
- Local keyword opportunities

2. COMPETITOR ANALYSIS
- Top 5 competitors for this topic
- Their content strategies
- Gaps and opportunities

3. CONTENT STRATEGY
- Recommended content formats
- Unique angles to cover
- Key statistics to include
- Expert sources to reference

4. LOCAL SEO (if applicable)
- Local keyword opportunities
- Google Business Profile tips
- Citation opportunities

5. TECHNICAL RECOMMENDATIONS
- Schema markup suggestions
- Internal linking strategy
- Featured snippet opportunities

Format as comprehensive JSON:
{
  "keywords": {
    "primary": [{"keyword": "", "volume": "", "difficulty": "", "intent": ""}],
    "longTail": [""],
    "questions": [""],
    "local": [""]
  },
  "competitors": [{"name": "", "website": "", "strategy": "", "gaps": []}],
  "contentStrategy": {
    "formats": [""],
    "uniqueAngles": [""],
    "statistics": [],
    "expertSources": []
  },
  "localSEO": {
    "keywords": [""],
    "gbpTips": [""],
    "citations": [""]
  },
  "technical": {
    "schemaTypes": [""],
    "internalLinking": [""],
    "featuredSnippetOpportunities": [""]
  },
  "actionPlan": [""]
}`,
  };

  // Use profile industry if available, otherwise use request industry
  const effectiveIndustry = companyProfile?.industryType || industry;

  // Append profile and existing content context to the prompt with strict industry enforcement
  const basePrompt = prompts[researchType] || prompts.comprehensive;
  const industryConstraint = `\n\nCRITICAL INDUSTRY CONSTRAINT: This research is EXCLUSIVELY for a ${effectiveIndustry.toUpperCase()} business. ALL recommendations MUST be specific to the ${effectiveIndustry} industry. Do NOT include suggestions from other industries.`;
  const prompt = basePrompt + industryConstraint + profileContextStr + existingContentStr + "\n\nIMPORTANT: Tailor recommendations to the company's specific services, strengths, and target audience. Avoid suggesting content topics that are too similar to their existing content. Stay strictly within the specified industry.";

  try {
    const result = await generateText({
      model: gateway("perplexity/sonar-reasoning-pro"),
      prompt,
    });

    // Try to parse JSON from response
    let research;
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        research = JSON.parse(jsonMatch[0]);
      } else {
        research = { rawResponse: result.text };
      }
    } catch {
      research = { rawResponse: result.text };
    }

    return res.status(200).json({
      research,
      researchType,
      topic,
      industry,
      location,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Perplexity research error:", error);
    return res.status(500).json({
      error: "Research failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
