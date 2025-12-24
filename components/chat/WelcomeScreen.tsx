// components/chat/WelcomeScreen.tsx
// Welcome screen with suggested actions

import { motion } from "framer-motion";
import styles from "../../styles/Chat.module.css";

interface WelcomeScreenProps {
  onSuggestion: (text: string) => void;
}

const suggestions = [
  {
    icon: "📝",
    text: "Generate a blog post about...",
    prompt: "Help me write a blog post about ",
  },
  {
    icon: "🔍",
    text: "Research keywords for my industry",
    prompt: "Research keywords for my industry and suggest topics to write about",
  },
  {
    icon: "📊",
    text: "Analyze my competitors",
    prompt: "Analyze my competitors and identify content opportunities",
  },
  {
    icon: "📋",
    text: "Show me my draft posts",
    prompt: "Show me a list of my draft blog posts",
  },
  {
    icon: "⚙️",
    text: "Update my company profile",
    prompt: "Show me my current profile settings and help me update them",
  },
  {
    icon: "💡",
    text: "Suggest blog topics for this month",
    prompt: "Suggest 5 blog topics I should write about this month based on my industry",
  },
];

export default function WelcomeScreen({ onSuggestion }: WelcomeScreenProps) {
  return (
    <div className={styles.welcomeContainer}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <svg
          className={styles.welcomeIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M12 2a9 9 0 0 0-9 9c0 3.17 1.64 5.95 4.12 7.56L6 22l3.74-1.12A8.96 8.96 0 0 0 12 21a9 9 0 0 0 0-18z" />
          <path d="M8 11h.01M12 11h.01M16 11h.01" />
        </svg>
      </motion.div>

      <motion.h2
        className={styles.welcomeTitle}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        How can I help you today?
      </motion.h2>

      <motion.p
        className={styles.welcomeSubtitle}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        I can help you create content, research keywords, manage drafts, and more.
      </motion.p>

      <motion.div
        className={styles.suggestionGrid}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        {suggestions.map((suggestion, index) => (
          <motion.button
            key={index}
            className={styles.suggestion}
            onClick={() => onSuggestion(suggestion.prompt)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className={styles.suggestionIcon}>{suggestion.icon}</span>
            {suggestion.text}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
