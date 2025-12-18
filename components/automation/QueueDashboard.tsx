// components/automation/QueueDashboard.tsx
// Dashboard for viewing and managing the generation queue

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "../../styles/Automation.module.css";

interface QueueItem {
  id: string;
  type: string;
  topic: string;
  keywords: string | null;
  status: string;
  priority: number;
  scheduledFor: string | null;
  draftId: string | null;
  errorMessage: string | null;
  attempts: number;
  createdAt: string | null;
  batchId: string | null;
}

interface QueueDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onViewDraft?: (draftId: string) => void;
}

type FilterStatus = "all" | "pending" | "generating" | "generated" | "failed";

export function QueueDashboard({ isOpen, onClose, onViewDraft }: QueueDashboardProps) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadQueue();
    }
  }, [isOpen]);

  const loadQueue = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/queue/list");
      const data = await response.json();

      if (data.success) {
        setItems(data.items || []);
      } else {
        setError(data.error || "Failed to load queue");
      }
    } catch (err) {
      console.error("Failed to load queue:", err);
      setError("Failed to load queue");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async (itemId: string) => {
    try {
      const response = await fetch("/api/queue/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, action: "retry" }),
      });

      if (response.ok) {
        loadQueue();
      }
    } catch (err) {
      console.error("Failed to retry item:", err);
    }
  };

  const handleCancel = async (itemId: string) => {
    try {
      const response = await fetch("/api/queue/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, action: "cancel" }),
      });

      if (response.ok) {
        loadQueue();
      }
    } catch (err) {
      console.error("Failed to cancel item:", err);
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      const response = await fetch(`/api/queue/update?id=${itemId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        loadQueue();
      }
    } catch (err) {
      console.error("Failed to delete item:", err);
    }
  };

  const filteredItems = items.filter((item) => {
    if (filter === "all") return true;
    if (filter === "generated") {
      return ["generated", "scheduled", "published"].includes(item.status);
    }
    return item.status === filter;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      pending: { color: "#6b7280", label: "Pending" },
      generating: { color: "#3b82f6", label: "Generating" },
      generated: { color: "#22c55e", label: "Generated" },
      scheduled: { color: "#8b5cf6", label: "Scheduled" },
      published: { color: "#10b981", label: "Published" },
      failed: { color: "#ef4444", label: "Failed" },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span
        className={styles.statusBadge}
        style={{ backgroundColor: `${config.color}20`, color: config.color }}
      >
        {config.label}
      </span>
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "blog":
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        );
      case "service_page":
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        );
      case "location_page":
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        );
      default:
        return null;
    }
  };

  const counts = {
    all: items.length,
    pending: items.filter((i) => i.status === "pending").length,
    generating: items.filter((i) => i.status === "generating").length,
    generated: items.filter((i) => ["generated", "scheduled", "published"].includes(i.status)).length,
    failed: items.filter((i) => i.status === "failed").length,
  };

  if (!isOpen) return null;

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
          className={styles.queueModal}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.modalHeader}>
            <h2>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              Generation Queue
            </h2>
            <div className={styles.headerActions}>
              <button className={styles.refreshButton} onClick={loadQueue}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 4v6h-6M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              </button>
              <button className={styles.closeButton} onClick={onClose}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className={styles.filterTabs}>
            {(["all", "pending", "generating", "generated", "failed"] as FilterStatus[]).map((status) => (
              <button
                key={status}
                className={`${styles.filterTab} ${filter === status ? styles.active : ""}`}
                onClick={() => setFilter(status)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                <span className={styles.filterCount}>{counts[status]}</span>
              </button>
            ))}
          </div>

          <div className={styles.modalBody}>
            {isLoading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner} />
                <p>Loading queue...</p>
              </div>
            ) : error ? (
              <div className={styles.errorState}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <p>{error}</p>
                <button onClick={loadQueue}>Retry</button>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className={styles.emptyState}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
                <p>No items in queue</p>
                <span>Use batch generate to add items to the queue</span>
              </div>
            ) : (
              <div className={styles.queueList}>
                {filteredItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    className={styles.queueItem}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <div className={styles.queueItemIcon}>
                      {getTypeIcon(item.type)}
                    </div>
                    <div className={styles.queueItemContent}>
                      <div className={styles.queueItemHeader}>
                        <span className={styles.queueItemTopic}>{item.topic}</span>
                        {getStatusBadge(item.status)}
                      </div>
                      {item.keywords && (
                        <span className={styles.queueItemKeywords}>
                          Keywords: {item.keywords}
                        </span>
                      )}
                      {item.errorMessage && (
                        <span className={styles.queueItemError}>
                          Error: {item.errorMessage}
                        </span>
                      )}
                      <div className={styles.queueItemMeta}>
                        <span>
                          {new Date(item.createdAt || "").toLocaleDateString()}
                        </span>
                        {item.attempts > 0 && (
                          <span>Attempts: {item.attempts}</span>
                        )}
                      </div>
                    </div>
                    <div className={styles.queueItemActions}>
                      {item.status === "failed" && (
                        <button
                          className={styles.retryButton}
                          onClick={() => handleRetry(item.id)}
                          title="Retry"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M23 4v6h-6M1 20v-6h6" />
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                          </svg>
                        </button>
                      )}
                      {item.status === "pending" && (
                        <button
                          className={styles.cancelButton}
                          onClick={() => handleCancel(item.id)}
                          title="Cancel"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                          </svg>
                        </button>
                      )}
                      {item.draftId && (
                        <button
                          className={styles.viewButton}
                          onClick={() => onViewDraft?.(item.draftId!)}
                          title="View Draft"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      )}
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDelete(item.id)}
                        title="Delete"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
