// pages/api/serp-research.ts
// SERP API integration using Bright Data for real search engine results

import { NextApiRequest, NextApiResponse } from "next";

export const maxDuration = 60;

interface SerpRequest {
  query: string;
  location?: string;
  searchType?: "organic" | "local" | "news" | "images";
  numResults?: number;
}

interface OrganicResult {
  position: number;
  title: string;
  url: string;
  displayUrl: string;
  snippet: string;
}

interface LocalResult {
  position: number;
  title: string;
  address?: string;
  rating?: number;
  reviews?: number;
  phone?: string;
}

interface PeopleAlsoAsk {
  question: string;
  snippet?: string;
}

interface RelatedSearch {
  query: string;
}

interface SerpResponse {
  query: string;
  organic: OrganicResult[];
  local?: LocalResult[];
  peopleAlsoAsk?: PeopleAlsoAsk[];
  relatedSearches?: RelatedSearch[];
  featuredSnippet?: {
    title: string;
    content: string;
    url: string;
  };
  totalResults?: string;
}

// Parse organic results from HTML
function parseOrganicResults(html: string): OrganicResult[] {
  const results: OrganicResult[] = [];

  // Match search result blocks - look for h3 tags within result divs
  const resultPattern = /<div[^>]*class="[^"]*(?:g|tF2Cxc)[^"]*"[^>]*>[\s\S]*?<h3[^>]*>(.*?)<\/h3>[\s\S]*?<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>[\s\S]*?<\/a>[\s\S]*?(?:<div[^>]*class="[^"]*VwiC3b[^"]*"[^>]*>([\s\S]*?)<\/div>)?/gi;

  let match;
  let position = 1;

  while ((match = resultPattern.exec(html)) !== null && position <= 20) {
    const title = match[1]?.replace(/<[^>]+>/g, '').trim();
    const url = match[2];
    const snippet = match[3]?.replace(/<[^>]+>/g, '').trim() || '';

    if (title && url && !url.includes('google.com')) {
      results.push({
        position,
        title,
        url,
        displayUrl: new URL(url).hostname,
        snippet,
      });
      position++;
    }
  }

  // Fallback: simpler pattern if first one doesn't work well
  if (results.length < 3) {
    const simplePattern = /<a[^>]*href="(https?:\/\/(?!www\.google)[^"]+)"[^>]*>[\s\S]*?<h3[^>]*>(.*?)<\/h3>/gi;
    let simpleMatch;
    position = 1;
    results.length = 0;

    while ((simpleMatch = simplePattern.exec(html)) !== null && position <= 20) {
      const url = simpleMatch[1];
      const title = simpleMatch[2]?.replace(/<[^>]+>/g, '').trim();

      if (title && url) {
        results.push({
          position,
          title,
          url,
          displayUrl: new URL(url).hostname,
          snippet: '',
        });
        position++;
      }
    }
  }

  return results;
}

// Parse "People Also Ask" questions
function parsePeopleAlsoAsk(html: string): PeopleAlsoAsk[] {
  const questions: PeopleAlsoAsk[] = [];

  // Look for PAA sections
  const paaPattern = /data-q="([^"]+)"/gi;
  let match;

  while ((match = paaPattern.exec(html)) !== null && questions.length < 10) {
    const question = match[1];
    if (question && !questions.some(q => q.question === question)) {
      questions.push({ question });
    }
  }

  // Alternative pattern
  if (questions.length === 0) {
    const altPattern = /<div[^>]*role="heading"[^>]*aria-level="3"[^>]*>(.*?)<\/div>/gi;
    while ((match = altPattern.exec(html)) !== null && questions.length < 10) {
      const question = match[1]?.replace(/<[^>]+>/g, '').trim();
      if (question && question.includes('?')) {
        questions.push({ question });
      }
    }
  }

  return questions;
}

// Parse related searches
function parseRelatedSearches(html: string): RelatedSearch[] {
  const searches: RelatedSearch[] = [];

  // Look for related searches section
  const relatedPattern = /<a[^>]*href="\/search\?[^"]*q=([^&"]+)[^"]*"[^>]*>[\s\S]*?<div[^>]*>(.*?)<\/div>/gi;
  let match;

  while ((match = relatedPattern.exec(html)) !== null && searches.length < 10) {
    const query = decodeURIComponent(match[1].replace(/\+/g, ' '));
    if (query && !searches.some(s => s.query === query)) {
      searches.push({ query });
    }
  }

  return searches;
}

// Parse featured snippet
function parseFeaturedSnippet(html: string): SerpResponse['featuredSnippet'] {
  // Look for featured snippet block
  const snippetPattern = /<div[^>]*class="[^"]*(?:xpdopen|featured-snippet)[^"]*"[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>[\s\S]*?<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/i;
  const match = snippetPattern.exec(html);

  if (match) {
    return {
      content: match[1]?.replace(/<[^>]+>/g, '').trim().substring(0, 500),
      url: match[2],
      title: match[3]?.replace(/<[^>]+>/g, '').trim(),
    };
  }

  return undefined;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { query, location, searchType = "organic", numResults = 10 }: SerpRequest = req.body;

  if (!query) {
    return res.status(400).json({ error: "Search query is required" });
  }

  // Use SERP_API1 env variable (user's Bright Data SERP zone)
  const apiKey = process.env.SERP_API1 || process.env.BRIGHTDATA_API_KEY;
  const serpZone = "serp_api1";

  // If no API key, return helpful error message
  if (!apiKey) {
    console.warn("BRIGHTDATA_API_KEY not configured");
    return res.status(200).json({
      query,
      organic: [],
      peopleAlsoAsk: [],
      relatedSearches: [],
      error: "SERP API not configured. Please add BRIGHTDATA_API_KEY to environment variables.",
    } as SerpResponse & { error: string });
  }

  try {
    // Build Google search URL
    let searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=${numResults}`;

    if (location) {
      searchUrl += `&near=${encodeURIComponent(location)}`;
    }

    if (searchType === "local") {
      searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=lcl`;
    } else if (searchType === "news") {
      searchUrl += "&tbm=nws";
    } else if (searchType === "images") {
      searchUrl += "&tbm=isch";
    }

    // Make request to Bright Data SERP API
    let response: Response;
    try {
      response = await fetch("https://api.brightdata.com/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          zone: serpZone,
          url: searchUrl,
          format: "raw",
        }),
      });
    } catch (fetchErr) {
      throw new Error(`Failed to connect to SERP API: ${(fetchErr as Error).message}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SERP API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const html = await response.text();

    // Parse the HTML response
    const serpResponse: SerpResponse = {
      query,
      organic: parseOrganicResults(html),
      peopleAlsoAsk: parsePeopleAlsoAsk(html),
      relatedSearches: parseRelatedSearches(html),
      featuredSnippet: parseFeaturedSnippet(html),
    };

    // Extract total results count
    const totalMatch = html.match(/About ([\d,]+) results/);
    if (totalMatch) {
      serpResponse.totalResults = totalMatch[1];
    }

    return res.status(200).json(serpResponse);
  } catch (error) {
    console.error("SERP API error:", error);
    return res.status(500).json({
      error: "Failed to fetch search results",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
