// components/seo/SEOAnalysisSidebar.tsx
// Main SEO sidebar component combining all analysis features

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  analyzeContent,
  type SEOScore,
  type SEOAnalysisInput,
} from "../../lib/seo-analyzer";
import { SEOScoreGauge, MiniScoreBadge } from "./SEOScoreGauge";
import { SEOChecklist } from "./SEOChecklist";
import { KeywordDensityChart } from "./KeywordDensityChart";
import { SERPPreview } from "./SERPPreview";
import { SocialPreview } from "./SocialPreview";
import styles from "../../styles/SEO.module.css";

interface SEOAnalysisSidebarProps {
  content: string;
  title: string;
  metaDescription: string;
  primaryKeyword: string;
  secondaryKeywords?: string[];
  url?: string;
  featuredImage?: {
    url: string;
    alt: string;
  };
  siteName?: string;
  isOpen: boolean;
  onClose: () => void;
}

type SidebarTab = "overview" | "checklist" | "keywords" | "preview";

export function SEOAnalysisSidebar({
  content,
  title,
  metaDescription,
  primaryKeyword,
  secondaryKeywords = [],
  url,
  featuredImage,
  siteName = "Your Site",
  isOpen,
  onClose,
}: SEOAnalysisSidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>("overview");

  // Analyze content with debounce
  const seoScore: SEOScore | null = useMemo(() => {
    if (!content && !title && !metaDescription) return null;

    const input: SEOAnalysisInput = {
      title,
      metaDescription,
      content,
      primaryKeyword,
      secondaryKeywords,
      url,
      featuredImage,
    };

    return analyzeContent(input);
  }, [
    content,
    title,
    metaDescription,
    primaryKeyword,
    secondaryKeywords,
    url,
    featuredImage,
  ]);

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: "chart" },
    { id: "checklist" as const, label: "Checklist", icon: "list" },
    { id: "keywords" as const, label: "Keywords", icon: "key" },
    { id: "preview" as const, label: "Preview", icon: "eye" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.sidebarOverlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.aside
            className={styles.sidebar}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={styles.sidebarHeader}>
              <div className={styles.sidebarTitleRow}>
                <h3 className={styles.sidebarTitle}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  SEO Analysis
                </h3>
                <button className={styles.closeButton} onClick={onClose}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Tabs */}
              <div className={styles.sidebarTabs}>
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    className={`${styles.sidebarTab} ${activeTab === tab.id ? styles.active : ""}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className={styles.sidebarContent}>
              {!seoScore ? (
                <div className={styles.emptyState}>
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  <p>Add content to see SEO analysis</p>
                  <span>Start writing or add a title and meta description</span>
                </div>
              ) : (
                <>
                  {activeTab === "overview" && (
                    <OverviewTab seoScore={seoScore} />
                  )}
                  {activeTab === "checklist" && (
                    <ChecklistTab seoScore={seoScore} />
                  )}
                  {activeTab === "keywords" && (
                    <KeywordsTab seoScore={seoScore} />
                  )}
                  {activeTab === "preview" && (
                    <PreviewTab
                      title={title}
                      metaDescription={metaDescription}
                      url={url}
                      image={featuredImage?.url}
                      siteName={siteName}
                    />
                  )}
                </>
              )}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Overview Tab
function OverviewTab({ seoScore }: { seoScore: SEOScore }) {
  return (
    <div className={styles.overviewTab}>
      {/* Main Score */}
      <div className={styles.mainScore}>
        <SEOScoreGauge
          score={seoScore.overall}
          grade={seoScore.grade}
          label="Overall SEO Score"
          size="large"
        />
      </div>

      {/* Category Scores */}
      <div className={styles.categoryScores}>
        <MiniScoreBadge score={seoScore.content} label="Content" />
        <MiniScoreBadge score={seoScore.keyword} label="Keywords" />
        <MiniScoreBadge score={seoScore.readability} label="Readability" />
        <MiniScoreBadge score={seoScore.technical} label="Technical" />
      </div>

      {/* Quick Stats */}
      <div className={styles.quickStats}>
        <div className={styles.quickStat}>
          <span className={styles.quickStatValue}>
            {seoScore.readabilityResult.wordCount.toLocaleString()}
          </span>
          <span className={styles.quickStatLabel}>Words</span>
        </div>
        <div className={styles.quickStat}>
          <span className={styles.quickStatValue}>
            {seoScore.readabilityResult.sentenceCount}
          </span>
          <span className={styles.quickStatLabel}>Sentences</span>
        </div>
        <div className={styles.quickStat}>
          <span className={styles.quickStatValue}>
            {seoScore.readabilityResult.fleschReadingEase}
          </span>
          <span className={styles.quickStatLabel}>Readability</span>
        </div>
        <div className={styles.quickStat}>
          <span className={styles.quickStatValue}>
            {seoScore.keywordResult.primaryKeyword.count}
          </span>
          <span className={styles.quickStatLabel}>Keyword Uses</span>
        </div>
      </div>

      {/* Top Issues */}
      <div className={styles.topIssues}>
        <h4 className={styles.sectionTitle}>Top Issues to Fix</h4>
        {seoScore.checks
          .filter((c) => c.status !== "pass")
          .sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          })
          .slice(0, 5)
          .map((check) => (
            <div
              key={check.id}
              className={`${styles.issueItem} ${styles[check.status]}`}
            >
              <span className={styles.issueTitle}>{check.title}</span>
              {check.suggestion && (
                <span className={styles.issueSuggestion}>
                  {check.suggestion}
                </span>
              )}
            </div>
          ))}
        {seoScore.checks.filter((c) => c.status !== "pass").length === 0 && (
          <div className={styles.noIssues}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>All checks passed! Great job!</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Checklist Tab
function ChecklistTab({ seoScore }: { seoScore: SEOScore }) {
  return (
    <div className={styles.checklistTab}>
      <SEOChecklist checks={seoScore.checks} expandedByDefault={true} />
    </div>
  );
}

// Keywords Tab
function KeywordsTab({ seoScore }: { seoScore: SEOScore }) {
  const { keywordResult } = seoScore;

  return (
    <div className={styles.keywordsTab}>
      {/* Keyword Placement Summary */}
      <div className={styles.keywordPlacement}>
        <h4 className={styles.sectionTitle}>Keyword Placement</h4>
        <div className={styles.placementGrid}>
          <div
            className={`${styles.placementItem} ${keywordResult.keywordInTitle ? styles.found : styles.missing}`}
          >
            <span className={styles.placementIcon}>
              {keywordResult.keywordInTitle ? "✓" : "○"}
            </span>
            <span>In Title</span>
          </div>
          <div
            className={`${styles.placementItem} ${keywordResult.keywordInMeta ? styles.found : styles.missing}`}
          >
            <span className={styles.placementIcon}>
              {keywordResult.keywordInMeta ? "✓" : "○"}
            </span>
            <span>In Meta Description</span>
          </div>
          <div
            className={`${styles.placementItem} ${keywordResult.keywordInFirstParagraph ? styles.found : styles.missing}`}
          >
            <span className={styles.placementIcon}>
              {keywordResult.keywordInFirstParagraph ? "✓" : "○"}
            </span>
            <span>In First Paragraph</span>
          </div>
          <div
            className={`${styles.placementItem} ${keywordResult.keywordInHeadings ? styles.found : styles.missing}`}
          >
            <span className={styles.placementIcon}>
              {keywordResult.keywordInHeadings ? "✓" : "○"}
            </span>
            <span>In Headings</span>
          </div>
        </div>
      </div>

      {/* Keyword Density Chart */}
      <KeywordDensityChart
        primaryKeyword={keywordResult.primaryKeyword}
        secondaryKeywords={keywordResult.secondaryKeywords}
      />
    </div>
  );
}

// Preview Tab
function PreviewTab({
  title,
  metaDescription,
  url,
  image,
  siteName,
}: {
  title: string;
  metaDescription: string;
  url?: string;
  image?: string;
  siteName: string;
}) {
  const [previewType, setPreviewType] = useState<"serp" | "social">("serp");

  return (
    <div className={styles.previewTab}>
      <div className={styles.previewToggle}>
        <button
          className={`${styles.previewToggleBtn} ${previewType === "serp" ? styles.active : ""}`}
          onClick={() => setPreviewType("serp")}
        >
          Search Results
        </button>
        <button
          className={`${styles.previewToggleBtn} ${previewType === "social" ? styles.active : ""}`}
          onClick={() => setPreviewType("social")}
        >
          Social Media
        </button>
      </div>

      {previewType === "serp" ? (
        <SERPPreview
          title={title}
          metaDescription={metaDescription}
          url={url}
          siteName={siteName}
        />
      ) : (
        <SocialPreview
          title={title}
          description={metaDescription}
          url={url}
          image={image}
          siteName={siteName}
        />
      )}
    </div>
  );
}

// Inline sidebar toggle button for use in editor
export function SEOSidebarToggle({
  score,
  onClick,
}: {
  score?: number;
  onClick: () => void;
}) {
  const getColor = (score?: number) => {
    if (!score) return "var(--text-secondary)";
    if (score >= 80) return "#22c55e";
    if (score >= 60) return "#eab308";
    if (score >= 40) return "#f97316";
    return "#ef4444";
  };

  return (
    <button
      className={styles.sidebarToggle}
      onClick={onClick}
      title="Open SEO Analysis"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      {score !== undefined && (
        <span
          className={styles.toggleScore}
          style={{ color: getColor(score) }}
        >
          {score}
        </span>
      )}
    </button>
  );
}
