// lib/seo-analyzer/readability.ts
// Readability analysis - Flesch-Kincaid, sentence length, passive voice

import type { SEOCheckItem } from "./index";

export interface ReadabilityResult {
  fleschKincaid: number;
  fleschReadingEase: number;
  gradeLevel: string;
  avgSentenceLength: number;
  avgWordLength: number;
  sentenceCount: number;
  wordCount: number;
  paragraphCount: number;
  passiveVoiceCount: number;
  longSentences: number;
  checks: SEOCheckItem[];
}

/**
 * Count syllables in a word (English approximation)
 */
function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;

  // Remove silent e
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  word = word.replace(/^y/, "");

  // Count vowel groups
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

/**
 * Split text into sentences
 */
function splitIntoSentences(text: string): string[] {
  // Handle abbreviations and edge cases
  const sentences = text
    .replace(/([.?!])\s+(?=[A-Z])/g, "$1|")
    .replace(/([.?!])$/g, "$1|")
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return sentences;
}

/**
 * Split text into words
 */
function splitIntoWords(text: string): string[] {
  return text
    .replace(/[^\w\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

/**
 * Detect passive voice patterns
 */
function countPassiveVoice(text: string): number {
  // Common passive voice patterns: "is/was/were/been/being + past participle"
  const passivePatterns = [
    /\b(is|are|was|were|been|being|be)\s+(\w+ed)\b/gi,
    /\b(is|are|was|were|been|being|be)\s+(\w+en)\b/gi,
    /\b(has|have|had)\s+been\s+(\w+ed)\b/gi,
    /\b(has|have|had)\s+been\s+(\w+en)\b/gi,
    /\b(will|shall|would|should|could|might)\s+be\s+(\w+ed)\b/gi,
    /\b(will|shall|would|should|could|might)\s+be\s+(\w+en)\b/gi,
  ];

  let count = 0;
  for (const pattern of passivePatterns) {
    const matches = text.match(pattern);
    if (matches) count += matches.length;
  }

  return count;
}

/**
 * Calculate Flesch Reading Ease Score
 * Higher = easier to read (0-100 scale, 60-70 is ideal)
 */
function calculateFleschReadingEase(
  totalWords: number,
  totalSentences: number,
  totalSyllables: number
): number {
  if (totalWords === 0 || totalSentences === 0) return 0;

  const avgSentenceLength = totalWords / totalSentences;
  const avgSyllablesPerWord = totalSyllables / totalWords;

  const score =
    206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Calculate Flesch-Kincaid Grade Level
 * Returns US grade level (e.g., 8 = 8th grade)
 */
function calculateFleschKincaid(
  totalWords: number,
  totalSentences: number,
  totalSyllables: number
): number {
  if (totalWords === 0 || totalSentences === 0) return 0;

  const avgSentenceLength = totalWords / totalSentences;
  const avgSyllablesPerWord = totalSyllables / totalWords;

  const grade =
    0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59;

  return Math.max(0, Math.round(grade * 10) / 10);
}

/**
 * Get readable grade level description
 */
function getGradeDescription(grade: number): string {
  if (grade <= 5) return "Elementary School (5th grade or below)";
  if (grade <= 6) return "6th Grade";
  if (grade <= 7) return "7th Grade";
  if (grade <= 8) return "8th Grade";
  if (grade <= 9) return "9th Grade (Freshman)";
  if (grade <= 10) return "10th Grade (Sophomore)";
  if (grade <= 11) return "11th Grade (Junior)";
  if (grade <= 12) return "12th Grade (Senior)";
  if (grade <= 14) return "College Level";
  return "Graduate Level";
}

/**
 * Analyze readability of text
 */
export function analyzeReadability(text: string): ReadabilityResult {
  const checks: SEOCheckItem[] = [];

  // Parse text
  const sentences = splitIntoSentences(text);
  const words = splitIntoWords(text);
  const paragraphs = text
    .split(/\n\n+/)
    .filter((p) => p.trim().length > 0);

  const sentenceCount = sentences.length;
  const wordCount = words.length;
  const paragraphCount = paragraphs.length;

  // Count syllables
  let totalSyllables = 0;
  for (const word of words) {
    totalSyllables += countSyllables(word);
  }

  // Calculate metrics
  const fleschReadingEase = calculateFleschReadingEase(
    wordCount,
    sentenceCount,
    totalSyllables
  );
  const fleschKincaid = calculateFleschKincaid(
    wordCount,
    sentenceCount,
    totalSyllables
  );
  const avgSentenceLength =
    sentenceCount > 0 ? Math.round((wordCount / sentenceCount) * 10) / 10 : 0;
  const avgWordLength =
    wordCount > 0
      ? Math.round((text.replace(/\s/g, "").length / wordCount) * 10) / 10
      : 0;

  // Count passive voice
  const passiveVoiceCount = countPassiveVoice(text);

  // Count long sentences (>20 words)
  let longSentences = 0;
  for (const sentence of sentences) {
    const sentenceWords = splitIntoWords(sentence);
    if (sentenceWords.length > 20) longSentences++;
  }

  // 1. Flesch Reading Ease Check
  let readingEaseStatus: SEOCheckItem["status"] = "pass";
  let readingEaseScore = 15;
  let readingEaseSuggestion: string | undefined;

  if (fleschReadingEase < 30) {
    readingEaseStatus = "fail";
    readingEaseScore = 5;
    readingEaseSuggestion =
      "Content is very difficult to read. Use shorter sentences and simpler words.";
  } else if (fleschReadingEase < 50) {
    readingEaseStatus = "warning";
    readingEaseScore = 10;
    readingEaseSuggestion =
      "Content is fairly difficult. Consider simplifying for broader audience.";
  } else if (fleschReadingEase > 70) {
    // Very easy is still good
    readingEaseScore = 15;
  }

  checks.push({
    id: "flesch-reading-ease",
    category: "readability",
    title: "Flesch Reading Ease",
    description: `Score: ${fleschReadingEase}/100 (${fleschReadingEase >= 60 ? "Easy" : fleschReadingEase >= 30 ? "Moderate" : "Difficult"})`,
    status: readingEaseStatus,
    priority: "high",
    score: readingEaseScore,
    maxScore: 15,
    suggestion: readingEaseSuggestion,
  });

  // 2. Grade Level Check (aim for 8th grade for web content)
  let gradeLevelStatus: SEOCheckItem["status"] = "pass";
  let gradeLevelScore = 15;
  let gradeLevelSuggestion: string | undefined;

  if (fleschKincaid > 12) {
    gradeLevelStatus = "warning";
    gradeLevelScore = 8;
    gradeLevelSuggestion =
      "Content requires college-level reading. Simplify for wider audience.";
  } else if (fleschKincaid > 10) {
    gradeLevelStatus = "warning";
    gradeLevelScore = 12;
    gradeLevelSuggestion =
      "Consider simplifying for broader readership (aim for 8th grade level).";
  }

  checks.push({
    id: "grade-level",
    category: "readability",
    title: "Reading Grade Level",
    description: `${getGradeDescription(fleschKincaid)} (Grade ${fleschKincaid})`,
    status: gradeLevelStatus,
    priority: "medium",
    score: gradeLevelScore,
    maxScore: 15,
    suggestion: gradeLevelSuggestion,
  });

  // 3. Sentence Length Check
  let sentenceStatus: SEOCheckItem["status"] = "pass";
  let sentenceScore = 12;
  let sentenceSuggestion: string | undefined;

  if (avgSentenceLength > 25) {
    sentenceStatus = "warning";
    sentenceScore = 6;
    sentenceSuggestion = `Average sentence length is ${avgSentenceLength} words. Try to keep it under 20.`;
  } else if (avgSentenceLength > 20) {
    sentenceStatus = "warning";
    sentenceScore = 9;
    sentenceSuggestion = `Sentences are a bit long (${avgSentenceLength} words avg). Shorter is often better.`;
  }

  checks.push({
    id: "sentence-length",
    category: "readability",
    title: "Average Sentence Length",
    description: `${avgSentenceLength} words per sentence`,
    status: sentenceStatus,
    priority: "medium",
    score: sentenceScore,
    maxScore: 12,
    suggestion: sentenceSuggestion,
  });

  // 4. Long Sentences Check
  const longSentenceRatio =
    sentenceCount > 0 ? (longSentences / sentenceCount) * 100 : 0;
  let longSentenceStatus: SEOCheckItem["status"] = "pass";
  let longSentenceScore = 10;
  let longSentenceSuggestion: string | undefined;

  if (longSentenceRatio > 30) {
    longSentenceStatus = "warning";
    longSentenceScore = 5;
    longSentenceSuggestion = `${Math.round(longSentenceRatio)}% of sentences are over 20 words. Break some up.`;
  } else if (longSentenceRatio > 20) {
    longSentenceStatus = "warning";
    longSentenceScore = 7;
    longSentenceSuggestion = `Consider shortening some of your longer sentences.`;
  }

  checks.push({
    id: "long-sentences",
    category: "readability",
    title: "Long Sentences",
    description: `${longSentences} of ${sentenceCount} sentences are over 20 words`,
    status: longSentenceStatus,
    priority: "low",
    score: longSentenceScore,
    maxScore: 10,
    suggestion: longSentenceSuggestion,
  });

  // 5. Passive Voice Check
  const passiveRatio =
    sentenceCount > 0 ? (passiveVoiceCount / sentenceCount) * 100 : 0;
  let passiveStatus: SEOCheckItem["status"] = "pass";
  let passiveScore = 10;
  let passiveSuggestion: string | undefined;

  if (passiveRatio > 20) {
    passiveStatus = "warning";
    passiveScore = 5;
    passiveSuggestion =
      "Too much passive voice. Use active voice for more engaging content.";
  } else if (passiveRatio > 10) {
    passiveStatus = "warning";
    passiveScore = 7;
    passiveSuggestion = "Consider reducing passive voice usage.";
  }

  checks.push({
    id: "passive-voice",
    category: "readability",
    title: "Passive Voice",
    description: `${passiveVoiceCount} passive voice instance${passiveVoiceCount !== 1 ? "s" : ""} detected`,
    status: passiveStatus,
    priority: "low",
    score: passiveScore,
    maxScore: 10,
    suggestion: passiveSuggestion,
  });

  // 6. Paragraph Check
  let paragraphStatus: SEOCheckItem["status"] = "pass";
  let paragraphScore = 8;
  let paragraphSuggestion: string | undefined;

  if (paragraphCount < 3 && wordCount > 300) {
    paragraphStatus = "warning";
    paragraphScore = 4;
    paragraphSuggestion =
      "Add more paragraph breaks to improve readability.";
  }

  checks.push({
    id: "paragraphs",
    category: "readability",
    title: "Paragraph Structure",
    description: `Content has ${paragraphCount} paragraph${paragraphCount !== 1 ? "s" : ""}`,
    status: paragraphStatus,
    priority: "low",
    score: paragraphScore,
    maxScore: 8,
    suggestion: paragraphSuggestion,
  });

  return {
    fleschKincaid,
    fleschReadingEase,
    gradeLevel: getGradeDescription(fleschKincaid),
    avgSentenceLength,
    avgWordLength,
    sentenceCount,
    wordCount,
    paragraphCount,
    passiveVoiceCount,
    longSentences,
    checks,
  };
}
