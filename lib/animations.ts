// lib/animations.ts
// Reusable Framer Motion animation variants for consistent animations across the app

import { Variants, Transition } from "framer-motion";

// ===== FADE ANIMATIONS =====

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const fadeInDown: Variants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

export const fadeInLeft: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

export const fadeInRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

// ===== SCALE ANIMATIONS =====

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

export const scaleUp: Variants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
};

// Hover/tap interactions
export const scaleOnHover = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
};

export const scaleOnHoverLarge = {
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.95 },
};

export const buttonPress = {
  whileHover: { scale: 1.02, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)" },
  whileTap: { scale: 0.98, boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" },
};

// ===== STAGGER ANIMATIONS =====

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

export const staggerContainerFast: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

// ===== SIDEBAR ANIMATIONS =====

export const sidebarExpand: Variants = {
  collapsed: { width: 64 },
  expanded: { width: 220 },
};

export const sidebarLabelFade: Variants = {
  collapsed: { opacity: 0, width: 0 },
  expanded: { opacity: 1, width: "auto" },
};

// ===== MODAL/DIALOG ANIMATIONS =====

export const modalOverlay: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalContent: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 10 },
};

export const commandPalette: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
};

// ===== CARD ANIMATIONS =====

export const cardHover = {
  whileHover: {
    y: -4,
    boxShadow: "0 12px 24px rgba(0, 0, 0, 0.1)",
    transition: { duration: 0.2 },
  },
};

export const cardPress = {
  whileTap: {
    y: 0,
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.08)",
  },
};

// ===== PAGE TRANSITIONS =====

export const pageTransition: Variants = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 10 },
};

export const sectionTransition: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

// ===== PROGRESS ANIMATIONS =====

export const progressBar: Variants = {
  initial: { width: 0 },
  animate: (progress: number) => ({
    width: `${progress}%`,
    transition: { duration: 0.5, ease: "easeOut" },
  }),
};

export const progressPulse = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// ===== LOADING ANIMATIONS =====

export const spinnerRotate = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

export const dotPulse: Variants = {
  initial: { scale: 0.8, opacity: 0.5 },
  animate: {
    scale: [0.8, 1, 0.8],
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// ===== TRANSITIONS =====

export const springTransition: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 25,
};

export const smoothTransition: Transition = {
  type: "tween",
  duration: 0.3,
  ease: "easeInOut",
};

export const fastTransition: Transition = {
  type: "tween",
  duration: 0.15,
  ease: "easeOut",
};

// ===== UTILITY FUNCTIONS =====

export function getStaggerDelay(index: number, baseDelay = 0.1): number {
  return index * baseDelay;
}

export function createSlideVariants(direction: "up" | "down" | "left" | "right", distance = 20): Variants {
  const directionMap = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance },
  };

  return {
    initial: { opacity: 0, ...directionMap[direction] },
    animate: { opacity: 1, x: 0, y: 0 },
    exit: { opacity: 0, ...directionMap[direction] },
  };
}
