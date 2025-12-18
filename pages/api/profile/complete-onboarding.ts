// pages/api/profile/complete-onboarding.ts
// Marks user onboarding as complete

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import {
  loadUserProfile,
  saveUserProfile,
  calculateProfileCompleteness,
} from "../../../lib/database";
import type { CompanyProfile } from "../../../lib/page-types";

interface CompleteOnboardingResponse {
  success: boolean;
  completeness?: number;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CompleteOnboardingResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    return res.status(401).json({
      success: false,
      error: "Not authenticated",
    });
  }

  const userId = (session.user as { id: string }).id;

  try {
    const profile = await loadUserProfile(userId);
    const existingCompanyProfile = profile?.companyProfile || {};

    const updatedCompanyProfile: CompanyProfile = {
      ...existingCompanyProfile,
      onboardingCompletedAt: new Date().toISOString(),
      profileCompleteness: calculateProfileCompleteness(
        existingCompanyProfile as CompanyProfile
      ),
    } as CompanyProfile;

    const { error } = await saveUserProfile(userId, {
      companyProfile: updatedCompanyProfile,
    });

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      completeness: updatedCompanyProfile.profileCompleteness,
    });
  } catch (error) {
    console.error("Complete onboarding error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to complete onboarding",
    });
  }
}
