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

  // Replace image placeholders in src attributes (new format: src="[IMAGE:X]")
  imageUrls.forEach((url, index) => {
    const srcPlaceholder = `src="[IMAGE:${index}]"`;
    result = result.replace(new RegExp(srcPlaceholder, 'g'), `src="${url}"`);
  });

  // Also handle standalone placeholders (old format: [IMAGE:X])
  imageUrls.forEach((url, index) => {
    const placeholder = `[IMAGE:${index}]`;
    const altText = index === 0
      ? `${seoData.primaryKeyword} - Featured Image`
      : `${seoData.primaryKeyword} - Image ${index}`;
    const imgTag = `<img src="${url}" alt="${altText}" width="800" height="600" />`;
    result = result.replace(new RegExp(placeholder.replace(/[[\]]/g, '\\$&'), 'g'), imgTag);
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
    companyName,
    primaryKeyword,
    secondaryKeywords,
    metaTitle,
    metaDescription,
    imageThemes,
    wordpress,
  } = req.body;

  try {
    // STEP 1: Generate outline with Archie
    sendProgress(res, "outline", "Archie is designing your blog structure...");

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

    // STEP 2: Generate images with Picasso
    sendProgress(res, "images", "Picasso is creating stunning images...");

    const generatedImages: GeneratedImage[] = [];
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

    // STEP 3: Generate content with Penelope
    sendProgress(res, "content", "Penelope is writing engaging content...");

    const rawContent = await generateContent({
      outline,
      topic,
      location,
      tone,
      companyName,
    });

    // STEP 4: Format content with Felix
    sendProgress(res, "format", "Felix is formatting the HTML...");

    // STEP 5: Upload to WordPress (if configured)
    let imageUrls: string[] = [];
    const uploadedImageIds: number[] = [];

    if (wordpress && generatedImages.some((img) => img.base64)) {
      sendProgress(res, "upload", "Uploading images to WordPress...");

      try {
        const primaryKeywordSlug = (seoData.primaryKeyword || topic)
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .substring(0, 50);

        const imagesToUpload = generatedImages
          .filter((img) => img.base64 && img.base64.length > 0)
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
              if (uploaded.url) imageUrls[i] = uploaded.url;
              if (uploaded.id) uploadedImageIds[i] = uploaded.id;
            });
          }
        }
      } catch (error) {
        console.error("WordPress upload failed:", error);
      }
    }

    // Fill missing URLs with base64 or placeholders
    for (let i = 0; i < generatedImages.length; i++) {
      if (!imageUrls[i]) {
        const img = generatedImages[i];
        if (img.base64 && img.base64.length > 0) {
          imageUrls[i] = img.base64;
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
