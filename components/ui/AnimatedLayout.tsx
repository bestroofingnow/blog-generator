// components/ui/AnimatedLayout.tsx
// Page layout wrapper with smooth transitions
import { motion, AnimatePresence, Variants } from "framer-motion";
import { ReactNode } from "react";
import { pageTransition } from "../../lib/animations";

interface AnimatedLayoutProps {
  children: ReactNode;
  className?: string;
  key?: string;
}

export function AnimatedLayout({ children, className, key }: AnimatedLayoutProps) {
  return (
    <motion.div
      key={key}
      className={className}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageTransition}
    >
      {children}
    </motion.div>
  );
}

// Animated tab panel content
interface AnimatedTabPanelProps {
  children: ReactNode;
  className?: string;
  isActive: boolean;
  direction?: "left" | "right";
}

const tabVariants: Variants = {
  enter: (direction: "left" | "right") => ({
    x: direction === "right" ? 20 : -20,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: "left" | "right") => ({
    x: direction === "right" ? -20 : 20,
    opacity: 0,
  }),
};

export function AnimatedTabPanel({
  children,
  className,
  isActive,
  direction = "right",
}: AnimatedTabPanelProps) {
  return (
    <AnimatePresence mode="wait" custom={direction}>
      {isActive && (
        <motion.div
          key="tab-panel"
          className={className}
          custom={direction}
          variants={tabVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Animated modal overlay
interface AnimatedModalProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  overlayClassName?: string;
}

export function AnimatedModal({
  children,
  isOpen,
  onClose,
  className,
  overlayClassName,
}: AnimatedModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className={overlayClassName}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(4px)",
              zIndex: 999,
            }}
          />
          {/* Modal */}
          <motion.div
            className={className}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{
              position: "fixed",
              zIndex: 1000,
            }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Animated accordion
interface AnimatedAccordionProps {
  children: ReactNode;
  isOpen: boolean;
  className?: string;
}

export function AnimatedAccordion({
  children,
  isOpen,
  className,
}: AnimatedAccordionProps) {
  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          className={className}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          style={{ overflow: "hidden" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Animated sidebar
interface AnimatedSidebarProps {
  children: ReactNode;
  isExpanded: boolean;
  expandedWidth: string;
  collapsedWidth: string;
  className?: string;
}

export function AnimatedSidebar({
  children,
  isExpanded,
  expandedWidth,
  collapsedWidth,
  className,
}: AnimatedSidebarProps) {
  return (
    <motion.nav
      className={className}
      initial={false}
      animate={{
        width: isExpanded ? expandedWidth : collapsedWidth,
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {children}
    </motion.nav>
  );
}

// Toast notification animation
interface AnimatedToastProps {
  children: ReactNode;
  className?: string;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}

const toastPositionVariants: Record<string, Variants> = {
  "top-right": {
    initial: { opacity: 0, x: 50, y: 0 },
    animate: { opacity: 1, x: 0, y: 0 },
    exit: { opacity: 0, x: 50, y: 0 },
  },
  "top-left": {
    initial: { opacity: 0, x: -50, y: 0 },
    animate: { opacity: 1, x: 0, y: 0 },
    exit: { opacity: 0, x: -50, y: 0 },
  },
  "bottom-right": {
    initial: { opacity: 0, x: 50, y: 0 },
    animate: { opacity: 1, x: 0, y: 0 },
    exit: { opacity: 0, x: 50, y: 0 },
  },
  "bottom-left": {
    initial: { opacity: 0, x: -50, y: 0 },
    animate: { opacity: 1, x: 0, y: 0 },
    exit: { opacity: 0, x: -50, y: 0 },
  },
};

export function AnimatedToast({
  children,
  className,
  position = "top-right",
}: AnimatedToastProps) {
  return (
    <motion.div
      className={className}
      variants={toastPositionVariants[position]}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// Loading spinner with animation
interface AnimatedSpinnerProps {
  size?: number;
  color?: string;
  className?: string;
}

export function AnimatedSpinner({
  size = 24,
  color = "currentColor",
  className,
}: AnimatedSpinnerProps) {
  return (
    <motion.svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="60 40"
        opacity={0.3}
      />
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="60 40"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.svg>
  );
}

// Animated presence wrapper for conditional rendering
interface AnimatedPresenceWrapperProps {
  children: ReactNode;
  show: boolean;
  mode?: "wait" | "sync" | "popLayout";
}

export function AnimatedPresenceWrapper({
  children,
  show,
  mode = "wait",
}: AnimatedPresenceWrapperProps) {
  return (
    <AnimatePresence mode={mode}>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AnimatedLayout;
