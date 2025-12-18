// lib/seo-analyzer/technical.ts
// Technical SEO analysis - HTML structure, schema, URL

import type { SEOCheckItem } from "./index";

export interface TechnicalSEOInput {
  content: string;
  title: string;
  metaDescription: string;
  url?: string;
}

export interface TechnicalSEOResult {
  hasSchemaMarkup: boolean;
  hasCanonicalTag: boolean;
  urlLength: number;
  urlHasKeyword: boolean;
  htmlSize: number;
  headingHierarchy: boolean;
  checks: SEOCheckItem[];
}

/**
 * Check if URL is SEO-friendly
 */
function analyzeUrl(url: string | undefined): {
  length: number;
  isClean: boolean;
  hasSpecialChars: boolean;
} {
  if (!url) return { length: 0, isClean: true, hasSpecialChars: false };

  // Extract path from URL
  let path = url;
  try {
    const urlObj = new URL(url);
    path = urlObj.pathname;
  } catch {
    // If URL parsing fails, use as-is
  }

  const length = path.length;
  const hasSpecialChars = /[^a-zA-Z0-9\-\/]/.test(path);
  const isClean = !hasSpecialChars && length < 75;

  return { length, isClean, hasSpecialChars };
}

/**
 * Check heading hierarchy (h1 -> h2 -> h3 should be sequential)
 */
function checkHeadingHierarchy(html: string): {
  valid: boolean;
  issues: string[];
} {
  const headingMatches = html.match(/<h[1-6][^>]*>/gi) || [];
  const headingLevels = headingMatches.map((h) => parseInt(h.charAt(2)));

  const issues: string[] = [];
  let lastLevel = 0;

  for (const level of headingLevels) {
    if (lastLevel === 0) {
      if (level !== 1) {
        issues.push(`Content should start with H1, not H${level}`);
      }
    } else if (level > lastLevel + 1) {
      issues.push(`Heading jumps from H${lastLevel} to H${level}`);
    }
    lastLevel = level;
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Check for schema markup
 */
function detectSchemaMarkup(html: string): boolean {
  // Check for JSON-LD
  if (/<script[^>]*type=["']application\/ld\+json["'][^>]*>/i.test(html)) {
    return true;
  }

  // Check for microdata
  if (/itemscope|itemprop|itemtype/i.test(html)) {
    return true;
  }

  // Check for RDFa
  if (/typeof=|property=.*schema/i.test(html)) {
    return true;
  }

  return false;
}

/**
 * Check for canonical tag
 */
function detectCanonicalTag(html: string): boolean {
  return /<link[^>]*rel=["']canonical["'][^>]*>/i.test(html);
}

/**
 * Calculate approximate HTML size in KB
 */
function getHtmlSize(html: string): number {
  const bytes = new Blob([html]).size;
  return Math.round((bytes / 1024) * 10) / 10;
}

/**
 * Analyze technical SEO
 */
export function analyzeTechnicalSEO(
  input: TechnicalSEOInput
): TechnicalSEOResult {
  const { content, url } = input;
  const checks: SEOCheckItem[] = [];

  const hasSchemaMarkup = detectSchemaMarkup(content);
  const hasCanonicalTag = detectCanonicalTag(content);
  const urlAnalysis = analyzeUrl(url);
  const headingCheck = checkHeadingHierarchy(content);
  const htmlSize = getHtmlSize(content);

  // 1. Schema Markup Check
  checks.push({
    id: "schema-markup",
    category: "technical",
    title: "Schema Markup",
    description: hasSchemaMarkup
      ? "Schema markup detected"
      : "No schema markup found",
    status: hasSchemaMarkup ? "pass" : "warning",
    priority: "medium",
    score: hasSchemaMarkup ? 15 : 5,
    maxScore: 15,
    suggestion: hasSchemaMarkup
      ? undefined
      : "Add schema markup (JSON-LD) for rich snippets in search results",
  });

  // 2. URL Length Check (only if URL provided)
  if (url) {
    let urlStatus: SEOCheckItem["status"] = "pass";
    let urlScore = 10;
    let urlSuggestion: string | undefined;

    if (urlAnalysis.length > 100) {
      urlStatus = "warning";
      urlScore = 4;
      urlSuggestion = `URL is very long (${urlAnalysis.length} chars). Keep URLs under 75 characters.`;
    } else if (urlAnalysis.length > 75) {
      urlStatus = "warning";
      urlScore = 7;
      urlSuggestion = "URL could be shorter for better SEO.";
    } else if (urlAnalysis.hasSpecialChars) {
      urlStatus = "warning";
      urlScore = 7;
      urlSuggestion =
        "URL contains special characters. Use only letters, numbers, and hyphens.";
    }

    checks.push({
      id: "url-length",
      category: "technical",
      title: "URL Structure",
      description: `URL path is ${urlAnalysis.length} characters`,
      status: urlStatus,
      priority: "medium",
      score: urlScore,
      maxScore: 10,
      suggestion: urlSuggestion,
    });
  }

  // 3. Heading Hierarchy Check
  checks.push({
    id: "heading-hierarchy",
    category: "technical",
    title: "Heading Hierarchy",
    description: headingCheck.valid
      ? "Headings follow proper hierarchy"
      : headingCheck.issues[0] || "Heading structure has issues",
    status: headingCheck.valid ? "pass" : "warning",
    priority: "medium",
    score: headingCheck.valid ? 12 : 5,
    maxScore: 12,
    suggestion: headingCheck.valid
      ? undefined
      : "Ensure headings follow a logical order (H1 → H2 → H3)",
  });

  // 4. HTML Size Check
  let sizeStatus: SEOCheckItem["status"] = "pass";
  let sizeScore = 8;
  let sizeSuggestion: string | undefined;

  if (htmlSize > 500) {
    sizeStatus = "warning";
    sizeScore = 3;
    sizeSuggestion = `Page is large (${htmlSize}KB). Consider optimizing content and images.`;
  } else if (htmlSize > 200) {
    sizeStatus = "warning";
    sizeScore = 6;
    sizeSuggestion = "Page size is moderate. Monitor for loading performance.";
  }

  checks.push({
    id: "html-size",
    category: "technical",
    title: "Page Size",
    description: `HTML content is approximately ${htmlSize}KB`,
    status: sizeStatus,
    priority: "low",
    score: sizeScore,
    maxScore: 8,
    suggestion: sizeSuggestion,
  });

  // 5. Content Completeness
  const hasTitle = input.title.length > 0;
  const hasMeta = input.metaDescription.length > 0;
  const isComplete = hasTitle && hasMeta;

  checks.push({
    id: "meta-completeness",
    category: "technical",
    title: "Meta Tags Complete",
    description: isComplete
      ? "Title and meta description are set"
      : `Missing: ${!hasTitle ? "title" : ""}${!hasTitle && !hasMeta ? ", " : ""}${!hasMeta ? "meta description" : ""}`,
    status: isComplete ? "pass" : "fail",
    priority: "high",
    score: isComplete ? 10 : hasTitle || hasMeta ? 5 : 0,
    maxScore: 10,
    suggestion: isComplete
      ? undefined
      : "Set both title and meta description for better SEO",
  });

  return {
    hasSchemaMarkup,
    hasCanonicalTag,
    urlLength: urlAnalysis.length,
    urlHasKeyword: false, // Would need keyword to check
    htmlSize,
    headingHierarchy: headingCheck.valid,
    checks,
  };
}
