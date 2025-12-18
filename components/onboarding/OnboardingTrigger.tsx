// components/onboarding/OnboardingTrigger.tsx
// Automatically shows onboarding wizard for incomplete profiles

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../lib/auth-context";
import OnboardingWizard from "./OnboardingWizard";
import type { CompanyProfile } from "../../lib/page-types";

interface OnboardingStatus {
  showOnboarding: boolean;
  completeness: number;
  message: string;
}

export default function OnboardingTrigger() {
  const { user, isLoading: authLoading } = useAuth();
  const [showWizard, setShowWizard] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [initialProfile, setInitialProfile] = useState<Partial<CompanyProfile> | undefined>();
  const [dismissed, setDismissed] = useState(false);

  // Check profile completeness on mount
  useEffect(() => {
    if (authLoading || !user) {
      setIsChecking(false);
      return;
    }

    // Check if already dismissed this session
    const sessionDismissed = sessionStorage.getItem("onboarding_dismissed");
    if (sessionDismissed) {
      setDismissed(true);
      setIsChecking(false);
      return;
    }

    checkOnboardingStatus();
  }, [user, authLoading]);

  const checkOnboardingStatus = async () => {
    try {
      const response = await fetch("/api/profile");
      if (!response.ok) {
        setIsChecking(false);
        return;
      }

      const data = await response.json();

      if (data.success && data.onboardingStatus) {
        const status: OnboardingStatus = data.onboardingStatus;

        if (status.showOnboarding) {
          setInitialProfile(data.profile?.companyProfile || undefined);
          setShowWizard(true);
        }
      }
    } catch (error) {
      console.error("Failed to check onboarding status:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleComplete = useCallback(async (profile: Partial<CompanyProfile>) => {
    try {
      // Save profile
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyProfile: profile,
          companyName: profile.name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to save profile (${response.status})`);
      }

      // Mark onboarding as complete
      const completeResponse = await fetch("/api/profile/complete-onboarding", {
        method: "POST",
      });

      if (!completeResponse.ok) {
        const errorData = await completeResponse.json().catch(() => ({}));
        console.warn("Failed to mark onboarding complete:", errorData.error || completeResponse.status);
        // Don't throw - profile was saved, just the completion marker failed
      }

      setShowWizard(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to complete onboarding:", errorMessage);
      // Still close the wizard, user can retry later
      setShowWizard(false);
    }
  }, []);

  const handleClose = useCallback(() => {
    setShowWizard(false);
    setDismissed(true);
    // Store dismissal for this session
    sessionStorage.setItem("onboarding_dismissed", "true");
  }, []);

  // Don't render anything while checking or if dismissed
  if (isChecking || dismissed || !showWizard) {
    return null;
  }

  return (
    <OnboardingWizard
      onComplete={handleComplete}
      onClose={handleClose}
      initialProfile={initialProfile}
    />
  );
}

// Export a hook for manually triggering onboarding from settings
export function useOnboardingTrigger() {
  const [showWizard, setShowWizard] = useState(false);
  const [initialProfile, setInitialProfile] = useState<Partial<CompanyProfile> | undefined>();

  const openWizard = useCallback(async () => {
    try {
      const response = await fetch("/api/profile");
      if (response.ok) {
        const data = await response.json();
        setInitialProfile(data.profile?.companyProfile || undefined);
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
    }
    setShowWizard(true);
  }, []);

  const closeWizard = useCallback(() => {
    setShowWizard(false);
  }, []);

  const handleComplete = useCallback(async (profile: Partial<CompanyProfile>) => {
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyProfile: profile,
          companyName: profile.name,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save profile");
      }
    } catch (error) {
      console.error("Failed to save profile:", error);
    }
    setShowWizard(false);
  }, []);

  const WizardModal = showWizard ? (
    <OnboardingWizard
      onComplete={handleComplete}
      onClose={closeWizard}
      initialProfile={initialProfile}
    />
  ) : null;

  return {
    openWizard,
    closeWizard,
    WizardModal,
    isOpen: showWizard,
  };
}
