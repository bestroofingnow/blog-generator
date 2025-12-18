// components/StreamingText.tsx
// Animated streaming text display for AI responses
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import styles from "../styles/StreamingText.module.css";

interface StreamingTextProps {
  text: string;
  speed?: number; // Characters per second
  className?: string;
  onComplete?: () => void;
  showCursor?: boolean;
  autoScroll?: boolean;
}

export default function StreamingText({
  text,
  speed = 50,
  className,
  onComplete,
  showCursor = true,
  autoScroll = true,
}: StreamingTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!text) {
      setDisplayedText("");
      setIsComplete(false);
      return;
    }

    let index = 0;
    setDisplayedText("");
    setIsComplete(false);

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;

        // Auto-scroll to bottom
        if (autoScroll && containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      } else {
        clearInterval(interval);
        setIsComplete(true);
        onComplete?.();
      }
    }, 1000 / speed);

    return () => clearInterval(interval);
  }, [text, speed, onComplete, autoScroll]);

  return (
    <div ref={containerRef} className={`${styles.container} ${className || ""}`}>
      <span className={styles.text}>{displayedText}</span>
      {showCursor && !isComplete && (
        <motion.span
          className={styles.cursor}
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
        />
      )}
    </div>
  );
}

// Instant reveal with fade effect for already-generated content
interface FadeInTextProps {
  text: string;
  className?: string;
  delay?: number;
}

export function FadeInText({ text, className, delay = 0 }: FadeInTextProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.5 }}
    >
      {text}
    </motion.div>
  );
}

// Word-by-word reveal for headings
interface WordRevealProps {
  text: string;
  className?: string;
  staggerDelay?: number;
}

export function WordReveal({ text, className, staggerDelay = 0.05 }: WordRevealProps) {
  const words = text.split(" ");

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {words.map((word, index) => (
        <motion.span
          key={index}
          style={{ display: "inline-block", marginRight: "0.3em" }}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
}

// Typing indicator (three dots)
export function TypingIndicator({ className }: { className?: string }) {
  return (
    <div className={`${styles.typingIndicator} ${className || ""}`}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className={styles.typingDot}
          animate={{
            y: [0, -4, 0],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

// Code block with syntax highlighting animation
interface AnimatedCodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export function AnimatedCodeBlock({
  code,
  language = "typescript",
  className,
}: AnimatedCodeBlockProps) {
  const lines = code.split("\n");

  return (
    <motion.pre
      className={`${styles.codeBlock} ${className || ""}`}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.05,
          },
        },
      }}
    >
      <code data-language={language}>
        {lines.map((line, index) => (
          <motion.div
            key={index}
            className={styles.codeLine}
            variants={{
              hidden: { opacity: 0, x: -10 },
              visible: { opacity: 1, x: 0 },
            }}
          >
            <span className={styles.lineNumber}>{index + 1}</span>
            <span className={styles.lineContent}>{line}</span>
          </motion.div>
        ))}
      </code>
    </motion.pre>
  );
}

// Markdown-style streaming renderer
interface StreamingMarkdownProps {
  content: string;
  speed?: number;
  className?: string;
}

export function StreamingMarkdown({
  content,
  speed = 50,
  className,
}: StreamingMarkdownProps) {
  const [displayedContent, setDisplayedContent] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!content) {
      setDisplayedContent("");
      return;
    }

    let index = 0;
    setDisplayedContent("");

    const interval = setInterval(() => {
      if (index < content.length) {
        setDisplayedContent(content.slice(0, index + 1));
        index++;

        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      } else {
        clearInterval(interval);
      }
    }, 1000 / speed);

    return () => clearInterval(interval);
  }, [content, speed]);

  return (
    <div
      ref={containerRef}
      className={`${styles.markdownContainer} ${className || ""}`}
      dangerouslySetInnerHTML={{ __html: displayedContent }}
    />
  );
}
