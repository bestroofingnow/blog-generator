// components/ui/AnimatedSection.tsx
// Animated section with reveal-on-scroll effect
import { motion, useInView, Variants } from "framer-motion";
import { ReactNode, useRef } from "react";
import { fadeInUp, slideInLeft, slideInRight, scaleIn } from "../../lib/animations";

type AnimationType = "fadeUp" | "slideLeft" | "slideRight" | "scale" | "custom";

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  animation?: AnimationType;
  customVariants?: Variants;
  delay?: number;
  duration?: number;
  once?: boolean;
  amount?: number;
}

const animationVariants: Record<string, Variants> = {
  fadeUp: fadeInUp,
  slideLeft: slideInLeft,
  slideRight: slideInRight,
  scale: scaleIn,
};

export function AnimatedSection({
  children,
  className,
  animation = "fadeUp",
  customVariants,
  delay = 0,
  duration = 0.5,
  once = true,
  amount = 0.2,
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, amount });

  const variants = animation === "custom" ? customVariants : animationVariants[animation];

  return (
    <motion.section
      ref={ref}
      className={className}
      initial="initial"
      animate={isInView ? "animate" : "initial"}
      variants={variants}
      transition={{ delay, duration, ease: "easeOut" }}
    >
      {children}
    </motion.section>
  );
}

// Animated heading with gradient reveal
interface AnimatedHeadingProps {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  delay?: number;
}

export function AnimatedHeading({
  children,
  className,
  as: Component = "h2",
  delay = 0,
}: AnimatedHeadingProps) {
  const MotionComponent = motion[Component];

  return (
    <MotionComponent
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
    >
      {children}
    </MotionComponent>
  );
}

// Animated paragraph with staggered word reveal
interface AnimatedTextProps {
  children: string;
  className?: string;
  delay?: number;
  staggerDelay?: number;
}

export function AnimatedText({
  children,
  className,
  delay = 0,
  staggerDelay = 0.02,
}: AnimatedTextProps) {
  const words = children.split(" ");

  return (
    <motion.p
      className={className}
      initial="initial"
      animate="animate"
      variants={{
        initial: {},
        animate: {
          transition: {
            delayChildren: delay,
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {words.map((word, index) => (
        <motion.span
          key={index}
          style={{ display: "inline-block", marginRight: "0.25em" }}
          variants={{
            initial: { opacity: 0, y: 10 },
            animate: { opacity: 1, y: 0 },
          }}
        >
          {word}
        </motion.span>
      ))}
    </motion.p>
  );
}

// Progress indicator with animation
interface AnimatedProgressProps {
  progress: number; // 0-100
  className?: string;
  color?: string;
  height?: number;
}

export function AnimatedProgress({
  progress,
  className,
  color = "var(--primary-color)",
  height = 4,
}: AnimatedProgressProps) {
  return (
    <div
      className={className}
      style={{
        width: "100%",
        height,
        backgroundColor: "var(--bg-tertiary)",
        borderRadius: height / 2,
        overflow: "hidden",
      }}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{
          height: "100%",
          backgroundColor: color,
          borderRadius: height / 2,
        }}
      />
    </div>
  );
}

// Animated number counter
interface AnimatedCounterProps {
  value: number;
  className?: string;
  duration?: number;
  prefix?: string;
  suffix?: string;
}

export function AnimatedCounter({
  value,
  className,
  duration = 1,
  prefix = "",
  suffix = "",
}: AnimatedCounterProps) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {prefix}
      </motion.span>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {value}
      </motion.span>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {suffix}
      </motion.span>
    </motion.span>
  );
}

export default AnimatedSection;
