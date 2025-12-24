// lib/chat/tools.ts
// Chat tool schemas for the conversational AI interface
// These schemas are used in pages/api/chat.ts for tool definitions

import { z } from "zod";

// ============ PROFILE & SETTINGS SCHEMAS ============

export const getProfileSchema = z.object({});

export const updateProfileSchema = z.object({
  name: z.string().optional().describe("Company name"),
  tagline: z.string().optional().describe("Company tagline or slogan"),
  website: z.string().optional().describe("Company website URL"),
  phone: z.string().optional().describe("Business phone number"),
  email: z.string().optional().describe("Business email address"),
  address: z.string().optional().describe("Business physical address"),
  headquarters: z.string().optional().describe("City where headquarters is located"),
  state: z.string().optional().describe("State/Province"),
  industryType: z.string().optional().describe("Type of industry (e.g., 'plumbing', 'roofing', 'landscaping')"),
  yearsInBusiness: z.number().optional().describe("Number of years in business"),
  audience: z.string().optional().describe("Target audience description"),
  services: z.array(z.string()).optional().describe("List of services offered"),
  cities: z.array(z.string()).optional().describe("List of cities/areas served"),
  usps: z.array(z.string()).optional().describe("Unique selling points"),
  certifications: z.array(z.string()).optional().describe("Professional certifications"),
});

export const updateBrandVoiceSchema = z.object({
  brandVoice: z.string().optional().describe("Brand voice description (e.g., 'professional and trustworthy', 'friendly and approachable')"),
  writingStyle: z.string().optional().describe("Preferred writing style (e.g., 'conversational', 'technical', 'educational')"),
  primarySiteKeyword: z.string().optional().describe("Main keyword the site should rank for"),
  secondarySiteKeywords: z.array(z.string()).optional().describe("Additional keywords to target"),
  siteDescription: z.string().optional().describe("Brief site/business description for SEO"),
  businessPersonality: z.string().optional().describe("The personality of the business (e.g., 'innovative', 'traditional', 'eco-friendly')"),
  valueProposition: z.string().optional().describe("Core value proposition for customers"),
});

// ============ CONTENT GENERATION SCHEMAS ============

export const generateOutlineSchema = z.object({
  topic: z.string().describe("The main topic for the blog post"),
  location: z.string().optional().describe("Target location for local SEO (city, state)"),
  blogType: z.enum(["blog", "service", "location"]).default("blog").describe("Type of content to generate"),
  numberOfSections: z.number().min(3).max(10).default(5).describe("Number of main sections"),
  tone: z.string().optional().describe("Tone of the content (e.g., 'professional', 'conversational')"),
  primaryKeyword: z.string().optional().describe("Primary keyword to target"),
  secondaryKeywords: z.array(z.string()).optional().describe("Secondary keywords to include"),
});

export const generateDraftSchema = z.object({
  topic: z.string().describe("The main topic for the blog post"),
  location: z.string().optional().describe("Target location for local SEO"),
  blogType: z.enum(["blog", "service", "location"]).default("blog").describe("Type of content"),
  numberOfSections: z.number().min(3).max(10).default(5).describe("Number of sections"),
  wordCountRange: z.object({
    min: z.number().default(800),
    max: z.number().default(1500),
  }).optional().describe("Target word count range"),
  tone: z.string().optional().describe("Tone of the content"),
  primaryKeyword: z.string().optional().describe("Primary keyword"),
  secondaryKeywords: z.array(z.string()).optional().describe("Secondary keywords"),
  generateImages: z.boolean().default(false).describe("Whether to generate images for the blog"),
  numberOfImages: z.number().min(0).max(5).default(3).describe("Number of images to generate"),
  saveDraft: z.boolean().default(true).describe("Whether to save the generated content as a draft"),
});

export const generateMetaSchema = z.object({
  topic: z.string().describe("The topic to generate meta for"),
  primaryKeyword: z.string().optional().describe("Primary keyword to target"),
  draftId: z.string().optional().describe("Optional draft ID to update with the generated meta"),
});

// ============ SEO RESEARCH SCHEMAS ============

export const keywordResearchSchema = z.object({
  topic: z.string().describe("The topic to research keywords for"),
  location: z.string().optional().describe("Target location for local SEO research"),
  industry: z.string().optional().describe("Industry type for more relevant results"),
  competitorUrls: z.array(z.string()).optional().describe("Competitor URLs to analyze"),
});

export const competitorAnalysisSchema = z.object({
  competitorUrls: z.array(z.string()).min(1).describe("URLs of competitor websites to analyze"),
  topic: z.string().optional().describe("Specific topic to focus analysis on"),
});

// ============ DRAFT MANAGEMENT SCHEMAS ============

export const listDraftsSchema = z.object({
  status: z.enum(["draft", "ready", "published", "all"]).default("all").describe("Filter by draft status"),
  type: z.enum(["blog", "service", "location", "all"]).default("all").describe("Filter by content type"),
  limit: z.number().min(1).max(50).default(20).describe("Maximum number of drafts to return"),
});

export const getDraftSchema = z.object({
  draftId: z.string().describe("The ID of the draft to retrieve"),
});

export const saveDraftSchema = z.object({
  draftId: z.string().optional().describe("Optional draft ID for updates. If not provided, creates new draft."),
  title: z.string().describe("Draft title"),
  type: z.enum(["blog", "service", "location"]).describe("Content type"),
  content: z.string().optional().describe("HTML content of the draft"),
  slug: z.string().optional().describe("URL slug for the content"),
  seoData: z.object({
    primaryKeyword: z.string().optional(),
    secondaryKeywords: z.array(z.string()).optional(),
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
  }).optional().describe("SEO metadata"),
  status: z.enum(["draft", "ready", "published"]).default("draft").describe("Draft status"),
});

export const deleteDraftSchema = z.object({
  draftId: z.string().describe("The ID of the draft to delete"),
  confirmDelete: z.boolean().describe("Must be true to confirm deletion"),
});

export const scheduleDraftSchema = z.object({
  draftId: z.string().describe("The ID of the draft to schedule"),
  scheduledDate: z.string().describe("ISO date string for when to publish (e.g., '2024-12-25T10:00:00Z')"),
});

// ============ TOOL DESCRIPTIONS ============

export const toolDescriptions = {
  // Profile & Settings
  getProfile: "Get the user's company profile including business details, branding, services, and settings.",
  updateProfile: "Update specific fields in the user's company profile. Use this to change business information, contact details, or company description.",
  updateBrandVoice: "Update the brand voice and writing style settings. This affects how AI generates content for the company.",

  // Content Generation
  generateOutline: "Generate a blog outline for a given topic. Creates a structured outline with sections, key points, and SEO optimization.",
  generateDraft: "Generate a complete blog draft from an outline or topic. This creates full content ready for review.",
  generateMeta: "Generate SEO meta title and description for a given topic or existing draft.",

  // SEO Research
  keywordResearch: "Perform keyword research for a topic. Finds primary and secondary keywords, competitor insights, and content angles.",
  competitorAnalysis: "Analyze competitor content and SEO strategies. Provides insights on what competitors are doing well.",

  // Draft Management
  listDrafts: "List the user's saved drafts with optional filtering. Returns draft titles, types, and status.",
  getDraft: "Get full details of a specific draft including content, SEO data, and images.",
  saveDraft: "Create or update a draft. Use this to save content changes or create new drafts.",
  deleteDraft: "Delete a draft permanently. This action cannot be undone.",
  scheduleDraft: "Schedule a draft for future publication.",
} as const;

// ============ SCHEMA REGISTRY ============

export const allSchemas = {
  // Profile & Settings
  getProfile: getProfileSchema,
  updateProfile: updateProfileSchema,
  updateBrandVoice: updateBrandVoiceSchema,

  // Content Generation
  generateOutline: generateOutlineSchema,
  generateDraft: generateDraftSchema,
  generateMeta: generateMetaSchema,

  // SEO Research
  keywordResearch: keywordResearchSchema,
  competitorAnalysis: competitorAnalysisSchema,

  // Draft Management
  listDrafts: listDraftsSchema,
  getDraft: getDraftSchema,
  saveDraft: saveDraftSchema,
  deleteDraft: deleteDraftSchema,
  scheduleDraft: scheduleDraftSchema,
};

export type ToolName = keyof typeof allSchemas;
