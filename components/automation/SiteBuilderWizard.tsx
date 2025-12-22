// components/automation/SiteBuilderWizard.tsx
// Multi-step wizard for AI-powered site building

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "../../styles/Automation.module.css";

interface ProposedPage {
  title: string;
  slug: string;
  description?: string;
  priority?: number;
}

interface LocationPage {
  city: string;
  service: string;
  slug: string;
  priority?: number;
}

interface BlogTopic {
  title: string;
  keywords?: string[];
  priority?: number;
  angle?: string;
  targetKeyword?: string;
}

// Deep research types
interface Competitor {
  name: string;
  services: string[];
  strengths: string[];
}

interface DeepResearchData {
  research: {
    competitors: Competitor[];
    industryTrends: string[];
    localMarketInsights: string[];
    searchTerms: string[];
  };
  recommendations: {
    services: Array<{
      name: string;
      rationale: string;
      priority: "high" | "medium" | "low";
      estimatedDemand: string;
    }>;
    locationPages: Array<{
      area: string;
      rationale: string;
      targetServices: string[];
    }>;
    blogTopics: Array<{
      title: string;
      angle: string;
      targetKeyword: string;
      priority: number;
    }>;
    uniqueSellingPoints: string[];
    contentStrategy: string;
  };
}

interface ProposedStructure {
  homepage: {
    title: string;
    description?: string;
    sections?: string[];
    heroText?: string;
    ctaButtons?: string[];
  };
  servicePages: ProposedPage[];
  locationPages: LocationPage[];
  blogTopics: BlogTopic[];
  sitemap: {
    structure?: string;
    internalLinking?: string[];
    homepage?: string;
    services?: string[];
    locations?: string[];
    blog?: string[];
  };
}

interface SiteBuilderWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type WizardStep = "industry" | "deep-research" | "research" | "review" | "confirm" | "progress";

export function SiteBuilderWizard({ isOpen, onClose, onSuccess }: SiteBuilderWizardProps) {
  const [step, setStep] = useState<WizardStep>("industry");
  const [industry, setIndustry] = useState("");
  const [customIndustry, setCustomIndustry] = useState("");
  const [isResearching, setIsResearching] = useState(false);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [proposal, setProposal] = useState<{
    industry: string;
    proposedStructure: ProposedStructure | null;
    aiReasoning: string;
    estimatedPages: number;
  } | null>(null);
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState<{
    total: number;
    completed: number;
    current: string;
  } | null>(null);
  const [deepResearch, setDeepResearch] = useState<DeepResearchData | null>(null);
  const [researchPhase, setResearchPhase] = useState<string>("");
  const [showResearchDetails, setShowResearchDetails] = useState(false);

  const INDUSTRY_OPTIONS = [
    "HVAC",
    "Plumbing",
    "Electrical",
    "Roofing",
    "Landscaping",
    "Pest Control",
    "Cleaning Services",
    "Auto Repair",
    "Dental",
    "Legal Services",
    "Real Estate",
    "Other",
  ];

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setStep("industry");
      setIndustry("");
      setCustomIndustry("");
      setProposalId(null);
      setProposal(null);
      setSelectedPages(new Set());
      setError(null);
      setGenerationProgress(null);
      setDeepResearch(null);
      setResearchPhase("");
      setShowResearchDetails(false);
    }
  }, [isOpen]);

  const handleIndustrySelect = (selectedIndustry: string) => {
    setIndustry(selectedIndustry);
    if (selectedIndustry !== "Other") {
      setCustomIndustry("");
    }
  };

  const handleStartResearch = async () => {
    const finalIndustry = industry === "Other" ? customIndustry : industry;

    if (!finalIndustry) {
      setError("Please select or enter an industry");
      return;
    }

    setStep("deep-research");
    setIsResearching(true);
    setError(null);
    setResearchPhase("Analyzing your market...");

    try {
      // Step 1: Deep research with Perplexity + Claude
      setResearchPhase("Researching competitors in your area...");

      const deepResearchResponse = await fetch("/api/site-builder/deep-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry: finalIndustry,
          businessName: "", // Could be from user profile
          city: "", // Could be from user profile
          state: "", // Could be from user profile
        }),
      });

      const deepResearchData = await deepResearchResponse.json();

      if (!deepResearchData.success) {
        console.warn("Deep research failed, continuing with default research");
      } else {
        setDeepResearch(deepResearchData);
      }

      setResearchPhase("Generating site structure...");
      setStep("research");

      // Step 2: Generate site structure using the research
      const response = await fetch("/api/site-builder/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry: finalIndustry,
          deepResearch: deepResearchData.success ? deepResearchData : null,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Research failed");
      }

      setProposalId(data.proposalId);
      setProposal({
        industry: data.industry,
        proposedStructure: data.proposedStructure,
        aiReasoning: data.aiReasoning,
        estimatedPages: data.estimatedPages,
      });

      // Select all pages by default
      const allSlugs = new Set<string>();
      if (data.proposedStructure) {
        data.proposedStructure.servicePages.forEach((p: ProposedPage) => allSlugs.add(p.slug));
        data.proposedStructure.locationPages.forEach((p: LocationPage) => allSlugs.add(p.slug));
        data.proposedStructure.blogTopics.forEach((t: BlogTopic, i: number) => allSlugs.add(`blog-${i}`));
      }
      setSelectedPages(allSlugs);

      setStep("review");
    } catch (err) {
      console.error("Research error:", err);
      setError(err instanceof Error ? err.message : "Research failed");
      setStep("industry");
    } finally {
      setIsResearching(false);
    }
  };

  const togglePage = (slug: string) => {
    const newSelected = new Set(selectedPages);
    if (newSelected.has(slug)) {
      newSelected.delete(slug);
    } else {
      newSelected.add(slug);
    }
    setSelectedPages(newSelected);
  };

  const handleApprove = async () => {
    if (!proposalId) return;

    setStep("progress");
    setError(null);

    try {
      // Calculate removed pages
      const allSlugs = new Set<string>();
      if (proposal?.proposedStructure) {
        proposal.proposedStructure.servicePages.forEach((p) => allSlugs.add(p.slug));
        proposal.proposedStructure.locationPages.forEach((p) => allSlugs.add(p.slug));
        proposal.proposedStructure.blogTopics.forEach((_, i) => allSlugs.add(`blog-${i}`));
      }

      const removedPages = Array.from(allSlugs).filter((s) => !selectedPages.has(s));

      // Update proposal with modifications
      await fetch(`/api/site-builder/proposal/${proposalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userModifications: { removedPages },
        }),
      });

      // Approve and start generation
      const response = await fetch(`/api/site-builder/proposal/${proposalId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to start generation");
      }

      setGenerationProgress(data.proposal?.generationProgress || null);

      // Poll for progress updates
      pollProgress();
    } catch (err) {
      console.error("Approval error:", err);
      setError(err instanceof Error ? err.message : "Failed to approve");
      setStep("review");
    }
  };

  const pollProgress = async () => {
    if (!proposalId) return;

    const checkProgress = async () => {
      try {
        const response = await fetch(`/api/site-builder/proposal/${proposalId}`);
        const data = await response.json();

        if (data.success && data.proposal) {
          setGenerationProgress(data.proposal.generationProgress);

          if (data.proposal.status === "completed") {
            onSuccess?.();
            return;
          }

          if (data.proposal.status === "generating") {
            setTimeout(checkProgress, 5000); // Poll every 5 seconds
          }
        }
      } catch (err) {
        console.error("Progress poll error:", err);
      }
    };

    checkProgress();
  };

  const getSelectedCount = () => selectedPages.size;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={styles.modalOverlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={styles.siteBuilderModal}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={styles.modalHeader}>
            <h2>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              AI Site Builder
            </h2>
            <button className={styles.closeButton} onClick={onClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Step Indicator */}
          <div className={styles.stepIndicator}>
            {(["industry", "deep-research", "research", "review", "progress"] as WizardStep[]).map((s, i) => (
              <div
                key={s}
                className={`${styles.stepDot} ${
                  step === s ? styles.active : ""
                } ${
                  ["industry", "deep-research", "research", "review", "progress"].indexOf(step) > i
                    ? styles.completed
                    : ""
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>

          <div className={styles.modalBody}>
            {/* Step 1: Industry Selection */}
            {step === "industry" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={styles.wizardStep}
              >
                <h3>Select Your Industry</h3>
                <p className={styles.stepDescription}>
                  Choose your industry so we can propose the optimal site structure based on
                  top-performing websites in your space.
                </p>

                <div className={styles.industryGrid}>
                  {INDUSTRY_OPTIONS.map((ind) => (
                    <button
                      key={ind}
                      type="button"
                      className={`${styles.industryOption} ${
                        industry === ind ? styles.selected : ""
                      }`}
                      onClick={() => handleIndustrySelect(ind)}
                    >
                      {ind}
                    </button>
                  ))}
                </div>

                {industry === "Other" && (
                  <input
                    type="text"
                    placeholder="Enter your industry..."
                    value={customIndustry}
                    onChange={(e) => setCustomIndustry(e.target.value)}
                    className={styles.customIndustryInput}
                  />
                )}

                {error && (
                  <div className={styles.errorMessage}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    {error}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 2: Deep Research with AI */}
            {step === "deep-research" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={styles.wizardStep}
              >
                <div className={styles.researchLoading}>
                  <div className={styles.aiSpinner}>
                    <svg viewBox="0 0 24 24" width="48" height="48">
                      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
                      <path
                        d="M12 2a10 10 0 0 1 10 10"
                        fill="none"
                        stroke="url(#gradient)"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          from="0 12 12"
                          to="360 12 12"
                          dur="1s"
                          repeatCount="indefinite"
                        />
                      </path>
                      <defs>
                        <linearGradient id="gradient">
                          <stop offset="0%" stopColor="#667eea" />
                          <stop offset="100%" stopColor="#764ba2" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <h3>Deep Industry Research</h3>
                  <p>{researchPhase}</p>
                  <div className={styles.researchSteps}>
                    <div className={styles.researchStepItem}>
                      <span className={researchPhase.includes("competitors") ? styles.loading : styles.checkmark}>
                        {researchPhase.includes("competitors") ? "..." : "✓"}
                      </span>
                      Analyzing local competitors
                    </div>
                    <div className={styles.researchStepItem}>
                      <span className={researchPhase.includes("trends") ? styles.loading : researchPhase.includes("competitors") ? styles.pending : styles.checkmark}>
                        {researchPhase.includes("trends") ? "..." : researchPhase.includes("competitors") ? "○" : "✓"}
                      </span>
                      Identifying industry trends
                    </div>
                    <div className={styles.researchStepItem}>
                      <span className={researchPhase.includes("market") ? styles.loading : researchPhase.includes("competitors") || researchPhase.includes("trends") ? styles.pending : styles.checkmark}>
                        {researchPhase.includes("market") ? "..." : (researchPhase.includes("competitors") || researchPhase.includes("trends")) ? "○" : "✓"}
                      </span>
                      Discovering market opportunities
                    </div>
                    <div className={styles.researchStepItem}>
                      <span className={researchPhase.includes("Generating") ? styles.loading : styles.pending}>
                        {researchPhase.includes("Generating") ? "..." : "○"}
                      </span>
                      Generating unique recommendations
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Research Loading */}
            {step === "research" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={styles.wizardStep}
              >
                <div className={styles.researchLoading}>
                  <div className={styles.aiSpinner}>
                    <svg viewBox="0 0 24 24" width="48" height="48">
                      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
                      <path
                        d="M12 2a10 10 0 0 1 10 10"
                        fill="none"
                        stroke="url(#gradient)"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          from="0 12 12"
                          to="360 12 12"
                          dur="1s"
                          repeatCount="indefinite"
                        />
                      </path>
                      <defs>
                        <linearGradient id="gradient">
                          <stop offset="0%" stopColor="#667eea" />
                          <stop offset="100%" stopColor="#764ba2" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <h3>Researching Your Industry</h3>
                  <p>Analyzing top-performing {industry === "Other" ? customIndustry : industry} websites...</p>
                  <div className={styles.researchSteps}>
                    <div className={styles.researchStepItem}>
                      <span className={styles.checkmark}>✓</span>
                      Identifying key services
                    </div>
                    <div className={styles.researchStepItem}>
                      <span className={styles.loading}>...</span>
                      Analyzing competitor structures
                    </div>
                    <div className={styles.researchStepItem}>
                      <span className={styles.pending}>○</span>
                      Generating content topics
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Review Proposal */}
            {step === "review" && proposal && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={styles.wizardStep}
              >
                <h3>Review Site Structure</h3>
                <p className={styles.stepDescription}>
                  Based on our deep analysis of your market and competitors, here&apos;s your
                  personalized site structure. Uncheck any pages you don&apos;t want.
                </p>

                {/* Research Insights */}
                {deepResearch && (
                  <div className={styles.researchInsights}>
                    <button
                      type="button"
                      className={styles.insightsToggle}
                      onClick={() => setShowResearchDetails(!showResearchDetails)}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                      View Market Research Insights
                      <span className={styles.chevron}>{showResearchDetails ? "▲" : "▼"}</span>
                    </button>

                    {showResearchDetails && (
                      <div className={styles.insightsContent}>
                        {/* Competitors */}
                        {deepResearch.research?.competitors?.length > 0 && (
                          <div className={styles.insightSection}>
                            <h5>Local Competitors Analyzed</h5>
                            <ul>
                              {deepResearch.research.competitors.slice(0, 3).map((comp, i) => (
                                <li key={i}>
                                  <strong>{comp.name}</strong>: {comp.services.slice(0, 3).join(", ")}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Industry Trends */}
                        {deepResearch.research?.industryTrends?.length > 0 && (
                          <div className={styles.insightSection}>
                            <h5>Industry Trends</h5>
                            <ul>
                              {deepResearch.research.industryTrends.slice(0, 3).map((trend, i) => (
                                <li key={i}>{trend}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* USPs */}
                        {deepResearch.recommendations?.uniqueSellingPoints?.length > 0 && (
                          <div className={styles.insightSection}>
                            <h5>Recommended Differentiators</h5>
                            <ul>
                              {deepResearch.recommendations.uniqueSellingPoints.map((usp, i) => (
                                <li key={i}>{usp}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Content Strategy */}
                        {deepResearch.recommendations?.contentStrategy && (
                          <div className={styles.insightSection}>
                            <h5>Content Strategy</h5>
                            <p>{deepResearch.recommendations.contentStrategy}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className={styles.proposalSummary}>
                  <span className={styles.summaryItem}>
                    <strong>{getSelectedCount()}</strong> pages selected
                  </span>
                  <span className={styles.summaryItem}>
                    Est. generation time: <strong>{Math.ceil(getSelectedCount() * 2)} min</strong>
                  </span>
                </div>

                {/* Service Pages */}
                <div className={styles.proposalSection}>
                  <h4>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                    </svg>
                    Service Pages ({proposal.proposedStructure?.servicePages.length || 0})
                  </h4>
                  <div className={styles.pageList}>
                    {proposal.proposedStructure?.servicePages.map((page) => (
                      <label key={page.slug} className={styles.pageItem}>
                        <input
                          type="checkbox"
                          checked={selectedPages.has(page.slug)}
                          onChange={() => togglePage(page.slug)}
                        />
                        <span className={styles.pageTitle}>{page.title}</span>
                        <span className={styles.pageSlug}>/{page.slug}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Location Pages */}
                {proposal.proposedStructure?.locationPages.length ? (
                  <div className={styles.proposalSection}>
                    <h4>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      Location Pages ({proposal.proposedStructure.locationPages.length})
                    </h4>
                    <div className={styles.pageList}>
                      {proposal.proposedStructure.locationPages.map((page) => (
                        <label key={page.slug} className={styles.pageItem}>
                          <input
                            type="checkbox"
                            checked={selectedPages.has(page.slug)}
                            onChange={() => togglePage(page.slug)}
                          />
                          <span className={styles.pageTitle}>
                            {page.service} in {page.city}
                          </span>
                          <span className={styles.pageSlug}>/{page.slug}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Blog Topics */}
                <div className={styles.proposalSection}>
                  <h4>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    Blog Posts ({proposal.proposedStructure?.blogTopics.length || 0})
                  </h4>
                  <div className={styles.pageList}>
                    {proposal.proposedStructure?.blogTopics.map((topic, index) => (
                      <label key={`blog-${index}`} className={styles.pageItem}>
                        <input
                          type="checkbox"
                          checked={selectedPages.has(`blog-${index}`)}
                          onChange={() => togglePage(`blog-${index}`)}
                        />
                        <span className={styles.pageTitle}>{topic.title}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* AI Reasoning */}
                <details className={styles.aiReasoning}>
                  <summary>View AI Analysis</summary>
                  <div className={styles.reasoningContent}>
                    {proposal.aiReasoning.split("\n").map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </details>

                {error && (
                  <div className={styles.errorMessage}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    {error}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 4: Progress */}
            {step === "progress" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={styles.wizardStep}
              >
                <div className={styles.progressContainer}>
                  <h3>Generating Your Site</h3>
                  <p className={styles.stepDescription}>
                    AI is generating all your pages. This may take a while depending on the number of pages.
                  </p>

                  {generationProgress && (
                    <>
                      <div className={styles.progressBar}>
                        <div
                          className={styles.progressFill}
                          style={{
                            width: `${(generationProgress.completed / generationProgress.total) * 100}%`,
                          }}
                        />
                      </div>
                      <div className={styles.progressStats}>
                        <span>
                          {generationProgress.completed} / {generationProgress.total} pages
                        </span>
                        <span>
                          {Math.round((generationProgress.completed / generationProgress.total) * 100)}%
                        </span>
                      </div>
                      {generationProgress.current && (
                        <p className={styles.currentPage}>
                          Currently generating: <strong>{generationProgress.current}</strong>
                        </p>
                      )}
                    </>
                  )}

                  <p className={styles.progressNote}>
                    You can close this window - generation will continue in the background.
                    Check the Queue Dashboard for progress.
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className={styles.modalFooter}>
            {step === "industry" && (
              <>
                <button className={styles.cancelButton} onClick={onClose}>
                  Cancel
                </button>
                <motion.button
                  className={styles.generateButton}
                  onClick={handleStartResearch}
                  disabled={!industry || (industry === "Other" && !customIndustry)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  Research Industry
                </motion.button>
              </>
            )}

            {step === "review" && (
              <>
                <button className={styles.cancelButton} onClick={() => setStep("industry")}>
                  Back
                </button>
                <motion.button
                  className={styles.generateButton}
                  onClick={handleApprove}
                  disabled={getSelectedCount() === 0}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Generate {getSelectedCount()} Pages
                </motion.button>
              </>
            )}

            {step === "progress" && (
              <button className={styles.cancelButton} onClick={onClose}>
                Close (Generation Continues)
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
