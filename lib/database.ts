// lib/database.ts
// Database CRUD operations for Neon DB with Drizzle ORM

import { db, profiles, drafts, draftImages, eq, desc } from "./db";
import type { CompanyProfile } from "./page-types";

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
      // Update existing draft
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
        .where(eq(drafts.id, draft.id));

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
    // Delete associated images first
    await db
      .delete(draftImages)
      .where(eq(draftImages.draftId, draftId));

    // Delete the draft
    await db
      .delete(drafts)
      .where(eq(drafts.id, draftId));

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

    await db
      .update(drafts)
      .set(updateData)
      .where(eq(drafts.id, draftId));

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
      await db
        .update(draftImages)
        .set({
          draftId: image.draftId || null,
          storagePath: image.storagePath,
          originalPrompt: image.originalPrompt || null,
          altText: image.altText || null,
          isFeatured: image.isFeatured || false,
        })
        .where(eq(draftImages.id, image.id));

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
    const result = await db
      .select()
      .from(draftImages)
      .where(eq(draftImages.draftId, draftId));

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
    await db
      .delete(draftImages)
      .where(eq(draftImages.id, imageId));

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
