// components/ui/ProgressRing.tsx
// Circular progress indicator with smooth animations

import { motion } from "framer-motion";
import styles from "../../styles/ModernUI.module.css";

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  showValue?: boolean;
  variant?: "primary" | "success" | "warning" | "danger";
  className?: string;
}

export default function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 6,
  showValue = true,
  variant = "primary",
  className = "",
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  const colors = {
    primary: "#667eea",
    success: "#22c55e",
    warning: "#f59e0b",
    danger: "#ef4444",
  };

  return (
    <div className={`${styles.progressRing} ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          className={styles.background}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <motion.circle
          className={styles.progress}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ stroke: colors[variant] }}
        />
      </svg>
      {showValue && (
        <motion.span
          className={styles.progressValue}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          {Math.round(progress)}%
        </motion.span>
      )}
    </div>
  );
}
