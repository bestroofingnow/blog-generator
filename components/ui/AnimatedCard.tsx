// components/ui/AnimatedCard.tsx
// Reusable animated card component with hover effects
import { motion, HTMLMotionProps } from "framer-motion";
import { ReactNode, forwardRef } from "react";
import { cardHover, fadeInUp, scaleOnTap } from "../../lib/animations";

interface AnimatedCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  className?: string;
  hoverEffect?: boolean;
  tapEffect?: boolean;
  delay?: number;
}

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ children, className, hoverEffect = true, tapEffect = true, delay = 0, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={className}
        initial="initial"
        animate="animate"
        variants={fadeInUp}
        transition={{ delay }}
        whileHover={hoverEffect ? cardHover.whileHover : undefined}
        whileTap={tapEffect ? scaleOnTap.whileTap : undefined}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

AnimatedCard.displayName = "AnimatedCard";

// Animated button with scale effect
interface AnimatedButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ children, className, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        className={className}
        disabled={disabled}
        whileHover={disabled ? undefined : { scale: 1.02 }}
        whileTap={disabled ? undefined : { scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

AnimatedButton.displayName = "AnimatedButton";

// Animated container that staggers children
interface AnimatedContainerProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export const AnimatedContainer = forwardRef<HTMLDivElement, AnimatedContainerProps>(
  ({ children, className, staggerDelay = 0.1, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={className}
        initial="initial"
        animate="animate"
        variants={{
          initial: {},
          animate: {
            transition: {
              staggerChildren: staggerDelay,
            },
          },
        }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

AnimatedContainer.displayName = "AnimatedContainer";

// Animated list item for use inside AnimatedContainer
interface AnimatedItemProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  className?: string;
}

export const AnimatedItem = forwardRef<HTMLDivElement, AnimatedItemProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={className}
        variants={fadeInUp}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

AnimatedItem.displayName = "AnimatedItem";

export default AnimatedCard;
