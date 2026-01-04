// lib/database.ts
// Database CRUD operations for Neon DB with Drizzle ORM

import { db, profiles, drafts, draftImages, publishedContent, dailyUsage, automationSettings, generationQueue, siteStructureProposals, workflowRuns, workflowTasks, imageQaLogs, conversations, conversationMessages, eq, desc, and, or, isNull, ne } from "./db";
import type { CompanyProfile } from "./page-types";
import type {
  ScheduleStatus,
  ScheduledBlog,
  AutomationSettings as AutomationSettingsType,
  GenerationQueueItem,
  NewGenerationQueueItem,
  SiteStructureProposal,
  QueueStatus,
  ProposalStatus,
  ProposedSiteStructure,
  GenerationProgress,
  WorkflowRun,
  WorkflowTask,
  ImageQaLog,
  WorkflowStatus,
  WorkflowStage,
  TaskStatus,
  IntakeData,
  ResearchData,
  Conversation,
  ConversationMessage,
  ConversationStatus,
  MessageRole,
  PublishedContent,
} from "./db";

// ============ PROFILE OPERATIONS ============

export interface UserProfile {
  userId: string;
  companyName: string | null;
  companyProfile: CompanyProfile | null;
  wordpressSettings: {
    siteUrl: string;
    username: string;
    appPassword: string;
    isConnected: boolean;
  } | null;
  ghlSettings: {
    apiToken: string;
    locationId: string;
    blogId: string;
    isConnected: boolean;
  } | null;
}

export async function loadUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const result = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const profile = result[0];
    return {
      userId: profile.userId,
      companyName: profile.companyName,
      companyProfile: profile.companyProfile as CompanyProfile | null,
      wordpressSettings: profile.wordpressSettings as UserProfile["wordpressSettings"],
      ghlSettings: profile.ghlSettings as UserProfile["ghlSettings"],
    };
  } catch (error) {
    console.error("Error loading profile:", error);
    return null;
  }
}

export async function saveUserProfile(
  userId: string,
  profile: Partial<Omit<UserProfile, "userId">>
): Promise<{ error: Error | null }> {
  try {
    // Check if profile exists
    const existing = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (profile.companyName !== undefined) {
      updateData.companyName = profile.companyName;
    }
    if (profile.companyProfile !== undefined) {
      updateData.companyProfile = profile.companyProfile;
    }
    if (profile.wordpressSettings !== undefined) {
      updateData.wordpressSettings = profile.wordpressSettings;
    }
    if (profile.ghlSettings !== undefined) {
      updateData.ghlSettings = profile.ghlSettings;
    }

    if (existing.length > 0) {
      await db
        .update(profiles)
        .set(updateData)
        .where(eq(profiles.userId, userId));
    } else {
      await db.insert(profiles).values({
        userId,
        ...updateData,
      });
    }

    return { error: null };
  } catch (error) {
    console.error("Error saving profile:", error);
    return { error: error as Error };
  }
}

// ============ DRAFT OPERATIONS ============

export interface DraftData {
  id?: string;
  type: string;
  title: string;
  slug?: string;
  content?: string;
  seoData?: {
    primaryKeyword?: string;
    secondaryKeywords?: string[];
    metaTitle?: string;
    metaDescription?: string;
  };
  status?: "draft" | "ready" | "published";
  publishedUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function loadDrafts(userId: string): Promise<DraftData[]> {
  try {
    const result = await db
      .select()
      .from(drafts)
      .where(eq(drafts.userId, userId))
      .orderBy(desc(drafts.updatedAt));

    return result.map((draft) => ({
      id: draft.id,
      type: draft.type,
      title: draft.title,
      slug: draft.slug || undefined,
      content: draft.content || undefined,
      seoData: draft.seoData as DraftData["seoData"],
      status: draft.status as "draft" | "ready" | "published",
      publishedUrl: draft.publishedUrl || undefined,
      createdAt: draft.createdAt || undefined,
      updatedAt: draft.updatedAt || undefined,
    }));
  } catch (error) {
    console.error("Error loading drafts:", error);
    return [];
  }
}

export async function saveDraft(
  userId: string,
  draft: DraftData
): Promise<{ id: string; error: Error | null }> {
  try {
    if (draft.id) {
      // Update existing draft - always verify userId for security
      await db
        .update(drafts)
        .set({
          type: draft.type,
          title: draft.title,
          slug: draft.slug || null,
          content: draft.content || null,
          seoData: draft.seoData || null,
          status: draft.status || "draft",
          publishedUrl: draft.publishedUrl || null,
          publishedAt: draft.publishedUrl ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(and(eq(drafts.id, draft.id), eq(drafts.userId, userId)));

      return { id: draft.id, error: null };
    } else {
      // Create new draft
      const result = await db
        .insert(drafts)
        .values({
          userId,
          type: draft.type,
          title: draft.title,
          slug: draft.slug || null,
          content: draft.content || null,
          seoData: draft.seoData || null,
          status: draft.status || "draft",
          publishedUrl: draft.publishedUrl || null,
        })
        .returning({ id: drafts.id });

      if (result.length === 0) {
        return { id: "", error: new Error("Failed to insert draft - no result returned") };
      }
      return { id: result[0].id, error: null };
    }
  } catch (error) {
    console.error("Error saving draft:", error);
    return { id: "", error: error as Error };
  }
}

export async function deleteDraft(
  userId: string,
  draftId: string
): Promise<{ error: Error | null }> {
  try {
    // Verify the draft belongs to this user first
    const existing = await db
      .select({ id: drafts.id })
      .from(drafts)
      .where(and(eq(drafts.id, draftId), eq(drafts.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      return { error: new Error("Draft not found or access denied") };
    }

    // Delete associated images first (also verify userId for safety)
    await db
      .delete(draftImages)
      .where(and(eq(draftImages.draftId, draftId), eq(draftImages.userId, userId)));

    // Delete the draft (with userId verification)
    await db
      .delete(drafts)
      .where(and(eq(drafts.id, draftId), eq(drafts.userId, userId)));

    return { error: null };
  } catch (error) {
    console.error("Error deleting draft:", error);
    return { error: error as Error };
  }
}

export async function updateDraftStatus(
  userId: string,
  draftId: string,
  status: "draft" | "ready" | "published",
  publishedUrl?: string
): Promise<{ error: Error | null }> {
  try {
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };

    if (publishedUrl) {
      updateData.publishedUrl = publishedUrl;
      updateData.publishedAt = new Date();
    }

    // Always verify userId to ensure user can only update their own drafts
    await db
      .update(drafts)
      .set(updateData)
      .where(and(eq(drafts.id, draftId), eq(drafts.userId, userId)));

    return { error: null };
  } catch (error) {
    console.error("Error updating draft status:", error);
    return { error: error as Error };
  }
}

// ============ IMAGE OPERATIONS ============

export interface ImageData {
  id?: string;
  draftId?: string;
  storagePath: string;
  originalPrompt?: string;
  altText?: string;
  isFeatured?: boolean;
}

export async function saveImage(
  userId: string,
  image: ImageData
): Promise<{ id: string; error: Error | null }> {
  try {
    if (image.id) {
      // Update existing image - always verify userId for security
      await db
        .update(draftImages)
        .set({
          draftId: image.draftId || null,
          storagePath: image.storagePath,
          originalPrompt: image.originalPrompt || null,
          altText: image.altText || null,
          isFeatured: image.isFeatured || false,
        })
        .where(and(eq(draftImages.id, image.id), eq(draftImages.userId, userId)));

      return { id: image.id, error: null };
    } else {
      const result = await db
        .insert(draftImages)
        .values({
          userId,
          draftId: image.draftId || null,
          storagePath: image.storagePath,
          originalPrompt: image.originalPrompt || null,
          altText: image.altText || null,
          isFeatured: image.isFeatured || false,
        })
        .returning({ id: draftImages.id });

      if (result.length === 0) {
        return { id: "", error: new Error("Failed to insert image - no result returned") };
      }
      return { id: result[0].id, error: null };
    }
  } catch (error) {
    console.error("Error saving image:", error);
    return { id: "", error: error as Error };
  }
}

export async function loadImagesForDraft(
  userId: string,
  draftId: string
): Promise<ImageData[]> {
  try {
    // Always verify userId to ensure user can only view their own images
    const result = await db
      .select()
      .from(draftImages)
      .where(and(eq(draftImages.draftId, draftId), eq(draftImages.userId, userId)));

    return result.map((img) => ({
      id: img.id,
      draftId: img.draftId || undefined,
      storagePath: img.storagePath,
      originalPrompt: img.originalPrompt || undefined,
      altText: img.altText || undefined,
      isFeatured: img.isFeatured || false,
    }));
  } catch (error) {
    console.error("Error loading images:", error);
    return [];
  }
}

export async function deleteImage(
  userId: string,
  imageId: string
): Promise<{ error: Error | null }> {
  try {
    // Always verify userId to ensure user can only delete their own images
    await db
      .delete(draftImages)
      .where(and(eq(draftImages.id, imageId), eq(draftImages.userId, userId)));

    return { error: null };
  } catch (error) {
    console.error("Error deleting image:", error);
    return { error: error as Error };
  }
}

// ============ PUBLISHED CONTENT OPERATIONS ============

export interface PublishedContentData {
  id?: string;
  draftId?: string;
  title: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  topic?: string;
  blogType?: string;
  featuredImageUrl?: string;
  featuredImageAlt?: string;
  publishedUrl?: string;
  publishedPlatform?: "wordpress" | "ghl";
  wordCount?: number;
  location?: string;
  publishedAt?: Date;
}

/**
 * Record published content for topic deduplication and history tracking
 * This is called after a successful publish to WordPress or GHL
 */
export async function recordPublishedContent(
  userId: string,
  data: PublishedContentData
): Promise<{ success: boolean; id: string | null; error: Error | null }> {
  try {
    const result = await db
      .insert(publishedContent)
      .values({
        userId,
        draftId: data.draftId || null,
        title: data.title,
        primaryKeyword: data.primaryKeyword || null,
        secondaryKeywords: data.secondaryKeywords || null,
        topic: data.topic || null,
        blogType: data.blogType || null,
        featuredImageUrl: data.featuredImageUrl || null,
        featuredImageAlt: data.featuredImageAlt || null,
        publishedUrl: data.publishedUrl || null,
        publishedPlatform: data.publishedPlatform || null,
        wordCount: data.wordCount || null,
        location: data.location || null,
        publishedAt: data.publishedAt || new Date(),
      })
      .returning({ id: publishedContent.id });

    if (result.length === 0) {
      return { success: false, id: null, error: new Error("Failed to record published content") };
    }

    return { success: true, id: result[0].id, error: null };
  } catch (error) {
    console.error("Error recording published content:", error);
    return { success: false, id: null, error: error as Error };
  }
}

/**
 * Load all published content for a user (for history view and deduplication)
 */
export async function loadPublishedContent(
  userId: string,
  limit?: number
): Promise<PublishedContent[]> {
  try {
    let result = await db
      .select()
      .from(publishedContent)
      .where(eq(publishedContent.userId, userId))
      .orderBy(desc(publishedContent.publishedAt));

    if (limit) {
      result = result.slice(0, limit);
    }

    return result;
  } catch (error) {
    console.error("Error loading published content:", error);
    return [];
  }
}

/**
 * Get all used topics and keywords for topic research deduplication
 * Returns unique lists of titles, keywords, and topics that have been used
 */
export async function getUsedTopicsAndKeywords(
  userId: string
): Promise<{ titles: string[]; keywords: string[]; topics: string[] }> {
  // Collect unique values
  const titlesSet = new Set<string>();
  const keywordsSet = new Set<string>();
  const topicsSet = new Set<string>();

  // Get from drafts first (this table always exists)
  try {
    const draftsList = await db
      .select({
        title: drafts.title,
        seoData: drafts.seoData,
      })
      .from(drafts)
      .where(eq(drafts.userId, userId));

    console.log(`[getUsedTopicsAndKeywords] Found ${draftsList.length} drafts for user`);

    for (const d of draftsList) {
      if (d.title) titlesSet.add(d.title.toLowerCase());
      const seo = d.seoData as { primaryKeyword?: string } | null;
      if (seo?.primaryKeyword) keywordsSet.add(seo.primaryKeyword.toLowerCase());
    }
  } catch (error) {
    console.error("[getUsedTopicsAndKeywords] Error loading drafts:", error);
  }

  // Get from published content history (table may not exist yet)
  try {
    const published = await db
      .select({
        title: publishedContent.title,
        primaryKeyword: publishedContent.primaryKeyword,
        topic: publishedContent.topic,
      })
      .from(publishedContent)
      .where(eq(publishedContent.userId, userId));

    console.log(`[getUsedTopicsAndKeywords] Found ${published.length} published items for user`);

    for (const p of published) {
      if (p.title) titlesSet.add(p.title.toLowerCase());
      if (p.primaryKeyword) keywordsSet.add(p.primaryKeyword.toLowerCase());
      if (p.topic) topicsSet.add(p.topic.toLowerCase());
    }
  } catch (error) {
    // Table might not exist yet - this is expected before first migration
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("does not exist") || errorMessage.includes("relation")) {
      console.log("[getUsedTopicsAndKeywords] published_content table does not exist yet - run /api/setup/create-published-content-table");
    } else {
      console.error("[getUsedTopicsAndKeywords] Error loading published content:", error);
    }
  }

  return {
    titles: Array.from(titlesSet),
    keywords: Array.from(keywordsSet),
    topics: Array.from(topicsSet),
  };
}

/**
 * Backfill published content from existing drafts
 * Used to populate the publishedContent table from drafts with scheduleStatus='published'
 */
export async function backfillPublishedContent(
  userId: string
): Promise<{ success: boolean; count: number; error: Error | null }> {
  try {
    // Get all published drafts for this user
    const publishedDrafts = await db
      .select()
      .from(drafts)
      .where(and(eq(drafts.userId, userId), eq(drafts.scheduleStatus, "published")));

    let count = 0;

    for (const draft of publishedDrafts) {
      // Check if already recorded
      const existing = await db
        .select({ id: publishedContent.id })
        .from(publishedContent)
        .where(and(eq(publishedContent.userId, userId), eq(publishedContent.draftId, draft.id)))
        .limit(1);

      if (existing.length > 0) {
        continue; // Already recorded
      }

      // Get featured image for this draft
      const featuredImg = await db
        .select({
          storagePath: draftImages.storagePath,
          altText: draftImages.altText,
        })
        .from(draftImages)
        .where(and(eq(draftImages.draftId, draft.id), eq(draftImages.userId, userId), eq(draftImages.isFeatured, true)))
        .limit(1);

      const seoData = draft.seoData as {
        primaryKeyword?: string;
        secondaryKeywords?: string[];
      } | null;

      // Record to published content
      await db.insert(publishedContent).values({
        userId,
        draftId: draft.id,
        title: draft.title,
        primaryKeyword: seoData?.primaryKeyword || null,
        secondaryKeywords: seoData?.secondaryKeywords || null,
        topic: null, // Not stored in drafts
        blogType: draft.type,
        featuredImageUrl: featuredImg[0]?.storagePath || null,
        featuredImageAlt: featuredImg[0]?.altText || null,
        publishedUrl: draft.publishedUrl || null,
        publishedPlatform: null, // Not stored in drafts
        publishedAt: draft.publishedAt || draft.updatedAt || new Date(),
      });

      count++;
    }

    return { success: true, count, error: null };
  } catch (error) {
    console.error("Error backfilling published content:", error);
    return { success: false, count: 0, error: error as Error };
  }
}

// ============ DATA MIGRATION ============

export async function migrateLocalStorageData(
  userId: string
): Promise<{ migrated: boolean; error: Error | null }> {
  if (typeof window === "undefined") {
    return { migrated: false, error: null };
  }

  try {
    const companyProfile = localStorage.getItem("companyProfile");
    const wordpressSettings = localStorage.getItem("wordpressSettings");
    const ghlSettings = localStorage.getItem("gohighlevelSettings");
    const pageLibrary = localStorage.getItem("pageLibrary");

    const hasData = companyProfile || wordpressSettings || ghlSettings || pageLibrary;

    if (!hasData) {
      return { migrated: false, error: null };
    }

    // Migrate profile data
    const profileUpdate: Partial<UserProfile> = {};

    if (companyProfile) {
      profileUpdate.companyProfile = JSON.parse(companyProfile);
      profileUpdate.companyName = profileUpdate.companyProfile?.name || null;
    }

    if (wordpressSettings) {
      profileUpdate.wordpressSettings = JSON.parse(wordpressSettings);
    }

    if (ghlSettings) {
      profileUpdate.ghlSettings = JSON.parse(ghlSettings);
    }

    if (Object.keys(profileUpdate).length > 0) {
      const { error } = await saveUserProfile(userId, profileUpdate);
      if (error) {
        return { migrated: false, error };
      }
    }

    // Migrate page library as drafts
    if (pageLibrary) {
      const pages = JSON.parse(pageLibrary);
      for (const page of pages) {
        await saveDraft(userId, {
          type: page.type,
          title: page.title,
          slug: page.slug,
          seoData: {
            primaryKeyword: page.primaryKeyword,
            secondaryKeywords: page.secondaryKeywords,
            metaTitle: page.metaTitle,
            metaDescription: page.metaDescription,
          },
          status: page.status === "published" ? "published" : "draft",
          publishedUrl: page.publishedUrl,
        });
      }
    }

    // Clear localStorage after successful migration
    localStorage.removeItem("companyProfile");
    localStorage.removeItem("wordpressSettings");
    localStorage.removeItem("gohighlevelSettings");
    localStorage.removeItem("pageLibrary");
    localStorage.removeItem("companyResearch");
    localStorage.removeItem("setupWizardDismissed");

    return { migrated: true, error: null };
  } catch (err) {
    return { migrated: false, error: err as Error };
  }
}

// ============ PROFILE COMPLETENESS ============

// Required fields for a complete profile (weighted by importance)
const PROFILE_FIELDS: { field: string; weight: number; label: string }[] = [
  // Essential (high weight) - 40% total
  { field: "name", weight: 10, label: "Company Name" },
  { field: "website", weight: 8, label: "Website URL" },
  { field: "phone", weight: 7, label: "Phone Number" },
  { field: "email", weight: 5, label: "Email Address" },
  { field: "industryType", weight: 10, label: "Industry Type" },

  // Important (medium weight) - 35% total
  { field: "state", weight: 6, label: "State" },
  { field: "headquarters", weight: 5, label: "City/Headquarters" },
  { field: "services", weight: 8, label: "Services" },
  { field: "audience", weight: 6, label: "Target Audience" },
  { field: "cities", weight: 5, label: "Service Areas" },
  { field: "usps", weight: 5, label: "Unique Selling Points" },

  // Nice to have (low weight) - 25% total
  { field: "tagline", weight: 3, label: "Tagline" },
  { field: "brandVoice", weight: 4, label: "Brand Voice" },
  { field: "writingStyle", weight: 3, label: "Writing Style" },
  { field: "socialLinks", weight: 5, label: "Social Media Links" },
  { field: "certifications", weight: 3, label: "Certifications" },
  { field: "yearsInBusiness", weight: 2, label: "Years in Business" },
  { field: "address", weight: 3, label: "Business Address" },
  { field: "competitors", weight: 2, label: "Competitors" },
];

/**
 * Calculate profile completeness as a percentage (0-100)
 */
export function calculateProfileCompleteness(profile: CompanyProfile | null): number {
  if (!profile) return 0;

  let earnedWeight = 0;
  const totalWeight = PROFILE_FIELDS.reduce((sum, f) => sum + f.weight, 0);

  for (const { field, weight } of PROFILE_FIELDS) {
    const value = profile[field as keyof CompanyProfile];

    if (value !== undefined && value !== null && value !== "") {
      // Check for arrays
      if (Array.isArray(value)) {
        if (value.length > 0) {
          earnedWeight += weight;
        }
      }
      // Check for objects (like socialLinks)
      else if (typeof value === "object") {
        const hasAnyValue = Object.values(value).some((v) => v && v !== "");
        if (hasAnyValue) {
          earnedWeight += weight;
        }
      }
      // Primitive values
      else {
        earnedWeight += weight;
      }
    }
  }

  return Math.round((earnedWeight / totalWeight) * 100);
}

/**
 * Get list of incomplete/missing fields
 */
export function getIncompleteFields(profile: CompanyProfile | null): { field: string; label: string; priority: "high" | "medium" | "low" }[] {
  if (!profile) {
    return PROFILE_FIELDS.map((f) => ({
      field: f.field,
      label: f.label,
      priority: f.weight >= 7 ? "high" : f.weight >= 4 ? "medium" : "low",
    }));
  }

  const incomplete: { field: string; label: string; priority: "high" | "medium" | "low" }[] = [];

  for (const { field, weight, label } of PROFILE_FIELDS) {
    const value = profile[field as keyof CompanyProfile];
    let isMissing = false;

    if (value === undefined || value === null || value === "") {
      isMissing = true;
    } else if (Array.isArray(value) && value.length === 0) {
      isMissing = true;
    } else if (typeof value === "object" && !Array.isArray(value)) {
      const hasAnyValue = Object.values(value).some((v) => v && v !== "");
      isMissing = !hasAnyValue;
    }

    if (isMissing) {
      incomplete.push({
        field,
        label,
        priority: weight >= 7 ? "high" : weight >= 4 ? "medium" : "low",
      });
    }
  }

  return incomplete;
}

/**
 * Check if onboarding should be shown based on profile completeness
 */
export function shouldShowOnboarding(profile: CompanyProfile | null): boolean {
  // Show onboarding if no profile or completeness is below 50%
  if (!profile) return true;

  // If onboarding was completed, don't show again
  if (profile.onboardingCompletedAt) return false;

  const completeness = calculateProfileCompleteness(profile);
  return completeness < 50;
}

/**
 * Get onboarding status message
 */
export function getOnboardingStatus(profile: CompanyProfile | null): {
  showOnboarding: boolean;
  completeness: number;
  message: string;
  incompleteCount: number;
  highPriorityMissing: string[];
} {
  const completeness = calculateProfileCompleteness(profile);
  const incomplete = getIncompleteFields(profile);
  const highPriority = incomplete.filter((f) => f.priority === "high");

  let message = "";
  if (completeness === 0) {
    message = "Let's set up your company profile to get started.";
  } else if (completeness < 30) {
    message = "Your profile needs some essential information.";
  } else if (completeness < 50) {
    message = "Add a few more details to complete your profile.";
  } else if (completeness < 80) {
    message = "Your profile is looking good! A few optional details remain.";
  } else {
    message = "Your profile is complete!";
  }

  return {
    showOnboarding: shouldShowOnboarding(profile),
    completeness,
    message,
    incompleteCount: incomplete.length,
    highPriorityMissing: highPriority.map((f) => f.label),
  };
}

// ============ SCHEDULING OPERATIONS ============

/**
 * Update a blog's scheduled publish date and status
 */
export async function updateBlogSchedule(
  userId: string,
  blogId: string,
  scheduledPublishAt: Date | null
): Promise<{ error: Error | null }> {
  try {
    const scheduleStatus: ScheduleStatus = scheduledPublishAt ? "scheduled" : "unscheduled";

    await db
      .update(drafts)
      .set({
        scheduledPublishAt,
        scheduleStatus,
        updatedAt: new Date(),
      })
      .where(and(eq(drafts.id, blogId), eq(drafts.userId, userId)));

    return { error: null };
  } catch (error) {
    console.error("Error updating blog schedule:", error);
    return { error: error as Error };
  }
}

/**
 * Load all scheduled blogs for a given month (for calendar view)
 */
export async function loadScheduledBlogs(
  userId: string,
  year?: number,
  month?: number
): Promise<ScheduledBlog[]> {
  try {
    const result = await db
      .select({
        id: drafts.id,
        title: drafts.title,
        type: drafts.type,
        content: drafts.content,
        scheduledPublishAt: drafts.scheduledPublishAt,
        scheduleStatus: drafts.scheduleStatus,
      })
      .from(drafts)
      .where(
        and(
          eq(drafts.userId, userId),
          eq(drafts.scheduleStatus, "scheduled")
        )
      )
      .orderBy(drafts.scheduledPublishAt);

    // Filter by month if provided
    let filteredResults = result;
    if (year !== undefined && month !== undefined) {
      filteredResults = result.filter((blog) => {
        if (!blog.scheduledPublishAt) return false;
        const date = new Date(blog.scheduledPublishAt);
        return date.getFullYear() === year && date.getMonth() === month;
      });
    }

    // Get featured images for these blogs (filter by userId for security)
    const blogIds = filteredResults.map((b) => b.id);
    const featuredImages = blogIds.length > 0
      ? await db
          .select({
            draftId: draftImages.draftId,
            storagePath: draftImages.storagePath,
          })
          .from(draftImages)
          .where(and(eq(draftImages.isFeatured, true), eq(draftImages.userId, userId)))
      : [];

    // Create a map of blog ID to featured image URL
    const imageMap = new Map<string, string>();
    featuredImages.forEach((img) => {
      if (img.draftId && blogIds.includes(img.draftId)) {
        imageMap.set(img.draftId, img.storagePath);
      }
    });

    return filteredResults.map((blog) => {
      // Try to get featured image from draftImages, fallback to extracting from content
      let featuredImageUrl = imageMap.get(blog.id);
      if (!featuredImageUrl) {
        featuredImageUrl = extractFirstImageUrl(blog.content);
      }

      return {
        id: blog.id,
        title: blog.title,
        type: blog.type,
        scheduledPublishAt: blog.scheduledPublishAt,
        scheduleStatus: (blog.scheduleStatus as ScheduleStatus) || "unscheduled",
        featuredImageUrl,
      };
    });
  } catch (error) {
    console.error("Error loading scheduled blogs:", error);
    return [];
  }
}

/**
 * Extract first image URL from HTML content
 */
function extractFirstImageUrl(content: string | null): string | undefined {
  if (!content) return undefined;

  // Match img tags with src attribute
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1]) {
    const url = imgMatch[1];
    // Skip placeholder images
    if (url.includes('placehold.co') || url.includes('placeholder')) {
      return undefined;
    }
    return url;
  }
  return undefined;
}

/**
 * Load all unscheduled blogs (for the "to be scheduled" panel)
 * Includes blogs with NULL scheduleStatus, "unscheduled" status, and draft/ready status
 * Excludes scheduled and published blogs
 */
export async function loadUnscheduledBlogs(
  userId: string
): Promise<ScheduledBlog[]> {
  try {
    const result = await db
      .select({
        id: drafts.id,
        title: drafts.title,
        type: drafts.type,
        content: drafts.content,
        scheduledPublishAt: drafts.scheduledPublishAt,
        scheduleStatus: drafts.scheduleStatus,
      })
      .from(drafts)
      .where(
        and(
          eq(drafts.userId, userId),
          // Include blogs where scheduleStatus is NULL, "unscheduled", or missing
          // Exclude "scheduled" and "published" blogs
          or(
            isNull(drafts.scheduleStatus),
            eq(drafts.scheduleStatus, "unscheduled")
          )
        )
      )
      .orderBy(desc(drafts.updatedAt));

    // Get featured images for these blogs (filter by userId for security)
    const blogIds = result.map((b) => b.id);
    const featuredImages = blogIds.length > 0
      ? await db
          .select({
            draftId: draftImages.draftId,
            storagePath: draftImages.storagePath,
          })
          .from(draftImages)
          .where(and(eq(draftImages.isFeatured, true), eq(draftImages.userId, userId)))
      : [];

    // Create a map of blog ID to featured image URL
    const imageMap = new Map<string, string>();
    featuredImages.forEach((img) => {
      if (img.draftId && blogIds.includes(img.draftId)) {
        imageMap.set(img.draftId, img.storagePath);
      }
    });

    return result.map((blog) => {
      // Try to get featured image from draftImages, fallback to extracting from content
      let featuredImageUrl = imageMap.get(blog.id);
      if (!featuredImageUrl) {
        featuredImageUrl = extractFirstImageUrl(blog.content);
      }

      return {
        id: blog.id,
        title: blog.title,
        type: blog.type,
        scheduledPublishAt: blog.scheduledPublishAt,
        scheduleStatus: (blog.scheduleStatus as ScheduleStatus) || "unscheduled",
        featuredImageUrl,
      };
    });
  } catch (error) {
    console.error("Error loading unscheduled blogs:", error);
    return [];
  }
}

/**
 * Get a single blog's schedule info
 */
export async function getBlogSchedule(
  userId: string,
  blogId: string
): Promise<ScheduledBlog | null> {
  try {
    const result = await db
      .select({
        id: drafts.id,
        title: drafts.title,
        type: drafts.type,
        scheduledPublishAt: drafts.scheduledPublishAt,
        scheduleStatus: drafts.scheduleStatus,
      })
      .from(drafts)
      .where(and(eq(drafts.id, blogId), eq(drafts.userId, userId)))
      .limit(1);

    if (result.length === 0) return null;

    const blog = result[0];
    return {
      id: blog.id,
      title: blog.title,
      type: blog.type,
      scheduledPublishAt: blog.scheduledPublishAt,
      scheduleStatus: (blog.scheduleStatus as ScheduleStatus) || "unscheduled",
    };
  } catch (error) {
    console.error("Error getting blog schedule:", error);
    return null;
  }
}

// ============ DAILY USAGE OPERATIONS ============

// Set to 999999 to effectively disable limit (was 20)
const DAILY_BLOG_LIMIT = 999999;

/**
 * Get today's date in YYYY-MM-DD format (UTC)
 */
function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Get the current daily usage for a user
 */
export async function getDailyUsage(
  userId: string,
  date?: string
): Promise<{ date: string; blogsGenerated: number; limit: number; remaining: number; canGenerate: boolean }> {
  const targetDate = date || getTodayDateString();

  try {
    const result = await db
      .select()
      .from(dailyUsage)
      .where(and(eq(dailyUsage.userId, userId), eq(dailyUsage.date, targetDate)))
      .limit(1);

    const blogsGenerated = result.length > 0 ? result[0].blogsGenerated || 0 : 0;
    const remaining = Math.max(0, DAILY_BLOG_LIMIT - blogsGenerated);

    return {
      date: targetDate,
      blogsGenerated,
      limit: DAILY_BLOG_LIMIT,
      remaining,
      canGenerate: blogsGenerated < DAILY_BLOG_LIMIT,
    };
  } catch (error) {
    console.error("Error getting daily usage:", error);
    return {
      date: targetDate,
      blogsGenerated: 0,
      limit: DAILY_BLOG_LIMIT,
      remaining: DAILY_BLOG_LIMIT,
      canGenerate: true,
    };
  }
}

/**
 * Increment the daily usage count
 * Returns the new count and whether the limit was exceeded
 */
export async function incrementDailyUsage(
  userId: string,
  count: number = 1
): Promise<{ success: boolean; newCount: number; remaining: number; error: Error | null }> {
  const targetDate = getTodayDateString();

  try {
    // Check current usage first
    const current = await getDailyUsage(userId, targetDate);

    if (current.blogsGenerated + count > DAILY_BLOG_LIMIT) {
      return {
        success: false,
        newCount: current.blogsGenerated,
        remaining: current.remaining,
        error: new Error("Daily limit exceeded"),
      };
    }

    // Check if record exists for today
    const existing = await db
      .select()
      .from(dailyUsage)
      .where(and(eq(dailyUsage.userId, userId), eq(dailyUsage.date, targetDate)))
      .limit(1);

    let newCount: number;

    if (existing.length > 0) {
      // Update existing record
      newCount = (existing[0].blogsGenerated || 0) + count;
      await db
        .update(dailyUsage)
        .set({
          blogsGenerated: newCount,
          updatedAt: new Date(),
        })
        .where(and(eq(dailyUsage.userId, userId), eq(dailyUsage.date, targetDate)));
    } else {
      // Create new record
      newCount = count;
      await db.insert(dailyUsage).values({
        userId,
        date: targetDate,
        blogsGenerated: newCount,
      });
    }

    return {
      success: true,
      newCount,
      remaining: Math.max(0, DAILY_BLOG_LIMIT - newCount),
      error: null,
    };
  } catch (error) {
    console.error("Error incrementing daily usage:", error);
    return {
      success: false,
      newCount: 0,
      remaining: 0,
      error: error as Error,
    };
  }
}

/**
 * Check if user can generate more blogs today
 */
export async function checkDailyLimit(userId: string): Promise<boolean> {
  const usage = await getDailyUsage(userId);
  return usage.canGenerate;
}

// ============ AUTOMATION SETTINGS OPERATIONS ============

/**
 * Get automation settings for a user (creates default if not exists)
 */
export async function getAutomationSettings(userId: string): Promise<AutomationSettingsType | null> {
  try {
    const result = await db
      .select()
      .from(automationSettings)
      .where(eq(automationSettings.userId, userId))
      .limit(1);

    if (result.length === 0) {
      // Return default settings (not persisted until save)
      return {
        userId,
        allowBuildEntireSite: false,
        allowAutoCreateDailyBlogs: false,
        allowAutoScheduleBlogs: false,
        allowAutoPostBlogs: false,
        dailyBlogFrequency: 1,
        autoPostPlatform: "wordpress",
        autoCreateMode: "queue_for_review",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return result[0];
  } catch (error) {
    console.error("Error getting automation settings:", error);
    return null;
  }
}

/**
 * Save automation settings for a user (upsert)
 */
export async function saveAutomationSettings(
  userId: string,
  settings: Partial<Omit<AutomationSettingsType, "userId" | "createdAt" | "updatedAt">>
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const existing = await db
      .select()
      .from(automationSettings)
      .where(eq(automationSettings.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      // Update
      await db
        .update(automationSettings)
        .set({
          ...settings,
          updatedAt: new Date(),
        })
        .where(eq(automationSettings.userId, userId));
    } else {
      // Insert
      await db.insert(automationSettings).values({
        userId,
        allowBuildEntireSite: settings.allowBuildEntireSite ?? false,
        allowAutoCreateDailyBlogs: settings.allowAutoCreateDailyBlogs ?? false,
        allowAutoScheduleBlogs: settings.allowAutoScheduleBlogs ?? false,
        allowAutoPostBlogs: settings.allowAutoPostBlogs ?? false,
        dailyBlogFrequency: settings.dailyBlogFrequency ?? 1,
        autoPostPlatform: settings.autoPostPlatform ?? "wordpress",
        autoCreateMode: settings.autoCreateMode ?? "queue_for_review",
      });
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error saving automation settings:", error);
    return { success: false, error: error as Error };
  }
}

// ============ GENERATION QUEUE OPERATIONS ============

export interface QueueItemInput {
  type: "blog" | "service_page" | "location_page";
  topic: string;
  keywords?: string;
  priority?: number;
  scheduledFor?: Date;
  batchId?: string;
}

/**
 * Add items to the generation queue
 */
export async function addToQueue(
  userId: string,
  items: QueueItemInput[]
): Promise<{ success: boolean; insertedIds: string[]; error: Error | null }> {
  try {
    const insertedIds: string[] = [];

    for (const item of items) {
      const result = await db
        .insert(generationQueue)
        .values({
          userId,
          type: item.type,
          topic: item.topic,
          keywords: item.keywords || null,
          priority: item.priority || 0,
          scheduledFor: item.scheduledFor || null,
          batchId: item.batchId || null,
          status: "pending",
        })
        .returning({ id: generationQueue.id });

      if (result.length > 0) {
        insertedIds.push(result[0].id);
      } else {
        console.error("Failed to insert queue item - no result returned");
      }
    }

    return { success: true, insertedIds, error: null };
  } catch (error) {
    console.error("Error adding to queue:", error);
    return { success: false, insertedIds: [], error: error as Error };
  }
}

/**
 * Get queue items for a user with optional filters
 */
export async function getQueueItems(
  userId: string,
  filters?: {
    status?: QueueStatus | QueueStatus[];
    type?: string;
    batchId?: string;
    limit?: number;
  }
): Promise<GenerationQueueItem[]> {
  try {
    let query = db
      .select()
      .from(generationQueue)
      .where(eq(generationQueue.userId, userId))
      .orderBy(desc(generationQueue.priority), desc(generationQueue.createdAt));

    // Note: More complex filtering would require building dynamic conditions
    // For now, we'll filter in memory for simplicity
    const result = await query;

    let filtered = result;

    if (filters?.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      filtered = filtered.filter((item) => statuses.includes(item.status as QueueStatus));
    }

    if (filters?.type) {
      filtered = filtered.filter((item) => item.type === filters.type);
    }

    if (filters?.batchId) {
      filtered = filtered.filter((item) => item.batchId === filters.batchId);
    }

    if (filters?.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  } catch (error) {
    console.error("Error getting queue items:", error);
    return [];
  }
}

/**
 * Update a queue item
 */
export async function updateQueueItem(
  userId: string,
  itemId: string,
  updates: Partial<{
    status: QueueStatus;
    priority: number;
    scheduledFor: Date | null;
    generatedDraftId: string;
    errorMessage: string;
    attempts: number;
  }>
): Promise<{ success: boolean; error: Error | null }> {
  try {
    await db
      .update(generationQueue)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(generationQueue.id, itemId), eq(generationQueue.userId, userId)));

    return { success: true, error: null };
  } catch (error) {
    console.error("Error updating queue item:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Delete a queue item
 */
export async function deleteQueueItem(
  userId: string,
  itemId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    await db
      .delete(generationQueue)
      .where(and(eq(generationQueue.id, itemId), eq(generationQueue.userId, userId)));

    return { success: true, error: null };
  } catch (error) {
    console.error("Error deleting queue item:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Get pending queue items for processing (for cron job)
 * Only returns items that are pending and user is under daily limit
 */
export async function getPendingQueueItems(
  limit: number = 10
): Promise<Array<GenerationQueueItem & { userId: string }>> {
  try {
    const result = await db
      .select()
      .from(generationQueue)
      .where(eq(generationQueue.status, "pending"))
      .orderBy(desc(generationQueue.priority), generationQueue.createdAt)
      .limit(limit);

    return result;
  } catch (error) {
    console.error("Error getting pending queue items:", error);
    return [];
  }
}

// ============ SITE STRUCTURE PROPOSAL OPERATIONS ============

/**
 * Create a new site structure proposal
 */
export async function createSiteProposal(
  userId: string,
  proposal: {
    industry?: string;
    proposedStructure?: ProposedSiteStructure;
    aiReasoning?: string;
    status?: ProposalStatus;
  }
): Promise<{ success: boolean; proposalId: string | null; error: Error | null }> {
  try {
    const result = await db
      .insert(siteStructureProposals)
      .values({
        userId,
        industry: proposal.industry || null,
        proposedStructure: proposal.proposedStructure || null,
        aiReasoning: proposal.aiReasoning || null,
        status: proposal.status || "draft",
      })
      .returning({ id: siteStructureProposals.id });

    if (result.length === 0) {
      return { success: false, proposalId: null, error: new Error("Failed to insert proposal - no result returned") };
    }
    return { success: true, proposalId: result[0].id, error: null };
  } catch (error) {
    console.error("Error creating site proposal:", error);
    return { success: false, proposalId: null, error: error as Error };
  }
}

/**
 * Get a specific site proposal
 */
export async function getSiteProposal(
  userId: string,
  proposalId: string
): Promise<SiteStructureProposal | null> {
  try {
    const result = await db
      .select()
      .from(siteStructureProposals)
      .where(and(eq(siteStructureProposals.id, proposalId), eq(siteStructureProposals.userId, userId)))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Error getting site proposal:", error);
    return null;
  }
}

/**
 * Update a site proposal
 */
export async function updateSiteProposal(
  userId: string,
  proposalId: string,
  updates: Partial<{
    status: ProposalStatus;
    proposedStructure: ProposedSiteStructure;
    aiReasoning: string;
    userModifications: Record<string, unknown>;
    generationProgress: GenerationProgress;
  }>
): Promise<{ success: boolean; error: Error | null }> {
  try {
    await db
      .update(siteStructureProposals)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(siteStructureProposals.id, proposalId), eq(siteStructureProposals.userId, userId)));

    return { success: true, error: null };
  } catch (error) {
    console.error("Error updating site proposal:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Get all proposals for a user
 */
export async function getUserSiteProposals(
  userId: string
): Promise<SiteStructureProposal[]> {
  try {
    const result = await db
      .select()
      .from(siteStructureProposals)
      .where(eq(siteStructureProposals.userId, userId))
      .orderBy(desc(siteStructureProposals.createdAt));

    return result;
  } catch (error) {
    console.error("Error getting user site proposals:", error);
    return [];
  }
}

/**
 * Delete a site proposal
 */
export async function deleteSiteProposal(
  userId: string,
  proposalId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    await db
      .delete(siteStructureProposals)
      .where(and(eq(siteStructureProposals.id, proposalId), eq(siteStructureProposals.userId, userId)));

    return { success: true, error: null };
  } catch (error) {
    console.error("Error deleting site proposal:", error);
    return { success: false, error: error as Error };
  }
}

// ============ WORKFLOW OPERATIONS ============

/**
 * Create a new workflow run
 */
export async function createWorkflowRun(
  userId: string,
  params: {
    proposalId?: string;
    workflowType: "site_build" | "blog_batch" | "single_page";
    initialStage?: WorkflowStage;
  }
): Promise<{ success: boolean; workflowId: string | null; error: Error | null }> {
  try {
    const result = await db
      .insert(workflowRuns)
      .values({
        userId,
        proposalId: params.proposalId || null,
        workflowType: params.workflowType,
        status: "pending",
        currentStage: params.initialStage || "intake",
        stageProgress: {},
        errorLog: [],
      })
      .returning({ id: workflowRuns.id });

    if (result.length === 0) {
      return { success: false, workflowId: null, error: new Error("Failed to create workflow") };
    }

    return { success: true, workflowId: result[0].id, error: null };
  } catch (error) {
    console.error("Error creating workflow run:", error);
    return { success: false, workflowId: null, error: error as Error };
  }
}

/**
 * Get a workflow run by ID
 */
export async function getWorkflowRun(
  userId: string,
  workflowId: string
): Promise<WorkflowRun | null> {
  try {
    const result = await db
      .select()
      .from(workflowRuns)
      .where(and(eq(workflowRuns.id, workflowId), eq(workflowRuns.userId, userId)))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Error getting workflow run:", error);
    return null;
  }
}

/**
 * Get all workflow runs for a user
 */
export async function getUserWorkflowRuns(
  userId: string,
  filters?: { status?: WorkflowStatus; limit?: number }
): Promise<WorkflowRun[]> {
  try {
    let result = await db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.userId, userId))
      .orderBy(desc(workflowRuns.createdAt));

    if (filters?.status) {
      result = result.filter((r) => r.status === filters.status);
    }

    if (filters?.limit) {
      result = result.slice(0, filters.limit);
    }

    return result;
  } catch (error) {
    console.error("Error getting user workflow runs:", error);
    return [];
  }
}

/**
 * Update a workflow run
 */
export async function updateWorkflowRun(
  userId: string,
  workflowId: string,
  updates: Partial<{
    status: WorkflowStatus;
    currentStage: WorkflowStage;
    stageProgress: Record<string, { completed: number; total: number; status: string }>;
    knowledgeBaseSnapshot: unknown;
    startedAt: Date;
    pausedAt: Date | null;
    completedAt: Date;
  }>
): Promise<{ success: boolean; error: Error | null }> {
  try {
    await db
      .update(workflowRuns)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(workflowRuns.id, workflowId), eq(workflowRuns.userId, userId)));

    return { success: true, error: null };
  } catch (error) {
    console.error("Error updating workflow run:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Start a workflow (set status to running)
 */
export async function startWorkflowRun(
  userId: string,
  workflowId: string
): Promise<{ success: boolean; error: Error | null }> {
  return updateWorkflowRun(userId, workflowId, {
    status: "running",
    startedAt: new Date(),
  });
}

/**
 * Get workflow tasks for a run
 */
export async function getWorkflowTasks(
  workflowId: string,
  filters?: { taskType?: WorkflowStage; status?: TaskStatus }
): Promise<WorkflowTask[]> {
  try {
    let result = await db
      .select()
      .from(workflowTasks)
      .where(eq(workflowTasks.workflowRunId, workflowId))
      .orderBy(desc(workflowTasks.priority), workflowTasks.createdAt);

    if (filters?.taskType) {
      result = result.filter((t) => t.taskType === filters.taskType);
    }

    if (filters?.status) {
      result = result.filter((t) => t.status === filters.status);
    }

    return result;
  } catch (error) {
    console.error("Error getting workflow tasks:", error);
    return [];
  }
}

/**
 * Get a single workflow task
 */
export async function getWorkflowTask(taskId: string): Promise<WorkflowTask | null> {
  try {
    const result = await db
      .select()
      .from(workflowTasks)
      .where(eq(workflowTasks.id, taskId))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Error getting workflow task:", error);
    return null;
  }
}

/**
 * Get image QA logs for a task
 */
export async function getImageQaLogs(taskId: string): Promise<ImageQaLog[]> {
  try {
    const result = await db
      .select()
      .from(imageQaLogs)
      .where(eq(imageQaLogs.taskId, taskId))
      .orderBy(imageQaLogs.attempt);

    return result;
  } catch (error) {
    console.error("Error getting image QA logs:", error);
    return [];
  }
}

/**
 * Create an image QA log entry
 */
export async function createImageQaLog(
  taskId: string,
  log: {
    attempt: number;
    originalPrompt?: string;
    claudeApproved?: boolean;
    claudeFeedback?: string;
    claudeScore?: number;
    kimiApproved?: boolean;
    kimiFeedback?: string;
    kimiScore?: number;
    textDetected?: boolean;
    spellingErrors?: string[];
    fixPrompt?: string;
    regenerationModel?: string;
    switchedToTextless?: boolean;
    textlessPrompt?: string;
    finalImageUrl?: string;
    finalApproved?: boolean;
  }
): Promise<{ success: boolean; logId: string | null; error: Error | null }> {
  try {
    const result = await db
      .insert(imageQaLogs)
      .values({
        taskId,
        attempt: log.attempt,
        originalPrompt: log.originalPrompt || null,
        claudeApproved: log.claudeApproved ?? null,
        claudeFeedback: log.claudeFeedback || null,
        claudeScore: log.claudeScore ?? null,
        kimiApproved: log.kimiApproved ?? null,
        kimiFeedback: log.kimiFeedback || null,
        kimiScore: log.kimiScore ?? null,
        textDetected: log.textDetected ?? null,
        spellingErrors: log.spellingErrors || null,
        fixPrompt: log.fixPrompt || null,
        regenerationModel: log.regenerationModel || null,
        switchedToTextless: log.switchedToTextless ?? false,
        textlessPrompt: log.textlessPrompt || null,
        finalImageUrl: log.finalImageUrl || null,
        finalApproved: log.finalApproved ?? null,
      })
      .returning({ id: imageQaLogs.id });

    if (result.length === 0) {
      return { success: false, logId: null, error: new Error("Failed to create log") };
    }

    return { success: true, logId: result[0].id, error: null };
  } catch (error) {
    console.error("Error creating image QA log:", error);
    return { success: false, logId: null, error: error as Error };
  }
}

/**
 * Update proposal with workflow data (intake, research, blueprints)
 */
export async function updateProposalWorkflowData(
  userId: string,
  proposalId: string,
  updates: Partial<{
    workflowRunId: string;
    intakeData: IntakeData;
    researchData: ResearchData;
    blueprintsData: Record<string, unknown>;
  }>
): Promise<{ success: boolean; error: Error | null }> {
  try {
    await db
      .update(siteStructureProposals)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(siteStructureProposals.id, proposalId), eq(siteStructureProposals.userId, userId)));

    return { success: true, error: null };
  } catch (error) {
    console.error("Error updating proposal workflow data:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Get incomplete workflows for recovery (for cron job)
 */
export async function getIncompleteWorkflows(): Promise<WorkflowRun[]> {
  try {
    const result = await db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.status, "running"))
      .orderBy(workflowRuns.startedAt);

    return result;
  } catch (error) {
    console.error("Error getting incomplete workflows:", error);
    return [];
  }
}

// ============ CONVERSATION OPERATIONS ============

/**
 * Message metadata for tool calls and results
 */
export interface MessageMetadata {
  toolCalls?: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
  }>;
  toolResults?: Array<{
    toolCallId: string;
    result: unknown;
  }>;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
  };
  model?: string;
  error?: string;
}

/**
 * Conversation metadata
 */
export interface ConversationMetadata {
  modelUsed?: string;
  totalMessages?: number;
  lastMessageAt?: string;
}

/**
 * Create a new conversation
 */
export async function createConversation(
  userId: string,
  params?: {
    title?: string;
    metadata?: ConversationMetadata;
  }
): Promise<{ success: boolean; conversationId: string | null; error: Error | null }> {
  try {
    const result = await db
      .insert(conversations)
      .values({
        userId,
        title: params?.title || "New Conversation",
        status: "active",
        metadata: params?.metadata || null,
      })
      .returning({ id: conversations.id });

    if (result.length === 0) {
      return { success: false, conversationId: null, error: new Error("Failed to create conversation") };
    }

    return { success: true, conversationId: result[0].id, error: null };
  } catch (error) {
    console.error("Error creating conversation:", error);
    return { success: false, conversationId: null, error: error as Error };
  }
}

/**
 * Get a conversation by ID
 */
export async function getConversation(
  userId: string,
  conversationId: string
): Promise<Conversation | null> {
  try {
    const result = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Error getting conversation:", error);
    return null;
  }
}

/**
 * Get all conversations for a user
 */
export async function getUserConversations(
  userId: string,
  filters?: {
    status?: ConversationStatus;
    limit?: number;
    offset?: number;
  }
): Promise<Conversation[]> {
  try {
    let result = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));

    if (filters?.status) {
      result = result.filter((c) => c.status === filters.status);
    }

    if (filters?.offset) {
      result = result.slice(filters.offset);
    }

    if (filters?.limit) {
      result = result.slice(0, filters.limit);
    }

    return result;
  } catch (error) {
    console.error("Error getting user conversations:", error);
    return [];
  }
}

/**
 * Update a conversation
 */
export async function updateConversation(
  userId: string,
  conversationId: string,
  updates: Partial<{
    title: string;
    status: ConversationStatus;
    metadata: ConversationMetadata;
  }>
): Promise<{ success: boolean; error: Error | null }> {
  try {
    await db
      .update(conversations)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));

    return { success: true, error: null };
  } catch (error) {
    console.error("Error updating conversation:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Delete a conversation and all its messages
 */
export async function deleteConversation(
  userId: string,
  conversationId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    // Messages are cascade deleted via foreign key
    await db
      .delete(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));

    return { success: true, error: null };
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Archive a conversation
 */
export async function archiveConversation(
  userId: string,
  conversationId: string
): Promise<{ success: boolean; error: Error | null }> {
  return updateConversation(userId, conversationId, { status: "archived" });
}

/**
 * Save a message to a conversation
 */
export async function saveConversationMessage(
  userId: string,
  conversationId: string,
  message: {
    role: MessageRole;
    content: string;
    metadata?: MessageMetadata;
  }
): Promise<{ success: boolean; messageId: string | null; error: Error | null }> {
  try {
    // First verify the conversation belongs to this user
    const conversation = await getConversation(userId, conversationId);
    if (!conversation) {
      return { success: false, messageId: null, error: new Error("Conversation not found or access denied") };
    }

    const result = await db
      .insert(conversationMessages)
      .values({
        conversationId,
        userId,
        role: message.role,
        content: message.content,
        metadata: message.metadata || null,
      })
      .returning({ id: conversationMessages.id });

    if (result.length === 0) {
      return { success: false, messageId: null, error: new Error("Failed to save message") };
    }

    // Update conversation's updatedAt timestamp
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));

    return { success: true, messageId: result[0].id, error: null };
  } catch (error) {
    console.error("Error saving conversation message:", error);
    return { success: false, messageId: null, error: error as Error };
  }
}

/**
 * Get messages for a conversation
 */
export async function getConversationMessages(
  userId: string,
  conversationId: string,
  options?: {
    limit?: number;
    beforeId?: string;
  }
): Promise<ConversationMessage[]> {
  try {
    // First verify the conversation belongs to this user
    const conversation = await getConversation(userId, conversationId);
    if (!conversation) {
      return [];
    }

    let result = await db
      .select()
      .from(conversationMessages)
      .where(eq(conversationMessages.conversationId, conversationId))
      .orderBy(conversationMessages.createdAt);

    // Filter messages before a certain ID for pagination
    if (options?.beforeId) {
      const beforeIndex = result.findIndex((m) => m.id === options.beforeId);
      if (beforeIndex > 0) {
        result = result.slice(0, beforeIndex);
      }
    }

    // Limit results (from the end for pagination)
    if (options?.limit && result.length > options.limit) {
      result = result.slice(-options.limit);
    }

    return result;
  } catch (error) {
    console.error("Error getting conversation messages:", error);
    return [];
  }
}

/**
 * Get the last N messages from a conversation (for context)
 */
export async function getRecentConversationMessages(
  userId: string,
  conversationId: string,
  limit: number = 20
): Promise<ConversationMessage[]> {
  return getConversationMessages(userId, conversationId, { limit });
}

/**
 * Delete a specific message
 */
export async function deleteConversationMessage(
  userId: string,
  messageId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    // Verify the message belongs to this user
    const message = await db
      .select()
      .from(conversationMessages)
      .where(and(eq(conversationMessages.id, messageId), eq(conversationMessages.userId, userId)))
      .limit(1);

    if (message.length === 0) {
      return { success: false, error: new Error("Message not found or access denied") };
    }

    await db
      .delete(conversationMessages)
      .where(and(eq(conversationMessages.id, messageId), eq(conversationMessages.userId, userId)));

    return { success: true, error: null };
  } catch (error) {
    console.error("Error deleting conversation message:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Generate a title for a conversation based on the first message
 * (Called after first user message to auto-title the conversation)
 */
export async function generateConversationTitle(
  userId: string,
  conversationId: string,
  firstMessage: string
): Promise<{ success: boolean; title: string; error: Error | null }> {
  try {
    // Generate a short title from the first message (max 50 chars)
    const words = firstMessage.trim().split(/\s+/).slice(0, 8);
    let title = words.join(" ");
    if (title.length > 50) {
      title = title.slice(0, 47) + "...";
    }
    if (!title) {
      title = "New Conversation";
    }

    await updateConversation(userId, conversationId, { title });

    return { success: true, title, error: null };
  } catch (error) {
    console.error("Error generating conversation title:", error);
    return { success: false, title: "New Conversation", error: error as Error };
  }
}
