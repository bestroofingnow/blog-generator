// lib/seo-analyzer/content.ts
// Content SEO analysis - titles, meta descriptions, headings, images

import type { SEOCheckItem } from "./index";

export interface ContentSEOInput {
  title: string;
  metaDescription: string;
  content: string;
  primaryKeyword: string;
  url?: string;
  featuredImage?: {
    url: string;
    alt: string;
  };
}

export interface ContentSEOResult {
  titleLength: number;
  metaDescriptionLength: number;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
    h4: string[];
  };
  imageCount: number;
  imagesWithAlt: number;
  internalLinks: number;
  externalLinks: number;
  checks: SEOCheckItem[];
}

/**
 * Extract headings from HTML content
 */
function extractHeadings(html: string): ContentSEOResult["headings"] {
  const h1 = (html.match(/<h1[^>]*>(.*?)<\/h1>/gi) || []).map((h) =>
    h.replace(/<[^>]+>/g, "")
  );
  const h2 = (html.match(/<h2[^>]*>(.*?)<\/h2>/gi) || []).map((h) =>
    h.replace(/<[^>]+>/g, "")
  );
  const h3 = (html.match(/<h3[^>]*>(.*?)<\/h3>/gi) || []).map((h) =>
    h.replace(/<[^>]+>/g, "")
  );
  const h4 = (html.match(/<h4[^>]*>(.*?)<\/h4>/gi) || []).map((h) =>
    h.replace(/<[^>]+>/g, "")
  );

  return { h1, h2, h3, h4 };
}

/**
 * Count images and check for alt tags
 */
function analyzeImages(html: string): { total: number; withAlt: number } {
  const imgTags = html.match(/<img[^>]*>/gi) || [];
  let withAlt = 0;

  for (const img of imgTags) {
    if (/alt=["'][^"']+["']/i.test(img)) {
      withAlt++;
    }
  }

  return { total: imgTags.length, withAlt };
}

/**
 * Count links
 */
function analyzeLinks(html: string): { internal: number; external: number } {
  const links = html.match(/<a[^>]*href=["']([^"']+)["'][^>]*>/gi) || [];
  let internal = 0;
  let external = 0;

  for (const link of links) {
    const hrefMatch = link.match(/href=["']([^"']+)["']/i);
    if (hrefMatch) {
      const href = hrefMatch[1];
      if (
        href.startsWith("/") ||
        href.startsWith("#") ||
        !href.includes("://")
      ) {
        internal++;
      } else {
        external++;
      }
    }
  }

  return { internal, external };
}

/**
 * Check if keyword appears in text (case-insensitive)
 */
function containsKeyword(text: string, keyword: string): boolean {
  if (!keyword) return false;
  const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  return regex.test(text);
}

/**
 * Analyze content SEO
 */
export function analyzeContentSEO(input: ContentSEOInput): ContentSEOResult {
  const { title, metaDescription, content, primaryKeyword, featuredImage } =
    input;

  const checks: SEOCheckItem[] = [];
  const headings = extractHeadings(content);
  const images = analyzeImages(content);
  const links = analyzeLinks(content);

  // 1. Title Length Check (50-60 chars ideal)
  const titleLength = title.length;
  let titleStatus: SEOCheckItem["status"] = "pass";
  let titleScore = 15;
  let titleSuggestion: string | undefined;

  if (titleLength === 0) {
    titleStatus = "fail";
    titleScore = 0;
    titleSuggestion = "Add a title to your content";
  } else if (titleLength < 30) {
    titleStatus = "warning";
    titleScore = 8;
    titleSuggestion = `Title is too short (${titleLength} chars). Aim for 50-60 characters.`;
  } else if (titleLength > 60) {
    titleStatus = "warning";
    titleScore = 10;
    titleSuggestion = `Title is too long (${titleLength} chars). Keep it under 60 characters to avoid truncation in search results.`;
  }

  checks.push({
    id: "title-length",
    category: "content",
    title: "Title Length",
    description: `Your title is ${titleLength} characters`,
    status: titleStatus,
    priority: "high",
    score: titleScore,
    maxScore: 15,
    suggestion: titleSuggestion,
  });

  // 2. Title Contains Keyword
  const titleHasKeyword = containsKeyword(title, primaryKeyword);
  checks.push({
    id: "title-keyword",
    category: "content",
    title: "Keyword in Title",
    description: titleHasKeyword
      ? `Title contains your primary keyword "${primaryKeyword}"`
      : "Primary keyword not found in title",
    status: titleHasKeyword ? "pass" : "fail",
    priority: "high",
    score: titleHasKeyword ? 15 : 0,
    maxScore: 15,
    suggestion: titleHasKeyword
      ? undefined
      : `Add your primary keyword "${primaryKeyword}" to the title`,
  });

  // 3. Meta Description Length (150-160 chars ideal)
  const metaLength = metaDescription.length;
  let metaStatus: SEOCheckItem["status"] = "pass";
  let metaScore = 10;
  let metaSuggestion: string | undefined;

  if (metaLength === 0) {
    metaStatus = "fail";
    metaScore = 0;
    metaSuggestion = "Add a meta description to improve click-through rates";
  } else if (metaLength < 120) {
    metaStatus = "warning";
    metaScore = 5;
    metaSuggestion = `Meta description is short (${metaLength} chars). Aim for 150-160 characters.`;
  } else if (metaLength > 160) {
    metaStatus = "warning";
    metaScore = 7;
    metaSuggestion = `Meta description is long (${metaLength} chars). Keep it under 160 characters.`;
  }

  checks.push({
    id: "meta-length",
    category: "content",
    title: "Meta Description Length",
    description: `Meta description is ${metaLength} characters`,
    status: metaStatus,
    priority: "high",
    score: metaScore,
    maxScore: 10,
    suggestion: metaSuggestion,
  });

  // 4. Meta Contains Keyword
  const metaHasKeyword = containsKeyword(metaDescription, primaryKeyword);
  checks.push({
    id: "meta-keyword",
    category: "content",
    title: "Keyword in Meta Description",
    description: metaHasKeyword
      ? "Meta description contains your primary keyword"
      : "Primary keyword not found in meta description",
    status: metaHasKeyword ? "pass" : "warning",
    priority: "medium",
    score: metaHasKeyword ? 10 : 3,
    maxScore: 10,
    suggestion: metaHasKeyword
      ? undefined
      : "Include your primary keyword in the meta description",
  });

  // 5. H1 Heading Check
  const h1Count = headings.h1.length;
  let h1Status: SEOCheckItem["status"] = "pass";
  let h1Score = 10;
  let h1Suggestion: string | undefined;

  if (h1Count === 0) {
    h1Status = "fail";
    h1Score = 0;
    h1Suggestion = "Add exactly one H1 heading to your content";
  } else if (h1Count > 1) {
    h1Status = "warning";
    h1Score = 5;
    h1Suggestion = `You have ${h1Count} H1 headings. Use only one H1 per page.`;
  }

  checks.push({
    id: "h1-heading",
    category: "content",
    title: "H1 Heading",
    description:
      h1Count === 1
        ? "Your content has one H1 heading"
        : `Your content has ${h1Count} H1 headings`,
    status: h1Status,
    priority: "high",
    score: h1Score,
    maxScore: 10,
  });

  // 6. H2 Subheadings Check
  const h2Count = headings.h2.length;
  let h2Status: SEOCheckItem["status"] = "pass";
  let h2Score = 8;
  let h2Suggestion: string | undefined;

  if (h2Count === 0) {
    h2Status = "warning";
    h2Score = 3;
    h2Suggestion = "Add H2 subheadings to break up your content";
  } else if (h2Count < 2) {
    h2Status = "warning";
    h2Score = 5;
    h2Suggestion = "Consider adding more H2 subheadings for better structure";
  }

  checks.push({
    id: "h2-headings",
    category: "content",
    title: "Subheadings (H2)",
    description: `Your content has ${h2Count} H2 subheading${h2Count !== 1 ? "s" : ""}`,
    status: h2Status,
    priority: "medium",
    score: h2Score,
    maxScore: 8,
    suggestion: h2Suggestion,
  });

  // 7. Images Check
  const imageCount = images.total;
  let imageStatus: SEOCheckItem["status"] = "pass";
  let imageScore = 8;
  let imageSuggestion: string | undefined;

  if (imageCount === 0) {
    imageStatus = "warning";
    imageScore = 3;
    imageSuggestion = "Add images to make your content more engaging";
  }

  checks.push({
    id: "images",
    category: "content",
    title: "Images",
    description: `Your content has ${imageCount} image${imageCount !== 1 ? "s" : ""}`,
    status: imageStatus,
    priority: "medium",
    score: imageScore,
    maxScore: 8,
    suggestion: imageSuggestion,
  });

  // 8. Image Alt Tags
  if (imageCount > 0) {
    const altStatus =
      images.withAlt === images.total
        ? "pass"
        : images.withAlt > 0
          ? "warning"
          : "fail";
    const altScore =
      imageCount > 0 ? Math.round((images.withAlt / imageCount) * 8) : 8;

    checks.push({
      id: "image-alt",
      category: "content",
      title: "Image Alt Tags",
      description: `${images.withAlt} of ${imageCount} images have alt tags`,
      status: altStatus,
      priority: "medium",
      score: altScore,
      maxScore: 8,
      suggestion:
        altStatus !== "pass"
          ? "Add descriptive alt tags to all images for accessibility and SEO"
          : undefined,
    });
  }

  // 9. Internal Links
  checks.push({
    id: "internal-links",
    category: "content",
    title: "Internal Links",
    description: `Your content has ${links.internal} internal link${links.internal !== 1 ? "s" : ""}`,
    status: links.internal > 0 ? "pass" : "warning",
    priority: "medium",
    score: links.internal > 0 ? 6 : 2,
    maxScore: 6,
    suggestion:
      links.internal === 0
        ? "Add internal links to other relevant pages on your site"
        : undefined,
  });

  // 10. Featured Image
  const hasFeaturedImage = !!featuredImage?.url;
  checks.push({
    id: "featured-image",
    category: "content",
    title: "Featured Image",
    description: hasFeaturedImage
      ? "Featured image is set"
      : "No featured image set",
    status: hasFeaturedImage ? "pass" : "warning",
    priority: "medium",
    score: hasFeaturedImage ? 5 : 2,
    maxScore: 5,
    suggestion: hasFeaturedImage
      ? undefined
      : "Add a featured image for better social sharing",
  });

  return {
    titleLength,
    metaDescriptionLength: metaLength,
    headings,
    imageCount,
    imagesWithAlt: images.withAlt,
    internalLinks: links.internal,
    externalLinks: links.external,
    checks,
  };
}
