// pages/api/orchestrate-blog-stream.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { generateOutline, generateContent } from "../../lib/ai-gateway";
import { generateImagesWithImagen } from "../../lib/imagen-client";

interface WordPressCredentials {
  siteUrl: string;
  username: string;
  appPassword: string;
}

interface ImageData {
  base64: string;
  mimeType: string;
  description: string;
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

async function uploadImageToWordPress(
  credentials: WordPressCredentials,
  imageBase64: string,
  filename: string,
  mimeType: string
): Promise<{ id: number; url: string } | null> {
  try {
    const imageBuffer = Buffer.from(imageBase64, "base64");
    const auth = Buffer.from(`${credentials.username}:${credentials.appPassword}`).toString("base64");

    const response = await fetch(`${credentials.siteUrl}/wp-json/wp/v2/media`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
      body: imageBuffer,
    });

    if (!response.ok) {
      console.error("WordPress upload failed:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    return { id: data.id, url: data.source_url };
  } catch (error) {
    console.error("WordPress upload error:", error);
    return null;
  }
}

function insertImagesIntoContent(content: string, imageUrls: string[]): string {
  let result = content;
  imageUrls.forEach((url, index) => {
    if (url) {
      const imgTag = `<img src="${url}" alt="Blog section image ${index + 1}" class="${index === 0 ? 'featured-image' : 'content-image'}" width="800" height="600" />`;
      result = result.replace(`[IMAGE:${index}]`, imgTag);
    }
  });
  // Remove any remaining placeholders
  result = result.replace(/\[IMAGE:\d+\]/g, "");
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
    topic,
    location,
    blogType,
    numberOfSections,
    tone,
    companyName,
    companyWebsite,
    primaryKeyword,
    secondaryKeywords,
    metaTitle,
    metaDescription,
    imageThemes,
    wordpress,
  } = req.body;

  const imageCount = Math.min(numberOfSections + 1, 3); // Hero + up to 2 section images

  try {
    // Step 1: Generate outline
    sendProgress(res, "outline", "Archie is designing your blog structure...");

    const outline = await generateOutline({
      topic,
      location,
      blogType,
      numberOfSections,
      tone,
      companyName,
      companyWebsite,
      primaryKeyword,
      secondaryKeywords: secondaryKeywords || [],
      metaTitle,
      metaDescription,
      imageThemes: imageThemes || [],
    });

    if (!outline) {
      sendError(res, "Failed to generate outline");
      res.end();
      return;
    }

    // Step 2: Generate images
    sendProgress(res, "images", "Picasso is creating stunning images...");

    let imageUrls: string[] = [];
    let featuredImageId: number | null = null;
    const generatedImages: ImageData[] = [];

    try {
      const imagePrompts = outline.sections.slice(0, imageCount).map((section, index) => {
        if (index === 0) {
          return `Professional photograph of ${topic} in ${location}, beautiful lighting, high quality`;
        }
        return `Professional photograph showing ${section.title}, ${topic} theme, high quality`;
      });

      const images = await generateImagesWithImagen(imagePrompts);

      for (const img of images) {
        if (img) {
          generatedImages.push(img);
        }
      }
    } catch (imgError) {
      console.error("Image generation failed:", imgError);
    }

    // Step 3: Generate content
    sendProgress(res, "content", "Penelope is writing engaging content...");

    const rawContent = await generateContent(outline, location);

    if (!rawContent) {
      sendError(res, "Failed to generate content");
      res.end();
      return;
    }

    // Step 4: Format content
    sendProgress(res, "format", "Felix is formatting the HTML...");

    // Step 5: Upload to WordPress (if configured)
    if (wordpress && generatedImages.length > 0) {
      sendProgress(res, "upload", "Uploading images to WordPress...");

      for (let i = 0; i < generatedImages.length; i++) {
        const img = generatedImages[i];
        const ext = img.mimeType.split("/")[1] || "png";
        const filename = `blog-${topic.replace(/\s+/g, "-")}-${i + 1}-${Date.now()}.${ext}`;

        const uploaded = await uploadImageToWordPress(wordpress, img.base64, filename, img.mimeType);
        if (uploaded) {
          imageUrls.push(uploaded.url);
          if (i === 0) {
            featuredImageId = uploaded.id;
          }
        }
      }
    } else if (generatedImages.length > 0) {
      // Use base64 data URLs as fallback
      imageUrls = generatedImages.map((img) => `data:${img.mimeType};base64,${img.base64}`);
    }

    // Insert images into content
    const htmlContent = insertImagesIntoContent(rawContent, imageUrls);

    const seoData = {
      primaryKeyword: outline.seo.primaryKeyword,
      secondaryKeywords: outline.seo.secondaryKeywords,
      metaTitle: outline.seo.metaTitle,
      metaDescription: outline.seo.metaDescription,
    };

    sendComplete(res, {
      success: true,
      htmlContent,
      seoData,
      featuredImageId,
    });

    res.end();
  } catch (error) {
    console.error("Orchestration error:", error);
    sendError(res, error instanceof Error ? error.message : "Unknown error");
    res.end();
  }
}
