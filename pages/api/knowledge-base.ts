// pages/api/knowledge-base.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import { createGateway } from "@ai-sdk/gateway";
import { generateText } from "ai";

const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? "",
});

// Use Claude for knowledge extraction
const knowledgeExtractor = gateway("anthropic/claude-sonnet-4.5");

interface KnowledgeEntry {
  id: string;
  type: "sitemap" | "url" | "pdf" | "image" | "text";
  source: string;
  title: string;
  content: string;
  extractedData?: {
    services?: string[];
    usps?: string[];
    locations?: string[];
    tone?: string;
    brandElements?: string[];
    keywords?: string[];
    companyInfo?: Record<string, string>;
  };
  scrapedAt: string;
}

interface SitemapEntry {
  url: string;
  lastmod?: string;
  priority?: string;
}

// Parse XML sitemap
function parseSitemap(xml: string): SitemapEntry[] {
  const entries: SitemapEntry[] = [];

  // Match all <url> blocks
  const urlRegex = /<url>([\s\S]*?)<\/url>/gi;
  let match;

  while ((match = urlRegex.exec(xml)) !== null) {
    const block = match[1];

    // Extract loc
    const locMatch = block.match(/<loc>(.*?)<\/loc>/i);
    if (locMatch) {
      const entry: SitemapEntry = { url: locMatch[1].trim() };

      // Extract optional fields
      const lastmodMatch = block.match(/<lastmod>(.*?)<\/lastmod>/i);
      if (lastmodMatch) entry.lastmod = lastmodMatch[1].trim();

      const priorityMatch = block.match(/<priority>(.*?)<\/priority>/i);
      if (priorityMatch) entry.priority = priorityMatch[1].trim();

      entries.push(entry);
    }
  }

  return entries;
}

// Fetch URL content using Bright Data scraper
async function scrapeUrl(url: string): Promise<string | null> {
  // Use web_unblocker env variable (user's Bright Data Web Unlocker zone)
  const apiKey = process.env.web_unblocker || process.env.BRIGHTDATA_API_KEY;
  const webScraperZone = "web_unlocker";

  try {
    // If Bright Data API key is configured, use it
    if (apiKey) {
      try {
        const response = await fetch("https://api.brightdata.com/request", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            zone: webScraperZone,
            url: url,
            format: "raw",
          }),
        });

        if (response.ok) {
          const html = await response.text();
          return html;
        }

        console.warn(`Bright Data returned ${response.status} for ${url}, falling back to direct fetch`);
      } catch (brightDataError) {
        console.warn(`Bright Data error for ${url}:`, brightDataError);
      }
    }

    // Fallback: direct fetch (may be blocked by some sites)
    const directResponse = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!directResponse.ok) {
      console.error(`Failed to fetch ${url}: ${directResponse.status}`);
      return null;
    }

    const html = await directResponse.text();
    return html;
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return null;
  }
}

// Get base URL for internal API calls
function getBaseUrl(): string {
  return process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
}

// Extract knowledge from content using AI
async function extractKnowledge(content: string, source: string, sourceType: string): Promise<KnowledgeEntry["extractedData"]> {
  const prompt = `Analyze this content from a business website and extract key information for SEO and content generation purposes.

SOURCE: ${source}
TYPE: ${sourceType}

CONTENT:
${content.substring(0, 15000)}

Extract the following information if present:
1. Services offered by the company
2. Unique Selling Points (USPs) and differentiators
3. Locations/service areas mentioned
4. Brand tone and voice characteristics
5. Brand elements (colors, taglines, key phrases)
6. Important keywords and phrases
7. Company information (name, contact, about us)

Respond in JSON format:
{
  "services": ["service1", "service2"],
  "usps": ["usp1", "usp2"],
  "locations": ["city1", "city2"],
  "tone": "description of brand tone",
  "brandElements": ["element1", "element2"],
  "keywords": ["keyword1", "keyword2"],
  "companyInfo": {
    "name": "",
    "phone": "",
    "email": "",
    "about": ""
  }
}

Only include fields where you found relevant information.`;

  try {
    const result = await generateText({
      model: knowledgeExtractor,
      prompt,
      maxOutputTokens: 2000,
    });

    // Parse JSON response
    let cleanedText = result.text.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.slice(7);
    }
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.slice(3);
    }
    if (cleanedText.endsWith("```")) {
      cleanedText = cleanedText.slice(0, -3);
    }

    return JSON.parse(cleanedText.trim());
  } catch (error) {
    console.error("Error extracting knowledge:", error);
    return {};
  }
}

// Generate unique ID
function generateId(): string {
  return `kb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const { action } = req.body;

  try {
    switch (action) {
      case "scan-sitemap": {
        const { sitemapUrl } = req.body;

        if (!sitemapUrl) {
          return res.status(400).json({ success: false, error: "Sitemap URL required" });
        }

        // Fetch sitemap
        const sitemapContent = await scrapeUrl(sitemapUrl);
        if (!sitemapContent) {
          return res.status(400).json({ success: false, error: "Could not fetch sitemap" });
        }

        // Parse sitemap
        const entries = parseSitemap(sitemapContent);

        if (entries.length === 0) {
          return res.status(400).json({ success: false, error: "No URLs found in sitemap" });
        }

        // Return parsed sitemap for user review
        return res.status(200).json({
          success: true,
          sitemapUrl,
          totalUrls: entries.length,
          entries: entries.slice(0, 100), // Limit preview to first 100
        });
      }

      case "scrape-urls": {
        const { urls, maxPages = 10 } = req.body;

        if (!urls || !Array.isArray(urls) || urls.length === 0) {
          return res.status(400).json({ success: false, error: "URLs array required" });
        }

        const results: KnowledgeEntry[] = [];
        const urlsToProcess = urls.slice(0, maxPages);

        for (const url of urlsToProcess) {
          const content = await scrapeUrl(url);

          if (content) {
            // Extract title from content
            const titleMatch = content.match(/<title>(.*?)<\/title>/i) ||
                             content.match(/^#\s+(.+)$/m);
            const title = titleMatch ? titleMatch[1].trim() : url;

            // Extract knowledge using AI
            const extractedData = await extractKnowledge(content, url, "webpage");

            results.push({
              id: generateId(),
              type: "url",
              source: url,
              title,
              content: content.substring(0, 5000), // Truncate for storage
              extractedData,
              scrapedAt: new Date().toISOString(),
            });
          }

          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return res.status(200).json({
          success: true,
          processedCount: results.length,
          entries: results,
        });
      }

      case "scrape-single-url": {
        const { url } = req.body;

        if (!url) {
          return res.status(400).json({ success: false, error: "URL required" });
        }

        const content = await scrapeUrl(url);

        if (!content) {
          return res.status(400).json({ success: false, error: "Could not fetch URL content" });
        }

        const titleMatch = content.match(/<title>(.*?)<\/title>/i) ||
                         content.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1].trim() : url;

        const extractedData = await extractKnowledge(content, url, "webpage");

        const entry: KnowledgeEntry = {
          id: generateId(),
          type: "url",
          source: url,
          title,
          content: content.substring(0, 5000),
          extractedData,
          scrapedAt: new Date().toISOString(),
        };

        return res.status(200).json({
          success: true,
          entry,
        });
      }

      case "process-text": {
        const { text, title } = req.body;

        if (!text) {
          return res.status(400).json({ success: false, error: "Text content required" });
        }

        const extractedData = await extractKnowledge(text, "Manual Entry", "text");

        const entry: KnowledgeEntry = {
          id: generateId(),
          type: "text",
          source: "Manual Entry",
          title: title || "Manual Knowledge Entry",
          content: text,
          extractedData,
          scrapedAt: new Date().toISOString(),
        };

        return res.status(200).json({
          success: true,
          entry,
        });
      }

      case "process-file": {
        const { fileContent, fileName, fileType } = req.body;

        if (!fileContent) {
          return res.status(400).json({ success: false, error: "File content required" });
        }

        let content = fileContent;
        let type: "pdf" | "image" | "text" = "text";

        // Handle different file types
        if (fileType?.includes("pdf")) {
          type = "pdf";
          // For PDF, we receive already extracted text from client-side
        } else if (fileType?.startsWith("image/")) {
          type = "image";
          // For images, use AI vision to extract text
          // The fileContent should be base64
        }

        const extractedData = await extractKnowledge(content, fileName, type);

        const entry: KnowledgeEntry = {
          id: generateId(),
          type,
          source: fileName,
          title: fileName,
          content: content.substring(0, 10000),
          extractedData,
          scrapedAt: new Date().toISOString(),
        };

        return res.status(200).json({
          success: true,
          entry,
        });
      }

      case "aggregate-knowledge": {
        const { entries } = req.body as { entries: KnowledgeEntry[] };

        if (!entries || !Array.isArray(entries) || entries.length === 0) {
          return res.status(400).json({ success: false, error: "Knowledge entries required" });
        }

        // Aggregate all extracted data
        const aggregated = {
          services: new Set<string>(),
          usps: new Set<string>(),
          locations: new Set<string>(),
          keywords: new Set<string>(),
          brandElements: new Set<string>(),
          tones: [] as string[],
          companyInfo: {} as Record<string, string>,
        };

        for (const entry of entries) {
          if (entry.extractedData) {
            entry.extractedData.services?.forEach(s => aggregated.services.add(s));
            entry.extractedData.usps?.forEach(u => aggregated.usps.add(u));
            entry.extractedData.locations?.forEach(l => aggregated.locations.add(l));
            entry.extractedData.keywords?.forEach(k => aggregated.keywords.add(k));
            entry.extractedData.brandElements?.forEach(b => aggregated.brandElements.add(b));
            if (entry.extractedData.tone) aggregated.tones.push(entry.extractedData.tone);
            if (entry.extractedData.companyInfo) {
              Object.assign(aggregated.companyInfo, entry.extractedData.companyInfo);
            }
          }
        }

        // Use AI to synthesize tone from multiple sources
        let synthesizedTone = "";
        if (aggregated.tones.length > 0) {
          const toneResult = await generateText({
            model: knowledgeExtractor,
            prompt: `Synthesize these brand tone descriptions into a single cohesive description:\n${aggregated.tones.join("\n")}\n\nProvide a 1-2 sentence description of the overall brand tone.`,
            maxOutputTokens: 200,
          });
          synthesizedTone = toneResult.text.trim();
        }

        return res.status(200).json({
          success: true,
          aggregatedKnowledge: {
            services: Array.from(aggregated.services),
            usps: Array.from(aggregated.usps),
            locations: Array.from(aggregated.locations),
            keywords: Array.from(aggregated.keywords),
            brandElements: Array.from(aggregated.brandElements),
            tone: synthesizedTone,
            companyInfo: aggregated.companyInfo,
            sourcesCount: entries.length,
          },
        });
      }

      default:
        return res.status(400).json({ success: false, error: "Unknown action" });
    }
  } catch (error) {
    console.error("Knowledge base error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
    responseLimit: false,
  },
  maxDuration: 300, // 5 minutes for sitemap scanning
};
