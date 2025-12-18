// lib/db.ts
// Neon DB client configuration using Drizzle ORM

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  boolean,
  primaryKey,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { eq, desc, and } from "drizzle-orm";

// Get the database URL from environment
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql);

// ============ SCHEMA DEFINITIONS ============

// Users table (for NextAuth)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  password: text("password"), // For credentials auth
  createdAt: timestamp("created_at").defaultNow(),
});

// Accounts table (for NextAuth OAuth)
export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

// Sessions table (for NextAuth)
export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

// Verification tokens (for NextAuth email verification)
export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

// User profiles (company settings, integrations)
export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  companyName: text("company_name"),
  companyProfile: jsonb("company_profile"),
  wordpressSettings: jsonb("wordpress_settings"),
  ghlSettings: jsonb("ghl_settings"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Drafts (unpublished blogs/pages)
export const drafts = pgTable("drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  slug: text("slug"),
  content: text("content"),
  seoData: jsonb("seo_data"),
  status: text("status").default("draft"),
  publishedUrl: text("published_url"),
  publishedAt: timestamp("published_at"),
  // Scheduling fields
  scheduledPublishAt: timestamp("scheduled_publish_at"),
  scheduleStatus: text("schedule_status").default("unscheduled"), // unscheduled, scheduled, published, failed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Draft images
export const draftImages = pgTable("draft_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  draftId: uuid("draft_id").references(() => drafts.id, { onDelete: "cascade" }),
  storagePath: text("storage_path").notNull(),
  originalPrompt: text("original_prompt"),
  altText: text("alt_text"),
  isFeatured: boolean("is_featured").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Security questions for password reset
export const securityQuestions = pgTable("security_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  question1: text("question1").notNull(),
  answer1Hash: text("answer1_hash").notNull(),
  question2: text("question2").notNull(),
  answer2Hash: text("answer2_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Password reset attempts (for rate limiting)
export const passwordResetAttempts = pgTable("password_reset_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  attemptCount: integer("attempt_count").default(0),
  lastAttempt: timestamp("last_attempt").defaultNow(),
  lockedUntil: timestamp("locked_until"),
});

// Knowledge Base - stores company facts, services, USPs for AI to reference
export const knowledgeBase = pgTable("knowledge_base", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  category: text("category").notNull(), // services, usps, facts, locations, certifications, team, faqs, testimonials
  title: text("title").notNull(),
  content: text("content").notNull(),
  tags: jsonb("tags").$type<string[]>().default([]),
  isAiGenerated: boolean("is_ai_generated").default(false),
  isVerified: boolean("is_verified").default(false), // User has reviewed and approved
  priority: integer("priority").default(0), // Higher priority = more likely to be included
  usageCount: integer("usage_count").default(0), // Track how often AI uses this
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Knowledge Base history - track changes and AI updates
export const knowledgeBaseHistory = pgTable("knowledge_base_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  entryId: uuid("entry_id")
    .notNull()
    .references(() => knowledgeBase.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // created, updated, deleted, ai_suggested, verified
  previousContent: text("previous_content"),
  newContent: text("new_content"),
  changeSource: text("change_source"), // user, ai_research, ai_content, import
  createdAt: timestamp("created_at").defaultNow(),
});

// ============ AI AUTOMATION TABLES ============

// Daily usage tracking - for enforcing 20 blogs/day limit
export const dailyUsage = pgTable(
  "daily_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD format for easy querying
    blogsGenerated: integer("blogs_generated").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    // Unique constraint ensures one record per user per day
    userDateIdx: uniqueIndex("daily_usage_user_date_idx").on(table.userId, table.date),
  })
);

// Automation settings - user preferences for AI automation features
export const automationSettings = pgTable("automation_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  allowBuildEntireSite: boolean("allow_build_entire_site").default(false),
  allowAutoCreateDailyBlogs: boolean("allow_auto_create_daily_blogs").default(false),
  allowAutoScheduleBlogs: boolean("allow_auto_schedule_blogs").default(false),
  allowAutoPostBlogs: boolean("allow_auto_post_blogs").default(false),
  dailyBlogFrequency: integer("daily_blog_frequency").default(1), // 1-5 blogs per day
  autoPostPlatform: text("auto_post_platform").default("wordpress"), // wordpress | ghl
  autoCreateMode: text("auto_create_mode").default("queue_for_review"), // automatic | queue_for_review
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Generation queue - for batch and scheduled blog generation
export const generationQueue = pgTable("generation_queue", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  batchId: text("batch_id"), // Groups items in a batch together
  type: text("type").notNull(), // blog | service_page | location_page
  topic: text("topic").notNull(),
  keywords: text("keywords"), // comma-separated primary/secondary keywords
  status: text("status").default("pending"), // pending | generating | generated | scheduled | published | failed
  priority: integer("priority").default(0), // Higher = process first
  scheduledFor: timestamp("scheduled_for"), // When to auto-schedule the generated blog
  generatedDraftId: uuid("generated_draft_id").references(() => drafts.id, { onDelete: "set null" }),
  errorMessage: text("error_message"),
  attempts: integer("attempts").default(0), // Retry counter
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Site structure proposals - AI-generated site architecture for user approval
export const siteStructureProposals = pgTable("site_structure_proposals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status").default("draft"), // draft | proposed | approved | generating | completed | failed
  industry: text("industry"),
  proposedStructure: jsonb("proposed_structure"), // { homepage, servicePages, locationPages, blogTopics, sitemap }
  aiReasoning: text("ai_reasoning"), // Why AI proposed this structure
  userModifications: jsonb("user_modifications"), // { removedPages, addedPages, changedPages }
  generationProgress: jsonb("generation_progress"), // { total, completed, current, errors }
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============ TYPE EXPORTS ============

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type Draft = typeof drafts.$inferSelect;
export type DraftImage = typeof draftImages.$inferSelect;
export type SecurityQuestion = typeof securityQuestions.$inferSelect;
export type PasswordResetAttempt = typeof passwordResetAttempts.$inferSelect;
export type KnowledgeBaseEntry = typeof knowledgeBase.$inferSelect;
export type NewKnowledgeBaseEntry = typeof knowledgeBase.$inferInsert;
export type KnowledgeBaseHistoryEntry = typeof knowledgeBaseHistory.$inferSelect;

// Automation types
export type DailyUsage = typeof dailyUsage.$inferSelect;
export type AutomationSettings = typeof automationSettings.$inferSelect;
export type GenerationQueueItem = typeof generationQueue.$inferSelect;
export type NewGenerationQueueItem = typeof generationQueue.$inferInsert;
export type SiteStructureProposal = typeof siteStructureProposals.$inferSelect;

// Automation status types
export type QueueStatus = "pending" | "generating" | "generated" | "scheduled" | "published" | "failed";
export type ProposalStatus = "draft" | "proposed" | "approved" | "generating" | "completed" | "failed";
export type AutoPostPlatform = "wordpress" | "ghl";
export type AutoCreateMode = "automatic" | "queue_for_review";

// Proposed site structure interface
export interface ProposedSiteStructure {
  homepage?: {
    title: string;
    description: string;
    sections: string[];
  };
  servicePages: Array<{
    title: string;
    slug: string;
    description: string;
    keywords?: string[];
  }>;
  locationPages: Array<{
    city: string;
    state: string;
    service: string;
    slug: string;
  }>;
  blogTopics: Array<{
    title: string;
    keywords?: string[];
    priority?: number;
  }>;
  sitemap?: {
    structure: string;
    internalLinking: string[];
  };
}

// Generation progress interface
export interface GenerationProgress {
  total: number;
  completed: number;
  current?: string;
  errors?: Array<{ page: string; error: string }>;
}

// Schedule status types
export type ScheduleStatus = "unscheduled" | "scheduled" | "published" | "failed";

// Scheduled blog type for calendar view
export interface ScheduledBlog {
  id: string;
  title: string;
  type: string;
  scheduledPublishAt: Date | null;
  scheduleStatus: ScheduleStatus;
  featuredImageUrl?: string;
}

// Re-export drizzle operators
export { eq, desc, and };
