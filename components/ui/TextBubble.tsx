// components/ui/TextBubble.tsx
// Modern text bubble component with smooth animations

import { motion, Variants } from "framer-motion";
import { ReactNode } from "react";
import styles from "../../styles/ModernUI.module.css";

interface TextBubbleProps {
  children: ReactNode;
  variant?: "primary" | "secondary" | "success" | "warning" | "info";
  position?: "left" | "right" | "center";
  animated?: boolean;
  delay?: number;
  className?: string;
}

export default function TextBubble({
  children,
  variant = "primary",
  position = "left",
  animated = true,
  delay = 0,
  className = "",
}: TextBubbleProps) {
  const bubbleVariants: Variants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 260,
        damping: 20,
        delay,
      },
    },
  };

  const Component = animated ? motion.div : "div";
  const animationProps = animated
    ? {
        variants: bubbleVariants,
        initial: "hidden",
        animate: "visible",
        whileHover: { scale: 1.02, y: -2 },
        whileTap: { scale: 0.98 },
      }
    : {};

  return (
    <Component
      className={`${styles.textBubble} ${styles[variant]} ${styles[position]} ${className}`}
      {...animationProps}
    >
      <div className={styles.bubbleContent}>{children}</div>
      <div className={styles.bubbleTail} />
    </Component>
  );
}
