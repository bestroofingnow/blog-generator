// pages/api/generate-blog.ts
import { Anthropic } from "@anthropic-ai/sdk";
import type { NextApiRequest, NextApiResponse } from "next";

interface BlogGeneratorRequest {
  topic: string;
  location: string;
  blogType: string;
  numberOfSections?: number;
  tone?: string;
  includeImages?: boolean;
}

interface BlogGeneratorResponse {
  success: boolean;
  htmlContent?: string;
  error?: string;
  tokens?: {
    input: number;
    output: number;
  };
}

const client = new Anthropic();

const systemPrompt = `You are an expert landscape lighting and lifestyle marketing content writer specializing in Charlotte, North Carolina neighborhoods. Your writing style perfectly blends practical expertise with emotional resonance.

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

async function generateBlogContent(
  request: BlogGeneratorRequest
): Promise<string> {
  const {
    topic,
    location,
    blogType,
    numberOfSections = 5,
    tone = "professional yet friendly",
  } = request;

  const userPrompt = `Generate a professional blog post about landscape lighting for Charlotte, NC area with these specifications:

TOPIC: ${topic}
LOCATION: ${location}
BLOG TYPE: ${blogType}
NUMBER OF SECTIONS: ${numberOfSections}
TONE: ${tone}

CONTENT REQUIREMENTS:

1. HEADLINE: Create an H1 title that mentions both ${location} and ${topic}, designed to appeal to homeowners considering lighting upgrades

2. INTRODUCTION (Hero Section):
   - Start with a compelling hook that speaks to homeowner pain points or aspirations
   - 2-3 paragraphs explaining why this topic matters for ${location} properties
   - End intro with a transition to main content
   - Include one [IMAGE:description] after intro

3. MAIN SECTIONS (${numberOfSections} sections):
   - Create H2 headers that are specific to ${location} neighborhoods or aspects
   - Each section: 2-3 substantial paragraphs
   - For each section, include:
     * Practical landscape lighting advice
     * How it specifically applies to ${location}
     * Local landmarks, parks, or neighborhood characteristics
     * Lifestyle/emotional benefits alongside practical benefits
     * Specific architectural or design considerations
   - Include [IMAGE:description] between 2-3 major sections
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

Generate ONLY valid HTML code. Do not include markdown formatting, code fences, or any text outside the HTML tags.`;

  const message = await client.messages.create({
    model: "claude-opus-4-20250805",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
    system: systemPrompt,
  });

  // Extract text content
  let htmlContent = "";
  if (message.content[0].type === "text") {
    htmlContent = message.content[0].text;
  }

  return htmlContent;
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

  try {
    const request = req.body as BlogGeneratorRequest;

    // Validate required fields
    if (!request.topic || !request.location || !request.blogType) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: topic, location, blogType",
      });
    }

    const htmlContent = await generateBlogContent(request);

    return res.status(200).json({
      success: true,
      htmlContent,
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
