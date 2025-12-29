// lib/hooks/useCompanyResearch.ts
// Hook for AI-powered deep company research during onboarding

import { useState, useCallback } from "react";
import type { CompanyProfile, SocialLinks, AdditionalLink } from "../page-types";

export interface ResearchProgress {
  phase: number;
  totalPhases: number;
  currentPhase: string;
  aiTeam: string;
  percentage: number;
}

export interface MissingField {
  field: string;
  label: string;
  priority: "high" | "medium" | "low";
  prompt: string;
}

export interface DataQuality {
  score: number;
  limitedInfo: boolean;
  usedCompetitorResearch: boolean;
  recommendedActions: string[];
}

export interface ResearchResult {
  profile: Partial<CompanyProfile>;
  socialLinks: SocialLinks;
  additionalLinks: AdditionalLink[];
  competitorAnalysis?: {
    competitors: string[];
    strengthsWeaknesses: string[];
    opportunities: string[];
  };
  seoInsights?: {
    primaryKeywords: string[];
    contentGaps: string[];
    localSEOScore: number;
    recommendations: string[];
  };
  conversionInsights?: {
    uspStrength: number;
    trustSignals: string[];
    ctaRecommendations: string[];
  };
  aiTeamNotes?: {
    maverick: string;
    kimi: string;
  };
  confidence: Record<string, number>;
  // NEW: Missing fields and data quality
  missingFields?: MissingField[];
  dataQuality?: DataQuality;
}

// Research phases
const RESEARCH_PHASES = [
  { phase: "strategy", label: "Creating research strategy...", aiTeam: "🎯 Strategy" },
  { phase: "website", label: "Analyzing website...", aiTeam: "🔍 Research" },
  { phase: "social", label: "Finding social profiles...", aiTeam: "🔍 Research" },
  { phase: "directories", label: "Searching directories...", aiTeam: "🔍 Research" },
  { phase: "competitors", label: "Analyzing competitors...", aiTeam: "🔍 Research" },
  { phase: "analysis", label: "Structuring data...", aiTeam: "📊 Analysis" },
  { phase: "seo", label: "Generating SEO strategy...", aiTeam: "🎯 Strategy" },
  { phase: "complete", label: "Research complete!", aiTeam: "✅ Complete" },
];

export function useCompanyResearch() {
  const [isResearching, setIsResearching] = useState(false);
  const [progress, setProgress] = useState<ResearchProgress>({
    phase: 0,
    totalPhases: RESEARCH_PHASES.length,
    currentPhase: "",
    aiTeam: "",
    percentage: 0,
  });
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const simulateProgress = useCallback(() => {
    let currentPhase = 0;
    const interval = setInterval(() => {
      currentPhase++;
      if (currentPhase >= RESEARCH_PHASES.length - 1) {
        clearInterval(interval);
        return;
      }
      const phase = RESEARCH_PHASES[currentPhase];
      setProgress({
        phase: currentPhase,
        totalPhases: RESEARCH_PHASES.length,
        currentPhase: phase.label,
        aiTeam: phase.aiTeam,
        percentage: Math.round((currentPhase / (RESEARCH_PHASES.length - 1)) * 100),
      });
    }, 3000); // Each phase takes ~3 seconds
    return interval;
  }, []);

  const research = useCallback(async (websiteUrl: string): Promise<ResearchResult | null> => {
    setIsResearching(true);
    setError(null);
    setProgress({
      phase: 0,
      totalPhases: RESEARCH_PHASES.length,
      currentPhase: RESEARCH_PHASES[0].label,
      aiTeam: RESEARCH_PHASES[0].aiTeam,
      percentage: 0,
    });

    // Start progress simulation
    const progressInterval = simulateProgress();

    try {
      // Call the deep research API
      const response = await fetch("/api/profile/deep-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Research failed");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Research failed");
      }

      // Transform the response into our expected format
      const profile: Partial<CompanyProfile> = {
        ...data.profile,
        website: websiteUrl,
        socialLinks: data.socialLinks,
        additionalLinks: data.additionalLinks,
        competitorAnalysis: data.competitorAnalysis,
        seoInsights: data.seoInsights,
        conversionInsights: data.conversionInsights,
        aiTeamNotes: data.aiTeamNotes,
        lastResearchedAt: new Date().toISOString(),
      };

      // Generate confidence scores based on data presence and quality
      const confidence = generateConfidenceScores(profile, data);

      const researchResult: ResearchResult = {
        profile,
        socialLinks: data.socialLinks || {},
        additionalLinks: data.additionalLinks || [],
        competitorAnalysis: data.competitorAnalysis,
        seoInsights: data.seoInsights,
        conversionInsights: data.conversionInsights,
        aiTeamNotes: data.aiTeamNotes,
        confidence,
        // NEW: Pass through missing fields and data quality from API
        missingFields: data.missingFields,
        dataQuality: data.dataQuality,
      };

      setProgress({
        phase: RESEARCH_PHASES.length - 1,
        totalPhases: RESEARCH_PHASES.length,
        currentPhase: "Research complete!",
        aiTeam: "✅ AI Team",
        percentage: 100,
      });

      setResult(researchResult);
      setIsResearching(false);

      return researchResult;
    } catch (err) {
      clearInterval(progressInterval);
      const message = err instanceof Error ? err.message : "Research failed";
      setError(message);
      setIsResearching(false);
      return null;
    }
  }, [simulateProgress]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setProgress({
      phase: 0,
      totalPhases: RESEARCH_PHASES.length,
      currentPhase: "",
      aiTeam: "",
      percentage: 0,
    });
  }, []);

  return {
    research,
    reset,
    isResearching,
    progress,
    result,
    error,
    phases: RESEARCH_PHASES,
  };
}

// Generate confidence scores for each field based on research data quality
function generateConfidenceScores(
  profile: Partial<CompanyProfile>,
  rawData: Record<string, unknown>
): Record<string, number> {
  const scores: Record<string, number> = {};

  // Name - high confidence if found from multiple sources
  scores.name = profile.name ? 95 : 0;

  // Contact info - based on what was found
  scores.phone = profile.phone ? 90 : 0;
  scores.email = profile.email ? 85 : 0;
  scores.address = profile.address ? 80 : 0;

  // Location
  scores.state = profile.state ? 85 : 0;
  scores.headquarters = profile.headquarters ? 75 : 0;
  scores.cities = profile.cities && profile.cities.length > 0 ? 70 : 0;

  // Industry
  scores.industryType = profile.industryType ? 85 : 0;

  // Services - depends on quantity found
  const serviceCount = profile.services?.length || 0;
  scores.services = serviceCount > 0 ? Math.min(90, 60 + serviceCount * 5) : 0;

  // USPs
  const uspCount = profile.usps?.length || 0;
  scores.usps = uspCount > 0 ? Math.min(80, 50 + uspCount * 5) : 0;

  // Social links - high confidence if found
  const socialLinkCount = profile.socialLinks
    ? Object.values(profile.socialLinks).filter(Boolean).length
    : 0;
  scores.socialLinks = socialLinkCount > 0 ? 90 : 0;

  // Additional links (directories)
  const linkCount = profile.additionalLinks?.length || 0;
  scores.additionalLinks = linkCount > 0 ? 85 : 0;

  // Certifications
  scores.certifications =
    profile.certifications && profile.certifications.length > 0 ? 80 : 0;

  // Years in business
  scores.yearsInBusiness = profile.yearsInBusiness ? 70 : 0;

  // Review data
  scores.reviewData = (rawData as { reviews?: unknown[] }).reviews ? 85 : 0;

  // Competitor analysis
  scores.competitorAnalysis = profile.competitorAnalysis?.competitors?.length ? 80 : 0;

  // SEO insights
  scores.seoInsights = profile.seoInsights?.primaryKeywords?.length ? 85 : 0;

  // Brand voice/writing style - AI inference
  scores.brandVoice = profile.brandVoice ? 65 : 0;
  scores.writingStyle = profile.writingStyle ? 65 : 0;

  // Audience
  scores.audience = profile.audience ? 75 : 0;

  return scores;
}

export default useCompanyResearch;
