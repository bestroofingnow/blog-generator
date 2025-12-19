// lib/seo-scorer.ts
// Server-side SEO scoring for the orchestrator (90+ score required)

export interface SEOScoreResult {
  overall: number;
  letterGrade: string;
  metrics: {
    keywordUsage: { score: number; detail: string };
    contentLength: { score: number; detail: string };
    readability: { score: number; detail: string };
    headingStructure: { score: number; detail: string };
    imageOptimization: { score: number; detail: string };
  };
  improvements: string[];
  passed: boolean;
}

interface ScoreParams {
  content: string;
  primaryKeyword: string;
  secondaryKeywords?: string[];
  targetWordCount?: number;
  metaTitle?: string;
  metaDescription?: string;
}

// Strip HTML tags for text analysis
function stripHtml(html: string): string {
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

// Count occurrences of a keyword (case-insensitive)
function countKeyword(text: string, keyword: string): number {
  if (!keyword) return 0;
  const regex = new RegExp(
    `\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
    "gi"
  );
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
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 85) return "A-";
  if (score >= 80) return "B+";
  if (score >= 75) return "B";
  if (score >= 70) return "B-";
  if (score >= 65) return "C+";
  if (score >= 60) return "C";
  if (score >= 55) return "C-";
  if (score >= 50) return "D+";
  if (score >= 45) return "D";
  return "F";
}

/**
 * Score content for SEO quality (90+ required to pass)
 */
export function scoreContent({
  content,
  primaryKeyword,
  secondaryKeywords = [],
  targetWordCount = 1800,
  metaTitle = "",
  metaDescription = "",
}: ScoreParams): SEOScoreResult {
  const plainText = stripHtml(content);
  const wordCount = plainText.split(/\s+/).filter((w) => w.length > 0).length;
  const improvements: string[] = [];

  // 1. Keyword Usage Score (30% weight)
  let keywordScore = 0;
  let keywordDetail = "";
  const primaryCount = countKeyword(plainText, primaryKeyword);

  if (primaryKeyword) {
    const keywordDensity = wordCount > 0 ? (primaryCount / wordCount) * 100 : 0;
    const idealMin = 0.8;
    const idealMax = 2.0;

    // Also check keyword in title/heading
    const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
    const h1Text = h1Match ? stripHtml(h1Match[1]) : "";
    const keywordInH1 = h1Text.toLowerCase().includes(primaryKeyword.toLowerCase());
    const keywordInMeta = metaTitle.toLowerCase().includes(primaryKeyword.toLowerCase());

    if (keywordDensity >= idealMin && keywordDensity <= idealMax && keywordInH1) {
      keywordScore = 100;
      keywordDetail = `Perfect! "${primaryKeyword}" ${primaryCount}x (${keywordDensity.toFixed(1)}%), in H1`;
    } else if (keywordDensity >= idealMin && keywordDensity <= idealMax) {
      keywordScore = 85;
      keywordDetail = `Good density but missing from H1`;
      if (!keywordInH1) {
        improvements.push(`Add "${primaryKeyword}" to the main H1 heading`);
      }
    } else if (keywordDensity < idealMin) {
      keywordScore = Math.max(40, 100 - (idealMin - keywordDensity) * 60);
      keywordDetail = `Low density: ${primaryCount}x (${keywordDensity.toFixed(1)}%)`;
      improvements.push(
        `Increase "${primaryKeyword}" usage from ${primaryCount} to ${Math.ceil((idealMin * wordCount) / 100)} mentions`
      );
    } else {
      keywordScore = Math.max(50, 100 - (keywordDensity - idealMax) * 25);
      keywordDetail = `High density: ${primaryCount}x (${keywordDensity.toFixed(1)}%)`;
      improvements.push(`Reduce "${primaryKeyword}" density - use synonyms or related terms`);
    }

    // Check secondary keywords
    const secondaryFound = secondaryKeywords.filter(
      (kw) => countKeyword(plainText, kw) >= 1
    ).length;
    if (secondaryKeywords.length > 0 && secondaryFound < secondaryKeywords.length * 0.5) {
      keywordScore = Math.max(keywordScore - 10, 40);
      improvements.push(
        `Add more secondary keywords: ${secondaryKeywords
          .filter((kw) => countKeyword(plainText, kw) === 0)
          .slice(0, 3)
          .join(", ")}`
      );
    }
  } else {
    keywordScore = 30;
    keywordDetail = "No primary keyword set";
    improvements.push("Set a primary keyword for SEO optimization");
  }

  // 2. Content Length Score (25% weight)
  let lengthScore = 0;
  let lengthDetail = "";
  const lengthRatio = wordCount / targetWordCount;

  if (lengthRatio >= 0.95 && lengthRatio <= 1.4) {
    lengthScore = 100;
    lengthDetail = `Excellent: ${wordCount} words`;
  } else if (lengthRatio >= 0.85 && lengthRatio < 0.95) {
    lengthScore = 85;
    lengthDetail = `Good: ${wordCount}/${targetWordCount} words`;
    improvements.push(`Add ${Math.ceil(targetWordCount * 0.95 - wordCount)} more words to reach optimal length`);
  } else if (lengthRatio >= 0.7 && lengthRatio < 0.85) {
    lengthScore = 65;
    lengthDetail = `Short: ${wordCount}/${targetWordCount} words`;
    improvements.push(`Content is too short - add ${targetWordCount - wordCount} more words`);
  } else if (lengthRatio > 1.4) {
    lengthScore = 90;
    lengthDetail = `Long: ${wordCount} words`;
  } else {
    lengthScore = Math.max(30, lengthRatio * 65);
    lengthDetail = `Very short: ${wordCount} words`;
    improvements.push(`Content is significantly too short - target ${targetWordCount} words minimum`);
  }

  // 3. Readability Score (20% weight)
  const fleschScore = calculateReadability(plainText);
  let readabilityScore = fleschScore;
  let readabilityDetail = "";

  if (fleschScore >= 60) {
    readabilityDetail = `Easy to read (${fleschScore.toFixed(0)})`;
    readabilityScore = 100;
  } else if (fleschScore >= 50) {
    readabilityDetail = `Fairly easy (${fleschScore.toFixed(0)})`;
    readabilityScore = 85;
  } else if (fleschScore >= 40) {
    readabilityDetail = `Moderate (${fleschScore.toFixed(0)})`;
    readabilityScore = 70;
    improvements.push("Use shorter sentences and simpler words to improve readability");
  } else {
    readabilityDetail = `Difficult (${fleschScore.toFixed(0)})`;
    readabilityScore = 50;
    improvements.push("Content is hard to read - simplify vocabulary and break up long sentences");
  }

  // 4. Heading Structure Score (15% weight)
  let headingScore = 0;
  let headingDetail = "";
  const h1Count = (content.match(/<h1[^>]*>/gi) || []).length;
  const h2Count = (content.match(/<h2[^>]*>/gi) || []).length;
  const h3Count = (content.match(/<h3[^>]*>/gi) || []).length;

  if (h1Count === 1 && h2Count >= 3 && h2Count <= 8) {
    headingScore = 100;
    headingDetail = `Perfect: 1 H1, ${h2Count} H2s, ${h3Count} H3s`;
  } else if (h1Count === 1 && h2Count >= 2) {
    headingScore = 90;
    headingDetail = `Good: 1 H1, ${h2Count} H2s`;
  } else if (h1Count === 0) {
    headingScore = 40;
    headingDetail = "Missing H1 heading";
    improvements.push("Add an H1 heading at the start with your primary keyword");
  } else if (h1Count > 1) {
    headingScore = 60;
    headingDetail = `Multiple H1s: ${h1Count}`;
    improvements.push("Use only ONE H1 heading - convert extras to H2s");
  } else if (h2Count < 2) {
    headingScore = 70;
    headingDetail = `Need more H2s: only ${h2Count}`;
    improvements.push("Add more H2 section headings to break up content");
  } else {
    headingScore = 80;
    headingDetail = `${h1Count} H1, ${h2Count} H2s`;
  }

  // 5. Image Optimization Score (10% weight)
  let imageScore = 0;
  let imageDetail = "";
  const images = content.match(/<img[^>]*>/gi) || [];
  const imagesWithAlt = content.match(/<img[^>]*alt=["'][^"']+["'][^>]*>/gi) || [];
  const imagesWithKeywordAlt = primaryKeyword
    ? images.filter((img) =>
        img.toLowerCase().includes(primaryKeyword.toLowerCase())
      )
    : [];

  if (images.length === 0) {
    imageScore = 50;
    imageDetail = "No images found";
    improvements.push("Add at least 2-3 images with keyword-rich alt text");
  } else if (images.length >= 2 && imagesWithAlt.length === images.length) {
    imageScore = imagesWithKeywordAlt.length > 0 ? 100 : 85;
    imageDetail = `${images.length} images with alt text`;
    if (imagesWithKeywordAlt.length === 0) {
      improvements.push(`Add primary keyword "${primaryKeyword}" to at least one image alt text`);
    }
  } else if (imagesWithAlt.length < images.length) {
    imageScore = Math.max(50, (imagesWithAlt.length / images.length) * 85);
    imageDetail = `${imagesWithAlt.length}/${images.length} have alt text`;
    improvements.push(`Add alt text to ${images.length - imagesWithAlt.length} images`);
  } else {
    imageScore = 70;
    imageDetail = `Only ${images.length} image`;
    improvements.push("Add more images to improve engagement");
  }

  // Calculate overall score (weighted average)
  const overallScore = Math.round(
    keywordScore * 0.30 +
    lengthScore * 0.25 +
    readabilityScore * 0.20 +
    headingScore * 0.15 +
    imageScore * 0.10
  );

  return {
    overall: overallScore,
    letterGrade: getLetterGrade(overallScore),
    metrics: {
      keywordUsage: { score: Math.round(keywordScore), detail: keywordDetail },
      contentLength: { score: Math.round(lengthScore), detail: lengthDetail },
      readability: { score: Math.round(readabilityScore), detail: readabilityDetail },
      headingStructure: { score: Math.round(headingScore), detail: headingDetail },
      imageOptimization: { score: Math.round(imageScore), detail: imageDetail },
    },
    improvements,
    passed: overallScore >= 90,
  };
}

/**
 * Generate a rewrite prompt based on SEO score results
 */
export function generateRewritePrompt(
  originalContent: string,
  scoreResult: SEOScoreResult,
  primaryKeyword: string,
  targetWordCount: number
): string {
  const improvementsList = scoreResult.improvements
    .map((imp, i) => `${i + 1}. ${imp}`)
    .join("\n");

  return `You are an expert SEO content optimizer. The current content scored ${scoreResult.overall}/100 but needs to score 90+ to pass.

CURRENT SEO SCORES:
- Keyword Usage: ${scoreResult.metrics.keywordUsage.score}/100 - ${scoreResult.metrics.keywordUsage.detail}
- Content Length: ${scoreResult.metrics.contentLength.score}/100 - ${scoreResult.metrics.contentLength.detail}
- Readability: ${scoreResult.metrics.readability.score}/100 - ${scoreResult.metrics.readability.detail}
- Heading Structure: ${scoreResult.metrics.headingStructure.score}/100 - ${scoreResult.metrics.headingStructure.detail}
- Image Optimization: ${scoreResult.metrics.imageOptimization.score}/100 - ${scoreResult.metrics.imageOptimization.detail}

REQUIRED IMPROVEMENTS TO REACH 90+:
${improvementsList}

PRIMARY KEYWORD: "${primaryKeyword}"
TARGET WORD COUNT: ${targetWordCount}+ words

REWRITE INSTRUCTIONS:
1. Keep the same overall structure and topic
2. Address EVERY improvement listed above
3. Ensure primary keyword appears naturally 0.8-2.0% density
4. Use exactly ONE H1 heading at the start containing the primary keyword
5. Include 3-6 H2 subheadings for clear structure
6. Write at a 6th-8th grade reading level (short sentences, simple words)
7. Ensure all image placeholders have descriptive alt text with keywords
8. Maintain the professional yet engaging tone

OUTPUT: Return ONLY the improved HTML content. No explanations.

CURRENT CONTENT TO IMPROVE:
${originalContent}`;
}
