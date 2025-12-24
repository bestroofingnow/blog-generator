// components/chat/ChatTriggerButton.tsx
// Floating button to open chat sidebar

import { motion } from "framer-motion";
import styles from "../../styles/Chat.module.css";

interface ChatTriggerButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export default function ChatTriggerButton({ onClick, isOpen }: ChatTriggerButtonProps) {
  // Don't show when chat is open
  if (isOpen) return null;

  return (
    <motion.button
      className={styles.triggerButton}
      onClick={onClick}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      title="Open AI Chat (Cmd+J)"
    >
      <svg
        className={styles.triggerIcon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <span className={styles.triggerShortcut}>⌘J</span>
    </motion.button>
  );
}
