// components/seo/SEOScoreGauge.tsx
// Circular progress gauge for SEO score display

import React from "react";
import { motion } from "framer-motion";
import styles from "../../styles/SEO.module.css";

interface SEOScoreGaugeProps {
  score: number;
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  label?: string;
  size?: "small" | "medium" | "large";
  showGrade?: boolean;
}

export function SEOScoreGauge({
  score,
  grade,
  label = "SEO Score",
  size = "medium",
  showGrade = true,
}: SEOScoreGaugeProps) {
  // SVG dimensions based on size
  const dimensions = {
    small: { size: 80, strokeWidth: 6, fontSize: 18, labelSize: 10 },
    medium: { size: 120, strokeWidth: 8, fontSize: 28, labelSize: 12 },
    large: { size: 160, strokeWidth: 10, fontSize: 36, labelSize: 14 },
  };

  const dim = dimensions[size];
  const radius = (dim.size - dim.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Color based on score
  const getColor = (score: number) => {
    if (score >= 80) return "#22c55e"; // Green
    if (score >= 60) return "#eab308"; // Yellow
    if (score >= 40) return "#f97316"; // Orange
    return "#ef4444"; // Red
  };

  const color = getColor(score);

  return (
    <div className={styles.gaugeContainer}>
      <svg
        width={dim.size}
        height={dim.size}
        viewBox={`0 0 ${dim.size} ${dim.size}`}
        className={styles.gaugeSvg}
      >
        {/* Background circle */}
        <circle
          cx={dim.size / 2}
          cy={dim.size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-color, #e5e7eb)"
          strokeWidth={dim.strokeWidth}
        />

        {/* Progress circle */}
        <motion.circle
          cx={dim.size / 2}
          cy={dim.size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={dim.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut" }}
          transform={`rotate(-90 ${dim.size / 2} ${dim.size / 2})`}
        />

        {/* Score text */}
        <text
          x="50%"
          y={showGrade ? "45%" : "50%"}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--text-primary, #1f2937)"
          fontSize={dim.fontSize}
          fontWeight="700"
        >
          {score}
        </text>

        {/* Grade text */}
        {showGrade && (
          <text
            x="50%"
            y="65%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill={color}
            fontSize={dim.fontSize * 0.6}
            fontWeight="600"
          >
            {grade}
          </text>
        )}
      </svg>

      {label && (
        <span
          className={styles.gaugeLabel}
          style={{ fontSize: dim.labelSize }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

// Mini score badges for category breakdown
interface MiniScoreBadgeProps {
  score: number;
  label: string;
}

export function MiniScoreBadge({ score, label }: MiniScoreBadgeProps) {
  const getColor = (score: number) => {
    if (score >= 80) return "#22c55e";
    if (score >= 60) return "#eab308";
    if (score >= 40) return "#f97316";
    return "#ef4444";
  };

  const color = getColor(score);

  return (
    <div className={styles.miniScoreBadge}>
      <span className={styles.miniScoreLabel}>{label}</span>
      <span
        className={styles.miniScoreValue}
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}
