// components/chat/ConversationList.tsx
// Conversation history panel

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import styles from "../../styles/Chat.module.css";

interface Conversation {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ConversationListProps {
  currentId: string | null;
  onSelect: (id: string) => void;
  onNewConversation: () => void;
  onClose: () => void;
}

export default function ConversationList({
  currentId,
  onSelect,
  onNewConversation,
  onClose,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/conversations?status=active&limit=50");
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Format relative date
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <motion.div
      className={styles.historyPanel}
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
    >
      <div className={styles.historyHeader}>
        <span className={styles.historyTitle}>Conversations</span>
        <button className={styles.iconButton} onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <button className={styles.newConversationButton} onClick={onNewConversation}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        New Conversation
      </button>

      <div className={styles.historyList}>
        {loading ? (
          <div style={{ padding: 20, textAlign: "center", color: "var(--text-tertiary)" }}>
            Loading...
          </div>
        ) : conversations.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "var(--text-tertiary)" }}>
            No conversations yet
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`${styles.historyItem} ${
                conv.id === currentId ? styles.historyItemActive : ""
              }`}
              onClick={() => onSelect(conv.id)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ flexShrink: 0, color: "var(--text-tertiary)" }}
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className={styles.historyItemTitle}>{conv.title}</span>
              <span className={styles.historyItemDate}>{formatDate(conv.updatedAt)}</span>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
