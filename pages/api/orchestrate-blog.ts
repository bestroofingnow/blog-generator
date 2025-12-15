// pages/api/orchestrate-blog.ts
import Anthropic from "@anthropic-ai/sdk";
import type { NextApiRequest, NextApiResponse } from "next";

interface WordPressCredentials {
  siteUrl: string;
  username: string;
  appPassword: string;
}

interface OrchestrateRequest {
  topic: string;
  location: string;
  blogType: string;
  numberOfSections?: number;
  tone?: string;
  companyName?: string;
  companyWebsite?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  metaTitle?: string;
  metaDescription?: string;
  imageThemes?: string[];
  wordpress?: WordPressCredentials;
}

interface SEOData {
  primaryKeyword: string;
  secondaryKeywords: string[];
  metaTitle: string;
  metaDescription: string;
}

interface OrchestrateResponse {
  success: boolean;
  htmlContent?: string;
  seoData?: SEOData;
  error?: string;
  steps?: {
    outline: boolean;
    images: boolean;
    upload: boolean;
    content: boolean;
  };
}

const anthropic = new Anthropic();

// Helper to call internal APIs
async function callInternalApi(endpoint: string, body: any): Promise<any> {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return response.json();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OrchestrateResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const steps = {
    outline: false,
    images: false,
    upload: false,
    content: false,
  };

  try {
    const request = req.body as OrchestrateRequest;

    if (!request.topic || !request.location || !request.blogType) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        steps,
      });
    }

    // STEP 1: Generate outline with Llama 4 Maverick
    console.log("Step 1: Generating outline with Llama...");
    let outline: any;

    try {
      const outlineResponse = await callInternalApi("/api/llama-outline", {
        topic: request.topic,
        location: request.location,
        blogType: request.blogType,
        numberOfSections: request.numberOfSections || 5,
        tone: request.tone || "professional yet friendly",
        primaryKeyword: request.primaryKeyword,
        secondaryKeywords: request.secondaryKeywords,
        imageThemes: request.imageThemes,
      });

      if (outlineResponse.success && outlineResponse.outline) {
        outline = outlineResponse.outline;
        steps.outline = true;
      } else {
        throw new Error(outlineResponse.error || "Failed to generate outline");
      }
    } catch (error) {
      console.error("Outline generation failed, using fallback:", error);
      // Fallback outline
      outline = createFallbackOutline(request);
      steps.outline = true;
    }

    // Use user-provided SEO data if available, otherwise use outline's SEO
    const seoData: SEOData = {
      primaryKeyword: request.primaryKeyword || outline.seo?.primaryKeyword || `${request.topic.toLowerCase()} ${request.location.toLowerCase()}`,
      secondaryKeywords: request.secondaryKeywords?.length ? request.secondaryKeywords : outline.seo?.secondaryKeywords || [],
      metaTitle: request.metaTitle || outline.seo?.metaTitle || `${request.topic} in ${request.location} | Expert Guide`,
      metaDescription: request.metaDescription || outline.seo?.metaDescription || `Discover the best ${request.topic.toLowerCase()} solutions in ${request.location}.`,
    };

    // STEP 2: Generate images with Gemini using context-aware prompts
    console.log("Step 2: Generating images with Gemini...");
    let generatedImages: any[] = [];

    try {
      // Build context-aware image prompts
      const imagePrompts = buildContextAwareImagePrompts(
        outline,
        request.topic,
        request.location,
        request.blogType,
        request.imageThemes
      );

      const imagesResponse = await callInternalApi("/api/generate-images", {
        prompts: imagePrompts,
      });

      if (imagesResponse.success && imagesResponse.images) {
        generatedImages = imagesResponse.images;
        steps.images = true;
      }
    } catch (error) {
      console.error("Image generation failed:", error);
      // Continue without images - will use placeholders
    }

    // STEP 3: Upload to WordPress (if credentials provided)
    console.log("Step 3: Uploading to WordPress...");
    let imageUrls: string[] = [];

    if (request.wordpress && generatedImages.length > 0) {
      try {
        const imagesToUpload = generatedImages
          .filter((img) => img.base64 && img.base64.length > 0)
          .map((img, index) => ({
            base64: img.base64,
            filename: `blog-image-${Date.now()}-${index}.png`,
            altText: img.prompt.substring(0, 100),
          }));

        if (imagesToUpload.length > 0) {
          const uploadResponse = await callInternalApi("/api/wordpress-upload", {
            action: "uploadMultiple",
            credentials: request.wordpress,
            images: imagesToUpload,
          });

          if (uploadResponse.success && uploadResponse.images) {
            imageUrls = uploadResponse.images.map((img: any) => img.url).filter(Boolean);
            steps.upload = true;
          }
        }
      } catch (error) {
        console.error("WordPress upload failed:", error);
        // Continue without WordPress - will use base64 or placeholders
      }
    }

    // If no WordPress or upload failed, use base64 images or placeholders
    if (imageUrls.length === 0) {
      imageUrls = generatedImages.map((img, index) => {
        if (img.base64 && img.base64.length > 0) {
          return img.base64; // Use base64 directly
        }
        // Placeholder with topic-relevant text
        const placeholderText = encodeURIComponent(`${request.topic} Image ${index + 1}`);
        return `https://placehold.co/800x400/667eea/ffffff?text=${placeholderText}`;
      });
    }

    // STEP 4: Generate final content with Claude
    console.log("Step 4: Writing content with Claude...");

    const htmlContent = await generateContentWithClaude(
      outline,
      imageUrls,
      request.tone || "professional yet friendly",
      seoData
    );
    steps.content = true;

    return res.status(200).json({
      success: true,
      htmlContent,
      seoData,
      steps,
    });
  } catch (error) {
    console.error("Orchestration error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Orchestration failed",
      steps,
    });
  }
}

function buildContextAwareImagePrompts(
  outline: any,
  topic: string,
  location: string,
  blogType: string,
  imageThemes?: string[]
): string[] {
  const prompts: string[] = [];

  // If user provided image themes from research, use those
  if (imageThemes && imageThemes.length > 0) {
    return imageThemes.slice(0, (outline.sections?.length || 5) + 1);
  }

  // Build context-aware prompts based on topic and content
  const topicLower = topic.toLowerCase();
  const isLighting = topicLower.includes("lighting") || topicLower.includes("light");
  const isRoofing = topicLower.includes("roof") || topicLower.includes("roofing");
  const isLandscape = topicLower.includes("landscape") || topicLower.includes("garden");
  const isLake = location.toLowerCase().includes("lake");

  // Hero image prompt
  let heroPrompt = "";
  if (isLighting) {
    heroPrompt = `Professional real estate photography of a beautiful luxury home in ${location} at dusk with stunning landscape lighting. Warm pathway lights leading to front entrance, accent lights highlighting architectural features, soft uplighting on trees. Golden hour sky, inviting atmosphere. Shot with professional camera, magazine quality.`;
  } else if (isRoofing) {
    heroPrompt = `Aerial drone photography of a beautiful ${location} home with a brand new premium architectural shingle roof. ${isLake ? "Lake visible in background, waterfront property." : "Lush green landscaping surrounding."} Clear sunny day, showing perfect roof installation, clean lines, professional quality.`;
  } else {
    heroPrompt = `Professional photography of a stunning ${location} home showcasing ${topic.toLowerCase()}. High-end residential setting, magazine-quality image, perfect lighting, inviting atmosphere.`;
  }
  prompts.push(heroPrompt);

  // Section-specific prompts based on outline
  const sections = outline.sections || [];
  sections.forEach((section: any, index: number) => {
    const sectionTitle = section.title?.toLowerCase() || "";
    let sectionPrompt = "";

    if (isLighting) {
      if (sectionTitle.includes("pathway") || sectionTitle.includes("walkway")) {
        sectionPrompt = `Close-up professional photography of elegant brass pathway lights illuminating a stone walkway at night in ${location}. Warm LED glow, landscaped garden borders, high-end residential setting.`;
      } else if (sectionTitle.includes("security") || sectionTitle.includes("safety")) {
        sectionPrompt = `Professional photo of home security lighting in ${location} - motion-activated floodlights, well-lit driveway, illuminated entry points. Evening shot showing effective coverage.`;
      } else if (sectionTitle.includes("accent") || sectionTitle.includes("architectural")) {
        sectionPrompt = `Architectural photography of accent lighting on a ${location} home - uplights on columns, wash lights on textured walls, dramatic shadows. Professional quality, twilight shot.`;
      } else if (sectionTitle.includes("garden") || sectionTitle.includes("landscape")) {
        sectionPrompt = `Professional landscape photography of illuminated garden in ${location} - spotlights on specimen trees, underwater pond lights, subtle path lighting through flower beds. Magical evening atmosphere.`;
      } else if (sectionTitle.includes("outdoor living") || sectionTitle.includes("patio") || sectionTitle.includes("entertainment")) {
        sectionPrompt = `Professional photo of outdoor living space in ${location} with string lights, recessed deck lighting, illuminated pergola. Evening entertainment setting, warm inviting glow.`;
      } else if (sectionTitle.includes("before") || sectionTitle.includes("after") || sectionTitle.includes("transform")) {
        sectionPrompt = `Side-by-side before and after photography showing ${location} home transformation with landscape lighting. Left: dark unlit exterior. Right: beautifully illuminated with professional lighting design.`;
      } else {
        sectionPrompt = `Professional photography of ${topic.toLowerCase()} installation in ${location} home - ${section.title || "beautiful lighting design"}. High quality, magazine style, evening shot with warm glow.`;
      }
    } else if (isRoofing) {
      if (sectionTitle.includes("material") || sectionTitle.includes("shingle") || sectionTitle.includes("type")) {
        sectionPrompt = `Close-up product photography of premium roofing materials - architectural shingles, metal roofing samples, slate tiles. Professional studio quality showing texture and quality.`;
      } else if (sectionTitle.includes("before") || sectionTitle.includes("after") || sectionTitle.includes("damage")) {
        sectionPrompt = `Before and after roofing project in ${location} - split image showing damaged old roof vs beautiful new roof installation. Professional documentation style.`;
      } else if (sectionTitle.includes("installation") || sectionTitle.includes("process")) {
        sectionPrompt = `Professional roofing crew working on ${location} home - safety equipment, clean worksite, skilled installation in progress. Documentary style photography.`;
      } else if (sectionTitle.includes("cost") || sectionTitle.includes("investment") || sectionTitle.includes("value")) {
        sectionPrompt = `Aerial view of ${location} neighborhood showing beautiful homes with well-maintained roofs. ${isLake ? "Lake community, waterfront properties." : "Upscale residential area."} Sunny day, property value concept.`;
      } else {
        sectionPrompt = `Professional photography of ${topic.toLowerCase()} project in ${location} - ${section.title || "quality roofing work"}. Clear detail, professional quality.`;
      }
    } else {
      // Generic topic
      sectionPrompt = `Professional photography related to ${topic} in ${location} - ${section.title || `aspect ${index + 1}`}. High quality, relevant to home improvement, professional setting.`;
    }

    prompts.push(sectionPrompt);
  });

  return prompts;
}

function createFallbackOutline(request: OrchestrateRequest): any {
  const { topic, location, numberOfSections = 5 } = request;

  const sections = [];
  const sectionTitles = [
    `Why ${topic} Matters in ${location}`,
    `Top ${topic} Trends for ${location} Homes`,
    `Choosing the Right ${topic} Solution`,
    `Professional Installation vs DIY`,
    `Maximizing Your Investment`,
    `Seasonal Considerations`,
    `Smart Technology Integration`,
  ];

  for (let i = 0; i < numberOfSections; i++) {
    sections.push({
      title: sectionTitles[i] || `Section ${i + 1}`,
      keyPoints: [
        "Key benefit and value proposition",
        "Local considerations and factors",
        "Expert recommendations",
      ],
      imagePrompt: `Professional photography showing ${topic.toLowerCase()} in ${location} - section ${i + 1}`,
      imagePlacement: "after",
    });
  }

  return {
    blogTitle: `Complete Guide to ${topic} in ${location}`,
    introduction: {
      hook: `Transform your ${location} property with professional ${topic.toLowerCase()}.`,
      keyPoints: [
        "Enhance curb appeal and property value",
        "Improve safety and security",
        "Create stunning outdoor living spaces",
      ],
      imagePrompt: `Hero image of beautiful ${location} home with professional ${topic.toLowerCase()}`,
    },
    sections,
    conclusion: {
      summary: `${topic} is one of the best investments you can make for your ${location} property.`,
      callToAction: "Contact us today for a free consultation and quote.",
    },
    seo: {
      primaryKeyword: request.primaryKeyword || `${topic.toLowerCase()} ${location.toLowerCase()}`,
      secondaryKeywords: request.secondaryKeywords || [
        topic.toLowerCase(),
        `${location} ${topic.toLowerCase()}`,
        "home improvement",
        "property value",
      ],
      metaTitle: request.metaTitle || `${topic} in ${location} | Expert Guide`,
      metaDescription: request.metaDescription || `Discover the best ${topic.toLowerCase()} solutions for ${location} homes. Expert tips, local insights, and professional recommendations.`,
    },
  };
}

async function generateContentWithClaude(
  outline: any,
  imageUrls: string[],
  tone: string,
  seoData: SEOData
): Promise<string> {
  const systemPrompt = `You are an expert content writer specializing in home improvement and local services. Write engaging, SEO-optimized blog posts that connect with homeowners emotionally while providing practical value.

WRITING STYLE:
- Address the reader directly as "you"
- Use vivid, sensory descriptions
- Balance practical advice with lifestyle benefits
- Include local references naturally
- Write in a ${tone} tone
- Naturally incorporate the primary keyword "${seoData.primaryKeyword}" 3-5 times
- Use secondary keywords naturally throughout: ${seoData.secondaryKeywords.join(", ")}

OUTPUT REQUIREMENTS:
- Generate ONLY valid HTML (no markdown)
- Use semantic HTML tags (h1, h2, p, strong, etc.)
- Include the provided image URLs in <img> tags with descriptive alt text
- Images should have style="max-width: 100%; height: auto; border-radius: 8px; margin: 1rem 0;"
- Make the content substantial (1500-2000 words)
- Each image should feel connected to the surrounding content`;

  // Build the content structure for Claude
  const imageUrlList = imageUrls.map((url, i) => `Image ${i + 1}: ${url}`).join("\n");

  const userPrompt = `Write a complete blog post based on this outline. Insert the provided images at appropriate locations, ensuring each image relates to the content around it.

BLOG OUTLINE:
${JSON.stringify(outline, null, 2)}

SEO DATA TO INCORPORATE:
- Primary Keyword: ${seoData.primaryKeyword}
- Secondary Keywords: ${seoData.secondaryKeywords.join(", ")}
- Meta Title: ${seoData.metaTitle}
- Meta Description: ${seoData.metaDescription}

IMAGES TO USE (insert in order, matching content context):
${imageUrlList}

REQUIREMENTS:
1. Start with an <h1> using the blogTitle
2. Write 2-3 paragraphs for the introduction based on the hook and keyPoints
3. Insert the first image after the introduction with relevant alt text
4. For each section:
   - Use <h2> for the section title
   - Write 2-3 substantial paragraphs covering the keyPoints
   - Insert the corresponding image with alt text that describes what's shown AND relates to the section topic
   - Use <strong> tags for key concepts and keywords
5. End with a conclusion section including the callToAction
6. Make sure image alt text is descriptive and includes relevant keywords

IMPORTANT: Each image's alt text should describe what the image shows while being relevant to the section content. For example:
- "Elegant pathway lighting illuminating a stone walkway in Charlotte, NC"
- "Before and after roof replacement showing dramatic transformation"

Generate ONLY the HTML content. No markdown, no code blocks, no explanations.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 6000,
    messages: [{ role: "user", content: userPrompt }],
    system: systemPrompt,
  });

  let content = "";
  if (message.content[0].type === "text") {
    content = message.content[0].text;
  }

  // Clean up any markdown formatting that might have slipped through
  content = content.trim();
  if (content.startsWith("```html")) {
    content = content.slice(7);
  }
  if (content.startsWith("```")) {
    content = content.slice(3);
  }
  if (content.endsWith("```")) {
    content = content.slice(0, -3);
  }

  return content.trim();
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
    responseLimit: false,
  },
  maxDuration: 120, // 2 minutes for the full orchestration
};
