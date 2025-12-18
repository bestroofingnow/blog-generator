// lib/hooks/useContentScore.ts
// Real-time content scoring for SEO optimization
import { useMemo, useCallback } from "react";

export interface SEOScoreData {
  overall: number;
  letterGrade: string;
  metrics: {
    keywordUsage: MetricScore;
    contentLength: MetricScore;
    readability: MetricScore;
    headingStructure: MetricScore;
    imageOptimization: MetricScore;
    internalLinks: MetricScore;
  };
  recommendations: Recommendation[];
}

export interface MetricScore {
  score: number;
  label: string;
  status: "good" | "warning" | "error";
  detail: string;
}

export interface Recommendation {
  id: string;
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  action?: string;
}

interface UseContentScoreParams {
  content: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  targetWordCount?: number;
}

// Strip HTML tags for text analysis
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// Count occurrences of a keyword (case-insensitive)
function countKeyword(text: string, keyword: string): number {
  if (!keyword) return 0;
  const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
  return (text.match(regex) || []).length;
}

// Calculate Flesch-Kincaid Reading Ease
function calculateReadability(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const syllables = words.reduce((count, word) => {
    return count + countSyllables(word);
  }, 0);

  if (sentences.length === 0 || words.length === 0) return 0;

  const avgSentenceLength = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;

  // Flesch Reading Ease formula
  const score = 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;
  return Math.max(0, Math.min(100, score));
}

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;

  const vowels = "aeiouy";
  let count = 0;
  let prevWasVowel = false;

  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    if (isVowel && !prevWasVowel) count++;
    prevWasVowel = isVowel;
  }

  // Adjust for silent 'e'
  if (word.endsWith("e") && count > 1) count--;
  // Ensure at least one syllable
  return Math.max(1, count);
}

// Get letter grade from score
function getLetterGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 85) return "A";
  if (score >= 80) return "A-";
  if (score >= 75) return "B+";
  if (score >= 70) return "B";
  if (score >= 65) return "B-";
  if (score >= 60) return "C+";
  if (score >= 55) return "C";
  if (score >= 50) return "C-";
  if (score >= 45) return "D+";
  if (score >= 40) return "D";
  return "F";
}

// Get status based on score
function getStatus(score: number): "good" | "warning" | "error" {
  if (score >= 70) return "good";
  if (score >= 40) return "warning";
  return "error";
}

export function useContentScore({
  content,
  primaryKeyword = "",
  secondaryKeywords = [],
  targetWordCount = 1500,
}: UseContentScoreParams): SEOScoreData {
  const calculateScore = useCallback(() => {
    const plainText = stripHtml(content);
    const wordCount = plainText.split(/\s+/).filter((w) => w.length > 0).length;
    const recommendations: Recommendation[] = [];

    // 1. Keyword Usage Score (25% weight)
    let keywordScore = 0;
    let keywordDetail = "";
    const primaryCount = countKeyword(plainText, primaryKeyword);

    if (primaryKeyword) {
      const keywordDensity = wordCount > 0 ? (primaryCount / wordCount) * 100 : 0;
      const idealMin = 0.5;
      const idealMax = 2.5;

      if (keywordDensity >= idealMin && keywordDensity <= idealMax) {
        keywordScore = 100;
        keywordDetail = `Perfect! "${primaryKeyword}" appears ${primaryCount}x (${keywordDensity.toFixed(1)}%)`;
      } else if (keywordDensity < idealMin) {
        keywordScore = Math.max(20, 100 - (idealMin - keywordDensity) * 50);
        keywordDetail = `Add more: "${primaryKeyword}" appears ${primaryCount}x (${keywordDensity.toFixed(1)}%)`;
        recommendations.push({
          id: "keyword-low",
          priority: "high",
          title: "Increase primary keyword usage",
          description: `Use "${primaryKeyword}" more naturally throughout your content. Aim for 0.5-2.5% density.`,
          action: `Add ${Math.ceil((idealMin * wordCount) / 100) - primaryCount} more mentions`,
        });
      } else {
        keywordScore = Math.max(30, 100 - (keywordDensity - idealMax) * 20);
        keywordDetail = `Too many: "${primaryKeyword}" appears ${primaryCount}x (${keywordDensity.toFixed(1)}%)`;
        recommendations.push({
          id: "keyword-high",
          priority: "medium",
          title: "Reduce keyword stuffing",
          description: `"${primaryKeyword}" appears too often. Consider using synonyms or related terms.`,
        });
      }
    } else {
      keywordScore = 50;
      keywordDetail = "No primary keyword set";
      recommendations.push({
        id: "keyword-missing",
        priority: "high",
        title: "Add a primary keyword",
        description: "Set a primary keyword to optimize your content for search engines.",
      });
    }

    // 2. Content Length Score (20% weight)
    let lengthScore = 0;
    let lengthDetail = "";
    const lengthRatio = wordCount / targetWordCount;

    if (lengthRatio >= 0.9 && lengthRatio <= 1.3) {
      lengthScore = 100;
      lengthDetail = `Great length: ${wordCount} words`;
    } else if (lengthRatio >= 0.7 && lengthRatio < 0.9) {
      lengthScore = 70;
      lengthDetail = `A bit short: ${wordCount}/${targetWordCount} words`;
      recommendations.push({
        id: "length-short",
        priority: "medium",
        title: "Add more content",
        description: `Your content is ${targetWordCount - wordCount} words below target. Consider expanding sections.`,
      });
    } else if (lengthRatio > 1.3) {
      lengthScore = 80;
      lengthDetail = `Long content: ${wordCount} words (target: ${targetWordCount})`;
    } else {
      lengthScore = Math.max(20, lengthRatio * 70);
      lengthDetail = `Too short: ${wordCount}/${targetWordCount} words`;
      recommendations.push({
        id: "length-very-short",
        priority: "high",
        title: "Content too short",
        description: `Add ${targetWordCount - wordCount} more words for better search ranking.`,
      });
    }

    // 3. Readability Score (20% weight)
    const fleschScore = calculateReadability(plainText);
    let readabilityScore = fleschScore;
    let readabilityDetail = "";

    if (fleschScore >= 60) {
      readabilityDetail = "Easy to read";
    } else if (fleschScore >= 40) {
      readabilityDetail = "Moderately readable";
      recommendations.push({
        id: "readability",
        priority: "low",
        title: "Simplify your writing",
        description: "Use shorter sentences and simpler words to improve readability.",
      });
    } else {
      readabilityDetail = "Difficult to read";
      recommendations.push({
        id: "readability-hard",
        priority: "medium",
        title: "Content is hard to read",
        description: "Break up long sentences and use simpler vocabulary.",
      });
    }

    // 4. Heading Structure Score (15% weight)
    let headingScore = 0;
    let headingDetail = "";
    const h1Count = (content.match(/<h1[^>]*>/gi) || []).length;
    const h2Count = (content.match(/<h2[^>]*>/gi) || []).length;
    const h3Count = (content.match(/<h3[^>]*>/gi) || []).length;

    if (h1Count === 1 && h2Count >= 2) {
      headingScore = 100;
      headingDetail = `Good structure: 1 H1, ${h2Count} H2s, ${h3Count} H3s`;
    } else if (h1Count === 0) {
      headingScore = 30;
      headingDetail = "Missing H1 heading";
      recommendations.push({
        id: "h1-missing",
        priority: "high",
        title: "Add an H1 heading",
        description: "Every page needs exactly one H1 heading with your primary keyword.",
      });
    } else if (h1Count > 1) {
      headingScore = 50;
      headingDetail = `Too many H1s: ${h1Count}`;
      recommendations.push({
        id: "h1-multiple",
        priority: "medium",
        title: "Use only one H1",
        description: "Convert extra H1s to H2s. Only one H1 per page is recommended.",
      });
    } else if (h2Count < 2) {
      headingScore = 60;
      headingDetail = `Add more sections: only ${h2Count} H2s`;
      recommendations.push({
        id: "h2-few",
        priority: "low",
        title: "Add more section headings",
        description: "Break content into more sections with H2 headings for better structure.",
      });
    } else {
      headingScore = 80;
      headingDetail = `${h1Count} H1, ${h2Count} H2s, ${h3Count} H3s`;
    }

    // 5. Image Optimization Score (10% weight)
    let imageScore = 0;
    let imageDetail = "";
    const images = content.match(/<img[^>]*>/gi) || [];
    const imagesWithAlt = content.match(/<img[^>]*alt=["'][^"']+["'][^>]*>/gi) || [];

    if (images.length === 0) {
      imageScore = 40;
      imageDetail = "No images found";
      recommendations.push({
        id: "images-none",
        priority: "medium",
        title: "Add images",
        description: "Include relevant images to improve engagement and SEO.",
      });
    } else if (imagesWithAlt.length === images.length) {
      imageScore = 100;
      imageDetail = `${images.length} images with alt text`;
    } else {
      imageScore = (imagesWithAlt.length / images.length) * 100;
      imageDetail = `${imagesWithAlt.length}/${images.length} images have alt text`;
      recommendations.push({
        id: "images-alt",
        priority: "medium",
        title: "Add missing alt text",
        description: `${images.length - imagesWithAlt.length} images are missing alt text.`,
      });
    }

    // 6. Internal Links Score (10% weight)
    let linkScore = 0;
    let linkDetail = "";
    const internalLinks = content.match(/<a[^>]*href=["'](?!https?:\/\/)[^"']*["'][^>]*>/gi) || [];
    const externalLinks = content.match(/<a[^>]*href=["']https?:\/\/[^"']*["'][^>]*>/gi) || [];

    if (internalLinks.length >= 2) {
      linkScore = 100;
      linkDetail = `${internalLinks.length} internal, ${externalLinks.length} external links`;
    } else if (internalLinks.length === 1) {
      linkScore = 70;
      linkDetail = "Only 1 internal link";
      recommendations.push({
        id: "links-few",
        priority: "low",
        title: "Add more internal links",
        description: "Link to other relevant pages on your site to improve SEO.",
      });
    } else {
      linkScore = 40;
      linkDetail = "No internal links";
      recommendations.push({
        id: "links-none",
        priority: "medium",
        title: "Add internal links",
        description: "Include 2-3 links to other pages on your website.",
      });
    }

    // Calculate overall score (weighted average)
    const overallScore = Math.round(
      keywordScore * 0.25 +
        lengthScore * 0.2 +
        readabilityScore * 0.2 +
        headingScore * 0.15 +
        imageScore * 0.1 +
        linkScore * 0.1
    );

    return {
      overall: overallScore,
      letterGrade: getLetterGrade(overallScore),
      metrics: {
        keywordUsage: {
          score: Math.round(keywordScore),
          label: "Keyword Usage",
          status: getStatus(keywordScore),
          detail: keywordDetail,
        },
        contentLength: {
          score: Math.round(lengthScore),
          label: "Content Length",
          status: getStatus(lengthScore),
          detail: lengthDetail,
        },
        readability: {
          score: Math.round(readabilityScore),
          label: "Readability",
          status: getStatus(readabilityScore),
          detail: readabilityDetail,
        },
        headingStructure: {
          score: Math.round(headingScore),
          label: "Heading Structure",
          status: getStatus(headingScore),
          detail: headingDetail,
        },
        imageOptimization: {
          score: Math.round(imageScore),
          label: "Image Optimization",
          status: getStatus(imageScore),
          detail: imageDetail,
        },
        internalLinks: {
          score: Math.round(linkScore),
          label: "Internal Links",
          status: getStatus(linkScore),
          detail: linkDetail,
        },
      },
      recommendations: recommendations.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }),
    };
  }, [content, primaryKeyword, secondaryKeywords, targetWordCount]);

  return useMemo(() => calculateScore(), [calculateScore]);
}
