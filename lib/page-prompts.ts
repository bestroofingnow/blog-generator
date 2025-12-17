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

// Service Page Prompt
function generateServicePagePrompt(params: PagePromptParams): string {
  const { companyProfile, pageConfig } = params;
  const serviceName = pageConfig.serviceName || pageConfig.title || "Service";
  const tone = pageConfig.tone || "professional yet friendly";

  return `You are an expert SEO copywriter creating a service page outline for "${serviceName}".

COMPANY INFORMATION:
- Company Name: ${companyProfile.name}
- Industry: ${companyProfile.industryType}
- Location: ${companyProfile.headquarters}, ${companyProfile.stateAbbr}
- All Services: ${companyProfile.services.join(", ")}
- USPs: ${companyProfile.usps.join(", ")}

SERVICE DETAILS:
- Service Name: ${serviceName}
- Service Description: ${pageConfig.serviceDescription || ""}

SEO REQUIREMENTS:
- Primary Keyword: ${pageConfig.primaryKeyword}
- Secondary Keywords: ${pageConfig.secondaryKeywords.join(", ")}
- Tone: ${tone}
- Target Word Count: 1500-2500 words

Create a comprehensive service page outline with the following sections:

1. HERO SECTION
   - Service-focused headline with primary keyword
   - Brief value proposition (what problem this solves)
   - Primary CTA

2. SERVICE DESCRIPTION
   - What is this service?
   - Who needs it?
   - When is it needed?
   - Clear explanation for someone unfamiliar

3. BENEFITS (4-6 benefits)
   - Each benefit with customer-focused explanation
   - Connect to pain points this service solves

4. OUR PROCESS / HOW IT WORKS
   - Step-by-step process (4-6 steps)
   - What customer can expect
   - Timeline if applicable

5. WHY CHOOSE US FOR THIS SERVICE
   - Specific expertise in this service
   - Certifications or training
   - Equipment or techniques used

6. PRICING / INVESTMENT (optional)
   - General pricing guidance
   - Factors that affect cost
   - Financing options if available

7. TESTIMONIALS
   - 2-3 testimonials specific to this service

8. FAQ SECTION
   - 5-8 frequently asked questions about this service
   - Include common concerns and objections

9. CALL TO ACTION
   - Service-specific CTA
   - Contact options

OUTPUT FORMAT:
Return a JSON object with sections array, each section having id, type, title, content, and any subsections.`;
}

// Location Page Prompt
function generateLocationPagePrompt(params: PagePromptParams): string {
  const { companyProfile, pageConfig } = params;
  const city = pageConfig.city || companyProfile.headquarters;
  const tone = pageConfig.tone || "professional yet friendly";

  return `You are an expert local SEO copywriter creating a location-specific page for ${city}, ${companyProfile.stateAbbr}.

COMPANY INFORMATION:
- Company Name: ${companyProfile.name}
- Industry: ${companyProfile.industryType}
- Headquarters: ${companyProfile.headquarters}, ${companyProfile.stateAbbr}
- Services: ${companyProfile.services.join(", ")}
- USPs: ${companyProfile.usps.join(", ")}

LOCATION DETAILS:
- Target City: ${city}
- State: ${companyProfile.state} (${companyProfile.stateAbbr})

SEO REQUIREMENTS:
- Primary Keyword: ${pageConfig.primaryKeyword}
- Secondary Keywords: ${pageConfig.secondaryKeywords.join(", ")}
- Tone: ${tone}
- Target Word Count: 1500-2500 words

IMPORTANT: This is a LOCAL SEO page. Include location-specific content throughout.

Create a comprehensive location page outline with the following sections:

1. HERO SECTION
   - Location-focused headline: "[Service] in ${city}, ${companyProfile.stateAbbr}"
   - Local value proposition
   - Primary CTA

2. AREA OVERVIEW
   - Brief description of ${city}
   - Why local expertise matters here
   - Connection to community

3. SERVICES IN ${city.toUpperCase()}
   - Services available in this area
   - Any location-specific considerations
   - Local pricing factors if relevant

4. NEIGHBORHOODS / AREAS SERVED
   - List specific neighborhoods, zip codes, or nearby areas
   - Coverage details
   - Travel/service radius

5. LOCAL EXPERTISE
   - Experience serving ${city} specifically
   - Understanding of local conditions (weather, building types, regulations)
   - Local projects or case studies

6. LOCAL TESTIMONIALS
   - 2-3 testimonials from ${city} customers
   - Include neighborhood names when possible

7. FAQ SECTION
   - Location-specific FAQs
   - "How long to get to ${city}?"
   - "Do you serve [nearby area]?"
   - Local regulation questions

8. CALL TO ACTION
   - Location-specific CTA
   - Mention serving ${city} area
   - Local phone number if different

OUTPUT FORMAT:
Return a JSON object with location-optimized sections.`;
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
