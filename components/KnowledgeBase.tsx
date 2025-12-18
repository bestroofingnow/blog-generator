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

const CATEGORIES = [
  { value: "services", label: "Services", icon: "🔧" },
  { value: "usps", label: "Unique Selling Points", icon: "⭐" },
  { value: "facts", label: "Company Facts", icon: "📋" },
  { value: "locations", label: "Service Areas", icon: "📍" },
  { value: "certifications", label: "Certifications", icon: "🏆" },
  { value: "team", label: "Team & Expertise", icon: "👥" },
  { value: "faqs", label: "FAQs", icon: "❓" },
  { value: "testimonials", label: "Testimonials", icon: "💬" },
  { value: "custom", label: "Custom", icon: "📝" },
];

interface KnowledgeBaseProps {
  onClose?: () => void;
  isModal?: boolean;
}

export default function KnowledgeBase({ onClose, isModal = false }: KnowledgeBaseProps) {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
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

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

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
        setSuccessMessage("Entry added successfully!");
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
        setSuccessMessage("Entry updated!");
        setEditingEntry(null);
        fetchEntries();
      } else {
        setError(data.error || "Failed to update entry");
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
        setSuccessMessage("Entry verified!");
        fetchEntries();
      } else {
        setError(data.error || "Failed to verify entry");
      }
    } catch (err) {
      setError("Failed to connect to server");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;

    try {
      const response = await fetch(`/api/knowledge-base?id=${id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        setSuccessMessage("Entry deleted!");
        fetchEntries();
      } else {
        setError(data.error || "Failed to delete entry");
      }
    } catch (err) {
      setError("Failed to connect to server");
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const groupedEntries = entries.reduce((acc, entry) => {
    if (!acc[entry.category]) acc[entry.category] = [];
    acc[entry.category].push(entry);
    return acc;
  }, {} as Record<string, KnowledgeEntry[]>);

  const containerClass = isModal
    ? `${styles.container} ${styles.modal}`
    : styles.container;

  return (
    <div className={containerClass}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>Knowledge Base</h2>
          <p className={styles.subtitle}>
            Your company facts that help the AI create better content
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.enrichButton}
            onClick={handleEnrich}
            disabled={enriching}
          >
            {enriching ? "Analyzing..." : "Auto-Enrich from Profile"}
          </button>
          <button
            className={styles.addButton}
            onClick={() => {
              setIsAddingNew(true);
              clearMessages();
            }}
          >
            + Add Entry
          </button>
          {isModal && onClose && (
            <button className={styles.closeButton} onClick={onClose}>
              ×
            </button>
          )}
        </div>
      </div>

      {(error || successMessage) && (
        <div className={error ? styles.error : styles.success}>
          {error || successMessage}
          <button onClick={clearMessages} className={styles.dismissButton}>
            ×
          </button>
        </div>
      )}

      <div className={styles.categoryTabs}>
        <button
          className={`${styles.categoryTab} ${!activeCategory ? styles.active : ""}`}
          onClick={() => setActiveCategory(null)}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            className={`${styles.categoryTab} ${activeCategory === cat.value ? styles.active : ""}`}
            onClick={() => setActiveCategory(cat.value)}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {isAddingNew && (
        <div className={styles.addForm}>
          <h3>Add New Entry</h3>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Category</label>
              <select
                value={newEntry.category}
                onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
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
                placeholder="e.g., 24/7 Emergency Service"
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>Content</label>
            <textarea
              value={newEntry.content}
              onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
              placeholder="Detailed description that can be used in blog posts..."
              rows={3}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Tags (comma-separated)</label>
            <input
              type="text"
              value={newEntry.tags}
              onChange={(e) => setNewEntry({ ...newEntry, tags: e.target.value })}
              placeholder="e.g., emergency, 24/7, service"
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
              Save Entry
            </button>
          </div>
        </div>
      )}

      <div className={styles.content}>
        {loading ? (
          <div className={styles.loading}>Loading knowledge base...</div>
        ) : entries.length === 0 ? (
          <div className={styles.empty}>
            <p>No entries yet. Add your first entry or auto-enrich from your company profile!</p>
          </div>
        ) : activeCategory ? (
          <div className={styles.entriesList}>
            {entries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
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
        ) : (
          Object.entries(groupedEntries).map(([category, categoryEntries]) => {
            const categoryInfo = CATEGORIES.find((c) => c.value === category);
            return (
              <div key={category} className={styles.categorySection}>
                <h3 className={styles.categoryHeader}>
                  {categoryInfo?.icon} {categoryInfo?.label || category}
                  <span className={styles.count}>{categoryEntries.length}</span>
                </h3>
                <div className={styles.entriesList}>
                  {categoryEntries.map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
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
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

interface EntryCardProps {
  entry: KnowledgeEntry;
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
            rows={3}
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
    <div className={styles.entryCard}>
      <div className={styles.entryHeader}>
        <h4 className={styles.entryTitle}>{entry.title}</h4>
        <div className={styles.entryBadges}>
          {entry.isAiGenerated && (
            <span className={styles.aiBadge}>AI Generated</span>
          )}
          {!entry.isVerified && (
            <span className={styles.unverifiedBadge}>Needs Review</span>
          )}
          {entry.usageCount > 0 && (
            <span className={styles.usageBadge}>Used {entry.usageCount}x</span>
          )}
        </div>
      </div>
      <p className={styles.entryContent}>{entry.content}</p>
      {entry.tags.length > 0 && (
        <div className={styles.entryTags}>
          {entry.tags.map((tag, i) => (
            <span key={i} className={styles.tag}>
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className={styles.entryActions}>
        {!entry.isVerified && (
          <button className={styles.verifyButton} onClick={onVerify}>
            Verify
          </button>
        )}
        <button className={styles.editButton} onClick={onEdit}>
          Edit
        </button>
        <button className={styles.deleteButton} onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}
