// lib/geo-grid/serp-client.ts
// Bright Data SERP API client with geo-targeting support

export interface GeoSerpRequest {
  keyword: string;
  lat: number;
  lng: number;
  numResults?: number;
  device?: "desktop" | "mobile";
}

export interface OrganicResult {
  position: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
}

export interface LocalPackResult {
  position: number;
  title: string;
  address?: string;
  rating?: number;
  reviewCount?: number;
  phone?: string;
  website?: string;
  placeId?: string;
}

export interface GeoSerpResponse {
  organic: OrganicResult[];
  localPack: LocalPackResult[];
  serpFeatures: string[];
  totalResults?: number;
  searchTime?: number;
}

/**
 * Generate Google's UULE parameter for geo-targeting
 * UULE encodes a specific geographic location for personalized search results
 */
export function generateUULE(lat: number, lng: number): string {
  // Google uses a specific format for encoding location
  // Format: w+CAIQICI + base64(canonical location string)
  // For coordinates, we use the format: @lat,lng
  const locationStr = `a+cm,w+CAIQICI${encodeCoordinates(lat, lng)}`;
  return locationStr;
}

/**
 * Encode coordinates for UULE parameter
 */
function encodeCoordinates(lat: number, lng: number): string {
  // Create a canonical name from coordinates
  // This is a simplified version - Google's actual UULE uses canonical place names
  const coordString = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  const base64 = Buffer.from(coordString).toString("base64");
  // Add length prefix as per Google's format
  const length = String.fromCharCode(coordString.length + 32);
  return length + base64;
}

/**
 * Build Google search URL with geo-targeting parameters
 */
export function buildGeoSearchUrl(
  keyword: string,
  lat: number,
  lng: number,
  numResults: number = 20
): string {
  const params = new URLSearchParams({
    q: keyword,
    num: numResults.toString(),
    gl: "us", // Country (United States)
    hl: "en", // Language
    // Use near parameter for local searches
    near: `${lat},${lng}`,
  });

  // Add UULE for precise location targeting
  const uule = generateUULE(lat, lng);
  params.append("uule", uule);

  return `https://www.google.com/search?${params.toString()}`;
}

/**
 * Fetch geo-targeted SERP results using Bright Data
 */
export async function fetchGeoTargetedSerp({
  keyword,
  lat,
  lng,
  numResults = 20,
  device = "desktop"
}: GeoSerpRequest): Promise<GeoSerpResponse> {
  const apiKey = process.env.BRIGHT_DATA_API_TOKEN || process.env.SERP_API1;

  if (!apiKey) {
    throw new Error("Bright Data API key not configured (BRIGHT_DATA_API_TOKEN or SERP_API1)");
  }

  // Build the search URL with geo-targeting
  const searchUrl = buildGeoSearchUrl(keyword, lat, lng, numResults);

  try {
    const response = await fetch("https://api.brightdata.com/request", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        zone: "serp_api1",
        url: searchUrl,
        format: "raw",
        device_type: device
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SERP API error: ${response.status} - ${errorText}`);
    }

    const html = await response.text();
    return parseGeoSerpHtml(html);
  } catch (error) {
    console.error("SERP fetch error:", error);
    throw error;
  }
}

/**
 * Parse Google SERP HTML to extract results
 */
export function parseGeoSerpHtml(html: string): GeoSerpResponse {
  const organic: OrganicResult[] = [];
  const localPack: LocalPackResult[] = [];
  const serpFeatures: string[] = [];

  try {
    // Extract organic results
    // Look for search result containers
    const organicRegex = /<div class="[^"]*g[^"]*"[^>]*>[\s\S]*?<a href="(https?:\/\/[^"]+)"[^>]*>[\s\S]*?<h3[^>]*>([^<]+)<\/h3>[\s\S]*?<\/div>/gi;
    let match;
    let position = 1;

    // Simpler regex for organic results
    const titleUrlRegex = /<a[^>]*href="(https?:\/\/(?!webcache)[^"]+)"[^>]*>[\s\S]*?<h3[^>]*class="[^"]*"[^>]*>([^<]+)<\/h3>/gi;

    while ((match = titleUrlRegex.exec(html)) !== null && position <= 20) {
      const url = match[1];
      const title = decodeHtmlEntities(match[2]);

      // Skip Google's own links, ads, and cached results
      if (url.includes("google.com") || url.includes("webcache") || url.includes("/aclk")) {
        continue;
      }

      const domain = extractDomain(url);

      // Try to find snippet for this result
      const snippetMatch = html.substring(match.index, match.index + 2000)
        .match(/<span[^>]*class="[^"]*aCOpRe[^"]*"[^>]*>([^<]+)<\/span>|<div[^>]*class="[^"]*VwiC3b[^"]*"[^>]*>([^<]+)/i);

      const snippet = snippetMatch
        ? decodeHtmlEntities(snippetMatch[1] || snippetMatch[2] || "")
        : "";

      organic.push({
        position,
        title,
        url,
        domain,
        snippet
      });

      position++;
    }

    // Check for local pack (Maps results)
    if (html.includes("data-local-pack") || html.includes("local-pack") || html.includes("/maps/")) {
      serpFeatures.push("local_pack");

      // Try to extract local pack results
      const localPackRegex = /<div[^>]*class="[^"]*VkpGBb[^"]*"[^>]*>[\s\S]*?<span[^>]*class="[^"]*OSrXXb[^"]*"[^>]*>([^<]+)/gi;
      let localPosition = 1;

      while ((match = localPackRegex.exec(html)) !== null && localPosition <= 3) {
        localPack.push({
          position: localPosition,
          title: decodeHtmlEntities(match[1])
        });
        localPosition++;
      }
    }

    // Check for other SERP features
    if (html.includes("featured-snippet") || html.includes("data-attrid=\"wa:/description\"")) {
      serpFeatures.push("featured_snippet");
    }

    if (html.includes("related-question") || html.includes("People also ask")) {
      serpFeatures.push("people_also_ask");
    }

    if (html.includes("data-lpage") || html.includes("shopping-carousel")) {
      serpFeatures.push("shopping");
    }

    if (html.includes("kp-wholepage") || html.includes("knowledge-panel")) {
      serpFeatures.push("knowledge_panel");
    }

    if (html.includes("video-carousel") || html.includes("video-voyager")) {
      serpFeatures.push("video");
    }

    if (html.includes("img-brk") || html.includes("image-carousel")) {
      serpFeatures.push("image_pack");
    }

  } catch (error) {
    console.error("Error parsing SERP HTML:", error);
  }

  return {
    organic,
    localPack,
    serpFeatures,
    totalResults: organic.length
  };
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    // Fallback regex extraction
    const match = url.match(/^https?:\/\/(?:www\.)?([^\/]+)/i);
    return match ? match[1] : url;
  }
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/**
 * Alternative: Use Bright Data's structured SERP endpoint if available
 */
export async function fetchStructuredSerp({
  keyword,
  lat,
  lng,
  numResults = 20
}: GeoSerpRequest): Promise<GeoSerpResponse> {
  const apiKey = process.env.BRIGHT_DATA_API_TOKEN;

  if (!apiKey) {
    throw new Error("Bright Data API key not configured");
  }

  try {
    // Try the structured SERP API endpoint
    const response = await fetch("https://api.brightdata.com/datasets/v3/trigger?dataset_id=gd_l1viktl72bvl7bjv10", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify([{
        keyword,
        country: "US",
        language: "en",
        location: `@${lat},${lng}`,
        num_results: numResults
      }])
    });

    if (!response.ok) {
      // Fall back to raw HTML parsing
      return fetchGeoTargetedSerp({ keyword, lat, lng, numResults });
    }

    const data = await response.json();

    // Transform structured data to our format
    const organic: OrganicResult[] = (data.organic_results || []).map((r: Record<string, unknown>, i: number) => ({
      position: i + 1,
      title: r.title as string || "",
      url: r.url as string || "",
      domain: extractDomain(r.url as string || ""),
      snippet: r.snippet as string || ""
    }));

    const localPack: LocalPackResult[] = (data.local_results || []).map((r: Record<string, unknown>, i: number) => ({
      position: i + 1,
      title: r.title as string || "",
      address: r.address as string,
      rating: r.rating as number,
      reviewCount: r.review_count as number,
      website: r.website as string
    }));

    return {
      organic,
      localPack,
      serpFeatures: data.serp_features || [],
      totalResults: data.total_results
    };

  } catch (error) {
    // Fall back to raw HTML parsing
    console.log("Structured SERP failed, falling back to HTML parsing:", error);
    return fetchGeoTargetedSerp({ keyword, lat, lng, numResults });
  }
}
