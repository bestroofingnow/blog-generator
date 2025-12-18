// pages/api/orchestrate-blog.ts
import type { NextApiRequest, NextApiResponse } from "next";
import {
  generateContent,
  generateOutline,
  generateBlogImage,
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
  readingLevel?: string;
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

  console.log(`[Internal API] Calling ${baseUrl}${endpoint}`);

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const responseText = await response.text();

  // Check if response is valid JSON
  try {
    return JSON.parse(responseText);
  } catch {
    console.error(`[Internal API] ${endpoint} returned non-JSON response:`, responseText.substring(0, 500));
    throw new Error(`Internal API ${endpoint} returned invalid response: ${responseText.substring(0, 100)}`);
  }
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
      // Call generateOutline directly instead of through internal API to save time
      outline = await generateOutline({
        topic: request.topic,
        location: request.location,
        blogType: request.blogType,
        numberOfSections: request.numberOfSections || 5,
        tone: request.tone || "professional yet friendly",
        primaryKeyword: request.primaryKeyword,
        secondaryKeywords: request.secondaryKeywords,
        imageThemes: request.imageThemes,
      });
      steps.outline = true;
      console.log("Outline generated successfully");
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
    // Generate images in PARALLEL to save time - only generate hero + 2 section images
    console.log("Step 2: Picasso is generating images in parallel...");
    let generatedImages: GeneratedImage[] = [];

    // Build image prompts from outline
    const imagePrompts: { prompt: string; index: number }[] = [];

    // Hero image
    if (outline.introduction?.imagePrompt) {
      imagePrompts.push({ prompt: outline.introduction.imagePrompt, index: 0 });
    } else {
      imagePrompts.push({
        prompt: `Professional photography of a stunning ${request.location} home showcasing ${request.topic.toLowerCase()}. Magazine-quality, perfect lighting.`,
        index: 0,
      });
    }

    // Only generate 2 section images to save time (sections 0 and 2 for variety)
    const sectionIndices = [0, Math.min(2, outline.sections.length - 1)];
    sectionIndices.forEach((sectionIdx, i) => {
      const section = outline.sections[sectionIdx];
      if (section?.imagePrompt) {
        imagePrompts.push({ prompt: section.imagePrompt, index: i + 1 });
      } else {
        imagePrompts.push({
          prompt: `Professional photography for ${section?.title || request.topic} in ${request.location}. High quality marketing image.`,
          index: i + 1,
        });
      }
    });

    // Generate all images in parallel
    console.log(`Generating ${imagePrompts.length} images in parallel...`);
    const imageResults = await Promise.allSettled(
      imagePrompts.map((p) => generateBlogImage(p))
    );

    // Collect successful images
    imageResults.forEach((result, idx) => {
      if (result.status === "fulfilled" && result.value) {
        generatedImages.push(result.value);
        console.log(`Image ${idx} generated successfully`);
      } else {
        console.log(`Image ${idx} failed:`, result.status === "rejected" ? result.reason : "null result");
        // Add placeholder for failed images
        generatedImages.push({
          index: idx,
          prompt: imagePrompts[idx].prompt,
          base64: "",
          mimeType: "image/png",
        });
      }
    });

    steps.images = generatedImages.some((img) => img.base64 && img.base64.length > 0);
    console.log(`Generated ${generatedImages.filter((img) => img.base64).length} real images`);

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

    // Fill missing URLs - try Vercel Blob if WordPress wasn't used
    const needsBlobStorage = generatedImages.some((img, i) => !imageUrls[i] && img.base64 && img.base64.length > 0);

    if (needsBlobStorage && !request.wordpress) {
      console.log("Storing images in Vercel Blob...");

      const primaryKeywordSlug = (seoData.primaryKeyword || request.topic)
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .substring(0, 50);

      for (let i = 0; i < generatedImages.length; i++) {
        if (!imageUrls[i]) {
          const img = generatedImages[i];
          if (img.base64 && img.base64.length > 0) {
            try {
              const sectionTitle = i === 0
                ? "hero"
                : (outline.sections[i - 1]?.title || `section-${i}`)
                    .toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, "")
                    .replace(/\s+/g, "-")
                    .substring(0, 30);

              const filename = `${primaryKeywordSlug}-${sectionTitle}-${Date.now()}.png`;

              const storeResponse = await callInternalApi("/api/store-image", {
                base64: img.base64,
                filename,
                contentType: img.mimeType || "image/png",
              }) as { success: boolean; url?: string };

              if (storeResponse.success && storeResponse.url) {
                imageUrls[i] = storeResponse.url;
                console.log(`Image ${i} stored in Vercel Blob:`, storeResponse.url);
              }
            } catch (error) {
              console.error(`Failed to store image ${i} in Vercel Blob:`, error);
            }
          }
        }
      }
      steps.upload = imageUrls.some(url => url && !url.startsWith("data:"));
    }

    // Final fallback - use base64 or placeholders for any remaining
    for (let i = 0; i < generatedImages.length; i++) {
      if (!imageUrls[i]) {
        const img = generatedImages[i];
        if (img.base64 && img.base64.length > 0) {
          imageUrls[i] = img.base64.startsWith("data:") ? img.base64 : `data:${img.mimeType || "image/png"};base64,${img.base64}`;
        } else {
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
      readingLevel: request.readingLevel || "8th Grade",
      companyName: request.companyName,
    });
    steps.content = true;

    // STEP 5: Format final blog HTML
    // Skip Felix (Kimi) formatting to save time - use simple image insertion instead
    console.log("Step 5: Formatting blog with image insertion...");
    const htmlContent = insertImagesIntoContent(rawContent, imageUrls, seoData);
    steps.format = true;

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

// Simple image insertion - replaces [IMAGE:X] placeholders with actual URLs
function insertImagesIntoContent(content: string, imageUrls: string[], seoData: SEOData): string {
  let result = content;

  // First pass: Replace src="[IMAGE:X]" with actual URLs (most common case)
  imageUrls.forEach((url, index) => {
    const srcPattern = new RegExp(`src=["']\\[IMAGE:${index}\\]["']`, 'gi');
    result = result.replace(srcPattern, `src="${url}"`);
  });

  // Second pass: Handle standalone [IMAGE:X] placeholders
  imageUrls.forEach((url, index) => {
    const placeholder = `[IMAGE:${index}]`;

    if (result.includes(placeholder)) {
      const altText = index === 0
        ? `${seoData.primaryKeyword} - Featured Image`
        : `${seoData.primaryKeyword} - Image ${index}`;

      const parts = result.split(placeholder);
      const newParts: string[] = [];

      for (let i = 0; i < parts.length; i++) {
        newParts.push(parts[i]);
        if (i < parts.length - 1) {
          const before = parts[i];
          const isInsideSrc = before.match(/src=["'][^"']*$/);

          if (isInsideSrc) {
            newParts.push(url);
          } else {
            newParts.push(`<img src="${url}" alt="${altText}" width="800" height="600" />`);
          }
        }
      }

      result = newParts.join('');
    }
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
