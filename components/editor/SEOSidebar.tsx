// components/editor/SEOSidebar.tsx
// SEO guidelines sidebar with real-time content scoring
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ContentScoreGauge, { MetricBar } from "./ContentScoreGauge";
import { SEOScoreData, Recommendation } from "../../lib/hooks/useContentScore";
import { fadeInRight, staggerContainer, staggerItem } from "../../lib/animations";
import styles from "../../styles/SEOSidebar.module.css";

interface SEOSidebarProps {
  scoreData: SEOScoreData;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  onClose?: () => void;
  isOpen?: boolean;
}

export default function SEOSidebar({
  scoreData,
  primaryKeyword,
  secondaryKeywords = [],
  onClose,
  isOpen = true,
}: SEOSidebarProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>("score");

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          className={styles.sidebar}
          variants={fadeInRight}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className={styles.header}>
            <h3 className={styles.title}>SEO Guidelines</h3>
            {onClose && (
              <button
                className={styles.closeButton}
                onClick={onClose}
                aria-label="Close sidebar"
              >
                <CloseIcon />
              </button>
            )}
          </div>

          {/* Content */}
          <div className={styles.content}>
            {/* Score Section */}
            <CollapsibleSection
              title="Content Score"
              isOpen={expandedSection === "score"}
              onToggle={() => toggleSection("score")}
              badge={scoreData.overall}
            >
              <div className={styles.scoreSection}>
                <ContentScoreGauge
                  score={scoreData.overall}
                  letterGrade={scoreData.letterGrade}
                  size="large"
                />
                <p className={styles.scoreHint}>
                  {scoreData.overall >= 75
                    ? "Great! Your content is well-optimized."
                    : scoreData.overall >= 50
                    ? "Good progress! A few improvements needed."
                    : "Needs work. Follow the recommendations below."}
                </p>
              </div>
            </CollapsibleSection>

            {/* Keyword Checklist */}
            <CollapsibleSection
              title="Keywords"
              isOpen={expandedSection === "keywords"}
              onToggle={() => toggleSection("keywords")}
            >
              <div className={styles.keywordsSection}>
                {primaryKeyword ? (
                  <div className={styles.keywordItem}>
                    <div className={styles.keywordHeader}>
                      <span className={styles.keywordLabel}>Primary</span>
                      <CheckIcon status={scoreData.metrics.keywordUsage.status} />
                    </div>
                    <span className={styles.keyword}>{primaryKeyword}</span>
                    <span className={styles.keywordDetail}>
                      {scoreData.metrics.keywordUsage.detail}
                    </span>
                  </div>
                ) : (
                  <p className={styles.noKeyword}>No primary keyword set</p>
                )}

                {secondaryKeywords.length > 0 && (
                  <div className={styles.secondaryKeywords}>
                    <span className={styles.keywordLabel}>Secondary Keywords</span>
                    <div className={styles.keywordTags}>
                      {secondaryKeywords.map((kw, i) => (
                        <span key={i} className={styles.keywordTag}>
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            {/* Metrics */}
            <CollapsibleSection
              title="Content Metrics"
              isOpen={expandedSection === "metrics"}
              onToggle={() => toggleSection("metrics")}
            >
              <motion.div
                className={styles.metricsSection}
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {Object.values(scoreData.metrics).map((metric) => (
                  <motion.div key={metric.label} variants={staggerItem}>
                    <MetricBar
                      label={metric.label}
                      score={metric.score}
                      detail={metric.detail}
                      status={metric.status}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </CollapsibleSection>

            {/* Recommendations */}
            <CollapsibleSection
              title="Recommendations"
              isOpen={expandedSection === "recommendations"}
              onToggle={() => toggleSection("recommendations")}
              badge={scoreData.recommendations.length}
            >
              <motion.div
                className={styles.recommendationsSection}
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {scoreData.recommendations.length === 0 ? (
                  <p className={styles.noRecommendations}>
                    No recommendations. Great job!
                  </p>
                ) : (
                  scoreData.recommendations.map((rec) => (
                    <motion.div key={rec.id} variants={staggerItem}>
                      <RecommendationCard recommendation={rec} />
                    </motion.div>
                  ))
                )}
              </motion.div>
            </CollapsibleSection>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

// Collapsible section component
interface CollapsibleSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  badge?: number;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  badge,
  children,
}: CollapsibleSectionProps) {
  return (
    <div className={styles.section}>
      <button
        className={`${styles.sectionHeader} ${isOpen ? styles.sectionOpen : ""}`}
        onClick={onToggle}
      >
        <span>{title}</span>
        <div className={styles.sectionRight}>
          {badge !== undefined && (
            <span className={styles.sectionBadge}>{badge}</span>
          )}
          <ChevronIcon className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`} />
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.sectionContent}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Recommendation card component
function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const priorityColors = {
    high: "var(--error-color)",
    medium: "var(--warning-color)",
    low: "var(--text-muted)",
  };

  return (
    <div className={styles.recommendation}>
      <div className={styles.recommendationHeader}>
        <span
          className={styles.priorityDot}
          style={{ backgroundColor: priorityColors[recommendation.priority] }}
        />
        <span className={styles.recommendationTitle}>{recommendation.title}</span>
      </div>
      <p className={styles.recommendationDesc}>{recommendation.description}</p>
      {recommendation.action && (
        <span className={styles.recommendationAction}>{recommendation.action}</span>
      )}
    </div>
  );
}

// Icons
function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CheckIcon({ status }: { status: "good" | "warning" | "error" }) {
  const colors = {
    good: "var(--success-color)",
    warning: "var(--warning-color)",
    error: "var(--error-color)",
  };

  if (status === "good") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors[status]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }

  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors[status]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
