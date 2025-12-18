// components/seo/SEOChecklist.tsx
// Collapsible checklist showing all SEO checks

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SEOCheckItem } from "../../lib/seo-analyzer";
import styles from "../../styles/SEO.module.css";

interface SEOChecklistProps {
  checks: SEOCheckItem[];
  expandedByDefault?: boolean;
}

// Group checks by category
function groupChecks(checks: SEOCheckItem[]) {
  const groups: Record<SEOCheckItem["category"], SEOCheckItem[]> = {
    content: [],
    readability: [],
    technical: [],
    keyword: [],
  };

  for (const check of checks) {
    groups[check.category].push(check);
  }

  return groups;
}

// Get category display name
function getCategoryName(category: SEOCheckItem["category"]): string {
  switch (category) {
    case "content":
      return "Content";
    case "readability":
      return "Readability";
    case "technical":
      return "Technical";
    case "keyword":
      return "Keywords";
  }
}

// Get status icon
function StatusIcon({ status }: { status: SEOCheckItem["status"] }) {
  if (status === "pass") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#22c55e"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    );
  } else if (status === "warning") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#eab308"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );
  } else {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ef4444"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    );
  }
}

// Priority badge
function PriorityBadge({ priority }: { priority: SEOCheckItem["priority"] }) {
  return (
    <span className={`${styles.priorityBadge} ${styles[priority]}`}>
      {priority}
    </span>
  );
}

// Category section
function CategorySection({
  category,
  checks,
  defaultExpanded,
}: {
  category: SEOCheckItem["category"];
  checks: SEOCheckItem[];
  defaultExpanded: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Calculate category stats
  const passCount = checks.filter((c) => c.status === "pass").length;
  const totalCount = checks.length;
  const categoryScore = Math.round((passCount / totalCount) * 100);

  return (
    <div className={styles.checklistCategory}>
      <button
        className={styles.categoryHeader}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={styles.categoryInfo}>
          <span className={styles.categoryName}>
            {getCategoryName(category)}
          </span>
          <span className={styles.categoryStats}>
            {passCount}/{totalCount} passed
          </span>
        </div>
        <div className={styles.categoryActions}>
          <span
            className={styles.categoryScore}
            style={{
              color:
                categoryScore >= 80
                  ? "#22c55e"
                  : categoryScore >= 60
                    ? "#eab308"
                    : "#ef4444",
            }}
          >
            {categoryScore}%
          </span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`${styles.expandIcon} ${isExpanded ? styles.expanded : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={styles.categoryContent}
          >
            {checks.map((check) => (
              <CheckItem key={check.id} check={check} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Individual check item
function CheckItem({ check }: { check: SEOCheckItem }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      className={`${styles.checkItem} ${styles[check.status]}`}
      onClick={() => setShowDetails(!showDetails)}
    >
      <div className={styles.checkMain}>
        <StatusIcon status={check.status} />
        <div className={styles.checkInfo}>
          <span className={styles.checkTitle}>{check.title}</span>
          <span className={styles.checkDescription}>{check.description}</span>
        </div>
        {check.priority !== "low" && (
          <PriorityBadge priority={check.priority} />
        )}
      </div>

      <AnimatePresence>
        {showDetails && check.suggestion && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={styles.checkSuggestion}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
            <span>{check.suggestion}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SEOChecklist({
  checks,
  expandedByDefault = true,
}: SEOChecklistProps) {
  const groupedChecks = groupChecks(checks);
  const categories: SEOCheckItem["category"][] = [
    "content",
    "keyword",
    "readability",
    "technical",
  ];

  // Summary stats
  const totalChecks = checks.length;
  const passedChecks = checks.filter((c) => c.status === "pass").length;
  const failedChecks = checks.filter((c) => c.status === "fail").length;
  const warningChecks = checks.filter((c) => c.status === "warning").length;

  return (
    <div className={styles.checklist}>
      <div className={styles.checklistSummary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryValue} style={{ color: "#22c55e" }}>
            {passedChecks}
          </span>
          <span className={styles.summaryLabel}>Passed</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryValue} style={{ color: "#eab308" }}>
            {warningChecks}
          </span>
          <span className={styles.summaryLabel}>Warnings</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryValue} style={{ color: "#ef4444" }}>
            {failedChecks}
          </span>
          <span className={styles.summaryLabel}>Failed</span>
        </div>
      </div>

      <div className={styles.checklistCategories}>
        {categories.map((category) => {
          const categoryChecks = groupedChecks[category];
          if (categoryChecks.length === 0) return null;

          return (
            <CategorySection
              key={category}
              category={category}
              checks={categoryChecks}
              defaultExpanded={expandedByDefault}
            />
          );
        })}
      </div>
    </div>
  );
}
