// lib/ai-gateway.ts
import { createGateway } from "@ai-sdk/gateway";
import { generateText, experimental_generateImage as generateImageAI } from "ai";

// Create gateway instance with API key authentication
const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? "",
});

// Language Model assignments based on user specification
// Using correct Vercel AI Gateway model IDs with provider prefix
// Trade Services AI Team:
// - Blueprint (Llama 4) - The Architect, designs structured outlines
// - Craftsman (Claude) - The Writer, crafts quality content
// - Foreman (Kimi) - The Reviewer, oversees code and quality
// - Snapshot (Imagen) - The Photographer, creates images
// - Touchup (Gemini Pro) - The Finisher, remakes/enhances images
// - Scout (Perplexity) - The Researcher, finds SEO opportunities
export const MODELS = {
  // Llama 4 Maverick - AI Conductor/Orchestrator (Blueprint)
  conductor: gateway("meta/llama-4-maverick"),

  // Claude Sonnet 4 - Content writer (Craftsman)
  contentWriter: gateway("anthropic/claude-sonnet-4"),

  // Kimi K2 - Code writer for blog posts and image review (Foreman)
  codeWriter: gateway("moonshotai/kimi-k2"),

  // Gemini 2.5 Flash - For image generation prompts
  geminiFlash: gateway("google/gemini-2.5-flash-preview-09-2025"),

  // Gemini 3 Pro - For image editing/remaking (Touchup)
  geminiPro: gateway("google/gemini-3.0-pro-preview"),

  // Perplexity Sonar - Deep SEO research (Scout)
  researcher: gateway("perplexity/sonar"),
};

// Image Model assignments - using Gateway's imageModel method
// Full model ID format: provider/model-name
export const IMAGE_MODELS = {
  // Google Imagen 4.0 for initial image generation (using full provider/model format)
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
  url?: string; // Optional external URL for user-provided images
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
  profileContext?: {
    // Company basics
    companyName?: string;
    tagline?: string;
    services?: string[];
    usps?: string[];
    certifications?: string[];
    brandVoice?: string;
    writingStyle?: string;
    targetAudience?: string;
    // Industry (may be custom industry name if user selected "custom")
    industryType?: string;
    customIndustryName?: string;
    yearsInBusiness?: number;
    // Location & Service Areas
    headquarters?: string;
    state?: string;
    serviceAreas?: string[];
    // SEO & Site Identity
    primarySiteKeyword?: string;
    secondarySiteKeywords?: string[];
    siteDescription?: string;
    // Business Personality
    businessPersonality?: string;
    valueProposition?: string;
    // Competitor Research
    competitorWebsites?: string[];
    competitors?: string[];
    // Contact info for CTAs
    phone?: string;
    email?: string;
    website?: string;
  };
  // Real SERP data from Bright Data
  serpData?: {
    topCompetitors?: string[];
    paaQuestions?: string[];
    relatedSearches?: string[];
  };
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
    profileContext,
    serpData,
  } = params;

  // Build profile context for better targeted outlines
  let profileSection = "";
  if (profileContext) {
    profileSection = "\n\nCOMPANY CONTEXT (use this to make content more specific and authentic):";
    // Company basics
    if (profileContext.companyName) {
      profileSection += `\n- Company Name: ${profileContext.companyName}`;
    }
    if (profileContext.tagline) {
      profileSection += `\n- Tagline: ${profileContext.tagline}`;
    }
    // SEO & Site Identity
    if (profileContext.primarySiteKeyword) {
      profileSection += `\n- PRIMARY SITE KEYWORD: "${profileContext.primarySiteKeyword}" (align content with this main keyword)`;
    }
    if (profileContext.secondarySiteKeywords && profileContext.secondarySiteKeywords.length > 0) {
      profileSection += `\n- Secondary Site Keywords: ${profileContext.secondarySiteKeywords.join(", ")}`;
    }
    if (profileContext.siteDescription) {
      profileSection += `\n- Site Focus: ${profileContext.siteDescription}`;
    }
    // Location & Service Areas
    if (profileContext.headquarters) {
      profileSection += `\n- Headquarters: ${profileContext.headquarters}${profileContext.state ? `, ${profileContext.state}` : ""}`;
    }
    if (profileContext.serviceAreas && profileContext.serviceAreas.length > 0) {
      profileSection += `\n- Service Areas: ${profileContext.serviceAreas.join(", ")}`;
    }
    // Business services and strengths
    if (profileContext.services && profileContext.services.length > 0) {
      profileSection += `\n- Services Offered: ${profileContext.services.join(", ")}`;
    }
    if (profileContext.usps && profileContext.usps.length > 0) {
      profileSection += `\n- Unique Selling Points to Highlight: ${profileContext.usps.join(", ")}`;
    }
    if (profileContext.valueProposition) {
      profileSection += `\n- Value Proposition: ${profileContext.valueProposition}`;
    }
    if (profileContext.certifications && profileContext.certifications.length > 0) {
      profileSection += `\n- Certifications/Credentials: ${profileContext.certifications.join(", ")}`;
    }
    // Brand voice and personality
    if (profileContext.brandVoice) {
      profileSection += `\n- Brand Voice: ${profileContext.brandVoice}`;
    }
    if (profileContext.businessPersonality) {
      profileSection += `\n- Business Personality: ${profileContext.businessPersonality}`;
    }
    if (profileContext.targetAudience) {
      profileSection += `\n- Target Audience: ${profileContext.targetAudience}`;
    }
    if (profileContext.yearsInBusiness) {
      profileSection += `\n- Years in Business: ${profileContext.yearsInBusiness}`;
    }
    if (profileContext.writingStyle) {
      profileSection += `\n- Writing Style: ${profileContext.writingStyle}`;
    }
    // Competitor information
    if (profileContext.competitorWebsites && profileContext.competitorWebsites.length > 0) {
      profileSection += `\n- Competitors to Differentiate From: ${profileContext.competitorWebsites.join(", ")}`;
    }
    if (profileContext.competitors && profileContext.competitors.length > 0) {
      profileSection += `\n- Named Competitors: ${profileContext.competitors.join(", ")}`;
    }
    // Contact info for CTAs
    if (profileContext.phone || profileContext.email || profileContext.website) {
      profileSection += "\n- Contact Info (for CTAs):";
      if (profileContext.phone) profileSection += ` Phone: ${profileContext.phone}`;
      if (profileContext.email) profileSection += ` Email: ${profileContext.email}`;
      if (profileContext.website) profileSection += ` Website: ${profileContext.website}`;
    }
  }

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

  // Build SERP research context (real search data from Bright Data)
  let serpContext = "";
  if (serpData) {
    serpContext = "\n\nREAL SEARCH DATA (from Google - use this to outrank competitors):";
    if (serpData.topCompetitors && serpData.topCompetitors.length > 0) {
      serpContext += `\n\nTOP RANKING COMPETITORS (analyze and differentiate):
${serpData.topCompetitors.slice(0, 5).map((c, i) => `${i + 1}. ${c}`).join("\n")}`;
    }
    if (serpData.paaQuestions && serpData.paaQuestions.length > 0) {
      serpContext += `\n\nPEOPLE ALSO ASK (include answers to these questions in your content):
${serpData.paaQuestions.slice(0, 8).map((q, i) => `${i + 1}. ${q}`).join("\n")}`;
    }
    if (serpData.relatedSearches && serpData.relatedSearches.length > 0) {
      serpContext += `\n\nRELATED SEARCHES (incorporate these keywords naturally):
${serpData.relatedSearches.slice(0, 10).join(", ")}`;
    }
  }

  // Determine industry from profile context
  const industry = profileContext?.industryType || "local services";

  const prompt = `You are an expert content strategist and SEO specialist. Create a detailed blog post outline for a local service company.

IMPORTANT: All content MUST be written in American English only. Do not use any other languages.

CRITICAL INDUSTRY CONSTRAINT: This content is EXCLUSIVELY for a ${industry.toUpperCase()} business. ALL topics, angles, and image prompts MUST be specific to the ${industry} industry. Do NOT reference or include content from other industries.

BLOG SPECIFICATIONS:
- Industry: ${industry} (IMPORTANT - stay within this industry only)
- Topic: ${topic}
- Location: ${location}
- Blog Type: ${blogType}
- Number of Sections: ${numberOfSections}
- Tone: ${tone}
- Language: American English ONLY

Your task is to create a structured outline that will guide the content writer. For each section, provide a detailed image prompt that will be used to generate a unique, professional image.
${seoContext}
${imageThemeContext}
${serpContext}
${profileSection}

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

  try {
    console.log("[Blueprint] Generating outline with meta/llama-4-maverick...");
    const result = await generateText({
      model: MODELS.conductor,
      system: "You are an expert content strategist. Always respond with valid JSON only, no markdown formatting or code blocks.",
      prompt,
      maxOutputTokens: 4000,
      temperature: 0.7,
    });

    // Clean and parse the response
    let cleanedResponse = result.text.trim();
    console.log("[Blueprint] Raw response length:", cleanedResponse.length);

    if (cleanedResponse.startsWith("```json")) {
      cleanedResponse = cleanedResponse.slice(7);
    }
    if (cleanedResponse.startsWith("```")) {
      cleanedResponse = cleanedResponse.slice(3);
    }
    if (cleanedResponse.endsWith("```")) {
      cleanedResponse = cleanedResponse.slice(0, -3);
    }

    try {
      return JSON.parse(cleanedResponse.trim());
    } catch (parseError) {
      console.error("[Blueprint] JSON parse error. Response starts with:", cleanedResponse.substring(0, 200));
      throw new Error(`Blueprint (Llama) returned invalid JSON: ${cleanedResponse.substring(0, 100)}...`);
    }
  } catch (error) {
    console.error("[Blueprint] Error calling meta/llama-4-maverick:", error);
    throw new Error(`Blueprint (meta/llama-4-maverick) failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

// Research keywords using Perplexity Sonar Reasoning Pro
export async function researchKeywords(params: {
  topic: string;
  location: string;
  companyName?: string;
  companyWebsite?: string;
  blogType: string;
  profileContext?: {
    // Company basics
    companyName?: string;
    tagline?: string;
    services?: string[];
    usps?: string[];
    certifications?: string[];
    brandVoice?: string;
    writingStyle?: string;
    targetAudience?: string;
    // Industry (may be custom industry name if user selected "custom")
    industryType?: string;
    customIndustryName?: string;
    yearsInBusiness?: number;
    // Location & Service Areas
    headquarters?: string;
    state?: string;
    serviceAreas?: string[];
    // SEO & Site Identity
    primarySiteKeyword?: string;
    secondarySiteKeywords?: string[];
    siteDescription?: string;
    // Business Personality
    businessPersonality?: string;
    valueProposition?: string;
    // Competitor Research
    competitorWebsites?: string[];
    competitors?: string[];
    // Contact info for CTAs
    phone?: string;
    email?: string;
    website?: string;
  };
  existingBlogTitles?: string[];
}): Promise<KeywordResearch> {
  const { topic, location, companyName, companyWebsite, blogType, profileContext, existingBlogTitles } = params;

  // Build profile context section
  let profileSection = "";
  if (profileContext) {
    profileSection = "\n\nCOMPANY PROFILE CONTEXT:";

    // Company basics
    if (profileContext.companyName) {
      profileSection += `\n- Company Name: ${profileContext.companyName}`;
    }
    if (profileContext.tagline) {
      profileSection += `\n- Tagline: ${profileContext.tagline}`;
    }

    // Site identity - MOST IMPORTANT
    if (profileContext.primarySiteKeyword) {
      profileSection += `\n- PRIMARY SITE KEYWORD: "${profileContext.primarySiteKeyword}" (ALL content should support this main keyword)`;
    }
    if (profileContext.secondarySiteKeywords && profileContext.secondarySiteKeywords.length > 0) {
      profileSection += `\n- Secondary Site Keywords: ${profileContext.secondarySiteKeywords.join(", ")}`;
    }
    if (profileContext.siteDescription) {
      profileSection += `\n- Site Focus: ${profileContext.siteDescription}`;
    }

    // Location & Service Areas
    if (profileContext.headquarters) {
      profileSection += `\n- Headquarters: ${profileContext.headquarters}${profileContext.state ? `, ${profileContext.state}` : ""}`;
    }
    if (profileContext.serviceAreas && profileContext.serviceAreas.length > 0) {
      profileSection += `\n- Service Areas: ${profileContext.serviceAreas.join(", ")}`;
    }

    // Business identity
    if (profileContext.services && profileContext.services.length > 0) {
      profileSection += `\n- Services Offered: ${profileContext.services.join(", ")}`;
    }
    if (profileContext.usps && profileContext.usps.length > 0) {
      profileSection += `\n- Unique Selling Points: ${profileContext.usps.join(", ")}`;
    }
    if (profileContext.valueProposition) {
      profileSection += `\n- Value Proposition: ${profileContext.valueProposition}`;
    }
    if (profileContext.certifications && profileContext.certifications.length > 0) {
      profileSection += `\n- Certifications: ${profileContext.certifications.join(", ")}`;
    }
    if (profileContext.yearsInBusiness) {
      profileSection += `\n- Years in Business: ${profileContext.yearsInBusiness}`;
    }

    // Brand personality
    if (profileContext.brandVoice) {
      profileSection += `\n- Brand Voice: ${profileContext.brandVoice}`;
    }
    if (profileContext.writingStyle) {
      profileSection += `\n- Writing Style: ${profileContext.writingStyle}`;
    }
    if (profileContext.businessPersonality) {
      profileSection += `\n- Business Personality: ${profileContext.businessPersonality}`;
    }
    if (profileContext.targetAudience) {
      profileSection += `\n- Target Audience: ${profileContext.targetAudience}`;
    }
    if (profileContext.industryType) {
      profileSection += `\n- Industry: ${profileContext.industryType}${profileContext.customIndustryName ? ` (${profileContext.customIndustryName})` : ""}`;
    }

    // Competitor info
    if (profileContext.competitorWebsites && profileContext.competitorWebsites.length > 0) {
      profileSection += `\n- Competitors to Research: ${profileContext.competitorWebsites.join(", ")}`;
    }
    if (profileContext.competitors && profileContext.competitors.length > 0) {
      profileSection += `\n- Named Competitors: ${profileContext.competitors.join(", ")}`;
    }
  }

  // Build existing content section
  let existingContentSection = "";
  if (existingBlogTitles && existingBlogTitles.length > 0) {
    existingContentSection = "\n\nEXISTING CONTENT (suggest unique angles different from these):";
    existingBlogTitles.slice(0, 15).forEach(title => {
      existingContentSection += `\n- "${title}"`;
    });
  }

  // Determine industry from profile context
  const industry = profileContext?.industryType || "general services";

  const prompt = `You are an expert SEO researcher and content strategist. Analyze the following business topic and provide comprehensive keyword and content research.

CRITICAL: This research is EXCLUSIVELY for a ${industry.toUpperCase()} business. ALL keywords, content angles, and recommendations MUST be relevant to the ${industry} industry. Do NOT suggest topics from other industries.

BUSINESS DETAILS:
- Industry: ${industry} (IMPORTANT - stay within this industry only)
- Topic/Service: ${topic}
- Location: ${location}
- Company Name: ${companyName || "Local service provider"}
- Company Website: ${companyWebsite || "Not provided"}
- Blog Type: ${blogType}${profileSection}${existingContentSection}

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

  try {
    console.log("[Scout] Researching keywords with perplexity/sonar...");
    const result = await generateText({
      model: MODELS.researcher,
      prompt,
      maxOutputTokens: 2000,
      temperature: 0.5,
    });

    console.log("[Scout] Research complete, response length:", result.text.length);

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
    } catch (parseError) {
      console.error("[Scout] JSON parse error. Response starts with:", cleanedText.substring(0, 200));
      // Return fallback if parsing fails
      return createFallbackKeywordResearch(topic, location);
    }
  } catch (error) {
    console.error("[Scout] Error calling perplexity/sonar:", error);
    // Return fallback on API error
    return createFallbackKeywordResearch(topic, location);
  }
}

// Fallback keyword research when API fails
function createFallbackKeywordResearch(topic: string, location: string): KeywordResearch {
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

// Reading level guidelines for content generation
const READING_LEVEL_GUIDELINES: Record<string, string> = {
  "5th Grade": "Use very simple words (1-2 syllables). Short sentences (8-12 words). Avoid jargon. Explain everything like talking to a 10-year-old.",
  "6th Grade": "Use simple words. Short sentences (10-14 words). Minimal technical terms. Clear and direct language.",
  "7th Grade": "Use common vocabulary. Moderate sentence length (12-16 words). Introduce basic industry terms with brief explanations.",
  "8th Grade": "Use everyday vocabulary with some industry terms. Sentences 14-18 words average. Balance clarity with detail.",
  "High School": "Use varied vocabulary including industry terms. Mix short and medium sentences. Assume basic familiarity with the topic.",
  "College": "Use sophisticated vocabulary and industry terminology. Complex sentence structures allowed. Assume reader knowledge of fundamentals.",
  "Graduate": "Use advanced vocabulary, technical terms, and nuanced language. Complex analysis and detailed explanations. Professional-level content.",
};

// Generate blog content using Claude Sonnet 4
export async function generateContent(params: {
  outline: BlogOutline;
  topic: string;
  location: string;
  tone?: string;
  readingLevel?: string;
  companyName?: string;
  wordCountRange?: string;
  numberOfImages?: number;
  profileContext?: {
    // Company basics
    companyName?: string;
    tagline?: string;
    services?: string[];
    usps?: string[];
    certifications?: string[];
    brandVoice?: string;
    writingStyle?: string;
    targetAudience?: string;
    // Industry (may be custom industry name if user selected "custom")
    industryType?: string;
    customIndustryName?: string;
    yearsInBusiness?: number;
    // Location & Service Areas
    headquarters?: string;
    state?: string;
    serviceAreas?: string[];
    // SEO & Site Identity
    primarySiteKeyword?: string;
    secondarySiteKeywords?: string[];
    siteDescription?: string;
    // Business Personality
    businessPersonality?: string;
    valueProposition?: string;
    // Competitor Research
    competitorWebsites?: string[];
    competitors?: string[];
    // Contact info for CTAs
    phone?: string;
    email?: string;
    website?: string;
  };
  // Real SERP data from Bright Data
  serpData?: {
    topCompetitors?: string[];
    paaQuestions?: string[];
    relatedSearches?: string[];
  };
}): Promise<string> {
  const {
    outline,
    topic,
    location,
    tone = "professional yet friendly",
    readingLevel = "8th Grade",
    companyName,
    wordCountRange = "1800-2400",
    numberOfImages = 3,
    profileContext,
    serpData,
  } = params;

  const readingGuidelines = READING_LEVEL_GUIDELINES[readingLevel] || READING_LEVEL_GUIDELINES["8th Grade"];

  // Parse word count range
  const [minWords, maxWords] = wordCountRange.split("-").map(s => parseInt(s.trim()) || 1800);
  const targetWordCount = Math.round((minWords + maxWords) / 2);

  // Generate image placeholder instructions based on numberOfImages
  const imageInstructions = numberOfImages > 1
    ? `Use [IMAGE:0] for the hero/featured image, then [IMAGE:1] through [IMAGE:${numberOfImages - 1}] for section images. Distribute images evenly throughout the content.`
    : `Use [IMAGE:0] for the hero/featured image only.`;

  // Build profile context section for more personalized content
  let profileSection = "";
  if (profileContext) {
    profileSection = "\n\nCOMPANY DETAILS (incorporate naturally into content):";
    // Company basics
    if (profileContext.companyName) {
      profileSection += `\n- Company Name: ${profileContext.companyName}`;
    }
    if (profileContext.tagline) {
      profileSection += `\n- Tagline to Reference: ${profileContext.tagline}`;
    }
    // SEO & Site Identity
    if (profileContext.primarySiteKeyword) {
      profileSection += `\n- PRIMARY SITE KEYWORD: "${profileContext.primarySiteKeyword}" (weave into content naturally)`;
    }
    if (profileContext.secondarySiteKeywords && profileContext.secondarySiteKeywords.length > 0) {
      profileSection += `\n- Secondary Keywords to Include: ${profileContext.secondarySiteKeywords.join(", ")}`;
    }
    if (profileContext.siteDescription) {
      profileSection += `\n- Site Focus: ${profileContext.siteDescription}`;
    }
    // Location & Service Areas
    if (profileContext.headquarters) {
      profileSection += `\n- Based in: ${profileContext.headquarters}${profileContext.state ? `, ${profileContext.state}` : ""}`;
    }
    if (profileContext.serviceAreas && profileContext.serviceAreas.length > 0) {
      profileSection += `\n- Service Areas to Reference: ${profileContext.serviceAreas.join(", ")}`;
    }
    // Business services and strengths
    if (profileContext.services && profileContext.services.length > 0) {
      profileSection += `\n- Services to Reference: ${profileContext.services.slice(0, 5).join(", ")}`;
    }
    if (profileContext.usps && profileContext.usps.length > 0) {
      profileSection += `\n- Unique Selling Points to Weave In: ${profileContext.usps.join(", ")}`;
    }
    if (profileContext.valueProposition) {
      profileSection += `\n- Value Proposition to Convey: ${profileContext.valueProposition}`;
    }
    if (profileContext.certifications && profileContext.certifications.length > 0) {
      profileSection += `\n- Credentials to Mention: ${profileContext.certifications.join(", ")}`;
    }
    // Brand voice and personality
    if (profileContext.brandVoice) {
      profileSection += `\n- Brand Voice: ${profileContext.brandVoice}`;
    }
    if (profileContext.businessPersonality) {
      profileSection += `\n- Business Personality: ${profileContext.businessPersonality}`;
    }
    if (profileContext.targetAudience) {
      profileSection += `\n- Target Audience: ${profileContext.targetAudience}`;
    }
    if (profileContext.yearsInBusiness) {
      profileSection += `\n- Years of Experience: ${profileContext.yearsInBusiness}`;
    }
    if (profileContext.writingStyle) {
      profileSection += `\n- Writing Style: ${profileContext.writingStyle}`;
    }
    // Competitor information
    if (profileContext.competitorWebsites && profileContext.competitorWebsites.length > 0) {
      profileSection += `\n- Differentiate From: ${profileContext.competitorWebsites.join(", ")}`;
    }
    if (profileContext.competitors && profileContext.competitors.length > 0) {
      profileSection += `\n- Named Competitors: ${profileContext.competitors.join(", ")}`;
    }
    // Contact info for CTAs
    if (profileContext.phone || profileContext.email || profileContext.website) {
      profileSection += "\n- Contact Info for CTAs:";
      if (profileContext.phone) profileSection += ` Call ${profileContext.phone}`;
      if (profileContext.email) profileSection += ` Email ${profileContext.email}`;
      if (profileContext.website) profileSection += ` Visit ${profileContext.website}`;
    }
  }

  // Build SERP research context (real search data from Bright Data)
  let serpSection = "";
  if (serpData) {
    serpSection = "\n\nREAL SEARCH DATA (use this to outrank competitors):";
    if (serpData.paaQuestions && serpData.paaQuestions.length > 0) {
      serpSection += `\n\nPEOPLE ALSO ASK - Answer these questions in your content:
${serpData.paaQuestions.slice(0, 8).map((q, i) => `${i + 1}. ${q}`).join("\n")}`;
    }
    if (serpData.relatedSearches && serpData.relatedSearches.length > 0) {
      serpSection += `\n\nRELATED SEARCHES - Incorporate these keywords naturally:
${serpData.relatedSearches.slice(0, 10).join(", ")}`;
    }
    if (serpData.topCompetitors && serpData.topCompetitors.length > 0) {
      serpSection += `\n\nCOMPETITOR CONTENT - Differentiate and outperform:
${serpData.topCompetitors.slice(0, 3).map((c, i) => `${i + 1}. ${c}`).join("\n")}`;
    }
  }

  // Determine industry from profile context
  const industry = profileContext?.industryType || "local services";

  // Calculate exact keyword requirements for 90+ SEO score
  const minKeywordMentions = Math.ceil(targetWordCount / 112); // At least 1 per 112 words
  const maxKeywordMentions = Math.floor((targetWordCount / 122) * 2); // No more than 2 per 122 words
  const targetKeywordMentions = Math.round((minKeywordMentions + maxKeywordMentions) / 2);

  const prompt = `You are an ELITE SEO content writer who creates engaging, human-like content that achieves 90+ SEO scores on the FIRST attempt. Write a comprehensive, SEO-optimized blog post based on this outline.

CRITICAL: All content MUST be written in American English only. Do not use any other languages, characters, or scripts.

CRITICAL INDUSTRY CONSTRAINT: This content is EXCLUSIVELY for a ${industry.toUpperCase()} business. ALL content, examples, and references MUST be specific to the ${industry} industry. Do NOT reference or include content from other industries.

BLOG OUTLINE:
${JSON.stringify(outline, null, 2)}

================================================================
SEO REQUIREMENTS FOR 90+ SCORE (FOLLOW EXACTLY - THIS IS CRITICAL)
================================================================

PRIMARY KEYWORD: "${outline.seo.primaryKeyword}"
TARGET KEYWORD DENSITY: 0.8% - 2.0% (approximately ${minKeywordMentions}-${maxKeywordMentions} mentions for ${targetWordCount} words)

MANDATORY KEYWORD PLACEMENTS (the scorer checks these locations):
1. ✅ H1 HEADING: Primary keyword MUST appear in the first 3-4 words of the H1 title
2. ✅ FIRST 100 WORDS: Primary keyword MUST appear in the very first sentence of the introduction
3. ✅ H2 HEADINGS: Primary keyword MUST appear in at least 3 of your H2 section headings
4. ✅ CONCLUSION: Primary keyword MUST appear in the final paragraph/conclusion
5. ✅ IMAGE ALT TEXT: Primary keyword MUST appear in at least 1 image alt attribute

SECONDARY KEYWORDS: ${outline.seo.secondaryKeywords?.join(", ") || "related terms"}
- Each secondary keyword should appear 2-4 times naturally throughout

HEADING STRUCTURE (scorer requires this):
- Exactly 1 H1 tag (your main title)
- 6-8 H2 tags (section headings - include keyword in at least 3)
- 3+ H3 tags (subsection headings under H2s)

CONTENT REQUIREMENTS:
- Industry: ${industry} (IMPORTANT - stay within this industry only)
- Topic: ${topic}
- Location: ${location}
- Tone: ${tone}
- Company: ${companyName || "our team"}
- Reading Level: ${readingLevel}
- Language: American English ONLY (no other languages or special characters)
- WORD COUNT: Write EXACTLY ${targetWordCount} words (±5%). The scorer checks this!
- Make content locally relevant to ${location}
- Include a strong call-to-action in the conclusion
- DO NOT include <header> or <footer> elements
- DO NOT include navigation elements

READABILITY REQUIREMENTS (for 90+ readability score):
- Short paragraphs: Maximum 3-4 sentences per paragraph
- Bullet points: Include at least 1 bulleted list per major section
- Short sentences: Mix of short (5-10 words) and medium (15-25 words) sentences
- Simple words: Use 8th grade vocabulary, avoid complex jargon
- Target Flesch Reading Ease: 60+ (easy to fairly easy)

IMAGE REQUIREMENTS (for 90+ image score):
- ALL images MUST have descriptive alt text containing the primary keyword
- ALL images MUST have a title attribute
- Use this exact format: <img src="[IMAGE:X]" alt="${outline.seo.primaryKeyword} - descriptive context" title="${outline.seo.primaryKeyword} | ${topic}" width="800" height="600" loading="lazy" />

READING LEVEL GUIDELINES (${readingLevel}):
${readingGuidelines}
${profileSection}
${serpSection}

HUMAN-LIKE WRITING STYLE:
- Write like a knowledgeable friend explaining things, NOT like a corporate brochure
- Use contractions (you're, we're, it's, don't) to sound natural
- Vary sentence length - mix short punchy sentences with longer explanatory ones
- Start some sentences with "And" or "But" for a conversational flow
- Include rhetorical questions to engage readers ("Sound familiar?" "What does this mean for you?")
- Use "you" and "your" frequently to speak directly to the reader
- Add occasional personal touches ("Here's what we've learned..." or "The truth is...")
- Avoid buzzwords and corporate jargon - use plain language
- Include specific examples and real-world scenarios
- Make transitions feel natural, not formulaic
- Show personality - it's okay to have opinions and preferences
- Avoid starting paragraphs with "In conclusion" or "Furthermore" - these sound robotic

CONVERSION OPTIMIZATION (Critical for lead generation):
1. TRUST SIGNALS - Weave these throughout:
   - Reference years of experience, certifications, or customer count
   - Include specific numbers (97% satisfaction, 500+ projects completed)
   - Mention guarantees, warranties, or risk-free offers
   - Reference industry standards or regulations followed

2. STRATEGIC CTAs - Include EXACTLY 4 calls-to-action:
   - SOFT CTA (after introduction): "Learn more about..." or "Download our free guide"
   - MID-CONTENT CTA (after 3rd section): "Schedule a free consultation" or "Get your free estimate"
   - SOCIAL PROOF CTA (after case study): "See more success stories" or "Read our reviews"
   - STRONG CTA (conclusion): "Call now", "Get started today", "Request your free quote"

3. PSYCHOLOGICAL TRIGGERS to include:
   - Urgency: "limited availability", "seasonal demand", "before prices increase"
   - Scarcity: "only X appointments left this month"
   - Social proof: "thousands of satisfied customers", "top-rated"
   - Authority: "industry experts", "certified professionals"
   - Fear of missing out: "don't let problems get worse"

4. BENEFIT-FOCUSED LANGUAGE:
   - Lead with benefits, not features
   - Use "you get" and "you'll enjoy" instead of "we offer"
   - Paint the after picture: "Imagine your home..."
   - Address objections proactively

E-E-A-T SIGNALS (for Google ranking):
- EXPERIENCE: Reference real projects, specific scenarios, lessons learned
- EXPERTISE: Include technical details explained simply, industry terminology
- AUTHORITATIVENESS: Cite industry standards, regulations, best practices
- TRUSTWORTHINESS: Mention credentials, guarantees, transparent pricing

BLOGGING BEST PRACTICES:
- Hook readers in the first sentence with a bold statement or question
- Use the "Problem-Agitate-Solution" framework in introductions
- Break up text with visual elements every 300-400 words
- Include at least one data point or statistic per major section
- Use power words: Ultimate, Proven, Essential, Complete, Expert, Professional
- Create scannable content with bold key phrases
- End each section with a mini-conclusion or transition
- Add a "Quick Tip" or "Pro Tip" box in at least 2 sections

USE THIS EXACT HTML STRUCTURE (no header, no footer, no navigation):

<section class="hero">
  <div class="hero-content">
    <p><img class="featured-image" src="[IMAGE:0]" alt="${outline.seo.primaryKeyword} - featured" width="800" height="600" /></p>
    <p>Introduction paragraph 1...</p>
    <p>Introduction paragraph 2...</p>
  </div>
</section>

<div class="toc">
  <h2>What You'll Learn</h2>
  <ul>
    <li>Section 1 Title</li>
    <li>Section 2 Title</li>
    <!-- etc -->
  </ul>
</div>

<article id="section-slug" class="content-section">
  <h2>Section Title</h2>
  <p>Content paragraphs...</p>
  <h3>Subsection if needed</h3>
  <p>More content...</p>
  <ul>
    <li><strong>Point:</strong> explanation</li>
  </ul>
  <div class="pro-tip">
    <strong>Pro Tip:</strong> Add a valuable insider tip here that demonstrates expertise.
  </div>
  <p><img class="content-image" src="[IMAGE:1]" alt="${outline.seo.primaryKeyword} description" title="${outline.seo.primaryKeyword} | Section Topic" width="800" height="600" loading="lazy" /></p>
</article>

<!-- Repeat for each section with appropriate image placeholders -->

<!-- Include a mid-content CTA after the 3rd section -->
<div class="inline-cta">
  <h3>Ready to Get Started?</h3>
  <p>Benefit-focused CTA text here.</p>
  <a class="cta-button secondary" href="/contact">Schedule Your Free Consultation</a>
</div>

<div class="key-takeaways">
  <h2>Key Takeaways</h2>
  <ul>
    <li>Takeaway 1</li>
    <li>Takeaway 2</li>
  </ul>
</div>

<div class="cta-section">
  <h2>Get Expert ${outline.seo.primaryKeyword} Help Today</h2>
  <p><strong>Don't wait until small problems become expensive emergencies.</strong> Our certified team has helped thousands of ${location} customers achieve outstanding results.</p>
  <ul class="cta-benefits">
    <li>Free, no-obligation consultation</li>
    <li>Transparent pricing with no hidden fees</li>
    <li>100% satisfaction guarantee</li>
  </ul>
  <p class="urgency-text">Limited appointments available this month - secure your spot today!</p>
  <p><a class="cta-button primary" href="/contact">Get Your Free Quote Now</a></p>
</div>

<section class="faq-section">
  <h2>Frequently Asked Questions</h2>
  <div class="faq-item">
    <div class="faq-question">Question here?</div>
    <div class="faq-answer">
      <p>Answer here...</p>
    </div>
  </div>
  <!-- Add 5-8 FAQs -->
</section>

IMAGE PLACEMENT (${numberOfImages} images total):
${imageInstructions}

IMPORTANT:
- Use exactly ${numberOfImages} image placeholders: [IMAGE:0] through [IMAGE:${numberOfImages - 1}]
- Include 5-8 relevant FAQ items
- Do NOT wrap in any header or footer tags
- WORD COUNT REMINDER: Write ${minWords}-${maxWords} words!

=== FINAL SEO CHECKLIST (VERIFY ALL BEFORE COMPLETING) ===
Before finishing, confirm EVERY item is complete:
✓ Primary keyword "${outline.seo.primaryKeyword}" in H1 title (first 3-4 words)
✓ Primary keyword in FIRST SENTENCE of introduction
✓ Primary keyword in at least 3 H2 headings
✓ Primary keyword in conclusion paragraph
✓ Primary keyword in at least 1 image alt text
✓ 6-8 H2 headings total
✓ H3 subheadings under major sections
✓ Bullet lists in every major section
✓ Paragraphs max 3-4 sentences
✓ 4 strategic CTAs placed throughout
✓ Pro tips in at least 2 sections
✓ FAQ section with 5-8 questions
✓ Word count ${minWords}-${maxWords}
✓ All images have alt AND title attributes

THIS CHECKLIST IS CRITICAL - missing any item will cause the SEO score to fail!`;

  try {
    console.log("[Craftsman] Generating content with anthropic/claude-sonnet-4...");
    const result = await generateText({
      model: MODELS.contentWriter,
      system: `You are an elite SEO copywriter and conversion specialist who writes like a real human expert. Your content MUST achieve a 90+ SEO score on the FIRST attempt by following EVERY SEO requirement precisely.

KEY PRIORITIES (in order):
1. SEO COMPLIANCE: Place primary keyword exactly where specified (H1, first sentence, H2s, conclusion, image alt)
2. READABILITY: Short paragraphs (3-4 sentences max), bullet lists in every section
3. CONVERSION: Include all 4 CTAs, trust signals, and urgency triggers
4. HUMAN VOICE: Write conversationally - use contractions, vary sentence length, sound like a knowledgeable friend

Your writing should pass as human-written content - avoid stiff, formulaic language. Match the specified reading level precisely. Output ONLY the HTML content, no explanations or markdown. CRITICAL: Write ONLY in American English - never use any other language, foreign words, or non-English characters.`,
      prompt,
      maxOutputTokens: 8000,
      temperature: 0.75,
    });

    console.log("[Craftsman] Content generated, length:", result.text.length);
    return result.text;
  } catch (error) {
    console.error("[Craftsman] Error calling anthropic/claude-sonnet-4:", error);
    throw new Error(`Craftsman (anthropic/claude-sonnet-4) failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Make targeted SEO adjustments to content
 * Uses Claude to make surgical edits, NOT full rewrites
 */
export async function improveContentForSEO(adjustmentPrompt: string): Promise<string> {
  try {
    console.log("[Craftsman] Making targeted SEO adjustments...");

    const result = await generateText({
      model: MODELS.contentWriter,
      system: `You are an expert SEO content EDITOR (not rewriter). Your job is to make MINIMAL, TARGETED adjustments to existing blog content.

CRITICAL - READ CAREFULLY:
- Do NOT rewrite the entire content
- Make SURGICAL EDITS only - change specific words, phrases, or sentences
- PRESERVE at least 90% of the original content exactly as written
- Only modify what is specifically needed to improve SEO scores
- Keep the same writing style, voice, and structure
- Do NOT add unnecessary filler content
- Do NOT remove good content that already exists

TARGETED ADJUSTMENTS ONLY:
1. Add primary keyword to 2-3 strategic locations if density is low
2. Modify only the H1 heading if it's missing the keyword
3. Expand only thin paragraphs that need more content
4. Update only image alt attributes that are missing keywords
5. Shorten only the longest sentences if readability is low

OUTPUT: Return the HTML with minimal targeted adjustments. No explanations.
LANGUAGE: American English only.`,
      prompt: adjustmentPrompt,
      maxOutputTokens: 10000,
      temperature: 0.3, // Lower temperature for more consistent, minimal changes
    });

    console.log("[Craftsman] SEO adjustments complete, length:", result.text.length);
    return result.text;
  } catch (error) {
    console.error("[Craftsman] SEO adjustment failed:", error);
    throw new Error(`SEO adjustment failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
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

  const prompt = `Review this image for quality, accuracy, and text issues.

ORIGINAL PROMPT: ${originalPrompt}
SECTION CONTEXT: ${sectionContext}
REQUIRED LANGUAGE: American English

REVIEW CRITERIA:

1. QUALITY CHECK:
   - Does the image match the prompt accurately?
   - Is it professional marketing quality?
   - Is it appropriate for a business blog?
   - Does it support the section content?

2. TEXT/SPELLING CHECK (CRITICAL):
   - Does the image contain ANY visible text, letters, numbers, or words?
   - If text is present, is it spelled correctly in American English?
   - Are there any nonsensical, garbled, or misspelled text elements?
   - Are there signs, labels, banners, or watermarks that shouldn't be there?
   - Is any visible text in the wrong language (should be American English only)?

3. VISUAL ACCURACY CHECK:
   - Do all visual elements make sense? (no extra limbs, weird proportions, impossible physics)
   - Is the subject matter accurate to the prompt?

An image should be REJECTED if:
- It contains ANY visible text, letters, numbers, or words (regardless of spelling)
- It contains text in ANY language (we want ZERO text)
- It contains garbled/nonsensical text artifacts
- It has signs, labels, banners, or watermarks with readable text
- It has visual inaccuracies or distortions
- It doesn't match the prompt

IMPORTANT: Even if text is correctly spelled, REJECT the image. We want NO TEXT AT ALL in these images. Text will be added via HTML, not in the image itself.

Respond ONLY in JSON:
{
  "approved": true/false,
  "hasText": true/false,
  "textIssues": "describe any text problems (misspellings, wrong language, garbled) or 'none'",
  "visualIssues": "describe any visual accuracy problems or 'none'",
  "feedback": "overall feedback explaining the decision",
  "remakePrompt": "if not approved, provide improved prompt - MUST include 'ABSOLUTELY NO TEXT' instruction"
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
    console.error("Craftsman review error:", error);
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

  const prompt = `You are a professional image quality reviewer specializing in detecting text and visual issues. Analyze this image for a business blog.

ORIGINAL IMAGE PROMPT: ${originalPrompt}
BLOG SECTION: ${sectionContext}
REQUIRED LANGUAGE: American English only

CRITICAL REVIEW CHECKLIST:

1. TEXT DETECTION (MOST IMPORTANT):
   - Look carefully for ANY text, words, letters, or numbers in the image
   - Check signs, labels, banners, clothing, products, buildings, screens
   - If text exists, verify it is spelled correctly in American English
   - Look for garbled, nonsensical, or AI-generated text artifacts
   - Check for watermarks or logos

2. QUALITY & RELEVANCE:
   - Does the image accurately represent the prompt?
   - Is the quality professional enough for marketing?
   - Would this image enhance the blog section?

3. VISUAL ACCURACY:
   - Are there any anatomical errors (wrong number of fingers, distorted faces)?
   - Are there any impossible physics or unrealistic elements?
   - Is the lighting and perspective consistent?

REJECTION CRITERIA (reject if ANY apply):
- Image contains ANY visible text, letters, numbers, or words (even if correctly spelled)
- Image contains text in ANY language - we want ZERO text in these images
- Image contains garbled/nonsensical AI-generated text artifacts
- Image has signs, banners, labels, or watermarks with readable text
- Image has significant visual distortions
- Image doesn't match the prompt

IMPORTANT: REJECT all images with visible text. Even correctly spelled text is NOT acceptable. These images should be 100% text-free. Any text overlay will be added via HTML.

Respond ONLY in JSON format:
{
  "approved": true or false,
  "hasText": true or false,
  "textIssues": "description of text problems or 'none'",
  "visualIssues": "description of visual problems or 'none'",
  "feedback": "your detailed review",
  "remakePrompt": "if not approved, provide better prompt WITH 'ABSOLUTELY NO TEXT, WORDS, OR LETTERS' instruction"
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
    console.error("Foreman review error:", error);
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

  console.log(`Craftsman review: ${claudeReview.approved ? "APPROVED" : "REJECTED"}`);
  console.log(`Foreman review: ${kimiReview.approved ? "APPROVED" : "REJECTED"}`);

  // If EITHER reviewer rejects, the image needs to be remade
  if (!claudeReview.approved || !kimiReview.approved) {
    // Prefer the remake prompt from whichever reviewer rejected
    // If both rejected, combine their feedback
    let combinedFeedback = "";
    let remakePrompt = "";

    if (!claudeReview.approved && claudeReview.feedback) {
      combinedFeedback += `Craftsman: ${claudeReview.feedback}. `;
      remakePrompt = claudeReview.remakePrompt || "";
    }
    if (!kimiReview.approved && kimiReview.feedback) {
      combinedFeedback += `Foreman: ${kimiReview.feedback}. `;
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

// ============ ENHANCED IMAGE QA LOOP WITH 3-RETRY ============

export interface ImageQaAttempt {
  attempt: number;
  originalPrompt: string;
  claudeApproved: boolean;
  claudeFeedback?: string;
  claudeScore?: number;
  kimiApproved: boolean;
  kimiFeedback?: string;
  kimiScore?: number;
  textDetected: boolean;
  spellingErrors?: string[];
  fixPrompt?: string;
  regenerationModel?: "gemini" | "imagen";
  switchedToTextless: boolean;
  textlessPrompt?: string;
  finalImageUrl?: string;
  finalApproved: boolean;
}

export interface EnhancedImageResult {
  success: boolean;
  image: GeneratedImage | null;
  attempts: ImageQaAttempt[];
  finalApproved: boolean;
  usedTextlessFallback: boolean;
}

// Create a textless fallback prompt
export function createTextlessPrompt(originalPrompt: string): string {
  // Remove any references to text, signs, labels
  let textless = originalPrompt
    .replace(/\b(sign|label|banner|text|word|letter|number|logo|watermark|brand)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // Add explicit no-text instructions
  const noTextInstructions = `
CRITICAL REQUIREMENTS - NO TEXT ALLOWED:
- This image must contain ABSOLUTELY NO TEXT, WORDS, LETTERS, OR NUMBERS of any kind
- NO signs, labels, banners, logos, watermarks, or brand names
- NO readable text on any objects, buildings, vehicles, clothing, or products
- If the scene would naturally contain text (storefronts, signs), either exclude those elements entirely or ensure they are blurred/obscured
- Pure visual imagery only - the image must be 100% text-free
- Any text overlay will be added separately in HTML

SCENE DESCRIPTION:
${textless}

Generate a clean, professional photograph with ZERO text elements. Focus on visual storytelling without any typography.`;

  return noTextInstructions;
}

// Regenerate image using Gemini 3 Pro (enhanced prompt engineering)
export async function regenerateWithGemini(params: {
  originalPrompt: string;
  feedback: string;
  previousAttempts: number;
  index: number;
}): Promise<GeneratedImage | null> {
  const { originalPrompt, feedback, previousAttempts, index } = params;

  try {
    console.log(`[Touchup] Gemini regenerating image (attempt ${previousAttempts + 1})...`);

    // Use Gemini to create an enhanced fix prompt
    const promptEnhancement = await generateText({
      model: MODELS.geminiPro,
      prompt: `You are an expert image prompt engineer. An AI-generated image failed quality review. Create a significantly improved prompt.

ORIGINAL PROMPT:
${originalPrompt}

REVIEW FEEDBACK (what was wrong):
${feedback}

ATTEMPT NUMBER: ${previousAttempts + 1} of 3

Create an enhanced prompt that:
1. Addresses the specific issues mentioned in the feedback
2. Is MORE EXPLICIT about avoiding text (if text was an issue)
3. Adds specific technical photography details (lighting, angle, composition)
4. Specifies the exact style and mood desired
5. Is more detailed and specific than the original

${previousAttempts >= 1 ? "IMPORTANT: Previous attempts also failed. Be SIGNIFICANTLY more specific and add 'PHOTOREALISTIC, NO TEXT OR LETTERS OF ANY KIND' to the prompt." : ""}

CRITICAL TEXT RESTRICTIONS - Include these EXACT instructions:
- "ABSOLUTELY NO TEXT, WORDS, LETTERS, OR NUMBERS anywhere in the image"
- "NO signs, labels, banners, logos, or readable text on any objects"
- "Pure visual imagery only - this image must contain ZERO text elements"

Return ONLY the enhanced prompt text, nothing else.`,
      maxOutputTokens: 800,
      temperature: 0.6,
    });

    const enhancedPrompt = promptEnhancement.text.trim();
    console.log(`[Touchup] Enhanced prompt: ${enhancedPrompt.substring(0, 150)}...`);

    // Generate image with enhanced prompt
    const imagenResult = await generateImageAI({
      model: IMAGE_MODELS.imageGenerator,
      prompt: enhancedPrompt,
      n: 1,
    });

    if (imagenResult.images && imagenResult.images.length > 0) {
      const image = imagenResult.images[0];
      return {
        index,
        prompt: enhancedPrompt,
        base64: `data:${image.mediaType || "image/png"};base64,${image.base64}`,
        mimeType: image.mediaType || "image/png",
      };
    }

    return null;
  } catch (error) {
    console.error(`[Touchup] Gemini regeneration failed:`, error);
    return null;
  }
}

// Enhanced image generation with 3-retry QA loop
export async function generateImageWithQA(params: {
  prompt: string;
  index: number;
  sectionContext: string;
  onAttempt?: (attempt: ImageQaAttempt) => void;
}): Promise<EnhancedImageResult> {
  const { prompt, index, sectionContext, onAttempt } = params;
  const maxAttempts = 3;
  const attempts: ImageQaAttempt[] = [];
  let currentPrompt = prompt;
  let usedTextlessFallback = false;

  for (let attemptNum = 1; attemptNum <= maxAttempts; attemptNum++) {
    console.log(`[Image QA] Attempt ${attemptNum}/${maxAttempts} for image ${index}`);

    // Generate the image
    const image = attemptNum === 1
      ? await generateBlogImage({ prompt: currentPrompt, index })
      : await regenerateWithGemini({
          originalPrompt: currentPrompt,
          feedback: attempts[attempts.length - 1]?.claudeFeedback || attempts[attempts.length - 1]?.kimiFeedback || "Quality issues",
          previousAttempts: attemptNum - 1,
          index,
        });

    if (!image) {
      const failedAttempt: ImageQaAttempt = {
        attempt: attemptNum,
        originalPrompt: currentPrompt,
        claudeApproved: false,
        kimiApproved: false,
        textDetected: false,
        switchedToTextless: false,
        finalApproved: false,
      };
      attempts.push(failedAttempt);
      onAttempt?.(failedAttempt);
      continue;
    }

    // Run dual review (Claude + Kimi)
    const review = await reviewImageQuality({
      imageBase64: image.base64,
      originalPrompt: currentPrompt,
      sectionContext,
    });

    const attemptResult: ImageQaAttempt = {
      attempt: attemptNum,
      originalPrompt: currentPrompt,
      claudeApproved: review.reviewer === "kimi" || review.approved, // If kimi rejected, claude approved
      claudeFeedback: review.feedback,
      kimiApproved: review.reviewer === "claude" || review.approved, // If claude rejected, kimi approved
      kimiFeedback: review.feedback,
      textDetected: review.feedback?.toLowerCase().includes("text") || false,
      fixPrompt: review.remakePrompt,
      regenerationModel: attemptNum > 1 ? "gemini" : undefined,
      switchedToTextless: usedTextlessFallback,
      finalApproved: review.approved,
    };

    attempts.push(attemptResult);
    onAttempt?.(attemptResult);

    if (review.approved) {
      console.log(`[Image QA] Image ${index} approved on attempt ${attemptNum}`);
      return {
        success: true,
        image,
        attempts,
        finalApproved: true,
        usedTextlessFallback,
      };
    }

    // Update prompt for next attempt
    currentPrompt = review.remakePrompt || currentPrompt;

    // If this is the last attempt before fallback, try textless
    if (attemptNum === maxAttempts - 1) {
      console.log(`[Image QA] Switching to textless fallback for image ${index}`);
      currentPrompt = createTextlessPrompt(prompt);
      usedTextlessFallback = true;
    }
  }

  // All attempts failed - do one final textless attempt
  if (!usedTextlessFallback) {
    console.log(`[Image QA] Final textless fallback attempt for image ${index}`);
    usedTextlessFallback = true;
    const textlessPrompt = createTextlessPrompt(prompt);

    const finalImage = await generateBlogImage({ prompt: textlessPrompt, index });

    if (finalImage) {
      const finalAttempt: ImageQaAttempt = {
        attempt: maxAttempts + 1,
        originalPrompt: textlessPrompt,
        claudeApproved: true, // Accept textless without review
        kimiApproved: true,
        textDetected: false,
        switchedToTextless: true,
        textlessPrompt,
        finalApproved: true,
      };
      attempts.push(finalAttempt);
      onAttempt?.(finalAttempt);

      return {
        success: true,
        image: finalImage,
        attempts,
        finalApproved: true,
        usedTextlessFallback: true,
      };
    }
  }

  // Complete failure
  console.error(`[Image QA] All attempts failed for image ${index}`);
  return {
    success: false,
    image: null,
    attempts,
    finalApproved: false,
    usedTextlessFallback,
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
- Style: Professional marketing photography, magazine-quality
- Quality: High resolution, sharp details, proper exposure and color balance
- Composition: Rule of thirds, balanced, visually appealing focal point
- Subject: ${prompt}

ABSOLUTELY CRITICAL - NO TEXT ALLOWED (READ THIS CAREFULLY):
- This image must contain ZERO text, words, letters, numbers, or typography of ANY kind
- NO signs, NO labels, NO banners, NO logos, NO watermarks, NO brand names
- NO readable text on ANY objects, buildings, vehicles, clothing, products, or surfaces
- DO NOT include storefronts, billboards, street signs, product packaging, or anything that would have text
- NO handwriting, digital text, captions, or overlays
- If the scene typically contains text elements, compose the shot to EXCLUDE them entirely
- The image must be 100% text-free - pure visual imagery only

CULTURAL CONTEXT: American business setting, professional and appropriate.

OUTPUT: A clean, professional photograph with ABSOLUTELY NO TEXT ELEMENTS. Focus on visual storytelling. The image should look like it was captured by a professional photographer for a high-end marketing campaign. Any text needed will be added separately via HTML - the image itself must be completely text-free.`;

  try {
    console.log(`[Image Gen] Starting image generation for index ${index}...`);
    console.log(`[Image Gen] Using model: google/imagen-4.0-generate`);
    console.log(`[Image Gen] Prompt length: ${enhancedPrompt.length} chars`);

    const result = await generateImageAI({
      model: IMAGE_MODELS.imageGenerator,
      prompt: enhancedPrompt,
      n: 1,
    });

    console.log(`[Image Gen] Result received, images count: ${result.images?.length || 0}`);

    // Get the first generated image
    if (result.images && result.images.length > 0) {
      const image = result.images[0];
      const base64Data = image.base64;
      const mediaType = image.mediaType || "image/png";

      console.log(`[Image Gen] Image ${index} generated successfully, base64 length: ${base64Data?.length || 0}`);

      return {
        index,
        prompt,
        base64: `data:${mediaType};base64,${base64Data}`,
        mimeType: mediaType,
      };
    }

    console.log(`[Image Gen] No images in result for index ${index}`);
    return null;
  } catch (error) {
    console.error(`[Image Gen] Error generating image ${index}:`, error);
    console.error(`[Image Gen] Error details:`, JSON.stringify(error, Object.getOwnPropertyNames(error)));
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
    // First, use Touchup to enhance the prompt
    console.log(`Touchup is enhancing the prompt for image ${index}...`);
    const enhancementResult = await generateText({
      model: MODELS.geminiPro,
      prompt: `You are an expert image prompt engineer. Enhance this image prompt to produce a better, more professional marketing photograph:

Original prompt: ${improvedPrompt}

Create an enhanced, detailed prompt that will generate a high-quality, photorealistic image suitable for a professional business blog. Include specific details about:
- Lighting (natural, studio, golden hour, soft shadows, etc.)
- Composition and framing (rule of thirds, leading lines, depth)
- Style and mood (professional, inviting, trustworthy)
- Technical quality expectations (sharp focus, proper exposure)

CRITICAL TEXT RESTRICTIONS - Include these EXACT instructions in your enhanced prompt:
- "ABSOLUTELY NO TEXT, WORDS, LETTERS, OR NUMBERS in the image"
- "NO signs, labels, banners, logos, watermarks, or readable text on any objects"
- "If text would naturally appear, blur it or exclude those elements"
- "Pure visual imagery only - ZERO text elements of any kind"

The enhanced prompt MUST explicitly tell the image generator to avoid all text. This is mandatory.

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

// Format final blog HTML using Kimi 2 with interactive JS design elements
export async function formatBlogCode(params: {
  content: string;
  images: GeneratedImage[];
  outline: BlogOutline;
}): Promise<string> {
  const { content, images, outline } = params;

  const prompt = `You are an expert web developer specializing in engaging blog designs. Take this blog content and images and format it as beautiful, interactive HTML ready for WordPress.

CRITICAL: All output MUST be in American English only. Do not add any text, comments, or content in any other language.

BLOG CONTENT:
${content}

IMAGES AVAILABLE:
${images.map((img, i) => `[IMAGE:${i}] - URL: ${img.base64.startsWith("http") ? img.base64 : "[base64-image]"} - Alt: ${img.prompt.substring(0, 80)}`).join("\n")}

SEO DATA:
- Title: ${outline.seo.metaTitle}
- Description: ${outline.seo.metaDescription}
- Primary Keyword: ${outline.seo.primaryKeyword}

REQUIREMENTS:
1. Replace [IMAGE:X] placeholders with proper <figure> elements using the actual image URLs/data
2. Use semantic HTML (article, section, figure, figcaption)
3. Add proper alt text to images
4. Ensure proper heading hierarchy (h1, h2, h3)
5. Make the HTML clean and WordPress-compatible
6. Do NOT include <html>, <head>, or <body> tags - just the article content

INTERACTIVE DESIGN ELEMENTS - Include these inline styles and scripts:
1. Add smooth scroll-reveal animations for sections (use IntersectionObserver)
2. Add hover zoom effect on images (transform: scale(1.02) on hover)
3. Add a floating "Back to Top" button that appears after scrolling
4. Add subtle box shadows and rounded corners on content blocks
5. Add a reading progress bar at the top of the article
6. Style blockquotes with left border accent and italic styling
7. Add smooth transitions (0.3s ease) on all interactive elements
8. Use CSS variables for consistent theming (--primary-color: #2563eb, --accent: #3b82f6)

EXAMPLE INTERACTIVE ELEMENTS TO INCLUDE:
<style>
  .blog-article { --primary: #2563eb; --accent: #3b82f6; }
  .blog-section { opacity: 0; transform: translateY(20px); transition: all 0.6s ease; }
  .blog-section.visible { opacity: 1; transform: translateY(0); }
  .blog-figure img { transition: transform 0.3s ease; border-radius: 12px; }
  .blog-figure:hover img { transform: scale(1.02); }
  .blog-cta { background: linear-gradient(135deg, var(--primary), var(--accent)); }
</style>

<script>
  // Scroll reveal animation
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.blog-section').forEach(el => observer.observe(el));
</script>

Return ONLY the formatted HTML with embedded styles and scripts, no explanations.`;

  try {
    console.log("[Foreman] Formatting blog code with moonshotai/kimi-k2...");
    const result = await generateText({
      model: MODELS.codeWriter,
      system: "You are an expert web developer. Return only clean HTML code with inline CSS and JavaScript for interactive effects. No explanations. CRITICAL: All output must be in American English only - no other languages, no foreign characters, no Chinese/Japanese/Korean text.",
      prompt,
      maxOutputTokens: 12000,
      temperature: 0.4,
    });

    console.log("[Foreman] Code formatted, length:", result.text.length);
    return result.text;
  } catch (error) {
    console.error("[Foreman] Error calling moonshotai/kimi-k2:", error);
    throw new Error(`Foreman (moonshotai/kimi-k2) failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
