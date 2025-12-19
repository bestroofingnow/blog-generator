// components/ui/ArchDecoration.tsx
// Decorative arch component for modern UI aesthetics

import { motion, Variants } from "framer-motion";
import styles from "../../styles/ModernUI.module.css";

interface ArchDecorationProps {
  position?: "top" | "bottom" | "left" | "right";
  variant?: "primary" | "secondary" | "gradient" | "subtle";
  size?: "sm" | "md" | "lg";
  animated?: boolean;
  className?: string;
}

export default function ArchDecoration({
  position = "top",
  variant = "gradient",
  size = "md",
  animated = true,
  className = "",
}: ArchDecorationProps) {
  const pathVariants: Variants = {
    hidden: {
      pathLength: 0,
      opacity: 0,
    },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { duration: 1.5, ease: [0.42, 0, 0.58, 1] },
        opacity: { duration: 0.3 },
      },
    },
  };

  const sizes = {
    sm: { width: 120, height: 60 },
    md: { width: 200, height: 100 },
    lg: { width: 300, height: 150 },
  };

  const { width, height } = sizes[size];

  return (
    <div
      className={`${styles.archDecoration} ${styles[`arch${position.charAt(0).toUpperCase() + position.slice(1)}`]} ${styles[variant]} ${className}`}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="archGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--primary-color, #667eea)" />
            <stop offset="100%" stopColor="var(--primary-light, #a78bfa)" />
          </linearGradient>
        </defs>
        {animated ? (
          <motion.path
            d={`M 0 ${height} Q ${width / 2} 0 ${width} ${height}`}
            stroke="url(#archGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            variants={pathVariants}
            initial="hidden"
            animate="visible"
          />
        ) : (
          <path
            d={`M 0 ${height} Q ${width / 2} 0 ${width} ${height}`}
            stroke="url(#archGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        )}
      </svg>
    </div>
  );
}
