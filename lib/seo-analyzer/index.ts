// lib/seo-analyzer/index.ts
// Main SEO analyzer - Pure TypeScript, no API costs

import { analyzeContentSEO, type ContentSEOResult } from "./content";
import { analyzeReadability, type ReadabilityResult } from "./readability";
import { analyzeTechnicalSEO, type TechnicalSEOResult } from "./technical";
import { analyzeKeywords, type KeywordResult } from "./keyword";

export interface SEOCheckItem {
  id: string;
  category: "content" | "readability" | "technical" | "keyword";
  title: string;
  description: string;
  status: "pass" | "warning" | "fail";
  priority: "high" | "medium" | "low";
  score: number; // 0-100
  maxScore: number;
  suggestion?: string;
}

export interface SEOScore {
  overall: number; // 0-100
  content: number;
  readability: number;
  technical: number;
  keyword: number;
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  checks: SEOCheckItem[];
  contentResult: ContentSEOResult;
  readabilityResult: ReadabilityResult;
  technicalResult: TechnicalSEOResult;
  keywordResult: KeywordResult;
}

export interface SEOAnalysisInput {
  title: string;
  metaDescription: string;
  content: string; // HTML or plain text
  primaryKeyword: string;
  secondaryKeywords?: string[];
  url?: string;
  featuredImage?: {
    url: string;
    alt: string;
  };
}

/**
 * Calculate letter grade from score
 */
function getGrade(score: number): SEOScore["grade"] {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  return "F";
}

/**
 * Strip HTML tags and get plain text
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  const plainText = stripHtml(text);
  const words = plainText.split(/\s+/).filter((word) => word.length > 0);
  return words.length;
}

/**
 * Main SEO analysis function
 */
export function analyzeContent(input: SEOAnalysisInput): SEOScore {
  const plainText = stripHtml(input.content);
  const wordCount = countWords(plainText);

  // Run all analyzers
  const contentResult = analyzeContentSEO({
    title: input.title,
    metaDescription: input.metaDescription,
    content: input.content,
    primaryKeyword: input.primaryKeyword,
    url: input.url,
    featuredImage: input.featuredImage,
  });

  const readabilityResult = analyzeReadability(plainText);

  const technicalResult = analyzeTechnicalSEO({
    content: input.content,
    title: input.title,
    metaDescription: input.metaDescription,
    url: input.url,
  });

  const keywordResult = analyzeKeywords({
    content: plainText,
    primaryKeyword: input.primaryKeyword,
    secondaryKeywords: input.secondaryKeywords || [],
    title: input.title,
    metaDescription: input.metaDescription,
    wordCount,
  });

  // Collect all checks
  const allChecks: SEOCheckItem[] = [
    ...contentResult.checks,
    ...readabilityResult.checks,
    ...technicalResult.checks,
    ...keywordResult.checks,
  ];

  // Calculate category scores
  const contentScore = calculateCategoryScore(
    allChecks.filter((c) => c.category === "content")
  );
  const readabilityScore = calculateCategoryScore(
    allChecks.filter((c) => c.category === "readability")
  );
  const technicalScore = calculateCategoryScore(
    allChecks.filter((c) => c.category === "technical")
  );
  const keywordScore = calculateCategoryScore(
    allChecks.filter((c) => c.category === "keyword")
  );

  // Calculate overall score (weighted average)
  const overall = Math.round(
    contentScore * 0.3 +
      readabilityScore * 0.25 +
      technicalScore * 0.2 +
      keywordScore * 0.25
  );

  return {
    overall,
    content: contentScore,
    readability: readabilityScore,
    technical: technicalScore,
    keyword: keywordScore,
    grade: getGrade(overall),
    checks: allChecks,
    contentResult,
    readabilityResult,
    technicalResult,
    keywordResult,
  };
}

/**
 * Calculate score for a category based on its checks
 */
function calculateCategoryScore(checks: SEOCheckItem[]): number {
  if (checks.length === 0) return 100;

  let totalScore = 0;
  let totalMaxScore = 0;

  for (const check of checks) {
    totalScore += check.score;
    totalMaxScore += check.maxScore;
  }

  return totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 100;
}

// Re-export types
export type { ContentSEOResult } from "./content";
export type { ReadabilityResult } from "./readability";
export type { TechnicalSEOResult } from "./technical";
export type { KeywordResult } from "./keyword";
