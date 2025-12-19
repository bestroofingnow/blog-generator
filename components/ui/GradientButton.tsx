// components/ui/GradientButton.tsx
// Modern gradient button with shimmer effect

import { motion, HTMLMotionProps } from "framer-motion";
import { ReactNode } from "react";
import styles from "../../styles/ModernUI.module.css";

interface GradientButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "success" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
}

export default function GradientButton({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  disabled,
  className = "",
  ...props
}: GradientButtonProps) {
  const sizeClasses = {
    sm: "padding: 0.5rem 1rem; font-size: 0.875rem;",
    md: "padding: 0.75rem 1.5rem; font-size: 0.95rem;",
    lg: "padding: 1rem 2rem; font-size: 1.1rem;",
  };

  return (
    <motion.button
      className={`${styles.gradientButton} ${className}`}
      disabled={disabled || loading}
      whileHover={disabled ? {} : { scale: 1.02, y: -2 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      style={{ opacity: disabled ? 0.6 : 1 }}
      {...props}
    >
      {loading ? (
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{ display: "inline-block" }}
        >
          ⟳
        </motion.span>
      ) : (
        icon
      )}
      {children}
    </motion.button>
  );
}
