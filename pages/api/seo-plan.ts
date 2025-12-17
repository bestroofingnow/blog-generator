// pages/api/seo-plan.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { INDUSTRIES, IndustryConfig } from "../../lib/industries";
import { BLOG_TEMPLATES, getBlogTopicsForIndustry, generateBlogTitle } from "../../lib/blog-templates";
import {
  CompanyProfile,
  PillarPage,
  BlogTopic,
  KeywordData,
  CalendarEntry,
  SEOPlan,
  generateSlug,
} from "../../lib/page-types";

interface SEOPlanRequest {
  companyProfile: CompanyProfile;
  contentDepth: "starter" | "growth" | "enterprise";
  calendarLength: number; // months
  postFrequency: number; // per week
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      companyProfile,
      contentDepth = "growth",
      calendarLength = 6,
      postFrequency = 2,
    } = req.body as SEOPlanRequest;

    // Validate required fields
    if (!companyProfile || !companyProfile.name || !companyProfile.industryType) {
      return res.status(400).json({ error: "Missing required company profile fields" });
    }

    const industry = INDUSTRIES[companyProfile.industryType];
    if (!industry) {
      return res.status(400).json({ error: `Unknown industry type: ${companyProfile.industryType}` });
    }

    // Generate SEO Plan
    const pillarPages = generatePillarPages(companyProfile, industry);
    const keywords = generateKeywordDatabase(companyProfile, industry);
    const blogTopics = generateBlogTopics(companyProfile, industry);
    const calendar = generateContentCalendar(blogTopics, calendarLength, postFrequency);
    const recommendations = generateRecommendations(companyProfile, industry, contentDepth);

    const seoPlan: SEOPlan = {
      companyProfile,
      pillarPages,
      blogTopics,
      keywords,
      calendar,
      recommendations,
      generatedAt: new Date().toISOString(),
    };

    return res.status(200).json({
      success: true,
      plan: seoPlan,
      stats: {
        totalPillarPages: pillarPages.length,
        totalBlogTopics: blogTopics.length,
        totalKeywords: keywords.length,
        calendarEntries: calendar.length,
        estimatedContentPieces: pillarPages.length + calendar.length,
      },
    });
  } catch (error) {
    console.error("SEO Plan generation error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to generate SEO plan",
    });
  }
}

// Generate pillar pages for each city
function generatePillarPages(profile: CompanyProfile, industry: IndustryConfig): PillarPage[] {
  const pages: PillarPage[] = [];

  profile.cities.forEach((city, index) => {
    const slug = city.toLowerCase().replace(/\s+/g, "-");
    const priority = index === 0 ? "HIGHEST" : index < 3 ? "HIGH" : index < 7 ? "MEDIUM" : "LOW";

    // Estimate search volume based on priority
    const volumeMap = { HIGHEST: 2400, HIGH: 720, MEDIUM: 320, LOW: 140 };
    const volume = volumeMap[priority];

    const primaryKeyword = `${industry.serviceNoun} ${slug}`;

    pages.push({
      city,
      slug,
      priority,
      url: `/locations/${slug}-${industry.urlSlug}/`,
      volume,
      h1: `${profile.name} - Trusted ${industry.name} Services in ${city}, ${profile.stateAbbr}`,
      metaTitle: `${city} ${industry.name} | ${industry.servicePlural} | ${profile.name}`,
      metaDescription: `Looking for trusted ${industry.providerNoun} in ${city}, ${profile.stateAbbr}? ${profile.name} offers professional ${industry.servicePlural}. Free estimates!`,
      primaryKeyword,
      secondaryKeywords: [
        `${industry.serviceNoun} company ${slug}`,
        `${slug} ${industry.providerNoun}`,
        `best ${industry.serviceNoun} ${slug}`,
      ],
    });
  });

  return pages;
}

// Generate keyword database
function generateKeywordDatabase(profile: CompanyProfile, industry: IndustryConfig): KeywordData[] {
  const keywords: KeywordData[] = [];

  profile.cities.forEach((city, cityIndex) => {
    const slug = city.toLowerCase().replace(/\s+/g, "-");

    // Volume multiplier based on city priority
    const multiplier = cityIndex === 0 ? 1 : cityIndex < 3 ? 0.3 : cityIndex < 7 ? 0.15 : 0.06;

    // Primary keywords
    keywords.push(
      {
        city,
        category: "primary",
        keyword: `${slug} ${industry.serviceNoun}`,
        volume: Math.round(2400 * multiplier),
        difficulty: "Medium",
        intent: "Commercial",
        targetPage: `${city} Pillar`,
      },
      {
        city,
        category: "primary",
        keyword: `${industry.serviceNoun} company ${slug}`,
        volume: Math.round(1200 * multiplier),
        difficulty: "Medium",
        intent: "Commercial",
        targetPage: `${city} Pillar`,
      },
      {
        city,
        category: "primary",
        keyword: `${slug} ${industry.providerNoun}`,
        volume: Math.round(900 * multiplier),
        difficulty: "Medium",
        intent: "Commercial",
        targetPage: `${city} Pillar`,
      }
    );

    // Service-specific keywords
    profile.services.slice(0, 6).forEach((service) => {
      const serviceSlug = service.toLowerCase().replace(/\s+/g, "-");
      keywords.push({
        city,
        category: "service",
        keyword: `${slug} ${serviceSlug}`,
        volume: Math.round((Math.random() * 400 + 200) * multiplier),
        difficulty: "Medium",
        intent: "Transactional",
        targetPage: `${city} Pillar`,
      });
    });

    // Long-tail keywords
    keywords.push(
      {
        city,
        category: "longTail",
        keyword: `how much does ${industry.serviceNoun} cost ${slug}`,
        volume: Math.round(170 * multiplier),
        difficulty: "Low",
        intent: "Informational",
        targetPage: `Cost Guide Blog`,
      },
      {
        city,
        category: "longTail",
        keyword: `best ${industry.serviceNoun} company in ${slug}`,
        volume: Math.round(140 * multiplier),
        difficulty: "Medium",
        intent: "Commercial",
        targetPage: `${city} Pillar`,
      },
      {
        city,
        category: "longTail",
        keyword: `affordable ${industry.providerNoun} ${slug}`,
        volume: Math.round(110 * multiplier),
        difficulty: "Low",
        intent: "Commercial",
        targetPage: `${city} Pillar`,
      }
    );
  });

  return keywords;
}

// Generate blog topics
function generateBlogTopics(profile: CompanyProfile, industry: IndustryConfig): BlogTopic[] {
  const topics: BlogTopic[] = [];
  const primaryCity = profile.cities[0] || profile.headquarters;
  const categories = getBlogTopicsForIndustry(profile.industryType);

  let id = 0;

  categories.forEach((category) => {
    category.topics.forEach((template) => {
      id++;

      const title = generateBlogTitle(template, {
        city: primaryCity,
        state: profile.state,
        year: new Date().getFullYear(),
        company: profile.name,
        industry: industry.name,
      });

      const slug = generateSlug(title);
      const priority = category.priority === 1 ? "HIGH" : category.priority === 2 ? "MEDIUM" : "LOW";

      topics.push({
        id,
        category: category.name,
        title,
        template,
        slug,
        url: `/blog/${slug}/`,
        priority,
        wordCount: "1500-2000",
        linkTo: `${primaryCity} Pillar Page`,
      });
    });
  });

  return topics;
}

// Generate content calendar
function generateContentCalendar(
  blogTopics: BlogTopic[],
  calendarLength: number,
  postFrequency: number
): CalendarEntry[] {
  const calendar: CalendarEntry[] = [];
  const startDate = new Date();

  // Sort topics by priority
  const sortedTopics = [...blogTopics].sort((a, b) => {
    const priorityMap = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return priorityMap[a.priority] - priorityMap[b.priority];
  });

  const weeks = calendarLength * 4;
  let topicIndex = 0;

  for (let week = 0; week < weeks && topicIndex < sortedTopics.length; week++) {
    const weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() + week * 7);

    for (let post = 0; post < postFrequency && topicIndex < sortedTopics.length; post++) {
      const postDate = new Date(weekStart);
      postDate.setDate(postDate.getDate() + post * 2); // Space posts 2 days apart

      const topic = sortedTopics[topicIndex];

      calendar.push({
        week: week + 1,
        date: postDate.toISOString().split("T")[0],
        title: topic.title,
        type: "blog_post",
        category: topic.category,
        priority: topic.priority,
        status: "Planned",
      });

      topicIndex++;
    }
  }

  return calendar;
}

// Generate recommendations
function generateRecommendations(
  profile: CompanyProfile,
  industry: IndustryConfig,
  contentDepth: string
): string[] {
  const recommendations: string[] = [];

  // City pillar pages
  recommendations.push(
    `Create ${profile.cities.length} city pillar pages (one per service area) - these are your primary local SEO assets.`
  );

  // Avoid doorway pages warning
  recommendations.push(
    `⚠️ CRITICAL: Do NOT create separate pages for each service in each city (e.g., "roofing-charlotte", "repairs-charlotte"). This creates doorway pages that Google penalizes. Use ONE pillar page per city with H2 sections for services.`
  );

  // Service pages
  if (profile.services.length > 3) {
    recommendations.push(
      `Create ${Math.min(profile.services.length, 8)} individual service pages for your main services, linking back to city pillar pages.`
    );
  }

  // GBP optimization
  recommendations.push(
    `Claim and optimize your Google Business Profile with category "${industry.gbpCategory}" - this is critical for local SEO.`
  );

  // Industry directories
  if (industry.directories.length > 0) {
    const criticalDirs = industry.directories.filter((d) => d.priority === "CRITICAL" || d.priority === "HIGH");
    recommendations.push(
      `Get listed on these ${industry.name}-specific directories: ${criticalDirs.map((d) => d.name).join(", ")}.`
    );
  }

  // Schema markup
  recommendations.push(
    `Implement ${industry.schemaType} schema markup on all pages to enhance search visibility.`
  );

  // Content strategy
  const blogCount = contentDepth === "starter" ? 20 : contentDepth === "growth" ? 40 : 60;
  recommendations.push(
    `Target creating ${blogCount}+ blog posts in your first year, focusing on high-priority topics first.`
  );

  // USPs
  if (profile.usps.length > 0) {
    recommendations.push(
      `Prominently feature your USPs ("${profile.usps.slice(0, 3).join('", "')}") on every page - these differentiate you from competitors.`
    );
  }

  // Reviews
  recommendations.push(
    `Implement a review generation strategy - aim for 50+ Google reviews in year one. Reviews are a major local ranking factor.`
  );

  // Internal linking
  recommendations.push(
    `Build a strong internal linking structure: Blog posts → City pillar pages → Service pages → Contact page.`
  );

  return recommendations;
}
