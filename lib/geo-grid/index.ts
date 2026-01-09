// lib/geo-grid/index.ts
// Geo-Grid Rank Tracker library exports

// Grid generation
export {
  generateGridPoints,
  calculateDistance,
  getGridPointCount,
  getGridCenter,
  isGridCenter,
  getAvailableGridSizes,
  getAvailableRadii,
  validateGridConfig,
  getISOWeek
} from "./grid-generator";

export type {
  GridPoint,
  GridGenerationParams,
  GridConfig
} from "./grid-generator";

// SERP client
export {
  generateUULE,
  buildGeoSearchUrl,
  fetchGeoTargetedSerp,
  fetchStructuredSerp,
  parseGeoSerpHtml
} from "./serp-client";

export type {
  GeoSerpRequest,
  GeoSerpResponse,
  OrganicResult,
  LocalPackResult
} from "./serp-client";

// Rank extraction
export {
  normalizeDomain,
  extractDomainFromUrl,
  domainMatches,
  extractRank,
  calculatePointVisibilityScore,
  getRankTier,
  getRankColor,
  calculateAggregateStats
} from "./rank-extractor";

export type {
  RankExtractionResult,
  CompetitorResult,
  RankTier,
  GridAggregateStats
} from "./rank-extractor";

// Rate limiting
export {
  RateLimiter,
  BatchExecutor,
  createRateLimiter,
  delay,
  DEFAULT_RATE_LIMITER_CONFIG
} from "./rate-limiter";

export type {
  RateLimiterConfig,
  BatchProgressCallback
} from "./rate-limiter";
