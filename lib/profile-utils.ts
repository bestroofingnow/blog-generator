// lib/profile-utils.ts
// Client-safe profile utility functions (no database dependencies)

import type { CompanyProfile } from "./page-types";

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
