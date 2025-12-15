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

    // STEP 2: Generate images with Gemini
    console.log("Step 2: Generating images with Gemini...");
    let generatedImages: any[] = [];

    try {
      // Collect all image prompts
      const imagePrompts = [
        outline.introduction.imagePrompt,
        ...outline.sections.map((s: any) => s.imagePrompt),
      ];

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
        // Placeholder
        return `https://placehold.co/800x400/667eea/ffffff?text=Image+${index + 1}`;
      });
    }

    // STEP 4: Generate final content with Claude
    console.log("Step 4: Writing content with Claude...");

    const htmlContent = await generateContentWithClaude(
      outline,
      imageUrls,
      request.tone || "professional yet friendly"
    );
    steps.content = true;

    return res.status(200).json({
      success: true,
      htmlContent,
      seoData: outline.seo,
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
      imagePrompt: `Professional landscape lighting photography showing ${topic.toLowerCase()} installation in ${location} neighborhood, evening dusk lighting, warm ambient glow`,
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
      imagePrompt: `Hero image of beautiful ${location} home exterior with professional landscape lighting at dusk, warm inviting atmosphere`,
    },
    sections,
    conclusion: {
      summary: `${topic} is one of the best investments you can make for your ${location} property.`,
      callToAction: "Contact us today for a free consultation and quote.",
    },
    seo: {
      primaryKeyword: `${topic.toLowerCase()} ${location}`,
      secondaryKeywords: [
        topic.toLowerCase(),
        `${location} lighting`,
        "outdoor lighting",
        "landscape design",
        "home improvement",
      ],
      metaTitle: `${topic} in ${location} | Expert Guide`,
      metaDescription: `Discover the best ${topic.toLowerCase()} solutions for ${location} homes. Expert tips, local insights, and professional recommendations.`,
    },
  };
}

async function generateContentWithClaude(
  outline: any,
  imageUrls: string[],
  tone: string
): Promise<string> {
  const systemPrompt = `You are an expert content writer specializing in landscape lighting and home improvement. Write engaging, SEO-optimized blog posts that connect with homeowners emotionally while providing practical value.

WRITING STYLE:
- Address the reader directly as "you"
- Use vivid, sensory descriptions
- Balance practical advice with lifestyle benefits
- Include local references naturally
- Write in a ${tone} tone

OUTPUT REQUIREMENTS:
- Generate ONLY valid HTML (no markdown)
- Use semantic HTML tags (h1, h2, p, strong, etc.)
- Include the provided image URLs in <img> tags at appropriate locations
- Make the content substantial (1500-2000 words)`;

  // Build the content structure for Claude
  const imageUrlList = imageUrls.join("\n");

  const userPrompt = `Write a complete blog post based on this outline. Insert the provided images at appropriate locations.

BLOG OUTLINE:
${JSON.stringify(outline, null, 2)}

IMAGES TO USE (insert in order, one after intro and one per section):
${imageUrlList}

REQUIREMENTS:
1. Start with an <h1> using the blogTitle
2. Write 2-3 paragraphs for the introduction based on the hook and keyPoints
3. Insert the first image after the introduction
4. For each section:
   - Use <h2> for the section title
   - Write 2-3 substantial paragraphs covering the keyPoints
   - Insert the corresponding image
   - Use <strong> tags for key concepts
5. End with a conclusion section including the callToAction

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
