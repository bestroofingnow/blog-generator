// pages/api/generate-blog.ts
import Anthropic from "@anthropic-ai/sdk";
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import { getUserTopQueries } from "../../lib/google-apis";
import { db, googleConnections, eq } from "../../lib/db";
import { hasEnoughCredits, deductCredits } from "../../lib/credits";

interface BlogGeneratorRequest {
  topic: string;
  location: string;
  blogType: string;
  numberOfSections?: number;
  tone?: string;
  includeImages?: boolean;
}

interface SEOData {
  primaryKeyword: string;
  secondaryKeywords: string[];
  metaTitle: string;
  metaDescription: string;
}

interface BlogGeneratorResponse {
  success: boolean;
  htmlContent?: string;
  seoData?: SEOData;
  error?: string;
  tokens?: {
    input: number;
    output: number;
  };
}

const client = new Anthropic();

const systemPrompt = `You are an expert landscape lighting and lifestyle marketing content writer specializing in Charlotte, North Carolina neighborhoods. Your writing style perfectly blends practical expertise with emotional resonance.

CRITICAL: All content MUST be written in American English only. Do not use any other languages, foreign words, or non-English characters.

KEY CONTENT STYLE ELEMENTS:
1. Conversational "you" addressing readers directly - create personal connection
2. Open with compelling problem/opportunity statement that hooks the reader
3. Local neighborhood-specific details (Myers Park, Sedgefield, Lake Wylie, Mooresville, Huntersville, etc.)
4. Mix local landmarks, parks, amenities, and community character into natural narrative
5. Include specific architectural styles, home features, and neighborhood characteristics
6. Practical lighting/home advice that solves real problems
7. Emotional/lifestyle benefits alongside practical benefits
8. Warm, inviting tone that makes readers feel understood
9. Vivid descriptive language (visual, sensory, emotional)
10. Strong CTAs positioned naturally within content flow

HTML STRUCTURE REQUIREMENTS:
- Output ONLY valid HTML (no markdown, no code blocks)
- Start with <h1> containing location and topic
- Follow with 2-3 paragraph hero introduction
- Include [IMAGE:description] placeholders between major sections (use vivid, relevant descriptions)
- Use 4-6 H2 section headers exploring different aspects/neighborhoods/topics
- 2-3 substantial paragraphs per section with local context
- Use <strong> tags for key concepts and feature names
- Include natural paragraph breaks for readability
- End with strong closing section and call-to-action

TONE GUIDELINES:
- Professional yet approachable (not stuffy, not overly casual)
- Enthusiastic about the benefits without being pushy
- Show expertise through specific knowledge, not jargon
- Address reader concerns and objections naturally
- Build trust through local knowledge and understanding
- Use vivid descriptions of ambiance, aesthetics, and experience
- Create FOMO (fear of missing out) on enhanced lifestyle/home value
- Emphasize community pride and shared values

COMMON THEMES TO INCORPORATE:
- How proper lighting transforms outdoor living
- Safety and security benefits with style
- Property value and investment returns
- Creating memorable gathering spaces
- Seasonal adaptability and year-round appeal
- Professional vs DIY considerations
- Smart technology integration
- Energy efficiency benefits
- Neighborhood character and community standards`;

interface GeneratedContent {
  htmlContent: string;
  seoData: SEOData;
}

interface SearchConsoleQuery {
  query: string;
  clicks: number;
  impressions: number;
  position: number;
}

interface SearchConsoleDataParam {
  topQueries: SearchConsoleQuery[];
}

async function generateBlogContent(
  request: BlogGeneratorRequest,
  searchConsoleData?: SearchConsoleDataParam | null
): Promise<GeneratedContent> {
  const {
    topic,
    location,
    blogType,
    numberOfSections = 5,
    tone = "professional yet friendly",
  } = request;

  // Build SEO context from Search Console data if available
  let seoContext = "";
  if (searchConsoleData && searchConsoleData.topQueries.length > 0) {
    const relevantQueries = searchConsoleData.topQueries
      .filter(q => {
        const lowerQuery = q.query.toLowerCase();
        const lowerTopic = topic.toLowerCase();
        const lowerLocation = location.toLowerCase();
        // Find queries relevant to the topic or location
        return lowerQuery.includes(lowerTopic.split(" ")[0]) ||
               lowerQuery.includes(lowerLocation.split(",")[0].toLowerCase()) ||
               lowerTopic.includes(lowerQuery.split(" ")[0]);
      })
      .slice(0, 10);

    if (relevantQueries.length > 0) {
      seoContext = `
SEO OPTIMIZATION DATA (from Google Search Console):
Your website is already ranking for these related queries. Use this data to optimize the content:

${relevantQueries.map(q => `- "${q.query}" - Position: ${q.position.toFixed(1)}, Clicks: ${q.clicks}, Impressions: ${q.impressions}`).join("\n")}

IMPORTANT: Naturally incorporate these ranking keywords and related phrases into the content where relevant. This helps improve existing rankings while targeting new opportunities.
`;
    }
  }

  const userPrompt = `Generate a professional blog post about landscape lighting for Charlotte, NC area with these specifications:

TOPIC: ${topic}
LOCATION: ${location}
BLOG TYPE: ${blogType}
NUMBER OF SECTIONS: ${numberOfSections}
TONE: ${tone}
${seoContext}
CONTENT REQUIREMENTS:

1. HEADLINE: Create an H1 title that mentions both ${location} and ${topic}, designed to appeal to homeowners considering lighting upgrades

2. INTRODUCTION (Hero Section):
   - Start with a compelling hook that speaks to homeowner pain points or aspirations
   - 2-3 paragraphs explaining why this topic matters for ${location} properties
   - End intro with a transition to main content
   - Include one image tag after intro using this format: <img src="https://placehold.co/800x400/667eea/ffffff?text=Landscape+Lighting+in+${encodeURIComponent(location)}" alt="[descriptive alt text]" />

3. MAIN SECTIONS (${numberOfSections} sections):
   - Create H2 headers that are specific to ${location} neighborhoods or aspects
   - Each section: 2-3 substantial paragraphs
   - For each section, include:
     * Practical landscape lighting advice
     * How it specifically applies to ${location}
     * Local landmarks, parks, or neighborhood characteristics
     * Lifestyle/emotional benefits alongside practical benefits
     * Specific architectural or design considerations
   - Include 2-3 images throughout using: <img src="https://placehold.co/800x400/764ba2/ffffff?text=[URL+Encoded+Description]" alt="[descriptive alt text]" />
   - Use <strong> tags for key concepts, product names, or feature highlights

4. CLOSING SECTION:
   - Summarize how lighting choices enhance both home value and lifestyle
   - Include natural call-to-action encouraging consultation/next steps
   - Emphasize local expertise and community values

CHARLOTTE-SPECIFIC DETAILS TO INCORPORATE:
- Reference neighborhood character, parks, and local amenities
- Consider seasonal variations in Charlotte's climate
- Highlight how lighting integrates with ${location}'s architectural styles
- Mention community standards and HOA considerations where relevant
- Include ROI/investment return angle for luxury market

IMPORTANT: Your response must be valid JSON with this exact structure:
{
  "seo": {
    "primaryKeyword": "main SEO keyword phrase (3-5 words, location + service focused)",
    "secondaryKeywords": ["keyword 1", "keyword 2", "keyword 3", "keyword 4", "keyword 5"],
    "metaTitle": "SEO optimized title under 60 characters including primary keyword",
    "metaDescription": "Compelling meta description 150-160 characters with primary keyword and call to action"
  },
  "html": "YOUR FULL HTML CONTENT HERE"
}

The HTML should be complete and ready to copy-paste. Include actual <img> tags with placeholder URLs, not [IMAGE:] placeholders.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 5000,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
    system: systemPrompt + "\n\nIMPORTANT: Always respond with valid JSON only. No markdown code fences, no extra text before or after the JSON.",
  });

  // Extract text content
  let responseText = "";
  if (message.content && Array.isArray(message.content) && message.content.length > 0) {
    const firstBlock = message.content[0];
    if (firstBlock.type === "text" && firstBlock.text) {
      responseText = firstBlock.text;
    }
  }

  if (!responseText) {
    throw new Error("No text content in API response");
  }

  // Parse the JSON response
  try {
    // Clean up response if it has markdown code fences
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith("```json")) {
      cleanedResponse = cleanedResponse.slice(7);
    }
    if (cleanedResponse.startsWith("```")) {
      cleanedResponse = cleanedResponse.slice(3);
    }
    if (cleanedResponse.endsWith("```")) {
      cleanedResponse = cleanedResponse.slice(0, -3);
    }
    cleanedResponse = cleanedResponse.trim();

    const parsed = JSON.parse(cleanedResponse);

    return {
      htmlContent: parsed.html,
      seoData: {
        primaryKeyword: parsed.seo.primaryKeyword,
        secondaryKeywords: parsed.seo.secondaryKeywords,
        metaTitle: parsed.seo.metaTitle,
        metaDescription: parsed.seo.metaDescription,
      },
    };
  } catch {
    // Fallback if JSON parsing fails - return raw content with default SEO
    return {
      htmlContent: responseText,
      seoData: {
        primaryKeyword: `${topic} ${location}`,
        secondaryKeywords: [topic, location, "landscape lighting", "outdoor lighting", "professional lighting"],
        metaTitle: `${topic} in ${location} | Professional Guide`,
        metaDescription: `Discover the best ${topic.toLowerCase()} options for ${location}. Expert tips, local insights, and professional recommendations.`,
      },
    };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BlogGeneratorResponse>
) {
  // Handle CORS and method validation
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  // Auth check
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const userId = session.user.id;

  // Credit check - ensure user has enough credits
  const canGenerate = await hasEnoughCredits(userId, "blog_generation");
  if (!canGenerate) {
    return res.status(402).json({
      success: false,
      error: "Insufficient credits. Please purchase more credits or upgrade your plan.",
    });
  }

  try {
    const request = req.body as BlogGeneratorRequest;

    // Validate required fields
    if (!request.topic || !request.location || !request.blogType) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: topic, location, blogType",
      });
    }

    // Fetch SEO data from Google Search Console if connected
    let searchConsoleData: { topQueries: Array<{ query: string; clicks: number; impressions: number; position: number }> } | null = null;
    try {
      // Get user's connected site
      const connection = await db
        .select()
        .from(googleConnections)
        .where(eq(googleConnections.userId, userId))
        .limit(1);

      if (connection.length > 0 && connection[0].connectedSiteUrl) {
        const siteUrl = connection[0].connectedSiteUrl;
        // Fetch top queries from the last 28 days
        const queries = await getUserTopQueries(userId, siteUrl, 28);
        if (queries && queries.length > 0) {
          // Take top 20 queries
          searchConsoleData = { topQueries: queries.slice(0, 20) };
          console.log(`[Blog Gen] Using ${Math.min(queries.length, 20)} Search Console queries for SEO optimization`);
        }
      }
    } catch (seoError) {
      // Non-fatal - continue without SEO data
      console.log("[Blog Gen] Could not fetch Search Console data:", seoError);
    }

    const { htmlContent, seoData } = await generateBlogContent(request, searchConsoleData);

    // Deduct credit after successful generation
    const creditResult = await deductCredits(
      userId,
      "blog_generation",
      `Blog: ${request.topic} - ${request.location}`
    );

    if (!creditResult.success) {
      console.error("[Blog Gen] Credit deduction failed:", creditResult.error);
      // Still return the content but log the issue
    }

    return res.status(200).json({
      success: true,
      htmlContent,
      seoData,
      tokens: {
        input: 0,
        output: 0,
      },
    });
  } catch (error) {
    console.error("Blog generation error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return res.status(500).json({
      success: false,
      error: `Failed to generate blog: ${errorMessage}`,
    });
  }
}
