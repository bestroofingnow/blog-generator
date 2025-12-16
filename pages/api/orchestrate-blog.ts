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
  featuredImageId?: number; // WordPress media ID for the hero/featured image
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

    // STEP 1: Generate outline with Archie (the Architect)
    console.log("Step 1: Archie is designing the blog structure...");
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

    // STEP 2: Generate images with Picasso (the Artist)
    console.log("Step 2: Picasso is painting your images...");
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
    const uploadedImageIds: number[] = []; // Store WordPress media IDs for featured image

    if (request.wordpress && generatedImages.length > 0) {
      try {
        // Create SEO-friendly filename from primary keyword
        const primaryKeywordSlug = (seoData.primaryKeyword || request.topic)
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .substring(0, 50);

        // Filter images that have base64 data and strip the data URI prefix
        const imagesToUpload = generatedImages
          .filter((img) => img.base64 && img.base64.length > 0)
          .map((img, index) => {
            // Strip data URI prefix if present (e.g., "data:image/png;base64,")
            let base64Data = img.base64;
            if (base64Data.includes(",")) {
              base64Data = base64Data.split(",")[1];
            }

            // Create descriptive, SEO-friendly filename based on section
            const sectionTitle = index === 0
              ? "hero"
              : (outline.sections[index - 1]?.title || `section-${index}`)
                  .toLowerCase()
                  .replace(/[^a-z0-9\s-]/g, "")
                  .replace(/\s+/g, "-")
                  .substring(0, 30);

            const filename = `${primaryKeywordSlug}-${sectionTitle}.png`;

            return {
              base64: base64Data,
              filename,
              altText: `${seoData.primaryKeyword || request.topic} - ${outline.sections[index - 1]?.title || "Featured Image"}`,
              caption: `${request.topic} in ${request.location} - ${outline.sections[index - 1]?.title || "Hero Image"}`,
            };
          });

        if (imagesToUpload.length > 0) {
          console.log(`Uploading ${imagesToUpload.length} images to WordPress...`);
          const uploadResponse = await callInternalApi("/api/wordpress-upload", {
            action: "uploadMultiple",
            credentials: request.wordpress,
            images: imagesToUpload,
          }) as { success: boolean; images?: Array<{ id: number; url: string }> };

          if (uploadResponse.success && uploadResponse.images) {
            // Map uploaded images back to their original indices
            uploadResponse.images.forEach((uploaded, i) => {
              if (uploaded.url) {
                imageUrls[i] = uploaded.url;
              }
              if (uploaded.id) {
                uploadedImageIds[i] = uploaded.id;
              }
            });
            steps.upload = true;
            console.log(`Successfully uploaded ${imageUrls.filter(Boolean).length} images to WordPress`);
          }
        }
      } catch (error) {
        console.error("WordPress upload failed:", error);
        // Continue without WordPress - will use base64 or placeholders
      }
    }

    // Fill in any missing URLs with base64 or placeholders
    for (let i = 0; i < generatedImages.length; i++) {
      if (!imageUrls[i]) {
        const img = generatedImages[i];
        if (img.base64 && img.base64.length > 0) {
          imageUrls[i] = img.base64; // Use base64 directly (includes data URI prefix)
        } else {
          // Placeholder with topic-relevant text
          const placeholderText = encodeURIComponent(`${request.topic} Image ${i + 1}`);
          imageUrls[i] = `https://placehold.co/800x400/667eea/ffffff?text=${placeholderText}`;
        }
      }
    }

    // STEP 4: Generate content with Penelope (the Writer)
    console.log("Step 4: Penelope is writing your content...");

    const rawContent = await generateContent({
      outline,
      topic: request.topic,
      location: request.location,
      tone: request.tone || "professional yet friendly",
      companyName: request.companyName,
    });
    steps.content = true;

    // STEP 5: Format final blog HTML with Felix (the Fixer)
    console.log("Step 5: Felix is formatting your blog code...");

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
      console.error("Felix formatting failed, using Penelope's output:", error);
      // Fall back to Claude's raw content with simple image insertion
      htmlContent = insertImagesIntoContent(rawContent, imageUrls, seoData);
    }

    return res.status(200).json({
      success: true,
      htmlContent,
      seoData,
      featuredImageId: uploadedImageIds[0], // First image (hero) as featured image
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

// Simple image insertion fallback with interactive styling
function insertImagesIntoContent(content: string, imageUrls: string[], seoData: SEOData): string {
  // Add interactive styles at the beginning
  const interactiveStyles = `<style>
  .blog-article { --primary: #2563eb; --accent: #3b82f6; font-family: system-ui, -apple-system, sans-serif; }
  .blog-section { opacity: 0; transform: translateY(20px); transition: all 0.6s ease; }
  .blog-section.visible { opacity: 1; transform: translateY(0); }
  .blog-figure { margin: 2rem 0; text-align: center; overflow: hidden; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
  .blog-figure img { width: 100%; height: auto; transition: transform 0.3s ease; display: block; }
  .blog-figure:hover img { transform: scale(1.02); }
  .blog-figure figcaption { padding: 1rem; background: #f8fafc; color: #64748b; font-size: 0.9rem; }
  .blog-cta { background: linear-gradient(135deg, var(--primary), var(--accent)); color: white; padding: 1.5rem 2rem; border-radius: 12px; text-align: center; margin: 2rem 0; }
  .blog-cta a { color: white; font-weight: 600; text-decoration: none; }
  blockquote { border-left: 4px solid var(--primary); padding-left: 1.5rem; margin: 1.5rem 0; font-style: italic; color: #475569; }
  h2 { color: #1e293b; margin-top: 2.5rem; }
  .back-to-top { position: fixed; bottom: 2rem; right: 2rem; background: var(--primary); color: white; width: 50px; height: 50px; border-radius: 50%; display: none; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 15px rgba(37,99,235,0.3); z-index: 1000; }
  .back-to-top.show { display: flex; }
</style>`;

  const interactiveScript = `<script>
  // Scroll reveal animation
  document.addEventListener('DOMContentLoaded', function() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.blog-section').forEach(el => observer.observe(el));

    // Back to top button
    const backToTop = document.querySelector('.back-to-top');
    if (backToTop) {
      window.addEventListener('scroll', () => {
        backToTop.classList.toggle('show', window.scrollY > 300);
      });
      backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }
  });
</script>
<button class="back-to-top" aria-label="Back to top">↑</button>`;

  let result = `<article class="blog-article">\n${interactiveStyles}\n${content}`;

  imageUrls.forEach((url, index) => {
    const placeholder = `[IMAGE:${index}]`;
    const altText = index === 0
      ? `${seoData.primaryKeyword} - Featured Image`
      : `${seoData.primaryKeyword} - Image ${index}`;
    const imgTag = `<figure class="blog-figure blog-section">
      <img src="${url}" alt="${altText}" loading="lazy" />
      <figcaption>${altText}</figcaption>
    </figure>`;
    result = result.replace(placeholder, imgTag);
  });

  result += `\n${interactiveScript}\n</article>`;
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
