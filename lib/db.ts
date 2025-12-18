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
} from "drizzle-orm/pg-core";
import { eq, desc } from "drizzle-orm";

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

// ============ TYPE EXPORTS ============

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type Draft = typeof drafts.$inferSelect;
export type DraftImage = typeof draftImages.$inferSelect;
export type SecurityQuestion = typeof securityQuestions.$inferSelect;
export type PasswordResetAttempt = typeof passwordResetAttempts.$inferSelect;

// Re-export drizzle operators
export { eq, desc };
