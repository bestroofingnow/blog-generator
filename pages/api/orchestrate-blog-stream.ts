// pages/api/orchestrate-blog-stream.ts
import type { NextApiRequest, NextApiResponse } from "next";
import {
  generateOutline,
  generateContent,
  generateBlogImage,
  BlogOutline,
  GeneratedImage,
} from "../../lib/ai-gateway";

interface WordPressCredentials {
  siteUrl: string;
  username: string;
  appPassword: string;
}

interface SEOData {
  primaryKeyword: string;
  secondaryKeywords: string[];
  metaTitle: string;
  metaDescription: string;
}

type ImageMode = "auto" | "manual" | "enhance";

interface UserImage {
  id: string;
  url: string; // Can be URL or base64 data URI
  caption?: string;
}

function sendProgress(res: NextApiResponse, step: string, message: string) {
  res.write(`data: ${JSON.stringify({ type: "progress", step, message })}\n\n`);
}

function sendError(res: NextApiResponse, error: string) {
  res.write(`data: ${JSON.stringify({ type: "error", error })}\n\n`);
}

function sendComplete(res: NextApiResponse, data: Record<string, unknown>) {
  res.write(`data: ${JSON.stringify({ type: "complete", ...data })}\n\n`);
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

  const responseText = await response.text();
  try {
    return JSON.parse(responseText);
  } catch {
    throw new Error(`Internal API ${endpoint} returned invalid response`);
  }
}

function insertImagesIntoContent(content: string, imageUrls: string[], seoData: SEOData): string {
  let result = content;

  // First pass: Replace src="[IMAGE:X]" with actual URLs (most common case)
  // This handles cases where the AI generates <img src="[IMAGE:0]" ...>
  imageUrls.forEach((url, index) => {
    // Match src="[IMAGE:X]" pattern and replace just the placeholder with the URL
    const srcPattern = new RegExp(`src=["']\\[IMAGE:${index}\\]["']`, 'gi');
    result = result.replace(srcPattern, `src="${url}"`);
  });

  // Second pass: Handle standalone [IMAGE:X] placeholders (less common)
  // Only create full img tags for placeholders that are NOT already inside an img tag
  imageUrls.forEach((url, index) => {
    const placeholder = `[IMAGE:${index}]`;
    const escapedPlaceholder = placeholder.replace(/[[\]]/g, '\\$&');

    // Check if there are any remaining standalone placeholders
    // Use negative lookbehind to avoid matching placeholders already in src attributes
    // Since JS regex lookbehind support varies, we'll do a simple check
    if (result.includes(placeholder)) {
      const altText = index === 0
        ? `${seoData.primaryKeyword} - Featured Image`
        : `${seoData.primaryKeyword} - Image ${index}`;

      // Only replace standalone placeholders (not inside src="...")
      // Split and check context to avoid double-wrapping
      const parts = result.split(placeholder);
      const newParts: string[] = [];

      for (let i = 0; i < parts.length; i++) {
        newParts.push(parts[i]);
        if (i < parts.length - 1) {
          // Check if this placeholder was inside a src attribute
          const before = parts[i];
          const isInsideSrc = before.match(/src=["'][^"']*$/);

          if (isInsideSrc) {
            // Already handled by first pass, or malformed - just use URL
            newParts.push(url);
          } else {
            // Standalone placeholder - create full img tag
            newParts.push(`<img src="${url}" alt="${altText}" width="800" height="600" />`);
          }
        }
      }

      result = newParts.join('');
    }
  });

  return result;
}

function createFallbackOutline(topic: string, location: string, numberOfSections: number): BlogOutline {
  const sections = [];
  const sectionTitles = [
    `Why ${topic} Matters in ${location}`,
    `Top ${topic} Trends for ${location} Homes`,
    `Choosing the Right ${topic} Solution`,
    `Professional Installation vs DIY`,
    `Maximizing Your Investment`,
  ];

  for (let i = 0; i < numberOfSections; i++) {
    sections.push({
      title: sectionTitles[i] || `Section ${i + 1}`,
      keyPoints: ["Key benefit", "Local considerations", "Expert tips"],
      imagePrompt: `Professional photography showing ${topic.toLowerCase()} in ${location}`,
      imagePlacement: "after" as const,
    });
  }

  return {
    blogTitle: `Complete Guide to ${topic} in ${location}`,
    introduction: {
      hook: `Transform your ${location} property with professional ${topic.toLowerCase()}.`,
      keyPoints: ["Enhance curb appeal", "Improve safety", "Create stunning spaces"],
      imagePrompt: `Hero image of beautiful ${location} home with ${topic.toLowerCase()}`,
    },
    sections,
    conclusion: {
      summary: `${topic} is one of the best investments for your ${location} property.`,
      callToAction: "Contact us today for a free consultation.",
    },
    seo: {
      primaryKeyword: `${topic.toLowerCase()} ${location.toLowerCase()}`,
      secondaryKeywords: [topic.toLowerCase(), `${location} ${topic.toLowerCase()}`],
      metaTitle: `${topic} in ${location} | Expert Guide`,
      metaDescription: `Discover the best ${topic.toLowerCase()} solutions for ${location} homes.`,
    },
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Set up SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const {
    topic,
    location,
    blogType,
    numberOfSections = 5,
    tone = "professional yet friendly",
    readingLevel = "8th Grade",
    companyName,
    primaryKeyword,
    secondaryKeywords,
    metaTitle,
    metaDescription,
    imageThemes,
    wordpress,
    imageMode = "auto",
    userImages = [],
  } = req.body as {
    topic: string;
    location: string;
    blogType: string;
    numberOfSections: number;
    tone: string;
    readingLevel?: string;
    companyName?: string;
    primaryKeyword?: string;
    secondaryKeywords?: string[];
    metaTitle?: string;
    metaDescription?: string;
    imageThemes?: string[];
    wordpress?: WordPressCredentials;
    imageMode: ImageMode;
    userImages: UserImage[];
  };

  try {
    // STEP 1: Generate outline with Blueprint
    sendProgress(res, "outline", "Blueprint is designing your blog structure...");

    let outline: BlogOutline;
    try {
      outline = await generateOutline({
        topic,
        location,
        blogType,
        numberOfSections,
        tone,
        primaryKeyword,
        secondaryKeywords: secondaryKeywords || [],
        imageThemes: imageThemes || [],
      });
    } catch (error) {
      console.error("Outline generation failed:", error);
      outline = createFallbackOutline(topic, location, numberOfSections);
    }

    // Build SEO data
    const seoData: SEOData = {
      primaryKeyword: primaryKeyword || outline.seo?.primaryKeyword || `${topic.toLowerCase()} ${location.toLowerCase()}`,
      secondaryKeywords: secondaryKeywords?.length ? secondaryKeywords : outline.seo?.secondaryKeywords || [],
      metaTitle: metaTitle || outline.seo?.metaTitle || `${topic} in ${location} | Expert Guide`,
      metaDescription: metaDescription || outline.seo?.metaDescription || `Discover the best ${topic.toLowerCase()} solutions in ${location}.`,
    };

    // STEP 2: Handle images based on imageMode
    const generatedImages: GeneratedImage[] = [];

    if (imageMode === "manual" && userImages.length > 0) {
      // Manual mode: Use user-provided images directly
      sendProgress(res, "images", "Processing your uploaded images...");

      userImages.forEach((img, index) => {
        generatedImages.push({
          index,
          prompt: img.caption || `User image ${index + 1}`,
          base64: img.url.startsWith("data:") ? img.url.split(",")[1] || "" : "",
          mimeType: "image/png",
          url: img.url.startsWith("data:") ? undefined : img.url, // External URL
        });
      });
    } else if (imageMode === "enhance" && userImages.length > 0) {
      // Enhance mode: Use user images but mark for potential AI enhancement
      // For now, treat similar to manual but with different messaging
      sendProgress(res, "images", "Enhancing your images with AI...");

      // TODO: Add actual AI enhancement logic here in the future
      // For now, use images as-is with enhanced metadata
      userImages.forEach((img, index) => {
        generatedImages.push({
          index,
          prompt: img.caption || `Enhanced image ${index + 1}`,
          base64: img.url.startsWith("data:") ? img.url.split(",")[1] || "" : "",
          mimeType: "image/png",
          url: img.url.startsWith("data:") ? undefined : img.url,
        });
      });
    } else {
      // Auto mode: Generate images with AI (default behavior)
      sendProgress(res, "images", "Snapshot is creating stunning images...");

      const imagePrompts: { prompt: string; index: number }[] = [];

      // Hero image
      imagePrompts.push({
        prompt: outline.introduction?.imagePrompt || `Professional photography of ${topic} in ${location}`,
        index: 0,
      });

      // Section images (only 2 to save time)
      const sectionIndices = [0, Math.min(2, outline.sections.length - 1)];
      sectionIndices.forEach((sectionIdx, i) => {
        const section = outline.sections[sectionIdx];
        imagePrompts.push({
          prompt: section?.imagePrompt || `Professional photography for ${section?.title || topic}`,
          index: i + 1,
        });
      });

      // Generate images in parallel
      const imageResults = await Promise.allSettled(
        imagePrompts.map((p) => generateBlogImage(p))
      );

      imageResults.forEach((result, idx) => {
        if (result.status === "fulfilled" && result.value) {
          generatedImages.push(result.value);
        } else {
          generatedImages.push({
            index: idx,
            prompt: imagePrompts[idx].prompt,
            base64: "",
            mimeType: "image/png",
          });
        }
      });
    }

    // STEP 3: Generate content with Craftsman
    sendProgress(res, "content", "Craftsman is writing engaging content...");

    const rawContent = await generateContent({
      outline,
      topic,
      location,
      tone,
      readingLevel,
      companyName,
    });

    // STEP 4: Format content with Foreman
    sendProgress(res, "format", "Foreman is formatting the HTML...");

    // STEP 5: Upload to WordPress (if configured) or use external URLs
    let imageUrls: string[] = [];
    const uploadedImageIds: number[] = [];

    // First, populate imageUrls with any external URLs from user-provided images
    generatedImages.forEach((img, i) => {
      if (img.url) {
        imageUrls[i] = img.url;
      }
    });

    // Upload base64 images to WordPress if connected
    const hasBase64Images = generatedImages.some((img, i) => !imageUrls[i] && img.base64 && img.base64.length > 0);

    if (wordpress && hasBase64Images) {
      sendProgress(res, "upload", "Uploading images to WordPress...");

      try {
        const primaryKeywordSlug = (seoData.primaryKeyword || topic)
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .substring(0, 50);

        const imagesToUpload = generatedImages
          .filter((img, i) => !imageUrls[i] && img.base64 && img.base64.length > 0)
          .map((img, index) => {
            let base64Data = img.base64;
            if (base64Data.includes(",")) {
              base64Data = base64Data.split(",")[1];
            }

            const sectionTitle = index === 0
              ? "hero"
              : (outline.sections[index - 1]?.title || `section-${index}`)
                  .toLowerCase()
                  .replace(/[^a-z0-9\s-]/g, "")
                  .replace(/\s+/g, "-")
                  .substring(0, 30);

            return {
              base64: base64Data,
              filename: `${primaryKeywordSlug}-${sectionTitle}.png`,
              altText: `${seoData.primaryKeyword} - ${outline.sections[index - 1]?.title || "Featured Image"}`,
              caption: `${topic} in ${location}`,
              originalIndex: img.index,
            };
          });

        if (imagesToUpload.length > 0) {
          const uploadResponse = await callInternalApi("/api/wordpress-upload", {
            action: "uploadMultiple",
            credentials: wordpress,
            images: imagesToUpload,
          }) as { success: boolean; images?: Array<{ id: number; url: string }> };

          if (uploadResponse.success && uploadResponse.images) {
            uploadResponse.images.forEach((uploaded, i) => {
              const originalIndex = imagesToUpload[i]?.originalIndex ?? i;
              if (uploaded.url) imageUrls[originalIndex] = uploaded.url;
              if (uploaded.id) uploadedImageIds[originalIndex] = uploaded.id;
            });
          }
        }
      } catch (error) {
        console.error("WordPress upload failed:", error);
      }
    }

    // Fill missing URLs - try Vercel Blob if WordPress wasn't used
    const needsBlobStorage = generatedImages.some((img, i) => !imageUrls[i] && img.base64);

    if (needsBlobStorage && !wordpress) {
      sendProgress(res, "upload", "Storing images in cloud storage...");

      const primaryKeywordSlug = (seoData.primaryKeyword || topic)
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .substring(0, 50);

      // Try to upload to Vercel Blob
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
    }

    // Final fallback - use external URL, base64, or placeholders for any remaining
    for (let i = 0; i < generatedImages.length; i++) {
      if (!imageUrls[i]) {
        const img = generatedImages[i];
        if (img.url) {
          // Use external URL from user-provided image
          imageUrls[i] = img.url;
        } else if (img.base64 && img.base64.length > 0) {
          // Use base64 data URL as fallback
          imageUrls[i] = img.base64.startsWith("data:") ? img.base64 : `data:${img.mimeType || "image/png"};base64,${img.base64}`;
        } else {
          const placeholderText = encodeURIComponent(`${topic} Image ${i + 1}`);
          imageUrls[i] = `https://placehold.co/800x400/667eea/ffffff?text=${placeholderText}`;
        }
      }
    }

    // Insert images into content
    const htmlContent = insertImagesIntoContent(rawContent, imageUrls, seoData);

    sendComplete(res, {
      success: true,
      htmlContent,
      seoData,
      featuredImageId: uploadedImageIds[0] || null,
    });

    res.end();
  } catch (error) {
    console.error("Orchestration error:", error);
    sendError(res, error instanceof Error ? error.message : "Unknown error");
    res.end();
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
    responseLimit: false,
  },
  maxDuration: 180,
};
