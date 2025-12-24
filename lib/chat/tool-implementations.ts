// lib/chat/tool-implementations.ts
// Tool implementations for the conversational AI chat

import {
  loadUserProfile,
  saveUserProfile,
  loadDrafts,
  saveDraft,
  deleteDraft,
  updateBlogSchedule,
  loadImagesForDraft,
} from "../database";
import {
  generateOutline as aiGenerateOutline,
  generateContent as aiGenerateContent,
  researchKeywords as aiResearchKeywords,
} from "../ai-gateway";
import type { CompanyProfile } from "../page-types";
import type { DraftData } from "../database";

// ============ PROFILE & SETTINGS IMPLEMENTATIONS ============

export async function getProfileImpl(userId: string) {
  const profile = await loadUserProfile(userId);

  if (!profile) {
    return {
      success: false,
      message: "No profile found. Consider creating one by providing your company information.",
      profile: null,
    };
  }

  const companyProfile = profile.companyProfile;

  return {
    success: true,
    profile: {
      companyName: profile.companyName || companyProfile?.name,
      tagline: companyProfile?.tagline,
      website: companyProfile?.website,
      phone: companyProfile?.phone,
      email: companyProfile?.email,
      address: companyProfile?.address,
      headquarters: companyProfile?.headquarters,
      state: companyProfile?.state,
      industryType: companyProfile?.industryType,
      yearsInBusiness: companyProfile?.yearsInBusiness,
      audience: companyProfile?.audience,
      services: companyProfile?.services || [],
      cities: companyProfile?.cities || [],
      usps: companyProfile?.usps || [],
      certifications: companyProfile?.certifications || [],
      brandVoice: companyProfile?.brandVoice,
      writingStyle: companyProfile?.writingStyle,
      primarySiteKeyword: companyProfile?.primarySiteKeyword,
      secondarySiteKeywords: companyProfile?.secondarySiteKeywords || [],
      siteDescription: companyProfile?.siteDescription,
      businessPersonality: companyProfile?.businessPersonality,
      valueProposition: companyProfile?.valueProposition,
      socialLinks: companyProfile?.socialLinks,
      competitors: companyProfile?.competitors || [],
      competitorWebsites: companyProfile?.competitorWebsites || [],
    },
    wordpressConnected: profile.wordpressSettings?.isConnected || false,
    ghlConnected: profile.ghlSettings?.isConnected || false,
  };
}

export async function updateProfileImpl(
  userId: string,
  updates: Partial<CompanyProfile>
) {
  // Load existing profile
  const existing = await loadUserProfile(userId);
  const currentProfile = (existing?.companyProfile || {}) as Partial<CompanyProfile>;

  // Merge updates
  const updatedProfile = {
    ...currentProfile,
    ...updates,
    // Merge arrays if partial updates provided
    services: updates.services || currentProfile.services || [],
    cities: updates.cities || currentProfile.cities || [],
    usps: updates.usps || currentProfile.usps || [],
    certifications: updates.certifications || currentProfile.certifications || [],
    secondarySiteKeywords: updates.secondarySiteKeywords || currentProfile.secondarySiteKeywords || [],
  };

  const { error } = await saveUserProfile(userId, {
    companyName: updates.name || currentProfile.name || existing?.companyName,
    companyProfile: updatedProfile as CompanyProfile,
  });

  if (error) {
    return {
      success: false,
      message: `Failed to update profile: ${error.message}`,
    };
  }

  return {
    success: true,
    message: "Profile updated successfully",
    updatedFields: Object.keys(updates),
  };
}

export async function updateBrandVoiceImpl(
  userId: string,
  updates: {
    brandVoice?: string;
    writingStyle?: string;
    primarySiteKeyword?: string;
    secondarySiteKeywords?: string[];
    siteDescription?: string;
    businessPersonality?: string;
    valueProposition?: string;
  }
) {
  return updateProfileImpl(userId, updates);
}

// ============ CONTENT GENERATION IMPLEMENTATIONS ============

export async function generateOutlineImpl(
  userId: string,
  params: {
    topic: string;
    location?: string;
    blogType?: "blog" | "service" | "location";
    numberOfSections?: number;
    tone?: string;
    primaryKeyword?: string;
    secondaryKeywords?: string[];
  }
) {
  // Load user profile for context
  const userProfile = await loadUserProfile(userId);
  const companyProfile = userProfile?.companyProfile;

  const profileContext = companyProfile ? {
    services: companyProfile.services || [],
    usps: companyProfile.usps || [],
    certifications: companyProfile.certifications || [],
    brandVoice: companyProfile.brandVoice,
    writingStyle: companyProfile.writingStyle,
    targetAudience: companyProfile.audience,
    industryType: companyProfile.industryType,
  } : undefined;

  try {
    const outline = await aiGenerateOutline({
      topic: params.topic,
      location: params.location || "",
      blogType: params.blogType || "blog",
      numberOfSections: params.numberOfSections || 5,
      tone: params.tone || companyProfile?.brandVoice || "professional",
      primaryKeyword: params.primaryKeyword || "",
      secondaryKeywords: params.secondaryKeywords || [],
      imageThemes: [],
      profileContext,
    });

    return {
      success: true,
      outline,
      message: `Generated outline for "${params.topic}" with ${outline.sections?.length || 0} sections.`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to generate outline: ${error instanceof Error ? error.message : "Unknown error"}`,
      outline: null,
    };
  }
}

export async function generateDraftImpl(
  userId: string,
  params: {
    topic: string;
    location?: string;
    blogType?: "blog" | "service" | "location";
    numberOfSections?: number;
    wordCountRange?: { min: number; max: number };
    tone?: string;
    primaryKeyword?: string;
    secondaryKeywords?: string[];
    generateImages?: boolean;
    numberOfImages?: number;
    saveDraft?: boolean;
  }
) {
  // Load user profile for context
  const userProfile = await loadUserProfile(userId);
  const companyProfile = userProfile?.companyProfile;

  const profileContext = companyProfile ? {
    services: companyProfile.services || [],
    usps: companyProfile.usps || [],
    certifications: companyProfile.certifications || [],
    brandVoice: companyProfile.brandVoice,
    writingStyle: companyProfile.writingStyle,
    targetAudience: companyProfile.audience,
    industryType: companyProfile.industryType,
    yearsInBusiness: companyProfile.yearsInBusiness,
    primarySiteKeyword: companyProfile.primarySiteKeyword,
    secondarySiteKeywords: companyProfile.secondarySiteKeywords || [],
    businessPersonality: companyProfile.businessPersonality,
    valueProposition: companyProfile.valueProposition,
  } : undefined;

  try {
    // First generate outline
    const outline = await aiGenerateOutline({
      topic: params.topic,
      location: params.location || "",
      blogType: params.blogType || "blog",
      numberOfSections: params.numberOfSections || 5,
      tone: params.tone || companyProfile?.brandVoice || "professional",
      primaryKeyword: params.primaryKeyword || "",
      secondaryKeywords: params.secondaryKeywords || [],
      imageThemes: [],
      profileContext,
    });

    // Then generate content
    const wordRange = params.wordCountRange
      ? `${params.wordCountRange.min}-${params.wordCountRange.max}`
      : "800-1500";
    const content = await aiGenerateContent({
      outline,
      topic: params.topic,
      location: params.location || "",
      tone: params.tone || companyProfile?.brandVoice || "professional",
      readingLevel: "general",
      companyName: companyProfile?.name || userProfile?.companyName || "",
      wordCountRange: wordRange,
      numberOfImages: params.generateImages ? (params.numberOfImages || 3) : 0,
      profileContext,
    });

    // Save as draft if requested
    let draftId: string | undefined;
    if (params.saveDraft !== false) {
      const draftResult = await saveDraft(userId, {
        type: params.blogType || "blog",
        title: outline.blogTitle || params.topic,
        slug: outline.blogTitle?.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        content,
        seoData: {
          primaryKeyword: params.primaryKeyword || outline.seo?.primaryKeyword,
          secondaryKeywords: params.secondaryKeywords || outline.seo?.secondaryKeywords,
          metaTitle: outline.seo?.metaTitle,
          metaDescription: outline.seo?.metaDescription,
        },
        status: "draft",
      });

      if (!draftResult.error) {
        draftId = draftResult.id;
      }
    }

    return {
      success: true,
      message: draftId
        ? `Draft created successfully with ID: ${draftId}`
        : "Content generated (not saved as draft)",
      draftId,
      title: outline.blogTitle,
      wordCount: content.split(/\s+/).length,
      seo: outline.seo,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to generate draft: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export async function generateMetaImpl(
  userId: string,
  params: {
    topic: string;
    primaryKeyword?: string;
    draftId?: string;
  }
) {
  // Load user profile for context
  const userProfile = await loadUserProfile(userId);
  const companyProfile = userProfile?.companyProfile;

  try {
    const research = await aiResearchKeywords({
      topic: params.topic,
      location: companyProfile?.headquarters || "",
      blogType: "blog",
      profileContext: {
        services: companyProfile?.services || [],
        usps: companyProfile?.usps || [],
        targetAudience: companyProfile?.audience || "",
        industryType: companyProfile?.industryType,
        primarySiteKeyword: companyProfile?.primarySiteKeyword,
        secondarySiteKeywords: companyProfile?.secondarySiteKeywords || [],
      },
    });

    const result = {
      success: true,
      primaryKeyword: params.primaryKeyword || research.primaryKeyword,
      metaTitle: research.metaTitle,
      metaDescription: research.metaDescription,
      secondaryKeywords: research.secondaryKeywords,
    };

    // Update draft if ID provided
    if (params.draftId) {
      await saveDraft(userId, {
        id: params.draftId,
        type: "blog",
        title: "", // Will be ignored in update
        seoData: {
          primaryKeyword: result.primaryKeyword,
          secondaryKeywords: result.secondaryKeywords,
          metaTitle: result.metaTitle,
          metaDescription: result.metaDescription,
        },
      });
      result.success = true;
    }

    return result;
  } catch (error) {
    return {
      success: false,
      message: `Failed to generate meta: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// ============ SEO RESEARCH IMPLEMENTATIONS ============

export async function keywordResearchImpl(
  userId: string,
  params: {
    topic: string;
    location?: string;
    industry?: string;
    competitorUrls?: string[];
  }
) {
  const userProfile = await loadUserProfile(userId);
  const companyProfile = userProfile?.companyProfile;

  try {
    const research = await aiResearchKeywords({
      topic: params.topic,
      location: params.location || companyProfile?.headquarters || "",
      blogType: "blog",
      profileContext: {
        services: companyProfile?.services || [],
        usps: companyProfile?.usps || [],
        targetAudience: companyProfile?.audience || "",
        industryType: params.industry || companyProfile?.industryType,
        primarySiteKeyword: companyProfile?.primarySiteKeyword,
        secondarySiteKeywords: companyProfile?.secondarySiteKeywords || [],
        competitorWebsites: params.competitorUrls || companyProfile?.competitorWebsites || [],
      },
    });

    return {
      success: true,
      primaryKeyword: research.primaryKeyword,
      secondaryKeywords: research.secondaryKeywords,
      metaTitle: research.metaTitle,
      metaDescription: research.metaDescription,
      competitorInsights: research.competitorInsights || [],
      contentAngles: research.contentAngles || [],
      imageThemes: research.imageThemes || [],
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to research keywords: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export async function competitorAnalysisImpl(
  userId: string,
  params: {
    competitorUrls: string[];
    topic?: string;
  }
) {
  const userProfile = await loadUserProfile(userId);
  const companyProfile = userProfile?.companyProfile;

  try {
    // Use keyword research with competitor focus
    const research = await aiResearchKeywords({
      topic: params.topic || companyProfile?.industryType || "industry analysis",
      location: companyProfile?.headquarters || "",
      blogType: "blog",
      profileContext: {
        services: companyProfile?.services || [],
        usps: companyProfile?.usps || [],
        targetAudience: companyProfile?.audience || "",
        industryType: companyProfile?.industryType,
        competitorWebsites: params.competitorUrls,
      },
    });

    return {
      success: true,
      competitorInsights: research.competitorInsights || [],
      contentAngles: research.contentAngles || [],
      keywords: research.secondaryKeywords,
      recommendations: research.competitorInsights?.slice(0, 3) || [],
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to analyze competitors: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// ============ DRAFT MANAGEMENT IMPLEMENTATIONS ============

export async function listDraftsImpl(
  userId: string,
  params: {
    status?: "draft" | "ready" | "published" | "all";
    type?: "blog" | "service" | "location" | "all";
    limit?: number;
  }
) {
  const allDrafts = await loadDrafts(userId);

  let filtered = allDrafts;

  if (params.status && params.status !== "all") {
    filtered = filtered.filter((d) => d.status === params.status);
  }

  if (params.type && params.type !== "all") {
    filtered = filtered.filter((d) => d.type === params.type);
  }

  if (params.limit) {
    filtered = filtered.slice(0, params.limit);
  }

  return {
    success: true,
    totalCount: allDrafts.length,
    filteredCount: filtered.length,
    drafts: filtered.map((d) => ({
      id: d.id,
      title: d.title,
      type: d.type,
      status: d.status,
      slug: d.slug,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      hasContent: !!d.content,
      seoData: d.seoData,
    })),
  };
}

export async function getDraftImpl(
  userId: string,
  params: { draftId: string }
) {
  const allDrafts = await loadDrafts(userId);
  const draft = allDrafts.find((d) => d.id === params.draftId);

  if (!draft) {
    return {
      success: false,
      message: "Draft not found",
      draft: null,
    };
  }

  // Also load images for this draft
  const images = draft.id ? await loadImagesForDraft(userId, draft.id) : [];

  return {
    success: true,
    draft: {
      id: draft.id,
      title: draft.title,
      type: draft.type,
      status: draft.status,
      slug: draft.slug,
      content: draft.content,
      seoData: draft.seoData,
      publishedUrl: draft.publishedUrl,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      wordCount: draft.content ? draft.content.split(/\s+/).length : 0,
    },
    images: images.map((img) => ({
      id: img.id,
      storagePath: img.storagePath,
      altText: img.altText,
      isFeatured: img.isFeatured,
    })),
  };
}

export async function saveDraftImpl(
  userId: string,
  params: {
    draftId?: string;
    title: string;
    type: "blog" | "service" | "location";
    content?: string;
    slug?: string;
    seoData?: {
      primaryKeyword?: string;
      secondaryKeywords?: string[];
      metaTitle?: string;
      metaDescription?: string;
    };
    status?: "draft" | "ready" | "published";
  }
) {
  const draftData: DraftData = {
    id: params.draftId,
    title: params.title,
    type: params.type,
    content: params.content,
    slug: params.slug,
    seoData: params.seoData,
    status: params.status || "draft",
  };

  const result = await saveDraft(userId, draftData);

  if (result.error) {
    return {
      success: false,
      message: `Failed to save draft: ${result.error.message}`,
    };
  }

  return {
    success: true,
    message: params.draftId ? "Draft updated successfully" : "Draft created successfully",
    draftId: result.id,
  };
}

export async function deleteDraftImpl(
  userId: string,
  params: {
    draftId: string;
    confirmDelete: boolean;
  }
) {
  if (!params.confirmDelete) {
    return {
      success: false,
      message: "Deletion not confirmed. Set confirmDelete to true to proceed.",
    };
  }

  const result = await deleteDraft(userId, params.draftId);

  if (result.error) {
    return {
      success: false,
      message: `Failed to delete draft: ${result.error.message}`,
    };
  }

  return {
    success: true,
    message: "Draft deleted successfully",
  };
}

export async function scheduleDraftImpl(
  userId: string,
  params: {
    draftId: string;
    scheduledDate: string;
  }
) {
  const scheduledAt = new Date(params.scheduledDate);

  if (isNaN(scheduledAt.getTime())) {
    return {
      success: false,
      message: "Invalid date format. Use ISO format (e.g., '2024-12-25T10:00:00Z')",
    };
  }

  if (scheduledAt < new Date()) {
    return {
      success: false,
      message: "Scheduled date must be in the future",
    };
  }

  const result = await updateBlogSchedule(userId, params.draftId, scheduledAt);

  if (result.error) {
    return {
      success: false,
      message: `Failed to schedule draft: ${result.error.message}`,
    };
  }

  return {
    success: true,
    message: `Draft scheduled for ${scheduledAt.toLocaleString()}`,
    scheduledAt: scheduledAt.toISOString(),
  };
}
