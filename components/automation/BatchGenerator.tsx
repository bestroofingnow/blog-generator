// components/automation/BatchGenerator.tsx
// Modal for creating up to 5 blogs at once

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "../../styles/Automation.module.css";

interface TopicInput {
  id: string;
  topic: string;
  keywords: string;
}

interface BatchGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BatchGenerator({ isOpen, onClose, onSuccess }: BatchGeneratorProps) {
  const [topics, setTopics] = useState<TopicInput[]>([
    { id: "1", topic: "", keywords: "" },
  ]);
  const [type, setType] = useState<"blog" | "service_page" | "location_page">("blog");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState({ remaining: 20, limit: 20 });

  // Load usage on mount
  useEffect(() => {
    if (isOpen) {
      loadUsage();
    }
  }, [isOpen]);

  const loadUsage = async () => {
    try {
      const response = await fetch("/api/usage/check");
      const data = await response.json();
      if (data.success) {
        setUsage({ remaining: data.remaining, limit: data.limit });
      }
    } catch (error) {
      console.error("Failed to load usage:", error);
    }
  };

  const addTopic = () => {
    if (topics.length < 5) {
      setTopics([...topics, { id: Date.now().toString(), topic: "", keywords: "" }]);
    }
  };

  const removeTopic = (id: string) => {
    if (topics.length > 1) {
      setTopics(topics.filter((t) => t.id !== id));
    }
  };

  const updateTopic = (id: string, field: "topic" | "keywords", value: string) => {
    setTopics(
      topics.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const handleGenerate = async () => {
    // Validate topics
    const validTopics = topics.filter((t) => t.topic.trim().length > 0);
    if (validTopics.length === 0) {
      setError("Please enter at least one topic");
      return;
    }

    // Check usage limit
    if (validTopics.length > usage.remaining) {
      setError(`You can only generate ${usage.remaining} more blogs today`);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/batch/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topics: validTopics.map((t) => ({
            topic: t.topic.trim(),
            keywords: t.keywords.trim() || undefined,
          })),
          type,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Failed to start batch generation");
        return;
      }

      // Success - close modal and notify parent
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Batch generation error:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  const validTopicCount = topics.filter((t) => t.topic.trim().length > 0).length;

  return (
    <AnimatePresence>
      <motion.div
        className={styles.modalOverlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={styles.batchModal}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.modalHeader}>
            <h2>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
              Batch Generate
            </h2>
            <button className={styles.closeButton} onClick={onClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className={styles.modalBody}>
            {/* Usage indicator */}
            <div className={styles.usageIndicator}>
              <span className={styles.usageText}>
                {usage.remaining} blogs remaining today
              </span>
              {validTopicCount > 0 && validTopicCount <= usage.remaining && (
                <span className={styles.willUse}>
                  Will use {validTopicCount} of your daily limit
                </span>
              )}
              {validTopicCount > usage.remaining && (
                <span className={styles.overLimit}>
                  Exceeds daily limit
                </span>
              )}
            </div>

            {/* Type selector */}
            <div className={styles.typeSelector}>
              <label>Content Type:</label>
              <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
                <option value="blog">Blog Post</option>
                <option value="service_page">Service Page</option>
                <option value="location_page">Location Page</option>
              </select>
            </div>

            {/* Topic inputs */}
            <div className={styles.topicList}>
              {topics.map((topic, index) => (
                <motion.div
                  key={topic.id}
                  className={styles.topicItem}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className={styles.topicNumber}>{index + 1}</div>
                  <div className={styles.topicInputs}>
                    <input
                      type="text"
                      placeholder="Enter topic (e.g., 'Benefits of solar panels for homes')"
                      value={topic.topic}
                      onChange={(e) => updateTopic(topic.id, "topic", e.target.value)}
                      className={styles.topicInput}
                    />
                    <input
                      type="text"
                      placeholder="Keywords (optional, comma-separated)"
                      value={topic.keywords}
                      onChange={(e) => updateTopic(topic.id, "keywords", e.target.value)}
                      className={styles.keywordsInput}
                    />
                  </div>
                  {topics.length > 1 && (
                    <button
                      className={styles.removeTopicButton}
                      onClick={() => removeTopic(topic.id)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Add topic button */}
            {topics.length < 5 && (
              <button className={styles.addTopicButton} onClick={addTopic}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Another Topic ({topics.length}/5)
              </button>
            )}

            {/* Error message */}
            {error && (
              <motion.div
                className={styles.errorMessage}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {error}
              </motion.div>
            )}
          </div>

          <div className={styles.modalFooter}>
            <button className={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <motion.button
              className={styles.generateButton}
              onClick={handleGenerate}
              disabled={isGenerating || validTopicCount === 0 || validTopicCount > usage.remaining}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isGenerating ? (
                <>
                  <span className={styles.buttonSpinner} />
                  Adding to Queue...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  Generate {validTopicCount} {validTopicCount === 1 ? "Blog" : "Blogs"}
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
