// pages/api/generate-location-page-ai.ts
// AI-powered location page generation with service-based images

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import { db, profiles, eq } from "../../lib/db";
import {
  generateBlogImage,
  reviewImageQuality,
  remakeBlogImage,
  MODELS,
} from "../../lib/ai-gateway";
import { generateText } from "ai";

interface GenerateRequest {
  cities: string[];
  service: string;
}

interface GeneratedPage {
  city: string;
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  content: string;
  images: Array<{
    index: number;
    base64: string;
    prompt: string;
  }>;
  schemaMarkup: Record<string, unknown>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const userId = (session.user as { id: string }).id;

  // Set up streaming response
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendProgress = (data: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Get user's company profile
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId));

    if (!profile?.companyProfile) {
      sendProgress({
        type: "error",
        error: "Company profile not found. Please complete your profile first.",
      });
      return res.end();
    }

    const companyProfile = profile.companyProfile as Record<string, unknown>;
    const { cities, service } = req.body as GenerateRequest;

    if (!cities || cities.length === 0) {
      sendProgress({ type: "error", error: "At least one city is required" });
      return res.end();
    }

    if (!service) {
      sendProgress({ type: "error", error: "Service type is required" });
      return res.end();
    }

    // Extract company data
    const state = (companyProfile.state as string) || "";
    const stateAbbrev = getStateAbbreviation(state);
    const companyName = (companyProfile.companyName as string) || profile.companyName || "";
    const phone = (companyProfile.phone as string) || "";
    const email = (companyProfile.email as string) || "";
    const yearsInBusiness = companyProfile.yearFounded
      ? new Date().getFullYear() - parseInt(companyProfile.yearFounded as string)
      : undefined;
    const services = (companyProfile.services as string[]) || [];
    const allCities = (companyProfile.cities as string[]) || [];
    const reviewData = companyProfile.reviews as Record<string, Record<string, unknown>> | undefined;
    const googleRating = reviewData?.google?.rating as number | undefined;
    const reviewCount = reviewData?.google?.reviewCount as number | undefined;

    const generatedPages: GeneratedPage[] = [];

    // Process each city
    for (let i = 0; i < cities.length; i++) {
      const city = cities[i];

      sendProgress({
        type: "progress",
        current: i + 1,
        total: cities.length,
        currentCity: city,
        status: "generating",
      });

      try {
        // Generate the page content with AI
        const pageContent = await generateLocationPageContent({
          city,
          state,
          stateAbbrev,
          service,
          companyName,
          phone,
          email,
          yearsInBusiness,
          services,
          otherCities: allCities.filter((c) => c !== city),
          googleRating,
          reviewCount,
        });

        sendProgress({
          type: "progress",
          current: i + 1,
          total: cities.length,
          currentCity: city,
          status: "images",
        });

        // Generate 3 service-based images
        const imagePrompts = getServiceImagePrompts(service, city, state);
        const images: Array<{ index: number; base64: string; prompt: string }> = [];

        for (let imgIndex = 0; imgIndex < 3; imgIndex++) {
          const image = await generateAndReviewImage(
            imagePrompts[imgIndex],
            imgIndex,
            `${service} in ${city}`
          );

          if (image) {
            images.push({
              index: imgIndex,
              base64: image.base64,
              prompt: imagePrompts[imgIndex],
            });
          }
        }

        // Create schema markup
        const schemaMarkup = createSchemaMarkup({
          city,
          state,
          stateAbbrev,
          service,
          companyName,
          phone,
          email,
          googleRating,
          reviewCount,
        });

        const slug = generateSlug(city, service);

        generatedPages.push({
          city,
          slug,
          title: `${service} in ${city}, ${stateAbbrev}`,
          metaTitle: generateMetaTitle(service, city, stateAbbrev, companyName),
          metaDescription: generateMetaDescription(service, city, stateAbbrev, companyName, phone),
          content: pageContent,
          images,
          schemaMarkup,
        });

        sendProgress({
          type: "page_complete",
          current: i + 1,
          total: cities.length,
          page: {
            city,
            slug,
            title: `${service} in ${city}, ${stateAbbrev}`,
            imageCount: images.length,
          },
        });
      } catch (error) {
        console.error(`Error generating page for ${city}:`, error);
        sendProgress({
          type: "page_error",
          current: i + 1,
          total: cities.length,
          city,
          error: error instanceof Error ? error.message : "Failed to generate page",
        });
      }
    }

    sendProgress({
      type: "complete",
      pages: generatedPages,
    });

    return res.end();
  } catch (error) {
    console.error("Generate location page AI error:", error);
    sendProgress({
      type: "error",
      error: error instanceof Error ? error.message : "Internal server error",
    });
    return res.end();
  }
}

// Generate AI-powered location page content
async function generateLocationPageContent(params: {
  city: string;
  state: string;
  stateAbbrev: string;
  service: string;
  companyName: string;
  phone: string;
  email?: string;
  yearsInBusiness?: number;
  services: string[];
  otherCities: string[];
  googleRating?: number;
  reviewCount?: number;
}): Promise<string> {
  const {
    city,
    state,
    stateAbbrev,
    service,
    companyName,
    phone,
    email,
    yearsInBusiness,
    services,
    otherCities,
    googleRating,
    reviewCount,
  } = params;

  const prompt = `Create a comprehensive, SEO-optimized location page for a local service business. This page must be 2,500-3,500 words and follow conversion best practices.

BUSINESS DETAILS:
- Company: ${companyName}
- Service: ${service}
- Location: ${city}, ${stateAbbrev} (${state})
- Phone: ${phone}
${email ? `- Email: ${email}` : ""}
${yearsInBusiness ? `- Years in Business: ${yearsInBusiness}` : ""}
${googleRating ? `- Google Rating: ${googleRating} stars (${reviewCount} reviews)` : ""}
${services.length > 0 ? `- Other Services: ${services.join(", ")}` : ""}
${otherCities.length > 0 ? `- Other Service Areas: ${otherCities.slice(0, 10).join(", ")}` : ""}

CRITICAL REQUIREMENTS:
- Write ONLY in American English
- Target the primary keyword: "${service.toLowerCase()} ${city.toLowerCase()}"
- Mention ${city} naturally 10-15 times throughout the content
- Include the phone number ${phone} at least 3 times with CTAs
- Word count: 2,500-3,500 words minimum

PAGE STRUCTURE (follow this exactly):

1. HERO SECTION
- Compelling H1 that includes city and service
- Tagline emphasizing local expertise
- Dual CTAs: Call button + Schedule button
- Trust indicators (rating, years, etc.)
- [IMAGE:0] placeholder for hero image

2. INTRODUCTION (300-400 words)
- Welcome message mentioning company and city
- Why local expertise matters for this service
- Overview of what the page covers
- Transition to main content

3. SERVICES OFFERED (400-500 words)
- H2: "Our ${service} Services in ${city}"
- List of specific services with descriptions
- Emphasize local availability
- Include relevant secondary keywords

4. COMMON PROBLEMS/SIGNS (400-500 words)
- H2: "Signs You Need ${service} in ${city}"
- List warning signs homeowners should watch for
- Create urgency without being pushy
- [IMAGE:1] placeholder for relevant image

5. WHY CHOOSE US (400-500 words)
- H2: "Why ${city} Residents Choose ${companyName}"
- 5 compelling reasons with explanations
- Include local credibility factors
- Certifications, guarantees, experience

6. OUR PROCESS (300-400 words)
- H2: "How Our ${service} Process Works"
- 5-step process breakdown
- Emphasize customer experience
- Set expectations

7. PRICING GUIDE (300-400 words)
- H2: "${service} Cost in ${city}, ${stateAbbrev}"
- Price ranges for common services
- Factors affecting cost
- Free estimate CTA
- [IMAGE:2] placeholder for service image

8. FAQ SECTION (400-500 words)
- H2: "Frequently Asked Questions About ${service} in ${city}"
- 5 questions formatted for FAQ schema
- Each answer 50-100 words
- Natural keyword usage

9. SERVICE AREAS (200-300 words)
- H2: "${service} Service Areas Near ${city}"
- List nearby cities/areas served
- Internal linking opportunities
- Coverage statement

10. FINAL CTA SECTION
- Strong closing statement
- Phone number prominently displayed
- Contact form encouragement
- Emergency service mention if applicable

HTML FORMATTING:
- Use semantic HTML5 elements
- Include <h1>, <h2>, <h3> hierarchy
- Use <ul> and <ol> lists appropriately
- Include <strong> for emphasis on key points
- Use <a href="tel:${phone.replace(/\D/g, "")}"> for phone links
- Add [IMAGE:0], [IMAGE:1], [IMAGE:2] placeholders exactly where indicated
- Include data-schema attributes for FAQ items

WRITING STYLE:
- Professional but conversational tone
- Write like a knowledgeable local expert
- Use contractions naturally (you're, we're, it's)
- Address the reader directly with "you" and "your"
- Avoid corporate jargon and buzzwords
- Include specific, tangible benefits
- Create trust through specificity

Output ONLY the HTML content. No explanations or markdown code blocks.`;

  try {
    console.log(`[Location AI] Generating content for ${city}...`);
    const result = await generateText({
      model: MODELS.contentWriter,
      system: `You are an expert SEO copywriter specializing in local service business content. You create high-converting location pages that rank well and drive leads. Write comprehensive, engaging content that sounds human and builds trust. CRITICAL: Write ONLY in American English. Output raw HTML only.`,
      prompt,
      maxOutputTokens: 12000,
      temperature: 0.7,
    });

    console.log(`[Location AI] Content generated for ${city}, length: ${result.text.length}`);
    return result.text;
  } catch (error) {
    console.error(`[Location AI] Error generating content for ${city}:`, error);
    throw new Error(`Failed to generate content for ${city}`);
  }
}

// Get service-specific image prompts
function getServiceImagePrompts(service: string, city: string, state: string): string[] {
  const servicePrompts: Record<string, string[]> = {
    // HVAC
    "AC Installation": [
      `Professional HVAC technician installing a modern air conditioning unit in a clean residential home, high-end photography, natural lighting, showing expertise and care`,
      `Modern central air conditioning system in a well-maintained home basement or utility room, professional installation, pristine condition`,
      `Happy homeowner feeling cool air from newly installed AC vents, comfortable living room setting, warm natural lighting`,
    ],
    "AC Repair": [
      `HVAC technician diagnosing an air conditioning unit with professional tools, outdoor residential setting, summer day`,
      `Close-up of hands working on AC components with precision tools, professional service call`,
      `Modern AC unit being serviced outdoors, clean residential backdrop, professional equipment visible`,
    ],
    "Heating Installation": [
      `Professional technician installing a modern furnace in a clean home utility room, safety equipment, professional setting`,
      `New high-efficiency furnace installation complete, pristine utility space, modern equipment`,
      `Cozy living room with warm ambient lighting suggesting comfortable heating, winter scene outside windows`,
    ],
    "Heating Repair": [
      `HVAC technician inspecting a furnace with diagnostic equipment, professional service call, indoor setting`,
      `Close-up of furnace maintenance and repair work, professional tools, clean environment`,
      `Technician explaining heating system to homeowner, professional consultation setting`,
    ],
    // Plumbing
    "Plumbing Services": [
      `Professional plumber working under a modern kitchen sink, clean workspace, professional tools organized`,
      `Modern bathroom plumbing installation, pristine fixtures, professional craftsmanship`,
      `Plumber inspecting water heater with diagnostic equipment, professional service setting`,
    ],
    "Drain Cleaning": [
      `Professional plumber using modern drain cleaning equipment, clean residential bathroom`,
      `Close-up of professional-grade plumbing tools and equipment, organized workspace`,
      `Plumber inspecting drainage system with camera equipment, professional diagnostic process`,
    ],
    "Water Heater Installation": [
      `New tankless water heater being installed by professional plumber, modern utility space`,
      `Professional water heater installation complete, clean utility room, modern equipment`,
      `Plumber explaining water heater options to homeowner, showroom or consultation setting`,
    ],
    // Electrical
    "Electrical Services": [
      `Licensed electrician working on a modern electrical panel, safety equipment, professional setting`,
      `Modern electrical panel installation, clean workspace, professional wiring`,
      `Electrician installing modern LED lighting fixtures, residential setting, quality craftsmanship`,
    ],
    "Panel Upgrade": [
      `Electrician upgrading an electrical panel, professional safety gear, clean workspace`,
      `Modern 200-amp electrical panel installation, pristine utility area`,
      `Professional electrical work with organized wiring, attention to detail visible`,
    ],
    // Roofing
    "Roofing Services": [
      `Professional roofing crew working on a residential roof, sunny day, safety equipment visible`,
      `Beautiful completed roof installation on a suburban home, curb appeal, professional quality`,
      `Close-up of quality roofing materials and expert installation technique`,
    ],
    "Roof Repair": [
      `Professional roofer repairing shingles on a residential roof, proper safety equipment`,
      `Detailed roof repair work in progress, quality materials, professional technique`,
      `Completed roof repair showing seamless integration with existing roofing`,
    ],
    // Landscaping
    "Landscaping Services": [
      `Beautiful landscaped front yard of a suburban home, manicured lawn, professional design`,
      `Professional landscaper creating garden bed design, quality plants and materials`,
      `Stunning backyard transformation with patio, plantings, and outdoor living space`,
    ],
    "Lawn Care": [
      `Perfectly manicured residential lawn, lush green grass, professional striping pattern`,
      `Professional lawn care technician with commercial equipment, residential setting`,
      `Beautiful healthy lawn with landscaping, curb appeal, well-maintained property`,
    ],
    // Pest Control
    "Pest Control": [
      `Professional pest control technician in uniform, treating exterior of residential home`,
      `Clean modern home interior, pest-free environment, family-friendly setting`,
      `Pest control professional conducting thorough inspection of residential property`,
    ],
  };

  // Find matching prompts or generate generic ones
  const matchingPrompts = servicePrompts[service];
  if (matchingPrompts) {
    return matchingPrompts;
  }

  // Generic prompts based on service type keywords
  return [
    `Professional ${service.toLowerCase()} technician at work in a residential setting, high-quality photography, natural lighting`,
    `${service.toLowerCase()} service in progress at a beautiful home in ${state}, professional equipment, quality workmanship`,
    `Completed ${service.toLowerCase()} project showing excellent results, happy homeowner, professional finish`,
  ];
}

// Generate and review image with quality checks
async function generateAndReviewImage(
  prompt: string,
  index: number,
  context: string
): Promise<{ base64: string; prompt: string } | null> {
  try {
    // Generate initial image
    const image = await generateBlogImage({ prompt, index });
    if (!image) {
      console.log(`Failed to generate image ${index}`);
      return null;
    }

    // Review the image
    const review = await reviewImageQuality({
      imageBase64: image.base64,
      originalPrompt: prompt,
      sectionContext: context,
    });

    if (review.approved) {
      return { base64: image.base64, prompt };
    }

    // Try to remake if not approved
    console.log(`Image ${index} rejected, attempting remake...`);
    const remadeImage = await remakeBlogImage({
      improvedPrompt: review.remakePrompt || prompt,
      index,
    });

    if (remadeImage) {
      return { base64: remadeImage.base64, prompt: review.remakePrompt || prompt };
    }

    // Return original if remake fails
    return { base64: image.base64, prompt };
  } catch (error) {
    console.error(`Error generating image ${index}:`, error);
    return null;
  }
}

// Create schema markup for the page
function createSchemaMarkup(params: {
  city: string;
  state: string;
  stateAbbrev: string;
  service: string;
  companyName: string;
  phone: string;
  email?: string;
  googleRating?: number;
  reviewCount?: number;
}): Record<string, unknown> {
  const { city, state, stateAbbrev, service, companyName, phone, email, googleRating, reviewCount } = params;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        name: companyName,
        description: `Professional ${service.toLowerCase()} services in ${city}, ${stateAbbrev}`,
        telephone: phone,
        email: email,
        areaServed: {
          "@type": "City",
          name: city,
          containedIn: {
            "@type": "State",
            name: state,
          },
        },
        ...(googleRating && {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: googleRating,
            reviewCount: reviewCount,
          },
        }),
      },
      {
        "@type": "Service",
        name: `${service} in ${city}`,
        description: `Professional ${service.toLowerCase()} services for ${city}, ${stateAbbrev} residents`,
        provider: {
          "@type": "LocalBusiness",
          name: companyName,
        },
        areaServed: {
          "@type": "City",
          name: city,
        },
      },
    ],
  };
}

// Helper functions
function generateSlug(city: string, service: string): string {
  const citySlug = city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const serviceSlug = service.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${citySlug}-${serviceSlug}-services`;
}

function generateMetaTitle(service: string, city: string, stateAbbrev: string, companyName: string): string {
  const base = `${service} in ${city}, ${stateAbbrev}`;
  if (base.length + companyName.length + 3 <= 60) {
    return `${base} | ${companyName}`;
  }
  return base;
}

function generateMetaDescription(
  service: string,
  city: string,
  stateAbbrev: string,
  companyName: string,
  phone: string
): string {
  const desc = `Looking for professional ${service.toLowerCase()} in ${city}, ${stateAbbrev}? ${companyName} offers expert service. Call ${phone} for a free estimate today!`;
  return desc.slice(0, 160);
}

function getStateAbbreviation(state: string): string {
  const stateAbbreviations: Record<string, string> = {
    "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
    "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
    "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
    "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
    "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
    "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS",
    "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV",
    "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
    "north carolina": "NC", "north dakota": "ND", "ohio": "OH", "oklahoma": "OK",
    "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
    "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT",
    "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV",
    "wisconsin": "WI", "wyoming": "WY", "district of columbia": "DC",
    "british columbia": "BC", "alberta": "AB", "ontario": "ON", "quebec": "QC",
  };

  if (state.length === 2) {
    return state.toUpperCase();
  }

  return stateAbbreviations[state.toLowerCase()] || state.slice(0, 2).toUpperCase();
}

export const config = {
  maxDuration: 300, // 5 minutes for multiple pages with images
};
