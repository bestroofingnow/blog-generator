// components/editor/ContentScoreGauge.tsx
// Circular SVG progress gauge for SEO content scoring
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import styles from "../../styles/ContentScoreGauge.module.css";

interface ContentScoreGaugeProps {
  score: number;
  letterGrade?: string;
  size?: "small" | "medium" | "large";
  showLabel?: boolean;
  animated?: boolean;
}

export default function ContentScoreGauge({
  score,
  letterGrade,
  size = "medium",
  showLabel = true,
  animated = true,
}: ContentScoreGaugeProps) {
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score);

  // Animate score on change
  useEffect(() => {
    if (!animated) {
      setDisplayScore(score);
      return;
    }

    const duration = 800;
    const startTime = Date.now();
    const startScore = displayScore;
    const diff = score - startScore;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(startScore + diff * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [score, animated]);

  // Size configurations
  const sizeConfig = {
    small: { radius: 28, stroke: 4, fontSize: 14, gradeSize: 10 },
    medium: { radius: 40, stroke: 6, fontSize: 20, gradeSize: 12 },
    large: { radius: 56, stroke: 8, fontSize: 28, gradeSize: 16 },
  };

  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * config.radius;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;
  const svgSize = (config.radius + config.stroke) * 2;

  // Color based on score
  const getColor = (s: number) => {
    if (s >= 75) return "var(--success-color)";
    if (s >= 50) return "var(--warning-color)";
    return "var(--error-color)";
  };

  const color = getColor(displayScore);

  return (
    <div className={`${styles.container} ${styles[size]}`}>
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        className={styles.svg}
      >
        {/* Background circle */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={config.radius}
          fill="none"
          stroke="var(--border-light)"
          strokeWidth={config.stroke}
        />

        {/* Progress circle */}
        <motion.circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={config.radius}
          fill="none"
          stroke={color}
          strokeWidth={config.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${svgSize / 2} ${svgSize / 2})`}
          initial={animated ? { strokeDashoffset: circumference } : undefined}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={styles.progress}
        />
      </svg>

      {/* Score display */}
      <div className={styles.scoreWrapper}>
        <span
          className={styles.score}
          style={{ fontSize: config.fontSize, color }}
        >
          {displayScore}
        </span>
        {letterGrade && (
          <span
            className={styles.grade}
            style={{ fontSize: config.gradeSize }}
          >
            {letterGrade}
          </span>
        )}
      </div>

      {showLabel && (
        <span className={styles.label}>Content Score</span>
      )}
    </div>
  );
}

// Compact inline score badge
export function ScoreBadge({ score, size = "small" }: { score: number; size?: "small" | "medium" }) {
  const getColor = (s: number) => {
    if (s >= 75) return "var(--success-color)";
    if (s >= 50) return "var(--warning-color)";
    return "var(--error-color)";
  };

  return (
    <span
      className={`${styles.badge} ${styles[`badge-${size}`]}`}
      style={{ backgroundColor: getColor(score) }}
    >
      {score}
    </span>
  );
}

// Metric progress bar
interface MetricBarProps {
  label: string;
  score: number;
  detail: string;
  status: "good" | "warning" | "error";
}

export function MetricBar({ label, score, detail, status }: MetricBarProps) {
  const statusColors = {
    good: "var(--success-color)",
    warning: "var(--warning-color)",
    error: "var(--error-color)",
  };

  return (
    <div className={styles.metricBar}>
      <div className={styles.metricHeader}>
        <span className={styles.metricLabel}>{label}</span>
        <span className={styles.metricScore} style={{ color: statusColors[status] }}>
          {score}%
        </span>
      </div>
      <div className={styles.metricTrack}>
        <motion.div
          className={styles.metricFill}
          style={{ backgroundColor: statusColors[status] }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <span className={styles.metricDetail}>{detail}</span>
    </div>
  );
}
