// lib/ai-gateway.ts
import { gateway } from "@ai-sdk/gateway";
import { generateText, experimental_generateImage as generateImageAI } from "ai";

// Language Model assignments based on user specification
export const MODELS = {
  // Llama 4 Maverick - AI Conductor/Orchestrator
  conductor: gateway("meta/llama-4-maverick"),

  // Claude Sonnet 4.5 - Content writer
  contentWriter: gateway("anthropic/claude-sonnet-4.5"),

  // Kimi 2 - Code writer for blog posts and image review
  codeWriter: gateway("moonshotai/kimi-k2"),

  // Gemini 2.5 Flash - For image generation
  geminiFlash: gateway("google/gemini-2.5-flash"),

  // Gemini 3 Pro - For image editing/remaking
  geminiPro: gateway("google/gemini-3-pro-image"),

  // Perplexity Sonar Reasoning Pro - Deep SEO research
  researcher: gateway("perplexity/sonar-reasoning-pro"),
};

// Image Model assignments - using Gateway's imageModel method
export const IMAGE_MODELS = {
  // Google Imagen 4.0 for initial image generation
  imageGenerator: gateway.imageModel("google/imagen-4.0-generate"),
};

// Types for the various AI operations
export interface OutlineSection {
  title: string;
  keyPoints: string[];
  imagePrompt: string;
  imagePlacement: "before" | "after" | "within";
}

export interface BlogOutline {
  blogTitle: string;
  introduction: {
    hook: string;
    keyPoints: string[];
    imagePrompt: string;
  };
  sections: OutlineSection[];
  conclusion: {
    summary: string;
    callToAction: string;
  };
  seo: {
    primaryKeyword: string;
    secondaryKeywords: string[];
    metaTitle: string;
    metaDescription: string;
  };
}

export interface KeywordResearch {
  primaryKeyword: string;
  secondaryKeywords: string[];
  metaTitle: string;
  metaDescription: string;
  competitorInsights: string[];
  contentAngles: string[];
  imageThemes: string[];
}

export interface GeneratedImage {
  index: number;
  prompt: string;
  base64: string;
  mimeType: string;
}

export interface ImageReviewResult {
  approved: boolean;
  feedback?: string;
  remakePrompt?: string;
  reviewer: "claude" | "kimi" | "both";
}

// Generate blog outline using Llama 4 Maverick (Conductor)
export async function generateOutline(params: {
  topic: string;
  location: string;
  blogType: string;
  numberOfSections?: number;
  tone?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  imageThemes?: string[];
}): Promise<BlogOutline> {
  const {
    topic,
    location,
    blogType,
    numberOfSections = 5,
    tone = "professional yet friendly",
    primaryKeyword,
    secondaryKeywords,
    imageThemes,
  } = params;

  const seoContext = primaryKeyword
    ? `\n\nSEO REQUIREMENTS:
- Primary keyword to target: "${primaryKeyword}"
- Secondary keywords to include naturally: ${secondaryKeywords?.join(", ") || "related terms"}
- Ensure the outline structure supports natural keyword placement`
    : "";

  const imageThemeContext = imageThemes && imageThemes.length > 0
    ? `\n\nIMAGE THEMES (from research - use these as guides for your image prompts):
${imageThemes.map((theme, i) => `${i + 1}. ${theme}`).join("\n")}`
    : "";

  const prompt = `You are an expert content strategist and SEO specialist. Create a detailed blog post outline for a local service company.

BLOG SPECIFICATIONS:
- Topic: ${topic}
- Location: ${location}
- Blog Type: ${blogType}
- Number of Sections: ${numberOfSections}
- Tone: ${tone}

Your task is to create a structured outline that will guide the content writer. For each section, provide a detailed image prompt that will be used to generate a unique, professional image.
${seoContext}
${imageThemeContext}

IMAGE PROMPT GUIDELINES:
- Each image prompt should be highly specific and descriptive
- Include details about: lighting conditions, time of day, architectural style, atmosphere
- The image MUST directly relate to the section content
- For ${topic}, include relevant visual elements (products, installations, before/after, etc.)
- Reference the location naturally (${location} area aesthetics)
- Aim for photorealistic, professional marketing imagery
- Avoid generic descriptions - make each prompt unique to its section's specific content

Respond with ONLY valid JSON in this exact format:
{
  "blogTitle": "Compelling H1 title mentioning ${location} and ${topic}",
  "introduction": {
    "hook": "Opening hook that addresses customer pain points or aspirations",
    "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
    "imagePrompt": "Detailed prompt for hero image"
  },
  "sections": [
    {
      "title": "Section H2 title",
      "keyPoints": ["Point 1", "Point 2", "Point 3"],
      "imagePrompt": "Detailed prompt for section image",
      "imagePlacement": "after"
    }
  ],
  "conclusion": {
    "summary": "Key takeaways",
    "callToAction": "Compelling CTA"
  },
  "seo": {
    "primaryKeyword": "primary keyword phrase",
    "secondaryKeywords": ["keyword1", "keyword2"],
    "metaTitle": "SEO title under 60 chars",
    "metaDescription": "Meta description 150-160 chars"
  }
}

Generate exactly ${numberOfSections} sections.`;

  const result = await generateText({
    model: MODELS.conductor,
    system: "You are an expert content strategist. Always respond with valid JSON only, no markdown formatting or code blocks.",
    prompt,
    maxOutputTokens: 4000,
    temperature: 0.7,
  });

  // Clean and parse the response
  let cleanedResponse = result.text.trim();
  if (cleanedResponse.startsWith("```json")) {
    cleanedResponse = cleanedResponse.slice(7);
  }
  if (cleanedResponse.startsWith("```")) {
    cleanedResponse = cleanedResponse.slice(3);
  }
  if (cleanedResponse.endsWith("```")) {
    cleanedResponse = cleanedResponse.slice(0, -3);
  }

  return JSON.parse(cleanedResponse.trim());
}

// Research keywords using Perplexity Sonar Reasoning Pro
export async function researchKeywords(params: {
  topic: string;
  location: string;
  companyName?: string;
  companyWebsite?: string;
  blogType: string;
}): Promise<KeywordResearch> {
  const { topic, location, companyName, companyWebsite, blogType } = params;

  const prompt = `You are an expert SEO researcher and content strategist. Analyze the following business topic and provide comprehensive keyword and content research.

BUSINESS DETAILS:
- Topic/Service: ${topic}
- Location: ${location}
- Company Name: ${companyName || "Local service provider"}
- Company Website: ${companyWebsite || "Not provided"}
- Blog Type: ${blogType}

RESEARCH TASKS:
1. Identify the best PRIMARY KEYWORD for this topic + location (high-intent, local search term)
2. Suggest 5-8 SECONDARY KEYWORDS (related terms, long-tail variations, LSI keywords)
3. Write an optimized META TITLE (under 60 characters, include primary keyword and location)
4. Write a compelling META DESCRIPTION (under 160 characters, include call to action)
5. Analyze what COMPETITORS are likely doing in this space
6. Suggest unique CONTENT ANGLES that would differentiate this blog
7. Recommend specific IMAGE THEMES for each section

For IMAGE THEMES, provide detailed descriptions:
- Time of day, weather, architectural style, camera angle, mood
- Be specific about what the images should show

Respond in this exact JSON format:
{
  "primaryKeyword": "main keyword phrase with location",
  "secondaryKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "metaTitle": "SEO optimized title under 60 chars",
  "metaDescription": "Compelling description under 160 chars with CTA",
  "competitorInsights": ["insight1", "insight2", "insight3"],
  "contentAngles": ["angle1", "angle2", "angle3"],
  "imageThemes": [
    "Hero image: detailed description",
    "Section 1: specific image description",
    "Section 2: specific image description",
    "Section 3: specific image description",
    "Section 4: specific image description",
    "Section 5: specific image description"
  ]
}`;

  const result = await generateText({
    model: MODELS.researcher,
    prompt,
    maxOutputTokens: 2000,
    temperature: 0.5,
  });

  // Clean and parse response
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
    // Return fallback if parsing fails
    return {
      primaryKeyword: `${topic.toLowerCase()} ${location.toLowerCase()}`,
      secondaryKeywords: [
        `${topic.toLowerCase()} services`,
        `best ${topic.toLowerCase()} near me`,
        `${location} ${topic.toLowerCase()} company`,
        `professional ${topic.toLowerCase()}`,
        `${topic.toLowerCase()} installation`,
      ],
      metaTitle: `${topic} in ${location} | Expert Guide`,
      metaDescription: `Discover the best ${topic.toLowerCase()} solutions in ${location}. Expert tips, local insights, and professional services. Contact us today!`,
      competitorInsights: [
        "Focus on local expertise and knowledge",
        "Highlight quality and professionalism",
        "Emphasize customer service and support",
      ],
      contentAngles: [
        "Local neighborhood-specific recommendations",
        "Before and after transformations",
        "Expert tips from industry professionals",
      ],
      imageThemes: [
        `Hero: Beautiful ${location} home showcasing professional ${topic.toLowerCase()}, golden hour lighting`,
        `Section 1: Close-up of ${topic.toLowerCase()} details showing quality craftsmanship`,
        `Section 2: Before and after comparison of ${topic.toLowerCase()} project`,
        `Section 3: Professional team working on ${topic.toLowerCase()} installation`,
        `Section 4: Finished ${topic.toLowerCase()} project from multiple angles`,
        `Section 5: Happy homeowner enjoying their new ${topic.toLowerCase()}`,
      ],
    };
  }
}

// Generate blog content using Claude Sonnet 4.5
export async function generateContent(params: {
  outline: BlogOutline;
  topic: string;
  location: string;
  tone?: string;
  companyName?: string;
}): Promise<string> {
  const { outline, topic, location, tone = "professional yet friendly", companyName } = params;

  const prompt = `You are an expert content writer specializing in local service businesses. Write a comprehensive, SEO-optimized blog post based on this outline.

BLOG OUTLINE:
${JSON.stringify(outline, null, 2)}

REQUIREMENTS:
- Topic: ${topic}
- Location: ${location}
- Tone: ${tone}
- Company: ${companyName || "our team"}
- Include the primary keyword "${outline.seo.primaryKeyword}" naturally throughout
- Include secondary keywords where appropriate
- Write engaging, informative content for each section
- Use HTML formatting (h1, h2, p, ul, li tags)
- Include [IMAGE:X] placeholders where images should be inserted (X = 0 for hero, 1-N for sections)
- Write approximately 1500-2000 words total
- Make content locally relevant to ${location}
- Include a strong call-to-action in the conclusion

FORMAT YOUR RESPONSE AS HTML:
<h1>Title</h1>
<p>Introduction...</p>
[IMAGE:0]
<h2>Section Title</h2>
<p>Content...</p>
[IMAGE:1]
...and so on`;

  const result = await generateText({
    model: MODELS.contentWriter,
    system: "You are an expert blog content writer. Write engaging, SEO-optimized content in HTML format.",
    prompt,
    maxOutputTokens: 8000,
    temperature: 0.7,
  });

  return result.text;
}

// Helper to parse JSON from AI response
function parseJsonResponse(text: string): Record<string, unknown> | null {
  let cleanedText = text.trim();
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
    return null;
  }
}

// Review image quality using Claude Sonnet 4.5
async function reviewWithClaude(params: {
  imageBase64: string;
  originalPrompt: string;
  sectionContext: string;
}): Promise<{ approved: boolean; feedback?: string; remakePrompt?: string }> {
  const { imageBase64, originalPrompt, sectionContext } = params;

  const prompt = `Review this image for quality and relevance to the blog section.

ORIGINAL PROMPT: ${originalPrompt}
SECTION CONTEXT: ${sectionContext}

Evaluate:
1. Does the image match the prompt?
2. Is it professional quality?
3. Is it appropriate for a business blog?
4. Does it support the section content?

Respond in JSON:
{
  "approved": true/false,
  "feedback": "explanation if not approved",
  "remakePrompt": "improved prompt if remake needed"
}`;

  try {
    const result = await generateText({
      model: MODELS.contentWriter,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image", image: imageBase64 },
          ],
        },
      ],
      maxOutputTokens: 500,
    });

    const parsed = parseJsonResponse(result.text);
    if (parsed) {
      return {
        approved: Boolean(parsed.approved),
        feedback: parsed.feedback as string | undefined,
        remakePrompt: parsed.remakePrompt as string | undefined,
      };
    }
  } catch (error) {
    console.error("Claude review error:", error);
  }
  return { approved: true };
}

// Review image quality using Kimi 2
async function reviewWithKimi(params: {
  imageBase64: string;
  originalPrompt: string;
  sectionContext: string;
}): Promise<{ approved: boolean; feedback?: string; remakePrompt?: string }> {
  const { imageBase64, originalPrompt, sectionContext } = params;

  const prompt = `You are a professional image quality reviewer. Analyze this image for a business blog.

ORIGINAL IMAGE PROMPT: ${originalPrompt}
BLOG SECTION: ${sectionContext}

Review criteria:
1. Does the image accurately represent the prompt?
2. Is the quality professional enough for marketing?
3. Would this image enhance the blog section?
4. Are there any issues (wrong subject, poor quality, inappropriate content)?

Respond ONLY in JSON format:
{
  "approved": true or false,
  "feedback": "your detailed feedback",
  "remakePrompt": "if not approved, provide a better image prompt"
}`;

  try {
    const result = await generateText({
      model: MODELS.codeWriter,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image", image: imageBase64 },
          ],
        },
      ],
      maxOutputTokens: 500,
    });

    const parsed = parseJsonResponse(result.text);
    if (parsed) {
      return {
        approved: Boolean(parsed.approved),
        feedback: parsed.feedback as string | undefined,
        remakePrompt: parsed.remakePrompt as string | undefined,
      };
    }
  } catch (error) {
    console.error("Kimi review error:", error);
  }
  return { approved: true };
}

// Combined image quality review using both Claude and Kimi 2
// If EITHER finds an issue, the image will be remade
export async function reviewImageQuality(params: {
  imageBase64: string;
  originalPrompt: string;
  sectionContext: string;
}): Promise<ImageReviewResult> {
  const { imageBase64, originalPrompt, sectionContext } = params;

  // Run both reviews in parallel
  const [claudeReview, kimiReview] = await Promise.all([
    reviewWithClaude({ imageBase64, originalPrompt, sectionContext }),
    reviewWithKimi({ imageBase64, originalPrompt, sectionContext }),
  ]);

  console.log(`Claude review: ${claudeReview.approved ? "APPROVED" : "REJECTED"}`);
  console.log(`Kimi review: ${kimiReview.approved ? "APPROVED" : "REJECTED"}`);

  // If EITHER reviewer rejects, the image needs to be remade
  if (!claudeReview.approved || !kimiReview.approved) {
    // Prefer the remake prompt from whichever reviewer rejected
    // If both rejected, combine their feedback
    let combinedFeedback = "";
    let remakePrompt = "";

    if (!claudeReview.approved && claudeReview.feedback) {
      combinedFeedback += `Claude: ${claudeReview.feedback}. `;
      remakePrompt = claudeReview.remakePrompt || "";
    }
    if (!kimiReview.approved && kimiReview.feedback) {
      combinedFeedback += `Kimi: ${kimiReview.feedback}. `;
      if (!remakePrompt && kimiReview.remakePrompt) {
        remakePrompt = kimiReview.remakePrompt;
      }
    }

    // If no remake prompt, create one from the original with feedback
    if (!remakePrompt) {
      remakePrompt = `${originalPrompt}. IMPORTANT: ${combinedFeedback}`;
    }

    return {
      approved: false,
      feedback: combinedFeedback.trim(),
      remakePrompt,
      reviewer: !claudeReview.approved && !kimiReview.approved ? "both" : (!claudeReview.approved ? "claude" : "kimi"),
    };
  }

  return {
    approved: true,
    reviewer: "both",
  };
}

// Generate image using Google Imagen 4.0
export async function generateBlogImage(params: {
  prompt: string;
  index: number;
}): Promise<GeneratedImage | null> {
  const { prompt, index } = params;

  const enhancedPrompt = `Create a high-quality, photorealistic image for a professional blog post.

IMAGE REQUIREMENTS:
- Style: Professional marketing photography
- Quality: High resolution, sharp details
- Composition: Well-balanced, visually appealing
- Subject: ${prompt}

Make the image look like it was taken by a professional photographer for a magazine or marketing material.`;

  try {
    const result = await generateImageAI({
      model: IMAGE_MODELS.imageGenerator,
      prompt: enhancedPrompt,
      n: 1,
    });

    // Get the first generated image
    if (result.images && result.images.length > 0) {
      const image = result.images[0];
      const base64Data = image.base64;
      const mediaType = image.mediaType || "image/png";

      return {
        index,
        prompt,
        base64: `data:${mediaType};base64,${base64Data}`,
        mimeType: mediaType,
      };
    }

    return null;
  } catch (error) {
    console.error(`Error generating image ${index}:`, error);
    return null;
  }
}

// Remake/edit image using Gemini 3 Pro (via Imagen with improved prompt)
// Gemini 3 Pro image model is accessed through the language model with image generation capability
export async function remakeBlogImage(params: {
  improvedPrompt: string;
  index: number;
}): Promise<GeneratedImage | null> {
  const { improvedPrompt, index } = params;

  try {
    // First, use Gemini 3 Pro to enhance the prompt
    console.log(`Using Gemini 3 Pro to enhance prompt for image ${index}...`);
    const enhancementResult = await generateText({
      model: MODELS.geminiPro,
      prompt: `You are an expert image prompt engineer. Enhance this image prompt to produce a better, more professional marketing photograph:

Original prompt: ${improvedPrompt}

Create an enhanced, detailed prompt that will generate a high-quality, photorealistic image suitable for a professional business blog. Include specific details about:
- Lighting (natural, studio, golden hour, etc.)
- Composition and framing
- Style and mood
- Technical quality expectations

Return ONLY the enhanced prompt text, nothing else.`,
      maxOutputTokens: 500,
    });

    const enhancedPrompt = enhancementResult.text.trim() || improvedPrompt;
    console.log(`Enhanced prompt: ${enhancedPrompt.substring(0, 100)}...`);

    // Generate the image with the enhanced prompt using Imagen
    const imagenResult = await generateImageAI({
      model: IMAGE_MODELS.imageGenerator,
      prompt: enhancedPrompt,
      n: 1,
    });

    if (imagenResult.images && imagenResult.images.length > 0) {
      const image = imagenResult.images[0];
      const base64Data = image.base64;
      const mediaType = image.mediaType || "image/png";

      return {
        index,
        prompt: improvedPrompt,
        base64: `data:${mediaType};base64,${base64Data}`,
        mimeType: mediaType,
      };
    }

    return null;
  } catch (error) {
    console.error(`Error remaking image ${index}:`, error);
    return null;
  }
}

// Format final blog HTML using Kimi 2
export async function formatBlogCode(params: {
  content: string;
  images: GeneratedImage[];
  outline: BlogOutline;
}): Promise<string> {
  const { content, images, outline } = params;

  const prompt = `You are an expert web developer. Take this blog content and images and format it as clean, semantic HTML ready for WordPress.

BLOG CONTENT:
${content}

IMAGES AVAILABLE:
${images.map((img, i) => `[IMAGE:${i}] - ${img.prompt}`).join("\n")}

SEO DATA:
- Title: ${outline.seo.metaTitle}
- Description: ${outline.seo.metaDescription}
- Primary Keyword: ${outline.seo.primaryKeyword}

REQUIREMENTS:
1. Replace [IMAGE:X] placeholders with proper <figure> elements
2. Use semantic HTML (article, section, figure, figcaption)
3. Add proper alt text to images using the prompts
4. Ensure proper heading hierarchy (h1, h2, h3)
5. Add schema.org structured data if appropriate
6. Make the HTML clean and WordPress-compatible
7. Do not include <html>, <head>, or <body> tags - just the article content

Return ONLY the formatted HTML, no explanations.`;

  const result = await generateText({
    model: MODELS.codeWriter,
    system: "You are an expert web developer. Return only clean HTML code, no explanations.",
    prompt,
    maxOutputTokens: 10000,
    temperature: 0.3,
  });

  return result.text;
}
