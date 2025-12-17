// lib/page-types.ts
// Page type configurations for different website pages

export type PageType =
  | "home_page"
  | "service_page"
  | "location_page"
  | "blog_post"
  | "news_article"
  | "about_page"
  | "contact_page"
  | "faq_page"
  | "testimonials_page"
  | "custom";

export interface PageTypeConfig {
  type: PageType;
  label: string;
  icon: string;
  description: string;
  requiredFields: string[];
  optionalFields: string[];
  defaultSections: string[];
  imageCount: number;
  wordCountRange: [number, number];
  schemaTypes: string[];
}

export const PAGE_TYPES: Record<PageType, PageTypeConfig> = {
  home_page: {
    type: "home_page",
    label: "Home Page",
    icon: "🏠",
    description: "Main landing page with hero, services overview, testimonials, and primary CTA",
    requiredFields: ["companyName", "tagline", "primaryService"],
    optionalFields: ["features", "testimonials", "awards", "stats"],
    defaultSections: [
      "hero",
      "services_overview",
      "why_choose_us",
      "featured_work",
      "testimonials",
      "service_areas",
      "cta",
    ],
    imageCount: 4,
    wordCountRange: [800, 1500],
    schemaTypes: ["LocalBusiness", "WebPage"],
  },

  service_page: {
    type: "service_page",
    label: "Service Page",
    icon: "🔧",
    description: "Detailed page for a specific service with benefits, process, and FAQ",
    requiredFields: ["serviceName", "serviceDescription"],
    optionalFields: ["benefits", "process", "pricing", "faq", "relatedServices"],
    defaultSections: [
      "hero",
      "service_description",
      "benefits",
      "our_process",
      "why_choose_us",
      "pricing_info",
      "testimonials",
      "faq",
      "cta",
    ],
    imageCount: 4,
    wordCountRange: [1500, 2500],
    schemaTypes: ["Service", "FAQPage"],
  },

  location_page: {
    type: "location_page",
    label: "Location Page",
    icon: "📍",
    description: "City/area-specific page for local SEO targeting",
    requiredFields: ["city", "state"],
    optionalFields: ["neighborhoods", "localStats", "areaDescription", "serviceAreas"],
    defaultSections: [
      "hero",
      "area_overview",
      "services_in_area",
      "neighborhoods_served",
      "local_expertise",
      "local_testimonials",
      "faq",
      "cta",
    ],
    imageCount: 3,
    wordCountRange: [1500, 2500],
    schemaTypes: ["LocalBusiness", "Service", "FAQPage"],
  },

  blog_post: {
    type: "blog_post",
    label: "Blog Post",
    icon: "📝",
    description: "Educational content for SEO, audience engagement, and thought leadership",
    requiredFields: ["topic", "location"],
    optionalFields: ["category", "tags", "author"],
    defaultSections: [
      "hero",
      "table_of_contents",
      "introduction",
      "content_sections",
      "key_takeaways",
      "faq",
      "cta",
    ],
    imageCount: 3,
    wordCountRange: [1500, 2500],
    schemaTypes: ["BlogPosting", "FAQPage"],
  },

  news_article: {
    type: "news_article",
    label: "News Article",
    icon: "📰",
    description: "Timely news, announcements, or press releases",
    requiredFields: ["headline", "summary"],
    optionalFields: ["quotes", "sources", "dateline"],
    defaultSections: [
      "headline",
      "lead_paragraph",
      "body",
      "quotes",
      "background",
      "conclusion",
    ],
    imageCount: 2,
    wordCountRange: [500, 1200],
    schemaTypes: ["NewsArticle"],
  },

  about_page: {
    type: "about_page",
    label: "About Us Page",
    icon: "👥",
    description: "Company history, mission, team, and values",
    requiredFields: ["companyName", "companyDescription"],
    optionalFields: ["history", "mission", "values", "team", "awards"],
    defaultSections: [
      "hero",
      "our_story",
      "mission_values",
      "team",
      "certifications",
      "community",
      "cta",
    ],
    imageCount: 4,
    wordCountRange: [1000, 2000],
    schemaTypes: ["AboutPage", "Organization"],
  },

  contact_page: {
    type: "contact_page",
    label: "Contact Page",
    icon: "📞",
    description: "Contact information, form, and service area details",
    requiredFields: ["companyName", "phone"],
    optionalFields: ["address", "email", "hours", "serviceAreas"],
    defaultSections: [
      "hero",
      "contact_info",
      "contact_form",
      "service_areas",
      "hours",
      "map",
    ],
    imageCount: 1,
    wordCountRange: [300, 800],
    schemaTypes: ["ContactPage", "LocalBusiness"],
  },

  faq_page: {
    type: "faq_page",
    label: "FAQ Page",
    icon: "❓",
    description: "Frequently asked questions organized by category",
    requiredFields: ["companyName"],
    optionalFields: ["categories", "questions"],
    defaultSections: [
      "hero",
      "faq_categories",
      "faq_list",
      "still_have_questions",
      "cta",
    ],
    imageCount: 1,
    wordCountRange: [1000, 2000],
    schemaTypes: ["FAQPage"],
  },

  testimonials_page: {
    type: "testimonials_page",
    label: "Testimonials Page",
    icon: "⭐",
    description: "Customer reviews, testimonials, and case studies",
    requiredFields: ["companyName"],
    optionalFields: ["testimonials", "caseStudies", "stats"],
    defaultSections: [
      "hero",
      "featured_testimonials",
      "testimonial_grid",
      "stats",
      "case_studies",
      "cta",
    ],
    imageCount: 2,
    wordCountRange: [800, 1500],
    schemaTypes: ["WebPage", "Review"],
  },

  custom: {
    type: "custom",
    label: "Custom Page",
    icon: "✨",
    description: "Create a custom page with your own sections and content",
    requiredFields: ["title"],
    optionalFields: ["sections", "customInstructions"],
    defaultSections: ["hero", "content", "cta"],
    imageCount: 2,
    wordCountRange: [500, 3000],
    schemaTypes: ["WebPage"],
  },
};

// Core page options (most common)
export const CORE_PAGE_OPTIONS = [
  "home_page",
  "service_page",
  "location_page",
  "about_page",
  "contact_page",
] as const;

// Content page options
export const CONTENT_PAGE_OPTIONS = [
  "blog_post",
  "news_article",
  "faq_page",
  "testimonials_page",
] as const;

// Get all page type options for selector
export function getPageTypeOptions(): { value: PageType; label: string; icon: string; description: string }[] {
  return Object.values(PAGE_TYPES).map((config) => ({
    value: config.type,
    label: config.label,
    icon: config.icon,
    description: config.description,
  }));
}

// Get page type config
export function getPageTypeConfig(pageType: PageType): PageTypeConfig {
  return PAGE_TYPES[pageType];
}

// Brand Voice Options
export const BRAND_VOICE_OPTIONS = [
  { value: "professional", label: "Professional", description: "Formal, authoritative, industry expert" },
  { value: "friendly", label: "Friendly", description: "Warm, approachable, conversational" },
  { value: "authoritative", label: "Authoritative", description: "Expert, confident, thought leader" },
  { value: "educational", label: "Educational", description: "Informative, helpful, teacher-like" },
  { value: "innovative", label: "Innovative", description: "Forward-thinking, cutting-edge, tech-savvy" },
  { value: "local", label: "Local/Community", description: "Neighborhood-focused, community-oriented" },
  { value: "luxury", label: "Premium/Luxury", description: "High-end, exclusive, sophisticated" },
  { value: "value", label: "Value-Focused", description: "Budget-conscious, practical, ROI-focused" },
  { value: "custom", label: "Custom", description: "Define your own brand voice" },
] as const;

export type BrandVoice = typeof BRAND_VOICE_OPTIONS[number]["value"] | string;

// Writing Style Options
export const WRITING_STYLE_OPTIONS = [
  { value: "conversational", label: "Conversational", description: "Natural, easy to read, engaging" },
  { value: "formal", label: "Formal", description: "Business-like, structured, professional" },
  { value: "storytelling", label: "Storytelling", description: "Narrative-driven, emotional, relatable" },
  { value: "data-driven", label: "Data-Driven", description: "Facts, statistics, research-based" },
  { value: "actionable", label: "Actionable", description: "Step-by-step, how-to, practical" },
  { value: "persuasive", label: "Persuasive", description: "Sales-focused, compelling, benefit-oriented" },
  { value: "custom", label: "Custom", description: "Define your own writing style" },
] as const;

export type WritingStyle = typeof WRITING_STYLE_OPTIONS[number]["value"] | string;

// Target Audience Options
export const TARGET_AUDIENCE_OPTIONS = [
  { value: "homeowners", label: "Homeowners", description: "Residential property owners" },
  { value: "business_owners", label: "Business Owners", description: "Small to medium business owners" },
  { value: "property_managers", label: "Property Managers", description: "Commercial property managers" },
  { value: "contractors", label: "Contractors/Builders", description: "Construction professionals" },
  { value: "real_estate", label: "Real Estate Professionals", description: "Agents, investors, developers" },
  { value: "facilities", label: "Facilities Managers", description: "Corporate facilities teams" },
  { value: "hoa", label: "HOA Boards", description: "Homeowner association decision makers" },
  { value: "mixed", label: "Mixed Audience", description: "Both residential and commercial" },
  { value: "custom", label: "Custom", description: "Define your own target audience" },
] as const;

export type TargetAudienceType = typeof TARGET_AUDIENCE_OPTIONS[number]["value"] | string;

// Company Profile interface
export interface CompanyProfile {
  // Basic Info
  name: string;
  tagline?: string;
  website: string;
  phone: string;
  email: string;
  yearFounded?: number;
  employeeCount?: string;

  // Location
  state: string;
  stateAbbr: string;
  headquarters: string;
  address?: string;
  zipCode?: string;
  serviceRadius?: number;
  region?: string;
  cities: string[];

  // Industry
  industryType: string;
  customIndustryName?: string; // Used when industryType is "custom"
  services: string[];
  usps: string[];

  // Target Market
  audience: "homeowners" | "commercial" | "both" | "property";
  targetAudience?: TargetAudienceType;
  targetAudienceDescription?: string;
  homeValue?: string;
  climate?: string;
  painPoints?: string[];

  // Branding & Content Style
  brandVoice?: BrandVoice;
  customBrandVoice?: string; // Used when brandVoice is "custom"
  writingStyle?: WritingStyle;
  customWritingStyle?: string; // Used when writingStyle is "custom"
  customTargetAudience?: string; // Used when targetAudience is "custom"
  competitors?: string[];

  // Social & Online Presence
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
    youtube?: string;
    yelp?: string;
    googleBusiness?: string;
  };

  // Certifications & Credibility
  certifications?: string[];
  awards?: string[];
  yearsInBusiness?: number;
  projectsCompleted?: number;

  // Content Preferences
  preferredWordCount?: number;
  includeCTAs?: boolean;
  includeLeadMagnets?: boolean;
  includeStats?: boolean;
}

// Page Entry for Page Library (internal linking)
export interface PageEntry {
  id: string;
  type: PageType;
  title: string;
  slug: string;
  url: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  metaTitle?: string;
  metaDescription?: string;
  status: "planned" | "draft" | "published";
  publishedUrl?: string;
  createdAt: string;
  updatedAt?: string;
  linkedFrom: string[]; // IDs of pages linking TO this page
  linksTo: string[]; // IDs of pages this page links TO
}

// Page Library
export interface PageLibrary {
  pages: PageEntry[];
  lastUpdated: string;
}

// SEO Plan interfaces
export interface PillarPage {
  city: string;
  slug: string;
  priority: "HIGHEST" | "HIGH" | "MEDIUM" | "LOW";
  url: string;
  volume: number;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
}

export interface BlogTopic {
  id: number;
  category: string;
  title: string;
  template: string;
  slug: string;
  url: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  wordCount: string;
  linkTo: string;
}

export interface KeywordData {
  city: string;
  category: string;
  keyword: string;
  volume: number;
  difficulty: "Low" | "Medium" | "High";
  intent: "Commercial" | "Informational" | "Transactional";
  targetPage: string;
}

export interface CalendarEntry {
  week: number;
  date: string;
  title: string;
  type: PageType;
  category?: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: "Planned" | "In Progress" | "Published";
}

export interface SEOPlan {
  companyProfile: CompanyProfile;
  pillarPages: PillarPage[];
  blogTopics: BlogTopic[];
  keywords: KeywordData[];
  calendar: CalendarEntry[];
  recommendations: string[];
  generatedAt: string;
}

// Generate URL slug from title
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 60);
}

// Generate page URL based on type
export function generatePageUrl(pageType: PageType, slug: string, city?: string): string {
  switch (pageType) {
    case "home_page":
      return "/";
    case "service_page":
      return `/services/${slug}/`;
    case "location_page":
      return `/locations/${slug}/`;
    case "blog_post":
      return `/blog/${slug}/`;
    case "news_article":
      return `/news/${slug}/`;
    case "about_page":
      return "/about/";
    case "contact_page":
      return "/contact/";
    case "faq_page":
      return "/faq/";
    case "testimonials_page":
      return "/testimonials/";
    default:
      return `/${slug}/`;
  }
}
