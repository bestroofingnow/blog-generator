// pages/api/orchestrate-blog.ts
import type { NextApiRequest, NextApiResponse } from "next";
import {
  generateContent,
  formatBlogCode,
  BlogOutline,
  GeneratedImage,
} from "../../lib/ai-gateway";

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
  enableQualityReview?: boolean; // Whether to use Gemini 3 Pro for image quality review
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
    format: boolean;
  };
}

// Helper to call internal APIs
async function callInternalApi(endpoint: string, body: unknown): Promise<unknown> {
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

  if (!process.env.AI_GATEWAY_API_KEY) {
    return res.status(500).json({
      success: false,
      error: "AI_GATEWAY_API_KEY not configured",
    });
  }

  const steps = {
    outline: false,
    images: false,
    upload: false,
    content: false,
    format: false,
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

    // STEP 1: Generate outline with Llama 4 Maverick (AI Conductor)
    console.log("Step 1: Generating outline with Llama 4 Maverick (Conductor)...");
    let outline: BlogOutline;

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
      }) as { success: boolean; outline?: BlogOutline; error?: string };

      if (outlineResponse.success && outlineResponse.outline) {
        outline = outlineResponse.outline;
        steps.outline = true;
      } else {
        throw new Error(outlineResponse.error || "Failed to generate outline");
      }
    } catch (error) {
      console.error("Outline generation failed, using fallback:", error);
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

    // STEP 2: Generate images with Gemini 2.5 Flash (with optional Gemini 3 Pro review)
    console.log("Step 2: Generating images with Gemini 2.5 Flash...");
    let generatedImages: GeneratedImage[] = [];

    try {
      // Build context-aware image prompts
      const imagePrompts = buildContextAwareImagePrompts(
        outline,
        request.topic,
        request.location,
        request.blogType,
        request.imageThemes
      );

      // Build section contexts for quality review
      const sectionContexts = [
        outline.introduction?.hook || `Introduction to ${request.topic}`,
        ...outline.sections.map((s) => s.title),
      ];

      const imagesResponse = await callInternalApi("/api/generate-images", {
        prompts: imagePrompts,
        sectionContexts,
        enableQualityReview: request.enableQualityReview,
      }) as { success: boolean; images?: GeneratedImage[] };

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
          }) as { success: boolean; images?: Array<{ url: string }> };

          if (uploadResponse.success && uploadResponse.images) {
            imageUrls = uploadResponse.images.map((img) => img.url).filter(Boolean);
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

    // STEP 4: Generate content with Claude Sonnet 4.5
    console.log("Step 4: Writing content with Claude Sonnet 4.5...");

    const rawContent = await generateContent({
      outline,
      topic: request.topic,
      location: request.location,
      tone: request.tone || "professional yet friendly",
      companyName: request.companyName,
    });
    steps.content = true;

    // STEP 5: Format final blog HTML with Kimi 2
    console.log("Step 5: Formatting blog code with Kimi 2...");

    // Prepare images with URLs for Kimi to format
    const imagesWithUrls = generatedImages.map((img, index) => ({
      ...img,
      base64: imageUrls[index] || img.base64,
    }));

    let htmlContent: string;
    try {
      htmlContent = await formatBlogCode({
        content: rawContent,
        images: imagesWithUrls,
        outline,
      });
      steps.format = true;
    } catch (error) {
      console.error("Kimi formatting failed, using Claude's output:", error);
      // Fall back to Claude's raw content with simple image insertion
      htmlContent = insertImagesIntoContent(rawContent, imageUrls);
    }

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

// Simple image insertion fallback
function insertImagesIntoContent(content: string, imageUrls: string[]): string {
  let result = content;
  imageUrls.forEach((url, index) => {
    const placeholder = `[IMAGE:${index}]`;
    const imgTag = `<figure style="margin: 2rem 0; text-align: center;">
      <img src="${url}" alt="Blog image ${index + 1}" style="max-width: 100%; height: auto; border-radius: 8px;" />
    </figure>`;
    result = result.replace(placeholder, imgTag);
  });
  return result;
}

function buildContextAwareImagePrompts(
  outline: BlogOutline,
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

  // Use outline's image prompts if available
  if (outline.introduction?.imagePrompt) {
    prompts.push(outline.introduction.imagePrompt);
  } else {
    prompts.push(`Professional photography of a stunning ${location} home showcasing ${topic.toLowerCase()}. High-end residential setting, magazine-quality image, perfect lighting, inviting atmosphere.`);
  }

  // Section prompts from outline
  outline.sections.forEach((section) => {
    if (section.imagePrompt) {
      prompts.push(section.imagePrompt);
    } else {
      prompts.push(`Professional photography related to ${section.title} for ${topic} in ${location}. High quality, professional setting.`);
    }
  });

  return prompts;
}

function createFallbackOutline(request: OrchestrateRequest): BlogOutline {
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
      imagePlacement: "after" as const,
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

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
    responseLimit: false,
  },
  maxDuration: 180, // 3 minutes for the full orchestration with quality review
};
