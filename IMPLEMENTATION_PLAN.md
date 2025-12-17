# Page Creation & SEO Planning Feature - Implementation Plan

## Overview

Add a comprehensive page creation system that allows users to:
1. Generate different types of SEO-optimized pages (Home, Service, Location, Blog, News)
2. Plan their entire website content strategy using integrated SEO tools
3. Maintain internal linking consistency across all generated pages
4. Publish directly to WordPress or GoHighLevel

---

## Phase 1: Industry Configuration & SEO Planning Integration

### 1.1 Create Industry Configuration Data (`lib/industries.ts`)

Port the INDUSTRIES configuration from the SEO HTML tool:

```typescript
export interface IndustryConfig {
  name: string;
  icon: string;
  schemaType: string;
  gbpCategory: string;
  urlSlug: string;
  serviceNoun: string;
  servicePlural: string;
  providerNoun: string;
  description: string;
  services: {
    core: ServiceOption[];
    commercial: ServiceOption[];
    specialty: ServiceOption[];
  };
  usps: ServiceOption[];
  directories: Directory[];
  blogCategories: string[];
}

export interface ServiceOption {
  value: string;
  checked: boolean;
}

export interface Directory {
  name: string;
  url: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

export const INDUSTRIES: Record<string, IndustryConfig> = {
  roofing: { /* ... */ },
  hvac: { /* ... */ },
  plumbing: { /* ... */ },
  electrical: { /* ... */ },
  realtor: { /* ... */ },
  landscaping: { /* ... */ },
  // ... 16 total industries
};
```

### 1.2 Create Blog Templates Data (`lib/blog-templates.ts`)

Port BLOGS_BY_INDUSTRY templates:

```typescript
export interface BlogCategory {
  name: string;
  priority: 1 | 2 | 3;
  industries: string[]; // "all" or specific industry keys
  topics: string[]; // Templates with {city}, {state}, {year}, {company}, {industry}
}

export const BLOG_TEMPLATES: Record<string, BlogCategory> = {
  insurance: {
    name: "💰 Insurance & Claims",
    priority: 1,
    industries: ["roofing"],
    topics: [
      "How to Maximize Your Insurance Claim for Roof Storm Damage in {city}",
      // ...
    ]
  },
  // ... all categories
};
```

---

## Phase 2: Company Profile & Page Library State

### 2.1 Company Profile Interface

```typescript
interface CompanyProfile {
  // Basic Info
  name: string;
  website: string;
  phone: string;
  email: string;
  yearFounded: number;
  employeeCount: string;

  // Location
  state: string;
  stateAbbr: string;
  headquarters: string;
  address: string;
  zipCode: string;
  serviceRadius: number;
  region: string;
  cities: string[]; // Service areas

  // Industry
  industryType: string;
  services: string[];
  usps: string[];

  // Target Market
  audience: "homeowners" | "commercial" | "both" | "property";
  homeValue: string;
  climate: string;
}
```

### 2.2 Page Library for Internal Linking

```typescript
interface PageEntry {
  id: string;
  type: PageType;
  title: string;
  slug: string;
  url: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  status: "planned" | "draft" | "published";
  publishedUrl?: string;
  createdAt: string;
  linkedFrom: string[]; // IDs of pages linking to this
  linksTo: string[]; // IDs of pages this links to
}

interface PageLibrary {
  pages: PageEntry[];
  lastUpdated: string;
}
```

Store in localStorage and provide import/export functionality.

---

## Phase 3: Page Type Definitions & Generation

### 3.1 Supported Page Types

```typescript
type PageType =
  | "home_page"
  | "service_page"
  | "location_page"
  | "blog_post"
  | "news_article"
  | "about_page"
  | "contact_page"
  | "custom";

interface PageTypeConfig {
  type: PageType;
  label: string;
  icon: string;
  description: string;
  requiredFields: string[];
  optionalFields: string[];
  defaultSections: string[];
  imageCount: number;
  wordCountRange: [number, number];
}

const PAGE_TYPES: Record<PageType, PageTypeConfig> = {
  home_page: {
    type: "home_page",
    label: "Home Page",
    icon: "🏠",
    description: "Main landing page with hero, features, testimonials, and CTA",
    requiredFields: ["companyName", "tagline", "primaryService"],
    optionalFields: ["features", "testimonials", "awards"],
    defaultSections: ["hero", "services_overview", "why_choose_us", "testimonials", "cta"],
    imageCount: 3,
    wordCountRange: [800, 1500]
  },
  service_page: {
    type: "service_page",
    label: "Service Page",
    icon: "🔧",
    description: "Detailed page for a specific service with benefits and process",
    requiredFields: ["serviceName", "serviceDescription"],
    optionalFields: ["benefits", "process", "pricing", "faq"],
    defaultSections: ["hero", "what_is", "benefits", "process", "why_us", "testimonials", "faq", "cta"],
    imageCount: 4,
    wordCountRange: [1500, 2500]
  },
  location_page: {
    type: "location_page",
    label: "Location Page",
    icon: "📍",
    description: "City/area-specific page for local SEO",
    requiredFields: ["city", "state"],
    optionalFields: ["neighborhoods", "localStats", "areaDescription"],
    defaultSections: ["hero", "area_overview", "services_here", "service_areas", "local_testimonials", "faq", "cta"],
    imageCount: 3,
    wordCountRange: [1500, 2500]
  },
  blog_post: {
    type: "blog_post",
    label: "Blog Post",
    icon: "📝",
    description: "Educational content for SEO and audience engagement",
    requiredFields: ["topic", "location"],
    optionalFields: ["category", "tags"],
    defaultSections: ["hero", "toc", "content_sections", "key_takeaways", "faq", "cta"],
    imageCount: 3,
    wordCountRange: [1500, 2500]
  },
  news_article: {
    type: "news_article",
    label: "News Article",
    icon: "📰",
    description: "Timely news or announcement content",
    requiredFields: ["headline", "summary"],
    optionalFields: ["quotes", "sources"],
    defaultSections: ["headline", "summary", "body", "quotes", "conclusion"],
    imageCount: 2,
    wordCountRange: [500, 1200]
  },
  // ... additional types
};
```

### 3.2 Page Generation API Endpoint

Create `/api/generate-page.ts`:

```typescript
interface GeneratePageRequest {
  pageType: PageType;
  companyProfile: CompanyProfile;
  pageConfig: {
    title?: string;
    slug?: string;
    primaryKeyword: string;
    secondaryKeywords: string[];
    tone: string;
    sections?: string[];
    customInstructions?: string;
  };
  imageMode: ImageMode;
  userImages?: UserImage[];
  pageLibrary?: PageEntry[]; // For internal linking
}

interface GeneratePageResponse {
  success: boolean;
  htmlContent: string;
  seoData: SEOData;
  suggestedInternalLinks: {
    pageId: string;
    anchorText: string;
    context: string;
  }[];
  featuredImageId?: number;
}
```

### 3.3 Page-Type-Specific Prompts

Create prompt templates for each page type in `lib/page-prompts.ts`:

```typescript
export function getPagePrompt(pageType: PageType, params: PagePromptParams): string {
  switch (pageType) {
    case "home_page":
      return generateHomePagePrompt(params);
    case "service_page":
      return generateServicePagePrompt(params);
    case "location_page":
      return generateLocationPagePrompt(params);
    // ... etc
  }
}
```

---

## Phase 4: SEO Planning Integration

### 4.1 SEO Planner Component

Create a new tab/section for SEO planning that:

1. **Collects Company Profile** - One-time setup stored in localStorage
2. **Generates Page Recommendations** based on:
   - Selected industry
   - Service areas (cities)
   - Services offered
3. **Creates Content Calendar** - Prioritized list of pages/blogs to create
4. **Tracks Progress** - Shows created vs planned pages

### 4.2 Planning API Endpoint

Create `/api/seo-plan.ts`:

```typescript
interface SEOPlanRequest {
  companyProfile: CompanyProfile;
  contentDepth: "starter" | "growth" | "enterprise";
  calendarLength: number; // months
  postFrequency: number; // per week
}

interface SEOPlanResponse {
  pillarPages: PillarPage[];
  blogTopics: BlogTopic[];
  keywords: KeywordData[];
  contentCalendar: CalendarEntry[];
  recommendations: string[];
}
```

---

## Phase 5: UI Implementation

### 5.1 New UI Sections in index.tsx

1. **Company Profile Section** (collapsible, saved to localStorage)
   - Industry selector with auto-populated services/USPs
   - Service areas (cities) input
   - Basic company info

2. **Page Type Selector**
   - Visual card/button grid for selecting page type
   - Shows description and requirements for each type

3. **Page Configuration Form** (dynamic based on page type)
   - Common fields: title, slug, keywords, tone
   - Type-specific fields loaded dynamically

4. **SEO Planner Tab/Modal**
   - Full planning interface
   - Import/export plan as JSON/Excel
   - Generate recommended pages

5. **Page Library Sidebar/Panel**
   - List of all created pages
   - Quick access for internal linking
   - Status tracking (planned/draft/published)

### 5.2 State Structure

```typescript
// Add to existing state
const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
const [pageLibrary, setPageLibrary] = useState<PageLibrary>({ pages: [], lastUpdated: "" });
const [selectedPageType, setSelectedPageType] = useState<PageType>("blog_post");
const [pageConfig, setPageConfig] = useState<PageConfig>({});
const [showPlanner, setShowPlanner] = useState(false);
const [seoPlan, setSeoPlan] = useState<SEOPlanResponse | null>(null);
```

---

## Phase 6: Internal Linking System

### 6.1 Link Suggestion Logic

When generating content:
1. Pass `pageLibrary` to the API
2. AI identifies relevant pages to link to based on:
   - Keyword overlap
   - Topic relevance
   - Page hierarchy (pillar → supporting content)
3. Returns suggested internal links with anchor text

### 6.2 Link Tracking

After page generation:
1. Extract all internal links from HTML
2. Update `pageLibrary` with bidirectional link references
3. Show orphan pages (no incoming links) as warnings

---

## Implementation Order

### Week 1: Foundation
- [ ] Create `lib/industries.ts` with all industry configs
- [ ] Create `lib/blog-templates.ts` with all templates
- [ ] Create `lib/page-types.ts` with page type configs
- [ ] Add CompanyProfile state and localStorage persistence

### Week 2: Page Generation
- [ ] Create `/api/generate-page.ts` endpoint
- [ ] Create `lib/page-prompts.ts` with type-specific prompts
- [ ] Add streaming version `/api/generate-page-stream.ts`
- [ ] Update UI with page type selector

### Week 3: SEO Planner
- [ ] Create `/api/seo-plan.ts` endpoint
- [ ] Build SEO Planner UI component
- [ ] Add keyword generation logic
- [ ] Add content calendar generation

### Week 4: Integration & Polish
- [ ] Implement page library with internal linking
- [ ] Add import/export functionality
- [ ] Add progress tracking
- [ ] Testing and refinement

---

## File Structure

```
lib/
  industries.ts          # Industry configurations (16+ industries)
  blog-templates.ts      # Blog topic templates by category
  page-types.ts          # Page type configurations
  page-prompts.ts        # AI prompts for each page type
  ai-gateway.ts          # (existing) - extend with page generation

pages/api/
  generate-page.ts       # Single page generation
  generate-page-stream.ts # Streaming page generation
  seo-plan.ts            # SEO planning endpoint
  orchestrate-blog-stream.ts # (existing)

components/
  CompanyProfileForm.tsx # Company info collection
  PageTypeSelector.tsx   # Visual page type picker
  PageConfigForm.tsx     # Dynamic form based on page type
  SEOPlanner.tsx         # Full planning interface
  PageLibrary.tsx        # Sidebar with created pages

pages/
  index.tsx              # (existing) - integrate new components
```

---

## Key Considerations

1. **Backwards Compatibility** - Existing blog generation should continue working unchanged

2. **Progressive Disclosure** - Don't overwhelm users; show advanced features only when needed

3. **Data Persistence** - Company profile, page library, and plans saved to localStorage

4. **Export Options** - Support Excel, JSON, and HTML export for plans and content

5. **WordPress Integration** - Extend existing WordPress API to support page creation (not just posts)

6. **SEO Best Practices** - All generated content follows current SEO guidelines:
   - Proper heading hierarchy (H1 → H2 → H3)
   - Keyword density targets
   - Internal linking strategy
   - Schema markup recommendations
   - Meta tag optimization
