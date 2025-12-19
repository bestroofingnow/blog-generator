// lib/database.ts
// Database CRUD operations for Neon DB with Drizzle ORM

import { db, profiles, drafts, draftImages, dailyUsage, automationSettings, generationQueue, siteStructureProposals, eq, desc, and } from "./db";
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

    // Get featured images for these blogs
    const blogIds = filteredResults.map((b) => b.id);
    const featuredImages = blogIds.length > 0
      ? await db
          .select({
            draftId: draftImages.draftId,
            storagePath: draftImages.storagePath,
          })
          .from(draftImages)
          .where(eq(draftImages.isFeatured, true))
      : [];

    // Create a map of blog ID to featured image URL
    const imageMap = new Map<string, string>();
    featuredImages.forEach((img) => {
      if (img.draftId && blogIds.includes(img.draftId)) {
        imageMap.set(img.draftId, img.storagePath);
      }
    });

    return filteredResults.map((blog) => ({
      id: blog.id,
      title: blog.title,
      type: blog.type,
      scheduledPublishAt: blog.scheduledPublishAt,
      scheduleStatus: (blog.scheduleStatus as ScheduleStatus) || "unscheduled",
      featuredImageUrl: imageMap.get(blog.id),
    }));
  } catch (error) {
    console.error("Error loading scheduled blogs:", error);
    return [];
  }
}

/**
 * Load all unscheduled blogs (for the "to be scheduled" panel)
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
        scheduledPublishAt: drafts.scheduledPublishAt,
        scheduleStatus: drafts.scheduleStatus,
      })
      .from(drafts)
      .where(
        and(
          eq(drafts.userId, userId),
          eq(drafts.scheduleStatus, "unscheduled")
        )
      )
      .orderBy(desc(drafts.updatedAt));

    // Get featured images for these blogs
    const blogIds = result.map((b) => b.id);
    const featuredImages = blogIds.length > 0
      ? await db
          .select({
            draftId: draftImages.draftId,
            storagePath: draftImages.storagePath,
          })
          .from(draftImages)
          .where(eq(draftImages.isFeatured, true))
      : [];

    // Create a map of blog ID to featured image URL
    const imageMap = new Map<string, string>();
    featuredImages.forEach((img) => {
      if (img.draftId && blogIds.includes(img.draftId)) {
        imageMap.set(img.draftId, img.storagePath);
      }
    });

    return result.map((blog) => ({
      id: blog.id,
      title: blog.title,
      type: blog.type,
      scheduledPublishAt: blog.scheduledPublishAt,
      scheduleStatus: (blog.scheduleStatus as ScheduleStatus) || "unscheduled",
      featuredImageUrl: imageMap.get(blog.id),
    }));
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

const DAILY_BLOG_LIMIT = 20;

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
