// lib/geo-grid/rank-extractor.ts
// Extract rank position for target domain from SERP results

import type { GeoSerpResponse, OrganicResult, LocalPackResult } from "./serp-client";

export interface RankExtractionResult {
  // Organic ranking
  organicRank: number | null; // null if not found
  organicUrl: string | null;
  organicTitle: string | null;
  organicSnippet: string | null;

  // Local pack ranking
  localPackRank: number | null;
  isInLocalPack: boolean;

  // Top competitors
  topCompetitors: CompetitorResult[];

  // SERP features present
  serpFeatures: string[];
}

export interface CompetitorResult {
  domain: string;
  position: number;
  title: string;
  url: string;
}

/**
 * Normalize a domain for comparison
 * Handles www, https, trailing slashes, etc.
 */
export function normalizeDomain(domain: string): string {
  if (!domain) return "";

  let normalized = domain.toLowerCase().trim();

  // Remove protocol
  normalized = normalized.replace(/^https?:\/\//, "");

  // Remove www.
  normalized = normalized.replace(/^www\./, "");

  // Remove trailing slash
  normalized = normalized.replace(/\/$/, "");

  // Remove port numbers
  normalized = normalized.replace(/:\d+$/, "");

  return normalized;
}

/**
 * Extract domain from a full URL
 */
export function extractDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return normalizeDomain(urlObj.hostname);
  } catch {
    // Fallback regex extraction
    const match = url.match(/^https?:\/\/(?:www\.)?([^\/]+)/i);
    return match ? normalizeDomain(match[1]) : normalizeDomain(url);
  }
}

/**
 * Check if a URL matches the target domain
 */
export function domainMatches(url: string, targetDomain: string): boolean {
  const urlDomain = extractDomainFromUrl(url);
  const normalizedTarget = normalizeDomain(targetDomain);

  // Exact match
  if (urlDomain === normalizedTarget) {
    return true;
  }

  // Check if it's a subdomain of the target
  // e.g., blog.example.com matches example.com
  if (urlDomain.endsWith(`.${normalizedTarget}`)) {
    return true;
  }

  return false;
}

/**
 * Extract rank for target domain from SERP results
 */
export function extractRank(
  serpResponse: GeoSerpResponse,
  targetDomain: string
): RankExtractionResult {
  const result: RankExtractionResult = {
    organicRank: null,
    organicUrl: null,
    organicTitle: null,
    organicSnippet: null,
    localPackRank: null,
    isInLocalPack: false,
    topCompetitors: [],
    serpFeatures: serpResponse.serpFeatures || []
  };

  const normalizedTarget = normalizeDomain(targetDomain);

  // Find organic rank
  for (const item of serpResponse.organic) {
    if (domainMatches(item.url, normalizedTarget)) {
      result.organicRank = item.position;
      result.organicUrl = item.url;
      result.organicTitle = item.title;
      result.organicSnippet = item.snippet;
      break; // Take first match (highest rank)
    }
  }

  // Find local pack rank
  for (const item of serpResponse.localPack) {
    // Check if website matches or if title contains the domain
    const matchesWebsite = item.website && domainMatches(item.website, normalizedTarget);
    const titleContainsDomain = item.title.toLowerCase().includes(normalizedTarget);

    if (matchesWebsite || titleContainsDomain) {
      result.localPackRank = item.position;
      result.isInLocalPack = true;
      break;
    }
  }

  // Extract top 3 competitors (excluding target domain)
  const competitors: CompetitorResult[] = [];
  for (const item of serpResponse.organic) {
    if (!domainMatches(item.url, normalizedTarget) && competitors.length < 3) {
      competitors.push({
        domain: extractDomainFromUrl(item.url),
        position: item.position,
        title: item.title,
        url: item.url
      });
    }
  }
  result.topCompetitors = competitors;

  return result;
}

/**
 * Calculate visibility score for a single point
 * Higher rank = higher score
 * Score = 101 - rank (so rank 1 = 100, rank 100 = 1)
 * Not found = 0
 */
export function calculatePointVisibilityScore(rank: number | null): number {
  if (rank === null || rank <= 0 || rank > 100) {
    return 0;
  }
  return 101 - rank;
}

/**
 * Get rank tier/category for color coding
 */
export type RankTier = "excellent" | "good" | "moderate" | "poor" | "bad" | "not_found";

export function getRankTier(rank: number | null): RankTier {
  if (rank === null) return "not_found";
  if (rank <= 3) return "excellent";
  if (rank <= 10) return "good";
  if (rank <= 20) return "moderate";
  if (rank <= 50) return "poor";
  return "bad";
}

/**
 * Get color for rank tier (for visualization)
 */
export function getRankColor(rank: number | null): string {
  const tier = getRankTier(rank);
  const colors: Record<RankTier, string> = {
    excellent: "#22c55e", // Green
    good: "#84cc16", // Light green
    moderate: "#eab308", // Yellow
    poor: "#f97316", // Orange
    bad: "#ef4444", // Red
    not_found: "#6b7280" // Gray
  };
  return colors[tier];
}

/**
 * Aggregate stats for a grid scan
 */
export interface GridAggregateStats {
  avgRank: number | null;
  bestRank: number | null;
  worstRank: number | null;
  pointsRanking: number;
  pointsTop3: number;
  pointsTop10: number;
  pointsTop20: number;
  pointsNotFound: number;
  totalPoints: number;
  pointsInLocalPack: number;
  avgLocalPackPosition: number | null;
  visibilityScore: number;
}

/**
 * Calculate aggregate stats from multiple rank extraction results
 */
export function calculateAggregateStats(
  results: RankExtractionResult[],
  totalPoints: number
): GridAggregateStats {
  const ranks: number[] = [];
  let pointsTop3 = 0;
  let pointsTop10 = 0;
  let pointsTop20 = 0;
  let pointsInLocalPack = 0;
  const localPackPositions: number[] = [];
  let visibilitySum = 0;

  for (const result of results) {
    if (result.organicRank !== null) {
      ranks.push(result.organicRank);
      visibilitySum += calculatePointVisibilityScore(result.organicRank);

      if (result.organicRank <= 3) pointsTop3++;
      if (result.organicRank <= 10) pointsTop10++;
      if (result.organicRank <= 20) pointsTop20++;
    }

    if (result.isInLocalPack) {
      pointsInLocalPack++;
      if (result.localPackRank !== null) {
        localPackPositions.push(result.localPackRank);
      }
    }
  }

  const pointsRanking = ranks.length;
  const pointsNotFound = totalPoints - pointsRanking;

  // Calculate averages
  const avgRank = pointsRanking > 0
    ? ranks.reduce((a, b) => a + b, 0) / pointsRanking
    : null;

  const bestRank = pointsRanking > 0 ? Math.min(...ranks) : null;
  const worstRank = pointsRanking > 0 ? Math.max(...ranks) : null;

  const avgLocalPackPosition = localPackPositions.length > 0
    ? localPackPositions.reduce((a, b) => a + b, 0) / localPackPositions.length
    : null;

  // Normalize visibility score to 0-100
  // Max possible = totalPoints * 100 (if all rank #1)
  const maxPossibleVisibility = totalPoints * 100;
  const visibilityScore = maxPossibleVisibility > 0
    ? (visibilitySum / maxPossibleVisibility) * 100
    : 0;

  return {
    avgRank: avgRank !== null ? Number(avgRank.toFixed(2)) : null,
    bestRank,
    worstRank,
    pointsRanking,
    pointsTop3,
    pointsTop10,
    pointsTop20,
    pointsNotFound,
    totalPoints,
    pointsInLocalPack,
    avgLocalPackPosition: avgLocalPackPosition !== null
      ? Number(avgLocalPackPosition.toFixed(2))
      : null,
    visibilityScore: Number(visibilityScore.toFixed(2))
  };
}
