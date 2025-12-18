// lib/page-prompts.ts
// AI prompt templates for generating different page types

import { PageType, CompanyProfile, PageEntry, PAGE_TYPES } from "./page-types";
import {
  generateEnhancedBlogPrompt,
  generateEnhancedOutlinePrompt,
  calculateKeywordRequirements,
  getBrandVoiceDescription,
  getWritingStyleDescription,
  getTargetAudienceDescription,
  EnhancedPromptParams,
} from "./enhanced-prompts";

export interface PagePromptParams {
  pageType: PageType;
  companyProfile: CompanyProfile;
  pageConfig: {
    title?: string;
    slug?: string;
    primaryKeyword: string;
    secondaryKeywords: string[];
    tone?: string;
    sections?: string[];
    customInstructions?: string;
    // Type-specific fields
    serviceName?: string;
    serviceDescription?: string;
    city?: string;
    topic?: string;
    headline?: string;
    summary?: string;
  };
  pageLibrary?: PageEntry[];
}

// Main function to get the appropriate prompt for a page type
export function getPageOutlinePrompt(params: PagePromptParams): string {
  const { pageType, companyProfile, pageConfig } = params;

  switch (pageType) {
    case "home_page":
      return generateHomePagePrompt(params);
    case "service_page":
      return generateServicePagePrompt(params);
    case "location_page":
      return generateLocationPagePrompt(params);
    case "blog_post":
      return generateBlogPostPrompt(params);
    case "news_article":
      return generateNewsArticlePrompt(params);
    case "about_page":
      return generateAboutPagePrompt(params);
    case "contact_page":
      return generateContactPagePrompt(params);
    case "faq_page":
      return generateFAQPagePrompt(params);
    case "testimonials_page":
      return generateTestimonialsPagePrompt(params);
    default:
      return generateCustomPagePrompt(params);
  }
}

// Home Page Prompt
function generateHomePagePrompt(params: PagePromptParams): string {
  const { companyProfile, pageConfig } = params;
  const tone = pageConfig.tone || "professional yet friendly";

  return `You are an expert SEO copywriter creating a home page outline for a ${companyProfile.industryType} business.

COMPANY INFORMATION:
- Company Name: ${companyProfile.name}
- Tagline: ${companyProfile.tagline || ""}
- Industry: ${companyProfile.industryType}
- Location: ${companyProfile.headquarters}, ${companyProfile.stateAbbr}
- Service Area: ${companyProfile.cities.slice(0, 5).join(", ")}${companyProfile.cities.length > 5 ? ` and ${companyProfile.cities.length - 5} more areas` : ""}
- Services: ${companyProfile.services.slice(0, 6).join(", ")}
- Unique Selling Points: ${companyProfile.usps.join(", ")}

SEO REQUIREMENTS:
- Primary Keyword: ${pageConfig.primaryKeyword}
- Secondary Keywords: ${pageConfig.secondaryKeywords.join(", ")}
- Tone: ${tone}

Create a comprehensive home page outline with the following sections:

1. HERO SECTION
   - Compelling headline incorporating primary keyword
   - Subheadline emphasizing main value proposition
   - Primary CTA (e.g., "Get Free Quote", "Schedule Service")
   - Trust indicators (years in business, reviews, certifications)

2. SERVICES OVERVIEW
   - Brief introduction to services
   - 3-4 featured services with short descriptions
   - Link to individual service pages

3. WHY CHOOSE US
   - 3-4 key differentiators
   - Each with a benefit-focused explanation
   - Support with any certifications or awards

4. FEATURED WORK / RESULTS (optional)
   - Before/after or case study highlights
   - Specific metrics if available

5. TESTIMONIALS
   - 2-3 customer testimonials
   - Include name, location, service used

6. SERVICE AREAS
   - List of cities/areas served
   - Brief description of coverage

7. CALL TO ACTION
   - Strong closing CTA
   - Contact information
   - Emergency service mention if applicable

OUTPUT FORMAT:
Return a JSON object with the following structure:
{
  "pageTitle": "SEO-optimized page title",
  "metaDescription": "Compelling meta description under 160 characters",
  "h1": "Main heading with primary keyword",
  "sections": [
    {
      "id": "hero",
      "type": "hero",
      "headline": "...",
      "subheadline": "...",
      "cta": {"text": "...", "action": "..."},
      "trustIndicators": ["..."]
    },
    // ... other sections
  ],
  "internalLinks": [
    {"text": "anchor text", "suggestedPage": "service-page-slug"}
  ]
}`;
}

// Service Page Prompt - Enhanced with Relentless Digital Formula
function generateServicePagePrompt(params: PagePromptParams): string {
  const { companyProfile, pageConfig } = params;
  const serviceName = pageConfig.serviceName || pageConfig.title || "Service";
  const tone = pageConfig.tone || "professional yet friendly";
  const city = pageConfig.city || companyProfile.headquarters;
  const yearsInBusiness = companyProfile.yearsInBusiness || 10;

  return `You are an expert SEO copywriter creating a high-converting service page for "${serviceName}" using the proven Relentless Digital formula.

COMPANY INFORMATION:
- Company Name: ${companyProfile.name}
- Industry: ${companyProfile.industryType}
- Location: ${city}, ${companyProfile.stateAbbr}
- All Services: ${companyProfile.services.join(", ")}
- USPs: ${companyProfile.usps.join(", ")}
- Years in Business: ${yearsInBusiness}+
${companyProfile.certifications?.length ? `- Certifications: ${companyProfile.certifications.join(", ")}` : ""}

SERVICE DETAILS:
- Service Name: ${serviceName}
- Service Description: ${pageConfig.serviceDescription || ""}

SEO REQUIREMENTS:
- Primary Keyword: ${pageConfig.primaryKeyword}
- Secondary Keywords: ${pageConfig.secondaryKeywords.join(", ")}
- Tone: ${tone}
- Target Word Count: 2000-3000 words

=== RELENTLESS DIGITAL FORMULA ===
This page structure is designed to capture featured snippets and convert visitors.

Create a comprehensive service page outline with these sections IN ORDER:

1. HERO SECTION (Above the fold)
   - H1: "${serviceName} in ${city}, ${companyProfile.stateAbbr}" (include primary keyword)
   - Subheadline: Value proposition emphasizing speed, quality, or price
   - DUAL CTAs: "Get Free Quote" (primary) + "Call Now: ${companyProfile.phone || '(XXX) XXX-XXXX'}" (secondary)
   - Trust badges: ${yearsInBusiness}+ Years, Licensed & Insured, 5-Star Reviews
   - Hero image placeholder

2. PROBLEM RECOGNITION (Pain Point Section)
   Title: "Common Signs You Need ${serviceName}"
   - List 6-8 warning signs/symptoms customers experience
   - Use bullet points for featured snippet potential
   - Include urgency: "If you notice these signs, don't wait..."
   - Emotional connection to customer frustrations

3. VALUE PROPOSITION (Benefits Section)
   Title: "Benefits of Professional ${serviceName}"
   - 5-6 benefits with icons/checkmarks
   - Each benefit has a short explanation (2-3 sentences)
   - Focus on outcomes, not features
   - Include: Safety, Warranty, Quality, Time Savings, Cost Efficiency, Peace of Mind

4. PRICING TRANSPARENCY SECTION
   Title: "How Much Does ${serviceName} Cost in ${city}?"
   Subtitle: "Transparent Pricing for ${companyProfile.state} Homeowners"
   - Three pricing tiers with ranges:
     * Simple/Minor: $XXX - $XXX (describe scope)
     * Standard/Medium: $XXX - $XXX (describe scope)
     * Complex/Major: $XXX+ (describe scope)
   - Factors that affect pricing (bulleted list)
   - "Free estimates" mention
   - Note: Actual prices should be realistic for ${companyProfile.industryType}

5. PROCESS SECTION
   Title: "Our ${serviceName} Process"
   - 5-step numbered process:
     1. Free Consultation/Inspection
     2. Detailed Quote
     3. Schedule Service
     4. Professional Service Delivery
     5. Final Walkthrough & Warranty
   - What customer can expect at each step
   - Timeline estimates

6. WHY CHOOSE US (Differentiation)
   Title: "Why Choose ${companyProfile.name} for ${serviceName}?"
   - 4-6 differentiators with brief explanations:
     * ${yearsInBusiness}+ years experience
     * Licensed, bonded, insured
     * Local family-owned business
     * Satisfaction guarantee
     * 24/7 emergency service (if applicable)
     * Free estimates
   - Weave in company certifications

7. SERVICE AREA SIDEBAR/SECTION
   Title: "${serviceName} Near You"
   - List 8-12 cities/neighborhoods served
   - Each as internal link placeholder: [LINK:city-service]
   - Include ${city} prominently

8. TESTIMONIALS WITH SCHEMA
   Title: "What Our ${city} Customers Say"
   - 3 testimonials with:
     * Customer name (first name, last initial)
     * Location (city)
     * Star rating (5 stars)
     * Specific service mentioned
     * Result/outcome
   - Schema markup ready structure

9. COMMERCIAL SERVICES (B2B Section)
   Title: "Commercial ${serviceName} Services"
   - Brief paragraph about serving businesses
   - Types of commercial clients served
   - "Contact for commercial pricing"
   - Helps capture B2B search traffic

10. FAQ SECTION (Schema Ready)
    Title: "Frequently Asked Questions About ${serviceName}"
    - 5 questions structured for featured snippets:
      1. "How much does ${serviceName.toLowerCase()} cost in ${city}?"
      2. "How long does ${serviceName.toLowerCase()} take?"
      3. "Do I need ${serviceName.toLowerCase()}?" (signs question)
      4. "What's included in your ${serviceName.toLowerCase()} service?"
      5. "Do you offer warranties on ${serviceName.toLowerCase()}?"
    - Each answer 2-4 sentences, direct and helpful
    - Use FAQPage schema structure

11. FINAL CTA SECTION
    Title: "Ready to Get Started?"
    - Reinforce main value proposition
    - Urgency element: "Schedule today for [benefit]"
    - DUAL CTAs again: Phone number + Form CTA
    - Business hours
    - Emergency availability (if applicable)

=== CTA FREQUENCY RULE ===
Include a CTA button every 400-500 words throughout the page.
Alternate between "Get Free Quote" and "Call Now" CTAs.

OUTPUT FORMAT:
Return a JSON object with:
{
  "pageTitle": "SEO title under 60 chars with ${serviceName} + ${city}",
  "metaDescription": "155-160 chars with service, location, and CTA",
  "h1": "Main heading with primary keyword",
  "sections": [
    {
      "id": "hero",
      "type": "hero",
      "title": "...",
      "content": {
        "headline": "...",
        "subheadline": "...",
        "primaryCta": {"text": "Get Free Quote", "link": "/contact"},
        "secondaryCta": {"text": "Call Now: XXX-XXX-XXXX", "link": "tel:..."},
        "trustBadges": ["...", "...", "..."]
      }
    },
    {
      "id": "problem-signs",
      "type": "list",
      "title": "Common Signs You Need ${serviceName}",
      "items": ["Sign 1", "Sign 2", ...]
    },
    // ... all other sections with appropriate structure
  ],
  "schema": {
    "faqSchema": [...],
    "localBusinessSchema": {...},
    "serviceSchema": {...}
  }
}`;
}

// Location Page Prompt - Enhanced with Relentless Digital Formula
function generateLocationPagePrompt(params: PagePromptParams): string {
  const { companyProfile, pageConfig } = params;
  const city = pageConfig.city || companyProfile.headquarters;
  const tone = pageConfig.tone || "professional yet friendly";
  const service = pageConfig.serviceName || companyProfile.services[0] || "Services";
  const yearsInBusiness = companyProfile.yearsInBusiness || 10;

  return `You are an expert local SEO copywriter creating a high-converting location page for "${service}" in ${city}, ${companyProfile.stateAbbr} using the Relentless Digital formula.

COMPANY INFORMATION:
- Company Name: ${companyProfile.name}
- Industry: ${companyProfile.industryType}
- Headquarters: ${companyProfile.headquarters}, ${companyProfile.stateAbbr}
- Phone: ${companyProfile.phone || "(XXX) XXX-XXXX"}
- Services: ${companyProfile.services.join(", ")}
- USPs: ${companyProfile.usps.join(", ")}
- Years in Business: ${yearsInBusiness}+
${companyProfile.certifications?.length ? `- Certifications: ${companyProfile.certifications.join(", ")}` : ""}

LOCATION DETAILS:
- Target City: ${city}
- State: ${companyProfile.state} (${companyProfile.stateAbbr})
- Service: ${service}

SEO REQUIREMENTS:
- Primary Keyword: ${pageConfig.primaryKeyword}
- Secondary Keywords: ${pageConfig.secondaryKeywords.join(", ")}
- Tone: ${tone}
- Target Word Count: 2,500-3,500 words (THIS IS CRITICAL FOR LOCAL SEO)

=== RELENTLESS DIGITAL LOCATION PAGE FORMULA ===
This structure generates unique, high-ranking local pages. MUST mention "${city}" 10-15 times naturally throughout.

Create a comprehensive location page with these sections IN ORDER:

1. HERO SECTION (Above the fold)
   - H1: "${service} in ${city}, ${companyProfile.stateAbbr}" (exact match)
   - Subheadline: "Trusted by ${city} homeowners for ${yearsInBusiness}+ years"
   - DUAL CTAs:
     * Primary: "Get Your Free ${city} Quote"
     * Secondary: "Call ${city} Office: ${companyProfile.phone || '(XXX) XXX-XXXX'}"
   - Trust badges row: ${yearsInBusiness}+ Years | Licensed & Insured | 5-Star ${city} Reviews
   - Hero image: [IMAGE:${city.toLowerCase().replace(/\s/g, '-')}-${service.toLowerCase().replace(/\s/g, '-')}]

2. SERVICE LIST SIDEBAR (Position on right)
   Title: "Our ${city} Services"
   - Link to all services: ${companyProfile.services.slice(0, 8).join(", ")}
   - Each as [LINK:city-service-slug]
   - Highlight "${service}" as current

3. CONTACT FORM SECTION (10 fields - high intent capture)
   Title: "Request Your Free ${city} Estimate"
   Fields: Name, Email, Phone, Address, City, Service Needed, Project Size, Timeline, Budget Range, Message
   - "We respond within 2 hours during business hours"

4. CITY-SPECIFIC INTRODUCTION (300-400 words)
   Title: "Your Trusted ${service} Experts in ${city}, ${companyProfile.stateAbbr}"
   - Welcome statement mentioning ${city} immediately
   - Why ${companyProfile.name} is the right choice for ${city} residents
   - Local knowledge: "${city}'s unique [climate/architecture/regulations]..."
   - Community connection: "As neighbors serving ${city} for ${yearsInBusiness}+ years..."
   - Weave "${city}" naturally 3-4 times in this section
   - End with CTA: "Ready for ${city}'s best ${service}?"

5. TESTIMONIALS SECTION (With Schema)
   Title: "What ${city} Residents Say About ${companyProfile.name}"
   - 3 testimonials with:
     * Name: "[First] [Last Initial]."
     * Location: "${city}, ${companyProfile.stateAbbr}"
     * Rating: 5 stars
     * Quote: Include "${service}" and outcome
     * Service date indicator
   - Schema markup for AggregateRating

6. MAIN CONTENT SECTION 1 - SERVICE OVERVIEW (400-500 words)
   Title: "Professional ${service} in ${city}"
   - What this service includes
   - Why ${city} properties need this service
   - Local considerations (weather, building types, etc.)
   - Benefits specific to ${city} homeowners
   - Mention "${city}" 2-3 times

7. MAIN CONTENT SECTION 2 - WHY CHOOSE US (400-500 words)
   Title: "Why ${city} Homeowners Choose ${companyProfile.name}"
   - 5-6 differentiators as bullet points with explanations:
     * ${yearsInBusiness}+ years serving ${city} and surrounding areas
     * ${companyProfile.certifications?.length ? companyProfile.certifications[0] : "Licensed and certified"} professionals
     * Local team - we know ${city}'s needs
     * Guaranteed satisfaction
     * Competitive ${city} pricing
     * 24/7 emergency service
   - MID-PAGE CTA: "Schedule Your Free ${city} Consultation"

8. MAIN CONTENT SECTION 3 - SERVICE PROCESS (350-400 words)
   Title: "Our ${service} Process in ${city}"
   - 5-step numbered process:
     1. Contact our ${city} team
     2. Free on-site ${city} inspection
     3. Transparent ${city}-competitive quote
     4. Professional service delivery
     5. ${city} satisfaction guarantee
   - What ${city} customers can expect

9. BENEFITS LIST SECTION
   Title: "Benefits of Professional ${service} in ${city}"
   - 6-8 benefits as bullet points (featured snippet format)
   - Each benefit is customer-outcome focused
   - Use power words: protect, save, increase, prevent, guarantee

10. GUIDE SECTION (5-Point Numbered List)
    Title: "5 Things ${city} Homeowners Should Know About ${service}"
    - Educational content structured for featured snippets
    - Each point 2-3 sentences
    - Include local insights about ${city}

11. DRIVING DIRECTIONS SECTION (Unique Content - 400+ words)
    Title: "Getting to ${companyProfile.name} from ${city}"
    - Detailed driving directions from ${city} center to office
    - Include landmarks, major roads, neighborhoods passed
    - Travel time estimate
    - Alternative routes
    - Office address and parking info
    - This adds 400+ unique words per city page

12. FAQ ACCORDION (5 Questions - Schema Markup)
    Title: "Frequently Asked Questions About ${service} in ${city}"
    Q1: "How much does ${service.toLowerCase()} cost in ${city}, ${companyProfile.stateAbbr}?"
    Q2: "How long does ${service.toLowerCase()} take in ${city}?"
    Q3: "Do you offer emergency ${service.toLowerCase()} in ${city}?"
    Q4: "What areas of ${city} do you serve?"
    Q5: "Why choose a local ${city} ${service.toLowerCase()} company?"
    - Each answer 2-4 sentences, direct and helpful
    - FAQPage schema structure

13. AREAS SERVED GRID
    Title: "Neighborhoods We Serve in ${city}"
    - List 10-15 neighborhoods/zip codes
    - Each as clickable link to service area
    - Include nearby cities with links
    - "Also serving: [City 1], [City 2], [City 3]..."

14. FINAL CTA SECTION
    Title: "Ready for Expert ${service} in ${city}?"
    - Urgency: "Schedule your free ${city} estimate today"
    - DUAL CTAs: Phone + Form button
    - Hours of operation
    - Emergency contact for ${city} area
    - Trust badges repeat

=== CRITICAL REQUIREMENTS ===
- Mention "${city}" 10-15 times throughout (naturally, not forced)
- Every CTA includes "${city}" reference
- Minimum 2,500 words total
- Include LocalBusiness and Service schema
- All images have ${city}-specific alt text

OUTPUT FORMAT:
Return a JSON object with:
{
  "pageTitle": "${service} in ${city}, ${companyProfile.stateAbbr} | ${companyProfile.name}",
  "metaDescription": "Professional ${service.toLowerCase()} in ${city}, ${companyProfile.stateAbbr}. ${yearsInBusiness}+ years experience. Free estimates. Call today!",
  "h1": "${service} in ${city}, ${companyProfile.stateAbbr}",
  "slug": "${city.toLowerCase().replace(/\\s/g, '-')}-${service.toLowerCase().replace(/\\s/g, '-')}",
  "sections": [...],
  "schema": {
    "localBusiness": {...},
    "service": {...},
    "faqPage": {...}
  },
  "cityMentions": 12
}`;
}

// Blog Post Prompt - Uses enhanced SEO-optimized prompt system
function generateBlogPostPrompt(params: PagePromptParams): string {
  const { companyProfile, pageConfig } = params;
  const topic = pageConfig.topic || pageConfig.title || "Topic";
  const pageTypeConfig = PAGE_TYPES.blog_post;
  const wordCount = companyProfile.preferredWordCount || pageTypeConfig.wordCountRange[1];

  // Use enhanced outline prompt for blog posts
  const enhancedParams: EnhancedPromptParams = {
    companyProfile,
    pageType: "blog_post",
    topic,
    primaryKeyword: pageConfig.primaryKeyword,
    secondaryKeywords: pageConfig.secondaryKeywords || [],
    wordCount,
    location: pageConfig.city,
    customInstructions: pageConfig.customInstructions,
  };

  return generateEnhancedOutlinePrompt(enhancedParams);
}

// News Article Prompt
function generateNewsArticlePrompt(params: PagePromptParams): string {
  const { companyProfile, pageConfig } = params;
  const headline = pageConfig.headline || pageConfig.title || "News";
  const tone = pageConfig.tone || "professional and newsworthy";

  return `You are a professional news writer creating a news article/press release.

COMPANY CONTEXT:
- Company: ${companyProfile.name}
- Industry: ${companyProfile.industryType}
- Location: ${companyProfile.headquarters}, ${companyProfile.stateAbbr}

NEWS DETAILS:
- Headline: ${headline}
- Summary: ${pageConfig.summary || ""}
- Tone: ${tone}
- Target Word Count: 500-1200 words

Create a news article outline following the inverted pyramid structure:

1. HEADLINE
   - Clear, attention-grabbing headline
   - Include key information

2. LEAD PARAGRAPH
   - Who, what, when, where, why
   - Most important information first

3. BODY
   - Supporting details
   - Context and background
   - Statistics or data if relevant

4. QUOTES
   - Quote from company representative
   - Expert perspective if applicable

5. BACKGROUND
   - Company background paragraph
   - Industry context if relevant

6. CONCLUSION
   - Next steps or future outlook
   - Contact information for media

OUTPUT FORMAT:
Return a JSON object with headline, lead, body sections, quotes, and boilerplate.`;
}

// About Page Prompt
function generateAboutPagePrompt(params: PagePromptParams): string {
  const { companyProfile, pageConfig } = params;
  const tone = pageConfig.tone || "warm and trustworthy";

  return `You are creating an About Us page that builds trust and connection.

COMPANY INFORMATION:
- Company: ${companyProfile.name}
- Industry: ${companyProfile.industryType}
- Founded: ${companyProfile.yearFounded || "N/A"}
- Location: ${companyProfile.headquarters}, ${companyProfile.stateAbbr}
- Employees: ${companyProfile.employeeCount || "N/A"}
- USPs: ${companyProfile.usps.join(", ")}

SEO REQUIREMENTS:
- Primary Keyword: ${pageConfig.primaryKeyword}
- Secondary Keywords: ${pageConfig.secondaryKeywords.join(", ")}
- Tone: ${tone}

Create an About Us page outline:

1. HERO SECTION
   - Compelling headline about company identity
   - Brief mission statement

2. OUR STORY
   - How and why the company started
   - Growth and milestones
   - Personal touch from founder/owner

3. MISSION & VALUES
   - Mission statement
   - 3-5 core values with explanations

4. TEAM (optional)
   - Key team members
   - Expertise and certifications
   - Human element

5. CERTIFICATIONS & AWARDS
   - Industry certifications
   - Awards and recognition
   - Memberships

6. COMMUNITY INVOLVEMENT
   - Local community ties
   - Charitable work
   - Sponsorships

7. CTA
   - Invitation to work together
   - Contact information

OUTPUT FORMAT:
Return a JSON object with sections for each area above.`;
}

// Contact Page Prompt
function generateContactPagePrompt(params: PagePromptParams): string {
  const { companyProfile, pageConfig } = params;

  return `You are creating a Contact Us page that makes it easy for customers to reach the company.

COMPANY INFORMATION:
- Company: ${companyProfile.name}
- Phone: ${companyProfile.phone}
- Email: ${companyProfile.email}
- Address: ${companyProfile.address || ""}, ${companyProfile.headquarters}, ${companyProfile.stateAbbr} ${companyProfile.zipCode || ""}
- Service Areas: ${companyProfile.cities.join(", ")}

SEO REQUIREMENTS:
- Primary Keyword: ${pageConfig.primaryKeyword}
- Tone: Helpful and accessible

Create a Contact page outline:

1. HERO SECTION
   - Welcoming headline
   - Brief message about getting in touch

2. CONTACT INFORMATION
   - Phone (prominent)
   - Email
   - Physical address
   - Hours of operation

3. CONTACT FORM
   - Form fields needed
   - What to expect after submission

4. SERVICE AREAS
   - Map or list of areas served
   - Travel radius

5. EMERGENCY CONTACT (if applicable)
   - 24/7 availability
   - Emergency number

OUTPUT FORMAT:
Return a JSON object with contact details and section structure.`;
}

// FAQ Page Prompt
function generateFAQPagePrompt(params: PagePromptParams): string {
  const { companyProfile, pageConfig } = params;

  return `You are creating a comprehensive FAQ page for a ${companyProfile.industryType} business.

COMPANY CONTEXT:
- Company: ${companyProfile.name}
- Industry: ${companyProfile.industryType}
- Services: ${companyProfile.services.join(", ")}
- Location: ${companyProfile.headquarters}, ${companyProfile.stateAbbr}

SEO REQUIREMENTS:
- Primary Keyword: ${pageConfig.primaryKeyword}
- Secondary Keywords: ${pageConfig.secondaryKeywords.join(", ")}

Create an FAQ page outline with questions organized by category:

CATEGORIES TO INCLUDE:
1. General Questions
2. Services & Pricing
3. Scheduling & Availability
4. Service Area
5. Warranties & Guarantees
6. Emergency Services (if applicable)

For each category, include 4-6 relevant questions with brief answers.

OUTPUT FORMAT:
Return a JSON object with categories array, each containing questions and answers.`;
}

// Testimonials Page Prompt
function generateTestimonialsPagePrompt(params: PagePromptParams): string {
  const { companyProfile, pageConfig } = params;

  return `You are creating a Testimonials/Reviews page that showcases customer satisfaction.

COMPANY CONTEXT:
- Company: ${companyProfile.name}
- Industry: ${companyProfile.industryType}
- Services: ${companyProfile.services.join(", ")}
- Location: ${companyProfile.headquarters}, ${companyProfile.stateAbbr}

Create a testimonials page outline:

1. HERO SECTION
   - Headline about customer satisfaction
   - Overall rating/stats summary

2. FEATURED TESTIMONIALS
   - 3-4 detailed testimonials
   - Include service type, location, specific results

3. TESTIMONIAL GRID
   - Placeholder structure for multiple reviews
   - Organized by service type

4. STATS SECTION
   - Years in business
   - Customers served
   - 5-star reviews count
   - Other relevant metrics

5. CASE STUDIES (optional)
   - 1-2 detailed success stories
   - Before/after if applicable

6. CTA
   - Invitation to become a happy customer
   - Contact information

OUTPUT FORMAT:
Return a JSON object with testimonial placeholders and section structure.`;
}

// Custom Page Prompt
function generateCustomPagePrompt(params: PagePromptParams): string {
  const { companyProfile, pageConfig } = params;
  const customInstructions = pageConfig.customInstructions || "";

  return `You are creating a custom page for a ${companyProfile.industryType} business.

COMPANY CONTEXT:
- Company: ${companyProfile.name}
- Industry: ${companyProfile.industryType}
- Location: ${companyProfile.headquarters}, ${companyProfile.stateAbbr}

PAGE DETAILS:
- Title: ${pageConfig.title || "Custom Page"}
- Primary Keyword: ${pageConfig.primaryKeyword}
- Secondary Keywords: ${pageConfig.secondaryKeywords.join(", ")}

CUSTOM INSTRUCTIONS:
${customInstructions}

REQUESTED SECTIONS:
${pageConfig.sections?.join(", ") || "Hero, Content, CTA"}

Create a page outline based on the specifications above. Include SEO-optimized headings and content structure.

OUTPUT FORMAT:
Return a JSON object with pageTitle, metaDescription, and sections array.`;
}

// Content generation prompt (after outline is created)
export function getPageContentPrompt(
  pageType: PageType,
  outline: Record<string, unknown>,
  params: PagePromptParams
): string {
  const { companyProfile, pageConfig } = params;

  // For blog posts, use the enhanced content prompt
  if (pageType === "blog_post") {
    return getEnhancedBlogContentPrompt(outline, params);
  }

  // For other page types, use the standard prompt
  const tone = pageConfig.tone || "professional yet friendly";

  return `You are an expert SEO copywriter. Generate the full HTML content for this ${pageType} based on the outline below.

COMPANY: ${companyProfile.name}
INDUSTRY: ${companyProfile.industryType}
LOCATION: ${companyProfile.headquarters}, ${companyProfile.stateAbbr}

OUTLINE:
${JSON.stringify(outline, null, 2)}

SEO REQUIREMENTS:
- Primary Keyword: ${pageConfig.primaryKeyword} (use naturally 3-5 times)
- Secondary Keywords: ${pageConfig.secondaryKeywords.join(", ")} (use each 1-2 times)
- Tone: ${tone}

HTML STRUCTURE REQUIREMENTS:
1. Use semantic HTML5 elements
2. Include proper heading hierarchy (H1, H2, H3)
3. Use image placeholders: [IMAGE:0], [IMAGE:1], etc.
4. Include class names for styling
5. Add internal link placeholders: [LINK:page-slug]

OUTPUT:
Return clean HTML content only, no markdown, no code blocks.
Start with the hero section and include all sections from the outline.

Example structure:
<section class="hero">
  <div class="hero-content">
    <h1>...</h1>
    <p>...</p>
    <a href="/contact" class="cta-button">Get Quote</a>
  </div>
  <img src="[IMAGE:0]" alt="..." class="hero-image" />
</section>

<section class="services">
  <h2>...</h2>
  ...
</section>

Continue with all sections...`;
}

// Enhanced blog content prompt using the full SEO system
function getEnhancedBlogContentPrompt(
  outline: Record<string, unknown>,
  params: PagePromptParams
): string {
  const { companyProfile, pageConfig } = params;
  const topic = pageConfig.topic || pageConfig.title || "Topic";
  const pageTypeConfig = PAGE_TYPES.blog_post;
  const wordCount = companyProfile.preferredWordCount || pageTypeConfig.wordCountRange[1];
  const keywordReqs = calculateKeywordRequirements(wordCount);
  const brandVoiceDesc = getBrandVoiceDescription(companyProfile.brandVoice, companyProfile.customBrandVoice);
  const writingStyleDesc = getWritingStyleDescription(companyProfile.writingStyle, companyProfile.customWritingStyle);
  const targetLocation = pageConfig.city || companyProfile.headquarters;

  return `You are an elite SEO copywriting specialist creating a complete, award-winning blog post.

# TASK
Generate the FULL HTML content for a ${wordCount}-word SEO-optimized blog post that ranks #1 on Google.

# COMPANY CONTEXT
Company: ${companyProfile.name}
Industry: ${companyProfile.industryType}
Location: ${targetLocation}, ${companyProfile.stateAbbr}
Website: ${companyProfile.website || "N/A"}
USPs: ${companyProfile.usps.join(", ")}
Services: ${companyProfile.services.slice(0, 6).join(", ")}
${companyProfile.certifications?.length ? `Certifications: ${companyProfile.certifications.join(", ")}` : ""}
${companyProfile.yearsInBusiness ? `Years in Business: ${companyProfile.yearsInBusiness}+` : ""}

# TOPIC: ${topic}

# OUTLINE TO FOLLOW:
${JSON.stringify(outline, null, 2)}

# CRITICAL SEO REQUIREMENTS

## Keyword Integration (MANDATORY):
- Primary Keyword: "${pageConfig.primaryKeyword}"
- MUST appear: ${keywordReqs.minMentions}-${keywordReqs.maxMentions} times total
- Place in: H1, first paragraph, 2+ H2 headers, conclusion
- Secondary Keywords (use each 1-2 times): ${pageConfig.secondaryKeywords.join(", ")}

## Word Count: EXACTLY ${wordCount} words (excluding HTML tags)

# VOICE & STYLE
Brand Voice: ${companyProfile.brandVoice || "professional"}
${brandVoiceDesc}

Writing Style: ${companyProfile.writingStyle || "conversational"}
${writingStyleDesc}

# HUMAN-LIKE AUTHENTICITY
To pass AI detection and read naturally:
- Include 3-5 subtle grammar variations (split infinitives, sentences ending with prepositions)
- Vary sentence length dramatically (5-word to 25+ word sentences)
- Use contractions naturally (you're, we've, it's, don't)
- Add 1-2 rhetorical questions per major section
- Use transitional phrases that feel conversational
- Occasionally start sentences with "And" or "But"

# CONVERSION ELEMENTS (Include All)

## CTAs (4 total, strategically placed):
1. After intro: Soft CTA (e.g., "Download our free guide...")
2. Mid-content: Direct CTA (e.g., "Schedule your free consultation...")
3. After case study/example: Social proof CTA (e.g., "See our 5-star reviews...")
4. Conclusion: Strong CTA (e.g., "Contact us today for...")

## Trust Signals to weave in:
${companyProfile.usps.slice(0, 3).map((usp) => `- ${usp}`).join("\n")}
${companyProfile.yearsInBusiness ? `- ${companyProfile.yearsInBusiness}+ years serving ${companyProfile.state}` : ""}
${companyProfile.projectsCompleted ? `- ${companyProfile.projectsCompleted}+ projects completed` : ""}

# HTML OUTPUT FORMAT

Return clean HTML with:
- Proper semantic structure (article, section, h1, h2, h3)
- Image placeholders: [IMAGE:0], [IMAGE:1], [IMAGE:2]
- Each image with suggested alt text in comments
- Internal link placeholders: [INTERNAL_LINK:service], [INTERNAL_LINK:location]
- FAQ section with schema-ready markup
- CTA buttons with class="cta-button"

## Required Structure:
\`\`\`html
<!-- META TITLE: [55-60 chars with keyword] -->
<!-- META DESCRIPTION: [155-160 chars with keyword and CTA] -->
<!-- PRIMARY KEYWORD: ${pageConfig.primaryKeyword} -->
<!-- WORD COUNT: ${wordCount} -->

<article class="blog-post">
  <header class="blog-header">
    <h1>[Magnetic headline with primary keyword]</h1>
    <p class="blog-meta">[Author] | [Date] | [Read time]</p>
  </header>

  <!-- [IMAGE:0] - Alt: ${pageConfig.primaryKeyword} hero image -->
  <img src="[IMAGE:0]" alt="${pageConfig.primaryKeyword} - featured image" class="featured-image" />

  <nav class="table-of-contents">
    <h2>Table of Contents</h2>
    <ul>
      <li><a href="#section1">Section 1 Title</a></li>
      ...
    </ul>
  </nav>

  <section class="blog-intro">
    <p>[Hook paragraph - problem agitation]</p>
    <p>[Solution preview with expertise]</p>
  </section>

  <section id="section1" class="blog-section">
    <h2>[H2 with keyword variation]</h2>
    ...
  </section>

  ... [Continue with all outlined sections] ...

  <section class="key-takeaways">
    <h2>Key Takeaways</h2>
    <ul>
      <li>[Actionable point 1]</li>
      ...
    </ul>
  </section>

  <section class="faq-section" itemscope itemtype="https://schema.org/FAQPage">
    <h2>Frequently Asked Questions</h2>
    <div itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
      <h3 itemprop="name">[Question]</h3>
      <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
        <p itemprop="text">[Answer]</p>
      </div>
    </div>
    ...
  </section>

  <section class="conclusion">
    <h2>[Conclusion heading]</h2>
    <p>[Summary and value reinforcement]</p>
    <a href="/contact" class="cta-button">Contact ${companyProfile.name} Today</a>
  </section>
</article>
\`\`\`

${pageConfig.customInstructions ? `# CUSTOM INSTRUCTIONS\n${pageConfig.customInstructions}` : ""}

Now generate the complete blog post following ALL requirements above.`;
}
