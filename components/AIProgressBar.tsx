// components/AIProgressBar.tsx
// Enhanced AI generation progress bar with stages
import { motion, AnimatePresence } from "framer-motion";
import styles from "../styles/AIProgressBar.module.css";

type ProgressStage =
  | "idle"
  | "research"
  | "outline"
  | "images"
  | "upload"
  | "content"
  | "format"
  | "publishing"
  | "complete";

interface AIProgressBarProps {
  stage: ProgressStage;
  message?: string;
  showEstimate?: boolean;
}

const stageConfig: Record<ProgressStage, {
  label: string;
  progress: number;
  icon: string;
  estimate?: string;
}> = {
  idle: { label: "Ready", progress: 0, icon: "⏸️" },
  research: { label: "Researching", progress: 15, icon: "🔍", estimate: "~30s" },
  outline: { label: "Creating Outline", progress: 30, icon: "📝", estimate: "~20s" },
  images: { label: "Generating Images", progress: 45, icon: "🎨", estimate: "~45s" },
  upload: { label: "Uploading Assets", progress: 60, icon: "☁️", estimate: "~15s" },
  content: { label: "Writing Content", progress: 75, icon: "✍️", estimate: "~60s" },
  format: { label: "Formatting", progress: 90, icon: "🎯", estimate: "~10s" },
  publishing: { label: "Publishing", progress: 95, icon: "🚀", estimate: "~10s" },
  complete: { label: "Complete!", progress: 100, icon: "✅" },
};

const stages: ProgressStage[] = [
  "research",
  "outline",
  "images",
  "upload",
  "content",
  "format",
];

export default function AIProgressBar({
  stage,
  message,
  showEstimate = true
}: AIProgressBarProps) {
  const config = stageConfig[stage];
  const currentStageIndex = stages.indexOf(stage);

  if (stage === "idle") return null;

  return (
    <div className={styles.container}>
      {/* Progress header */}
      <div className={styles.header}>
        <AnimatePresence mode="wait">
          <motion.div
            key={stage}
            className={styles.stageInfo}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <span className={styles.stageIcon}>{config.icon}</span>
            <span className={styles.stageLabel}>{config.label}</span>
            {showEstimate && config.estimate && (
              <span className={styles.estimate}>{config.estimate}</span>
            )}
          </motion.div>
        </AnimatePresence>
        <span className={styles.percentage}>{config.progress}%</span>
      </div>

      {/* Progress bar */}
      <div className={styles.track}>
        <motion.div
          className={styles.fill}
          initial={{ width: 0 }}
          animate={{ width: `${config.progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        {/* Animated shimmer */}
        <motion.div
          className={styles.shimmer}
          animate={{
            x: ["-100%", "200%"],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Stage dots */}
      <div className={styles.stages}>
        {stages.map((s, index) => {
          const isActive = index === currentStageIndex;
          const isComplete = index < currentStageIndex || stage === "complete";
          const stageData = stageConfig[s];

          return (
            <div
              key={s}
              className={`${styles.stageDot} ${isActive ? styles.active : ""} ${isComplete ? styles.complete : ""}`}
            >
              <motion.div
                className={styles.dot}
                initial={false}
                animate={{
                  scale: isActive ? 1.2 : 1,
                  backgroundColor: isComplete
                    ? "var(--success-color)"
                    : isActive
                    ? "var(--primary-color)"
                    : "var(--bg-tertiary)",
                }}
                transition={{ duration: 0.2 }}
              >
                {isComplete && (
                  <motion.svg
                    viewBox="0 0 24 24"
                    width="12"
                    height="12"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <path
                      fill="white"
                      d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                    />
                  </motion.svg>
                )}
              </motion.div>
              <span className={styles.stageText}>{stageData.label.split(" ")[0]}</span>
            </div>
          );
        })}
      </div>

      {/* Custom message */}
      {message && (
        <AnimatePresence mode="wait">
          <motion.p
            key={message}
            className={styles.message}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {message}
          </motion.p>
        </AnimatePresence>
      )}
    </div>
  );
}

// Mini version for inline use
interface MiniProgressProps {
  progress: number;
  color?: string;
}

export function MiniProgress({ progress, color = "var(--primary-color)" }: MiniProgressProps) {
  return (
    <div className={styles.miniTrack}>
      <motion.div
        className={styles.miniFill}
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3 }}
      />
    </div>
  );
}

// Pulsing loader for indefinite progress
export function PulsingLoader({ text = "Processing..." }: { text?: string }) {
  return (
    <div className={styles.pulsingContainer}>
      <div className={styles.pulsingDots}>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className={styles.pulsingDot}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.15,
            }}
          />
        ))}
      </div>
      <span className={styles.pulsingText}>{text}</span>
    </div>
  );
}
