// pages/api/profile/index.ts
// Profile CRUD API for user settings and company profile

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import {
  loadUserProfile,
  saveUserProfile,
  calculateProfileCompleteness,
  getOnboardingStatus,
  type UserProfile,
} from "../../../lib/database";
import type { CompanyProfile } from "../../../lib/page-types";

interface ProfileResponse {
  success: boolean;
  profile?: UserProfile | null;
  completeness?: number;
  onboardingStatus?: ReturnType<typeof getOnboardingStatus>;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProfileResponse>
) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    return res.status(401).json({
      success: false,
      error: "Not authenticated",
    });
  }

  const userId = (session.user as { id: string }).id;

  try {
    switch (req.method) {
      case "GET":
        return handleGet(userId, res);
      case "PUT":
        return handlePut(userId, req, res);
      case "PATCH":
        return handlePatch(userId, req, res);
      default:
        return res.status(405).json({
          success: false,
          error: "Method not allowed",
        });
    }
  } catch (error) {
    console.error("Profile API error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

// GET - Load user profile with completeness info
async function handleGet(
  userId: string,
  res: NextApiResponse<ProfileResponse>
) {
  const profile = await loadUserProfile(userId);
  const companyProfile = profile?.companyProfile || null;
  const completeness = calculateProfileCompleteness(companyProfile);
  const onboardingStatus = getOnboardingStatus(companyProfile);

  return res.status(200).json({
    success: true,
    profile,
    completeness,
    onboardingStatus,
  });
}

// PUT - Replace entire profile
async function handlePut(
  userId: string,
  req: NextApiRequest,
  res: NextApiResponse<ProfileResponse>
) {
  const { companyName, companyProfile, wordpressSettings, ghlSettings } =
    req.body;

  // Validate required fields if companyProfile is provided
  if (companyProfile && typeof companyProfile !== "object") {
    return res.status(400).json({
      success: false,
      error: "Invalid companyProfile format",
    });
  }

  const updateData: Partial<Omit<UserProfile, "userId">> = {};

  if (companyName !== undefined) {
    updateData.companyName = companyName;
  }

  if (companyProfile !== undefined) {
    // Calculate completeness and add metadata
    const completeness = calculateProfileCompleteness(companyProfile);
    updateData.companyProfile = {
      ...companyProfile,
      profileCompleteness: completeness,
    } as CompanyProfile;
  }

  if (wordpressSettings !== undefined) {
    updateData.wordpressSettings = wordpressSettings;
  }

  if (ghlSettings !== undefined) {
    updateData.ghlSettings = ghlSettings;
  }

  const { error } = await saveUserProfile(userId, updateData);

  if (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }

  // Return updated profile
  const updatedProfile = await loadUserProfile(userId);
  const updatedCompanyProfile = updatedProfile?.companyProfile || null;

  return res.status(200).json({
    success: true,
    profile: updatedProfile,
    completeness: calculateProfileCompleteness(updatedCompanyProfile),
    onboardingStatus: getOnboardingStatus(updatedCompanyProfile),
  });
}

// PATCH - Update specific fields
async function handlePatch(
  userId: string,
  req: NextApiRequest,
  res: NextApiResponse<ProfileResponse>
) {
  const { field, value, companyProfileFields } = req.body;

  // Option 1: Update a top-level field (companyName, wordpressSettings, ghlSettings)
  if (field && value !== undefined) {
    const allowedFields = ["companyName", "wordpressSettings", "ghlSettings"];
    if (!allowedFields.includes(field)) {
      return res.status(400).json({
        success: false,
        error: `Invalid field: ${field}`,
      });
    }

    const { error } = await saveUserProfile(userId, { [field]: value });

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Option 2: Update specific companyProfile fields
  if (companyProfileFields && typeof companyProfileFields === "object") {
    const existingProfile = await loadUserProfile(userId);
    const existingCompanyProfile = existingProfile?.companyProfile || {};

    const updatedCompanyProfile = {
      ...existingCompanyProfile,
      ...companyProfileFields,
    } as CompanyProfile;

    // Recalculate completeness
    const completeness = calculateProfileCompleteness(updatedCompanyProfile);
    updatedCompanyProfile.profileCompleteness = completeness;

    const { error } = await saveUserProfile(userId, {
      companyProfile: updatedCompanyProfile,
      companyName: updatedCompanyProfile.name || existingProfile?.companyName,
    });

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Return updated profile
  const updatedProfile = await loadUserProfile(userId);
  const updatedCompanyProfile = updatedProfile?.companyProfile || null;

  return res.status(200).json({
    success: true,
    profile: updatedProfile,
    completeness: calculateProfileCompleteness(updatedCompanyProfile),
    onboardingStatus: getOnboardingStatus(updatedCompanyProfile),
  });
}
