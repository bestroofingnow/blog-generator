// components/automation/UsageMeter.tsx
// Visual meter showing daily blog usage (X/20)

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import styles from "../../styles/Automation.module.css";

interface UsageMeterProps {
  showLabel?: boolean;
  size?: "small" | "medium" | "large";
}

export function UsageMeter({
  showLabel = true,
  size = "medium",
}: UsageMeterProps) {
  const [used, setUsed] = useState(0);
  const [limit, setLimit] = useState(20);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      const response = await fetch("/api/usage/check");
      const data = await response.json();
      if (data.success) {
        setUsed(data.blogsGenerated || 0);
        setLimit(data.limit || 20);
      }
    } catch (error) {
      console.error("Failed to load usage:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const percentage = Math.min((used / limit) * 100, 100);
  const remaining = Math.max(limit - used, 0);

  // Color based on usage level
  const getColor = () => {
    if (percentage >= 80) return "#ef4444"; // Red - near limit
    if (percentage >= 60) return "#f97316"; // Orange - getting close
    if (percentage >= 40) return "#eab308"; // Yellow - moderate
    return "#22c55e"; // Green - plenty remaining
  };

  const color = getColor();

  // Size configurations
  const sizeConfig = {
    small: { radius: 30, stroke: 5, fontSize: 12 },
    medium: { radius: 45, stroke: 6, fontSize: 16 },
    large: { radius: 60, stroke: 8, fontSize: 20 },
  };

  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * config.radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Calculate time until reset (midnight UTC)
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  const hoursUntilReset = Math.ceil((midnight.getTime() - now.getTime()) / (1000 * 60 * 60));

  if (isLoading) {
    return (
      <div className={`${styles.usageMeter} ${styles[size]}`}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.usageMeter} ${styles[size]}`}>
      <div className={styles.gaugeContainer}>
        <svg
          width={(config.radius + config.stroke) * 2}
          height={(config.radius + config.stroke) * 2}
          viewBox={`0 0 ${(config.radius + config.stroke) * 2} ${(config.radius + config.stroke) * 2}`}
        >
          {/* Background circle */}
          <circle
            cx={config.radius + config.stroke}
            cy={config.radius + config.stroke}
            r={config.radius}
            fill="none"
            stroke="var(--border-light)"
            strokeWidth={config.stroke}
          />
          {/* Progress arc */}
          <motion.circle
            cx={config.radius + config.stroke}
            cy={config.radius + config.stroke}
            r={config.radius}
            fill="none"
            stroke={color}
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            transform={`rotate(-90 ${config.radius + config.stroke} ${config.radius + config.stroke})`}
          />
        </svg>
        <div className={styles.gaugeCenter} style={{ fontSize: config.fontSize }}>
          <span className={styles.gaugeValue} style={{ color }}>{used}</span>
          <span className={styles.gaugeDivider}>/</span>
          <span className={styles.gaugeLimit}>{limit}</span>
        </div>
      </div>

      {showLabel && (
        <div className={styles.usageInfo}>
          <span className={styles.usageLabel}>Blogs Today</span>
          <span className={styles.usageRemaining}>
            {remaining > 0 ? (
              <>{remaining} remaining</>
            ) : (
              <span className={styles.limitReached}>Daily limit reached</span>
            )}
          </span>
          <span className={styles.resetTime}>
            Resets in {hoursUntilReset}h
          </span>
        </div>
      )}
    </div>
  );
}

// Compact badge version for sidebar
export function UsageBadge({
  used,
  limit,
}: {
  used: number;
  limit: number;
}) {
  const percentage = (used / limit) * 100;
  const getColor = () => {
    if (percentage >= 80) return "#ef4444";
    if (percentage >= 60) return "#f97316";
    if (percentage >= 40) return "#eab308";
    return "#22c55e";
  };

  return (
    <span
      className={styles.usageBadge}
      style={{ backgroundColor: `${getColor()}20`, color: getColor() }}
    >
      {used}/{limit}
    </span>
  );
}
