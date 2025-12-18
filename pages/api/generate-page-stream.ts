// pages/api/generate-page-stream.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { generateText } from "ai";
import {
  MODELS,
  generateBlogImage,
  GeneratedImage,
} from "../../lib/ai-gateway";
import {
  PageType,
  CompanyProfile,
  PageEntry,
  getPageTypeConfig,
} from "../../lib/page-types";
import {
  getPageOutlinePrompt,
  getPageContentPrompt,
  PagePromptParams,
} from "../../lib/page-prompts";

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
  url: string;
  caption?: string;
}

interface GeneratePageRequest {
  pageType: PageType;
  companyProfile: CompanyProfile;
  pageConfig: {
    title?: string;
    slug?: string;
    primaryKeyword: string;
    secondaryKeywords: string[];
    tone?: string;
    sections?: string[];
    customInstructions?: string;
    serviceName?: string;
    serviceDescription?: string;
    city?: string;
    topic?: string;
    headline?: string;
    summary?: string;
  };
  imageMode?: ImageMode;
  userImages?: UserImage[];
  pageLibrary?: PageEntry[];
  wordpress?: WordPressCredentials;
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

  // Replace image placeholders
  imageUrls.forEach((url, index) => {
    // Handle src="[IMAGE:X]" format
    const srcPlaceholder = `src="[IMAGE:${index}]"`;
    result = result.replace(new RegExp(srcPlaceholder, "g"), `src="${url}"`);

    // Handle standalone [IMAGE:X] format
    const placeholder = `[IMAGE:${index}]`;
    const altText = index === 0
      ? `${seoData.primaryKeyword} - Featured Image`
      : `${seoData.primaryKeyword} - Image ${index}`;
    const imgTag = `<img src="${url}" alt="${altText}" width="800" height="600" loading="lazy" />`;
    result = result.replace(new RegExp(placeholder.replace(/[[\]]/g, "\\$&"), "g"), imgTag);
  });

  return result;
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
    pageType,
    companyProfile,
    pageConfig,
    imageMode = "auto",
    userImages = [],
    pageLibrary = [],
    wordpress,
  } = req.body as GeneratePageRequest;

  try {
    const pageTypeConfig = getPageTypeConfig(pageType);

    // STEP 1: Generate page outline
    sendProgress(res, "outline", `Blueprint is designing your ${pageTypeConfig.label} structure...`);

    const promptParams: PagePromptParams = {
      pageType,
      companyProfile,
      pageConfig,
      pageLibrary,
    };

    const outlinePrompt = getPageOutlinePrompt(promptParams);

    let outline: Record<string, unknown>;
    try {
      const outlineResult = await generateText({
        model: MODELS.conductor,
        prompt: outlinePrompt,
        temperature: 0.7,
      });

      // Parse JSON from response
      const responseText = outlineResult.text;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        outline = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in outline response");
      }
    } catch (error) {
      console.error("Outline generation failed:", error);
      // Create fallback outline
      outline = createFallbackOutline(pageType, companyProfile, pageConfig);
    }

    // Build SEO data
    const seoData: SEOData = {
      primaryKeyword: pageConfig.primaryKeyword,
      secondaryKeywords: pageConfig.secondaryKeywords || [],
      metaTitle: (outline.metaTitle as string) || (outline.pageTitle as string) ||
        `${pageConfig.title || companyProfile.name} | ${companyProfile.industryType}`,
      metaDescription: (outline.metaDescription as string) ||
        `Professional ${companyProfile.industryType} services from ${companyProfile.name} in ${companyProfile.headquarters}, ${companyProfile.stateAbbr}.`,
    };

    // STEP 2: Handle images based on imageMode
    const generatedImages: GeneratedImage[] = [];
    const imageCount = pageTypeConfig.imageCount;

    if (imageMode === "manual" && userImages.length > 0) {
      sendProgress(res, "images", "Processing your uploaded images...");

      userImages.slice(0, imageCount).forEach((img, index) => {
        generatedImages.push({
          index,
          prompt: img.caption || `User image ${index + 1}`,
          base64: img.url.startsWith("data:") ? img.url.split(",")[1] || "" : "",
          mimeType: "image/png",
          url: img.url.startsWith("data:") ? undefined : img.url,
        });
      });
    } else if (imageMode === "enhance" && userImages.length > 0) {
      sendProgress(res, "images", "Enhancing your images with AI...");

      userImages.slice(0, imageCount).forEach((img, index) => {
        generatedImages.push({
          index,
          prompt: img.caption || `Enhanced image ${index + 1}`,
          base64: img.url.startsWith("data:") ? img.url.split(",")[1] || "" : "",
          mimeType: "image/png",
          url: img.url.startsWith("data:") ? undefined : img.url,
        });
      });
    } else {
      // Auto mode: Generate images with AI
      sendProgress(res, "images", "Snapshot is creating images for your page...");

      const imagePrompts: { prompt: string; index: number }[] = [];

      // Generate image prompts based on page type
      for (let i = 0; i < imageCount; i++) {
        let prompt = "";
        if (i === 0) {
          prompt = `Professional hero image for ${companyProfile.industryType} ${pageTypeConfig.label.toLowerCase()} in ${companyProfile.headquarters}`;
        } else {
          prompt = `Professional ${companyProfile.industryType} service image, section ${i}`;
        }
        imagePrompts.push({ prompt, index: i });
      }

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

    // STEP 3: Generate page content
    sendProgress(res, "content", "Craftsman is writing your page content...");

    const contentPrompt = getPageContentPrompt(pageType, outline, promptParams);

    let rawContent: string;
    try {
      const contentResult = await generateText({
        model: MODELS.contentWriter,
        prompt: contentPrompt,
        temperature: 0.7,
      });
      rawContent = contentResult.text;
    } catch (error) {
      console.error("Content generation failed:", error);
      rawContent = createFallbackContent(pageType, outline, companyProfile);
    }

    // STEP 4: Format content
    sendProgress(res, "format", "Foreman is formatting the HTML...");

    // STEP 5: Upload images to WordPress or Vercel Blob
    let imageUrls: string[] = [];
    const uploadedImageIds: number[] = [];

    // First, populate imageUrls with any external URLs
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
        const keywordSlug = (seoData.primaryKeyword || pageConfig.title || "page")
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

            return {
              base64: base64Data,
              filename: `${keywordSlug}-${pageType}-${index}.png`,
              altText: `${seoData.primaryKeyword} - Image ${index + 1}`,
              caption: `${companyProfile.name} - ${pageTypeConfig.label}`,
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

    // Try Vercel Blob for remaining images
    const needsBlobStorage = generatedImages.some((img, i) => !imageUrls[i] && img.base64);

    if (needsBlobStorage && !wordpress) {
      sendProgress(res, "upload", "Storing images in cloud storage...");

      for (let i = 0; i < generatedImages.length; i++) {
        if (!imageUrls[i]) {
          const img = generatedImages[i];
          if (img.base64 && img.base64.length > 0) {
            try {
              const keywordSlug = (seoData.primaryKeyword || "page")
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, "")
                .replace(/\s+/g, "-")
                .substring(0, 50);

              const filename = `${keywordSlug}-${pageType}-${i}-${Date.now()}.png`;

              const storeResponse = await callInternalApi("/api/store-image", {
                base64: img.base64,
                filename,
                contentType: img.mimeType || "image/png",
              }) as { success: boolean; url?: string };

              if (storeResponse.success && storeResponse.url) {
                imageUrls[i] = storeResponse.url;
              }
            } catch (error) {
              console.error(`Failed to store image ${i}:`, error);
            }
          }
        }
      }
    }

    // Final fallback - use placeholders
    for (let i = 0; i < generatedImages.length; i++) {
      if (!imageUrls[i]) {
        const img = generatedImages[i];
        if (img.url) {
          imageUrls[i] = img.url;
        } else if (img.base64 && img.base64.length > 0) {
          imageUrls[i] = img.base64.startsWith("data:")
            ? img.base64
            : `data:${img.mimeType || "image/png"};base64,${img.base64}`;
        } else {
          const placeholderText = encodeURIComponent(`${companyProfile.industryType} ${i + 1}`);
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
      outline,
      featuredImageId: uploadedImageIds[0] || null,
      pageType,
    });

    res.end();
  } catch (error) {
    console.error("Page generation error:", error);
    sendError(res, error instanceof Error ? error.message : "Unknown error");
    res.end();
  }
}

// Fallback outline generator
function createFallbackOutline(
  pageType: PageType,
  companyProfile: CompanyProfile,
  pageConfig: Record<string, unknown>
): Record<string, unknown> {
  return {
    pageTitle: `${pageConfig.title || companyProfile.name} | ${companyProfile.industryType}`,
    metaDescription: `Professional ${companyProfile.industryType} services from ${companyProfile.name} in ${companyProfile.headquarters}, ${companyProfile.stateAbbr}.`,
    h1: pageConfig.title || `${companyProfile.name} - ${companyProfile.industryType}`,
    sections: [
      { id: "hero", type: "hero", title: "Welcome" },
      { id: "content", type: "content", title: "Our Services" },
      { id: "cta", type: "cta", title: "Contact Us" },
    ],
  };
}

// Fallback content generator
function createFallbackContent(
  pageType: PageType,
  outline: Record<string, unknown>,
  companyProfile: CompanyProfile
): string {
  const title = (outline.h1 as string) || companyProfile.name;

  return `
<section class="hero">
  <div class="hero-content">
    <h1>${title}</h1>
    <p>Welcome to ${companyProfile.name}, your trusted ${companyProfile.industryType} provider in ${companyProfile.headquarters}, ${companyProfile.stateAbbr}.</p>
    <a href="/contact" class="cta-button">Contact Us Today</a>
  </div>
  <img src="[IMAGE:0]" alt="${companyProfile.industryType} services" class="hero-image" />
</section>

<section class="services">
  <h2>Our Services</h2>
  <p>${companyProfile.name} offers professional ${companyProfile.services.slice(0, 5).join(", ")} services.</p>
  <ul>
    ${companyProfile.services.slice(0, 6).map((s) => `<li>${s}</li>`).join("\n    ")}
  </ul>
</section>

<section class="why-choose-us">
  <h2>Why Choose ${companyProfile.name}?</h2>
  <ul>
    ${companyProfile.usps.slice(0, 4).map((u) => `<li>${u}</li>`).join("\n    ")}
  </ul>
</section>

<section class="cta-section">
  <h2>Ready to Get Started?</h2>
  <p>Contact us today for a free consultation.</p>
  <a href="/contact" class="cta-button">Get Free Quote</a>
</section>
`;
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
