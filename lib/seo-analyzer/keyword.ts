// lib/seo-analyzer/keyword.ts
// Keyword density and placement analysis

import type { SEOCheckItem } from "./index";

export interface KeywordInput {
  content: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  title: string;
  metaDescription: string;
  wordCount: number;
}

export interface KeywordDensity {
  keyword: string;
  count: number;
  density: number;
  status: "optimal" | "low" | "high";
}

export interface KeywordResult {
  primaryKeyword: KeywordDensity;
  secondaryKeywords: KeywordDensity[];
  keywordInTitle: boolean;
  keywordInMeta: boolean;
  keywordInFirstParagraph: boolean;
  keywordInHeadings: boolean;
  checks: SEOCheckItem[];
}

/**
 * Count keyword occurrences (case-insensitive, whole word)
 */
function countKeywordOccurrences(text: string, keyword: string): number {
  if (!keyword || keyword.trim() === "") return 0;

  const escapedKeyword = keyword
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${escapedKeyword}\\b`, "gi");
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

/**
 * Calculate keyword density
 */
function calculateDensity(count: number, wordCount: number): number {
  if (wordCount === 0) return 0;
  return Math.round((count / wordCount) * 100 * 100) / 100;
}

/**
 * Determine density status
 * Optimal: 1-2% for primary, 0.5-1.5% for secondary
 */
function getDensityStatus(
  density: number,
  isPrimary: boolean
): "optimal" | "low" | "high" {
  if (isPrimary) {
    if (density < 0.5) return "low";
    if (density > 3) return "high";
    return "optimal";
  } else {
    if (density < 0.3) return "low";
    if (density > 2) return "high";
    return "optimal";
  }
}

/**
 * Check if keyword appears in first paragraph
 */
function isKeywordInFirstParagraph(
  content: string,
  keyword: string
): boolean {
  const firstParagraph = content.split(/\n\n|\r\n\r\n/)[0] || content;
  return countKeywordOccurrences(firstParagraph, keyword) > 0;
}

/**
 * Check if keyword appears in any heading
 */
function isKeywordInHeadings(html: string, keyword: string): boolean {
  const headingMatches = html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/gi) || [];
  for (const heading of headingMatches) {
    const headingText = heading.replace(/<[^>]+>/g, "");
    if (countKeywordOccurrences(headingText, keyword) > 0) {
      return true;
    }
  }
  return false;
}

/**
 * Analyze keyword usage
 */
export function analyzeKeywords(input: KeywordInput): KeywordResult {
  const {
    content,
    primaryKeyword,
    secondaryKeywords,
    title,
    metaDescription,
    wordCount,
  } = input;

  const checks: SEOCheckItem[] = [];

  // Analyze primary keyword
  const primaryCount = countKeywordOccurrences(content, primaryKeyword);
  const primaryDensity = calculateDensity(primaryCount, wordCount);
  const primaryStatus = getDensityStatus(primaryDensity, true);

  const keywordInTitle = countKeywordOccurrences(title, primaryKeyword) > 0;
  const keywordInMeta =
    countKeywordOccurrences(metaDescription, primaryKeyword) > 0;
  const keywordInFirstParagraph = isKeywordInFirstParagraph(
    content,
    primaryKeyword
  );
  const keywordInHeadings = isKeywordInHeadings(content, primaryKeyword);

  // 1. Primary Keyword Density Check
  let densityStatus: SEOCheckItem["status"] = "pass";
  let densityScore = 15;
  let densitySuggestion: string | undefined;

  if (primaryStatus === "low") {
    densityStatus = primaryCount === 0 ? "fail" : "warning";
    densityScore = primaryCount === 0 ? 0 : 7;
    densitySuggestion =
      primaryCount === 0
        ? `Add your primary keyword "${primaryKeyword}" to your content`
        : `Keyword density is low (${primaryDensity}%). Aim for 1-2%.`;
  } else if (primaryStatus === "high") {
    densityStatus = "warning";
    densityScore = 8;
    densitySuggestion = `Keyword density is high (${primaryDensity}%). This may look like keyword stuffing. Aim for 1-2%.`;
  }

  checks.push({
    id: "primary-keyword-density",
    category: "keyword",
    title: "Primary Keyword Density",
    description: `"${primaryKeyword}" appears ${primaryCount} times (${primaryDensity}%)`,
    status: densityStatus,
    priority: "high",
    score: densityScore,
    maxScore: 15,
    suggestion: densitySuggestion,
  });

  // 2. Keyword in First Paragraph
  checks.push({
    id: "keyword-first-paragraph",
    category: "keyword",
    title: "Keyword in Introduction",
    description: keywordInFirstParagraph
      ? "Primary keyword appears in the first paragraph"
      : "Primary keyword not found in first paragraph",
    status: keywordInFirstParagraph ? "pass" : "warning",
    priority: "medium",
    score: keywordInFirstParagraph ? 10 : 3,
    maxScore: 10,
    suggestion: keywordInFirstParagraph
      ? undefined
      : "Add your primary keyword to the opening paragraph",
  });

  // 3. Keyword in Headings
  checks.push({
    id: "keyword-in-headings",
    category: "keyword",
    title: "Keyword in Headings",
    description: keywordInHeadings
      ? "Primary keyword found in at least one heading"
      : "Primary keyword not found in any headings",
    status: keywordInHeadings ? "pass" : "warning",
    priority: "medium",
    score: keywordInHeadings ? 10 : 4,
    maxScore: 10,
    suggestion: keywordInHeadings
      ? undefined
      : "Include your primary keyword in at least one H2 subheading",
  });

  // 4. Keyword Distribution (check if spread throughout content)
  let distributionScore = 10;
  let distributionStatus: SEOCheckItem["status"] = "pass";
  let distributionSuggestion: string | undefined;

  if (primaryCount > 0 && wordCount > 300) {
    // Split content into thirds and check distribution
    const third = Math.floor(content.length / 3);
    const firstThird = content.substring(0, third);
    const middleThird = content.substring(third, third * 2);
    const lastThird = content.substring(third * 2);

    const firstCount = countKeywordOccurrences(firstThird, primaryKeyword);
    const middleCount = countKeywordOccurrences(middleThird, primaryKeyword);
    const lastCount = countKeywordOccurrences(lastThird, primaryKeyword);

    const sections = [firstCount > 0, middleCount > 0, lastCount > 0];
    const filledSections = sections.filter(Boolean).length;

    if (filledSections < 2) {
      distributionStatus = "warning";
      distributionScore = 5;
      distributionSuggestion =
        "Spread your keyword throughout the content, not just in one section";
    }
  }

  checks.push({
    id: "keyword-distribution",
    category: "keyword",
    title: "Keyword Distribution",
    description:
      distributionStatus === "pass"
        ? "Keyword is well distributed throughout content"
        : "Keyword appears in limited sections of content",
    status: distributionStatus,
    priority: "low",
    score: distributionScore,
    maxScore: 10,
    suggestion: distributionSuggestion,
  });

  // 5. Secondary Keywords Check
  const secondaryResults: KeywordDensity[] = [];
  let secondaryScore = 10;
  let secondaryMissing = 0;

  for (const keyword of secondaryKeywords.slice(0, 5)) {
    // Max 5 secondary keywords
    const count = countKeywordOccurrences(content, keyword);
    const density = calculateDensity(count, wordCount);
    const status = getDensityStatus(density, false);

    secondaryResults.push({
      keyword,
      count,
      density,
      status,
    });

    if (count === 0) secondaryMissing++;
  }

  if (secondaryKeywords.length > 0) {
    if (secondaryMissing === secondaryKeywords.length) {
      secondaryScore = 2;
    } else if (secondaryMissing > secondaryKeywords.length / 2) {
      secondaryScore = 5;
    }

    checks.push({
      id: "secondary-keywords",
      category: "keyword",
      title: "Secondary Keywords",
      description:
        secondaryMissing === 0
          ? `All ${secondaryKeywords.length} secondary keywords found in content`
          : `${secondaryKeywords.length - secondaryMissing} of ${secondaryKeywords.length} secondary keywords found`,
      status:
        secondaryMissing === 0
          ? "pass"
          : secondaryMissing > secondaryKeywords.length / 2
            ? "warning"
            : "pass",
      priority: "medium",
      score: secondaryScore,
      maxScore: 10,
      suggestion:
        secondaryMissing > 0
          ? `Add missing secondary keywords: ${secondaryKeywords.filter((k) => countKeywordOccurrences(content, k) === 0).slice(0, 3).join(", ")}`
          : undefined,
    });
  }

  // 6. Word Count Check (for comprehensive coverage)
  let wordCountStatus: SEOCheckItem["status"] = "pass";
  let wordCountScore = 10;
  let wordCountSuggestion: string | undefined;

  if (wordCount < 300) {
    wordCountStatus = "warning";
    wordCountScore = 3;
    wordCountSuggestion = `Content is thin (${wordCount} words). Aim for at least 800-1000 words for better SEO.`;
  } else if (wordCount < 800) {
    wordCountStatus = "warning";
    wordCountScore = 6;
    wordCountSuggestion = `Content could be longer (${wordCount} words). Longer content often ranks better.`;
  } else if (wordCount >= 1500) {
    wordCountScore = 10;
  }

  checks.push({
    id: "word-count",
    category: "keyword",
    title: "Content Length",
    description: `${wordCount.toLocaleString()} words`,
    status: wordCountStatus,
    priority: "medium",
    score: wordCountScore,
    maxScore: 10,
    suggestion: wordCountSuggestion,
  });

  return {
    primaryKeyword: {
      keyword: primaryKeyword,
      count: primaryCount,
      density: primaryDensity,
      status: primaryStatus,
    },
    secondaryKeywords: secondaryResults,
    keywordInTitle,
    keywordInMeta,
    keywordInFirstParagraph,
    keywordInHeadings,
    checks,
  };
}
