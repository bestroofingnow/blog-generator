// components/seo/KeywordDensityChart.tsx
// Visual keyword density display with bars

import React from "react";
import { motion } from "framer-motion";
import type { KeywordDensity } from "../../lib/seo-analyzer/keyword";
import styles from "../../styles/SEO.module.css";

interface KeywordDensityChartProps {
  primaryKeyword: KeywordDensity;
  secondaryKeywords: KeywordDensity[];
}

// Get color based on density status
function getStatusColor(status: KeywordDensity["status"]): string {
  switch (status) {
    case "optimal":
      return "#22c55e";
    case "low":
      return "#eab308";
    case "high":
      return "#ef4444";
  }
}

// Get status label
function getStatusLabel(status: KeywordDensity["status"]): string {
  switch (status) {
    case "optimal":
      return "Good";
    case "low":
      return "Low";
    case "high":
      return "High";
  }
}

// Density bar component
function DensityBar({
  keyword,
  isPrimary = false,
}: {
  keyword: KeywordDensity;
  isPrimary?: boolean;
}) {
  const color = getStatusColor(keyword.status);
  const statusLabel = getStatusLabel(keyword.status);

  // For the bar, map density to a percentage (max 4% = 100% bar)
  const barWidth = Math.min((keyword.density / 4) * 100, 100);

  // Optimal zone indicator (1-2% for primary, 0.5-1.5% for secondary)
  const optimalStart = isPrimary ? 1 : 0.5;
  const optimalEnd = isPrimary ? 2 : 1.5;
  const optimalStartPercent = (optimalStart / 4) * 100;
  const optimalEndPercent = (optimalEnd / 4) * 100;

  return (
    <div className={`${styles.densityItem} ${isPrimary ? styles.primary : ""}`}>
      <div className={styles.densityHeader}>
        <span className={styles.densityKeyword}>
          {isPrimary && (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          )}
          {keyword.keyword}
        </span>
        <span className={styles.densityStats}>
          <span className={styles.densityCount}>{keyword.count}×</span>
          <span
            className={styles.densityPercent}
            style={{ color }}
          >
            {keyword.density}%
          </span>
          <span
            className={styles.densityStatus}
            style={{ backgroundColor: color + "20", color }}
          >
            {statusLabel}
          </span>
        </span>
      </div>

      <div className={styles.densityBarContainer}>
        {/* Optimal zone indicator */}
        <div
          className={styles.optimalZone}
          style={{
            left: `${optimalStartPercent}%`,
            width: `${optimalEndPercent - optimalStartPercent}%`,
          }}
        />

        {/* Actual density bar */}
        <motion.div
          className={styles.densityBar}
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${barWidth}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />

        {/* Scale markers */}
        <div className={styles.scaleMarkers}>
          <span>0%</span>
          <span>1%</span>
          <span>2%</span>
          <span>3%</span>
          <span>4%</span>
        </div>
      </div>
    </div>
  );
}

export function KeywordDensityChart({
  primaryKeyword,
  secondaryKeywords,
}: KeywordDensityChartProps) {
  return (
    <div className={styles.densityChart}>
      <div className={styles.densitySection}>
        <h4 className={styles.densitySectionTitle}>Primary Keyword</h4>
        <DensityBar keyword={primaryKeyword} isPrimary />
      </div>

      {secondaryKeywords.length > 0 && (
        <div className={styles.densitySection}>
          <h4 className={styles.densitySectionTitle}>
            Secondary Keywords ({secondaryKeywords.length})
          </h4>
          <div className={styles.secondaryKeywordsList}>
            {secondaryKeywords.map((keyword, index) => (
              <DensityBar key={index} keyword={keyword} />
            ))}
          </div>
        </div>
      )}

      <div className={styles.densityLegend}>
        <div className={styles.legendItem}>
          <span
            className={styles.legendDot}
            style={{ backgroundColor: "#22c55e" }}
          />
          <span>Optimal (1-2%)</span>
        </div>
        <div className={styles.legendItem}>
          <span
            className={styles.legendDot}
            style={{ backgroundColor: "#eab308" }}
          />
          <span>Low (&lt;1%)</span>
        </div>
        <div className={styles.legendItem}>
          <span
            className={styles.legendDot}
            style={{ backgroundColor: "#ef4444" }}
          />
          <span>High (&gt;3%)</span>
        </div>
      </div>
    </div>
  );
}
