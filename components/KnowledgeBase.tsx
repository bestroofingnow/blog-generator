// components/KnowledgeBase.tsx
import { useState, useEffect, useCallback } from "react";
import styles from "../styles/KnowledgeBase.module.css";

interface KnowledgeEntry {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  isAiGenerated: boolean;
  isVerified: boolean;
  priority: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ProfileSuggestion {
  field: string;
  currentValue: unknown;
  suggestedValue: unknown;
  source: string;
}

const CATEGORIES = [
  { value: "services", label: "Services", icon: "S", color: "#3b82f6" },
  { value: "usps", label: "USPs", icon: "U", color: "#8b5cf6" },
  { value: "facts", label: "Facts", icon: "F", color: "#06b6d4" },
  { value: "locations", label: "Areas", icon: "L", color: "#10b981" },
  { value: "certifications", label: "Certs", icon: "C", color: "#f59e0b" },
  { value: "team", label: "Team", icon: "T", color: "#ec4899" },
  { value: "faqs", label: "FAQs", icon: "Q", color: "#6366f1" },
  { value: "testimonials", label: "Reviews", icon: "R", color: "#14b8a6" },
  { value: "custom", label: "Other", icon: "+", color: "#6b7280" },
];

interface KnowledgeBaseProps {
  onClose?: () => void;
  isModal?: boolean;
}

export default function KnowledgeBase({ onClose, isModal = false }: KnowledgeBaseProps) {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newEntry, setNewEntry] = useState({
    category: "services",
    title: "",
    content: "",
    tags: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [profileSuggestions, setProfileSuggestions] = useState<ProfileSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fetchEntries = useCallback(async () => {
    try {
      const url = activeCategory
        ? `/api/knowledge-base?category=${activeCategory}`
        : "/api/knowledge-base";
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setEntries(data.entries || []);
      } else {
        setError(data.error || "Failed to load knowledge base");
      }
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  const checkProfileSync = useCallback(async () => {
    try {
      const response = await fetch("/api/knowledge-base/sync-to-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "suggest" }),
      });
      const data = await response.json();
      if (data.success && data.suggestions?.length > 0) {
        setProfileSuggestions(data.suggestions);
      }
    } catch (err) {
      // Silent fail - suggestions are optional
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    if (entries.length > 0) {
      checkProfileSync();
    }
  }, [entries.length, checkProfileSync]);

  const handleEnrich = async () => {
    setEnriching(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/knowledge-base/enrich", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        setSuccessMessage(`Added ${data.entriesAdded} new entries from your company profile!`);
        fetchEntries();
      } else {
        setError(data.error || "Failed to enrich knowledge base");
      }
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setEnriching(false);
    }
  };

  const handleSyncToProfile = async () => {
    setSyncing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/knowledge-base/sync-to-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply" }),
      });
      const data = await response.json();

      if (data.success) {
        const count = data.updatedFields?.length || 0;
        setSuccessMessage(`Updated ${count} profile field(s) from knowledge base!`);
        setProfileSuggestions([]);
        setShowSuggestions(false);
      } else {
        setError(data.error || "Failed to sync to profile");
      }
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveNew = async () => {
    if (!newEntry.title || !newEntry.content) {
      setError("Title and content are required");
      return;
    }

    try {
      const response = await fetch("/api/knowledge-base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newEntry,
          tags: newEntry.tags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      const data = await response.json();

      if (data.success) {
        setSuccessMessage("Entry added!");
        setIsAddingNew(false);
        setNewEntry({ category: "services", title: "", content: "", tags: "" });
        fetchEntries();
      } else {
        setError(data.error || "Failed to add entry");
      }
    } catch (err) {
      setError("Failed to connect to server");
    }
  };

  const handleUpdate = async (entry: KnowledgeEntry) => {
    try {
      const response = await fetch("/api/knowledge-base", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      const data = await response.json();

      if (data.success) {
        setSuccessMessage("Updated!");
        setEditingEntry(null);
        fetchEntries();
      } else {
        setError(data.error || "Failed to update");
      }
    } catch (err) {
      setError("Failed to connect to server");
    }
  };

  const handleVerify = async (entry: KnowledgeEntry) => {
    try {
      const response = await fetch("/api/knowledge-base", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entry.id, isVerified: true }),
      });
      const data = await response.json();

      if (data.success) {
        fetchEntries();
      }
    } catch (err) {
      setError("Failed to verify");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry?")) return;

    try {
      const response = await fetch(`/api/knowledge-base?id=${id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        fetchEntries();
      }
    } catch (err) {
      setError("Failed to delete");
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  // Count entries by category
  const entryCounts = entries.reduce((acc, entry) => {
    acc[entry.category] = (acc[entry.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filteredEntries = activeCategory
    ? entries.filter((e) => e.category === activeCategory)
    : entries;

  const unverifiedCount = entries.filter((e) => !e.isVerified).length;

  const containerClass = isModal
    ? `${styles.container} ${styles.modal}`
    : styles.container;

  return (
    <div className={containerClass}>
      {/* Compact Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>Knowledge Base</h2>
          <div className={styles.stats}>
            <span>{entries.length} entries</span>
            {unverifiedCount > 0 && (
              <span className={styles.unverifiedStat}>{unverifiedCount} need review</span>
            )}
          </div>
        </div>
        <div className={styles.headerActions}>
          {profileSuggestions.length > 0 && (
            <button
              className={styles.syncButton}
              onClick={() => setShowSuggestions(!showSuggestions)}
            >
              {profileSuggestions.length} Profile Updates
            </button>
          )}
          <button
            className={styles.enrichButton}
            onClick={handleEnrich}
            disabled={enriching}
            title="Pull data from your company profile"
          >
            {enriching ? "..." : "From Profile"}
          </button>
          <button
            className={styles.addButton}
            onClick={() => {
              setIsAddingNew(true);
              clearMessages();
            }}
          >
            + Add
          </button>
          {isModal && onClose && (
            <button className={styles.closeButton} onClick={onClose}>
              x
            </button>
          )}
        </div>
      </div>

      {/* Profile Sync Suggestions */}
      {showSuggestions && profileSuggestions.length > 0 && (
        <div className={styles.syncPanel}>
          <div className={styles.syncHeader}>
            <strong>Sync to Company Profile</strong>
            <span className={styles.syncInfo}>
              Knowledge found that could update your profile
            </span>
          </div>
          <div className={styles.syncList}>
            {profileSuggestions.map((suggestion, idx) => (
              <div key={idx} className={styles.syncItem}>
                <span className={styles.syncField}>{suggestion.field}</span>
                <span className={styles.syncSource}>{suggestion.source}</span>
              </div>
            ))}
          </div>
          <div className={styles.syncActions}>
            <button
              className={styles.cancelButton}
              onClick={() => setShowSuggestions(false)}
            >
              Dismiss
            </button>
            <button
              className={styles.saveButton}
              onClick={handleSyncToProfile}
              disabled={syncing}
            >
              {syncing ? "Syncing..." : "Apply All Updates"}
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      {(error || successMessage) && (
        <div className={error ? styles.error : styles.success}>
          {error || successMessage}
          <button onClick={clearMessages} className={styles.dismissButton}>
            x
          </button>
        </div>
      )}

      {/* Category Pills */}
      <div className={styles.categoryTabs}>
        <button
          className={`${styles.categoryTab} ${!activeCategory ? styles.active : ""}`}
          onClick={() => setActiveCategory(null)}
        >
          All ({entries.length})
        </button>
        {CATEGORIES.map((cat) => {
          const count = entryCounts[cat.value] || 0;
          if (count === 0 && !activeCategory) return null;
          return (
            <button
              key={cat.value}
              className={`${styles.categoryTab} ${activeCategory === cat.value ? styles.active : ""}`}
              onClick={() => setActiveCategory(cat.value)}
              style={{
                "--cat-color": cat.color,
              } as React.CSSProperties}
            >
              <span className={styles.catIcon}>{cat.icon}</span>
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Add New Form */}
      {isAddingNew && (
        <div className={styles.addForm}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Category</label>
              <select
                value={newEntry.category}
                onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Title</label>
              <input
                type="text"
                value={newEntry.title}
                onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                placeholder="Brief title"
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>Content</label>
            <textarea
              value={newEntry.content}
              onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
              placeholder="Details for AI to use in content..."
              rows={2}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Tags (comma-separated)</label>
            <input
              type="text"
              value={newEntry.tags}
              onChange={(e) => setNewEntry({ ...newEntry, tags: e.target.value })}
              placeholder="tag1, tag2"
            />
          </div>
          <div className={styles.formActions}>
            <button
              className={styles.cancelButton}
              onClick={() => {
                setIsAddingNew(false);
                setNewEntry({ category: "services", title: "", content: "", tags: "" });
              }}
            >
              Cancel
            </button>
            <button className={styles.saveButton} onClick={handleSaveNew}>
              Save
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={styles.content}>
        {loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : entries.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>KB</div>
            <p>No knowledge entries yet</p>
            <p className={styles.emptyHint}>
              Click "From Profile" to import data or "Add" to create entries
            </p>
          </div>
        ) : (
          <div className={styles.entriesList}>
            {filteredEntries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                category={CATEGORIES.find((c) => c.value === entry.category)}
                isEditing={editingEntry?.id === entry.id}
                onEdit={() => setEditingEntry(entry)}
                onSave={handleUpdate}
                onCancel={() => setEditingEntry(null)}
                onVerify={() => handleVerify(entry)}
                onDelete={() => handleDelete(entry.id)}
                editingEntry={editingEntry}
                setEditingEntry={setEditingEntry}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface CategoryInfo {
  value: string;
  label: string;
  icon: string;
  color: string;
}

interface EntryCardProps {
  entry: KnowledgeEntry;
  category?: CategoryInfo;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (entry: KnowledgeEntry) => void;
  onCancel: () => void;
  onVerify: () => void;
  onDelete: () => void;
  editingEntry: KnowledgeEntry | null;
  setEditingEntry: (entry: KnowledgeEntry | null) => void;
}

function EntryCard({
  entry,
  category,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onVerify,
  onDelete,
  editingEntry,
  setEditingEntry,
}: EntryCardProps) {
  if (isEditing && editingEntry) {
    return (
      <div className={`${styles.entryCard} ${styles.editing}`}>
        <div className={styles.formGroup}>
          <label>Title</label>
          <input
            type="text"
            value={editingEntry.title}
            onChange={(e) =>
              setEditingEntry({ ...editingEntry, title: e.target.value })
            }
          />
        </div>
        <div className={styles.formGroup}>
          <label>Content</label>
          <textarea
            value={editingEntry.content}
            onChange={(e) =>
              setEditingEntry({ ...editingEntry, content: e.target.value })
            }
            rows={2}
          />
        </div>
        <div className={styles.entryActions}>
          <button className={styles.cancelButton} onClick={onCancel}>
            Cancel
          </button>
          <button
            className={styles.saveButton}
            onClick={() => onSave(editingEntry)}
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.entryCard} ${!entry.isVerified ? styles.unverified : ""}`}
      style={{
        "--entry-color": category?.color || "#6b7280",
      } as React.CSSProperties}
    >
      <div className={styles.entryHeader}>
        <div className={styles.entryLeft}>
          <span
            className={styles.entryCatBadge}
            style={{ background: category?.color || "#6b7280" }}
          >
            {category?.icon || "?"}
          </span>
          <h4 className={styles.entryTitle}>{entry.title}</h4>
        </div>
        <div className={styles.entryBadges}>
          {entry.isAiGenerated && (
            <span className={styles.aiBadge}>AI</span>
          )}
          {!entry.isVerified && (
            <span className={styles.unverifiedBadge}>Review</span>
          )}
          {entry.usageCount > 0 && (
            <span className={styles.usageBadge}>{entry.usageCount}x</span>
          )}
        </div>
      </div>
      <p className={styles.entryContent}>{entry.content}</p>
      {entry.tags.length > 0 && (
        <div className={styles.entryTags}>
          {entry.tags.slice(0, 4).map((tag, i) => (
            <span key={i} className={styles.tag}>
              {tag}
            </span>
          ))}
          {entry.tags.length > 4 && (
            <span className={styles.tagMore}>+{entry.tags.length - 4}</span>
          )}
        </div>
      )}
      <div className={styles.entryActions}>
        {!entry.isVerified && (
          <button className={styles.verifyButton} onClick={onVerify} title="Mark as verified">
            Verify
          </button>
        )}
        <button className={styles.editButton} onClick={onEdit}>
          Edit
        </button>
        <button className={styles.deleteButton} onClick={onDelete}>
          Del
        </button>
      </div>
    </div>
  );
}
