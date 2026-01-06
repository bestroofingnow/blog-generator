// components/KnowledgeBase.tsx
import { useState, useEffect, useCallback, useRef } from "react";
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

// Quick-add templates for common entries
const QUICK_ADD_TEMPLATES = [
  { category: "services", title: "Service", placeholder: "Describe the service you offer...", icon: "S" },
  { category: "usps", title: "USP", placeholder: "What makes you different from competitors?", icon: "U" },
  { category: "facts", title: "Company Fact", placeholder: "e.g., Founded in 2010, 500+ projects completed...", icon: "F" },
  { category: "faqs", title: "FAQ", placeholder: "Q: [Question]\nA: [Answer]", icon: "Q" },
  { category: "locations", title: "Service Area", placeholder: "City/area you serve with any specific details...", icon: "L" },
  { category: "testimonials", title: "Review", placeholder: "Customer quote or review...", icon: "R" },
];

export default function KnowledgeBase({ onClose, isModal = false }: KnowledgeBaseProps) {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newEntry, setNewEntry] = useState({
    category: "services",
    title: "",
    content: "",
    tags: "",
  });
  const [documentText, setDocumentText] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [profileSuggestions, setProfileSuggestions] = useState<ProfileSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
    } catch {
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
      } else {
        setProfileSuggestions([]);
      }
    } catch {
      // Silent fail
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
        setLastSaved(new Date());
        fetchEntries();
      } else {
        setError(data.error || "Failed to enrich knowledge base");
      }
    } catch {
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
        setLastSaved(new Date());
      } else {
        setError(data.error || "Failed to sync to profile");
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setSyncing(false);
    }
  };

  const handleParseDocument = async () => {
    if (!documentText.trim()) {
      setError("Please enter or paste document content");
      return;
    }

    setParsing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/knowledge-base/parse-and-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: documentText,
          title: documentTitle || "Uploaded Document",
          source: "document_upload",
        }),
      });
      const data = await response.json();

      if (data.success) {
        const messages: string[] = [];
        if (data.entriesCreated > 0) {
          messages.push(`Created ${data.entriesCreated} knowledge entries`);
        }
        if (data.profileFieldsUpdated?.length > 0) {
          messages.push(`Updated profile: ${data.profileFieldsUpdated.join(", ")}`);
        }
        setSuccessMessage(messages.join(". ") || "Document processed successfully!");
        setDocumentText("");
        setDocumentTitle("");
        setShowDocumentUpload(false);
        setLastSaved(new Date());
        fetchEntries();
        checkProfileSync();
      } else {
        setError(data.error || "Failed to parse document");
      }
    } catch {
      setError("Failed to parse document");
    } finally {
      setParsing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocumentTitle(file.name);

    // Read file content
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setDocumentText(content);
    };

    if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
      reader.readAsText(file);
    } else {
      setError("Please upload a text file (.txt or .md)");
    }
  };

  const handleSaveNew = async () => {
    if (!newEntry.title || !newEntry.content) {
      setError("Title and content are required");
      return;
    }

    setIsSaving(true);
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
        setSuccessMessage("Entry saved!");
        setIsAddingNew(false);
        setNewEntry({ category: "services", title: "", content: "", tags: "" });
        setLastSaved(new Date());
        fetchEntries();
      } else {
        setError(data.error || "Failed to add entry");
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (entry: KnowledgeEntry) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/knowledge-base", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      const data = await response.json();

      if (data.success) {
        setSuccessMessage("Saved!");
        setEditingEntry(null);
        setLastSaved(new Date());
        fetchEntries();
      } else {
        setError(data.error || "Failed to update");
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerify = async (entry: KnowledgeEntry) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/knowledge-base", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entry.id, isVerified: true }),
      });
      const data = await response.json();

      if (data.success) {
        setLastSaved(new Date());
        fetchEntries();
      }
    } catch {
      setError("Failed to verify");
    } finally {
      setIsSaving(false);
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
    } catch {
      setError("Failed to delete");
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  // Quick add handler - opens form with template pre-filled
  const handleQuickAdd = (template: typeof QUICK_ADD_TEMPLATES[0]) => {
    setNewEntry({
      category: template.category,
      title: "",
      content: "",
      tags: "",
    });
    setIsAddingNew(true);
    setShowQuickAdd(false);
    clearMessages();
  };

  // Count entries by category
  const entryCounts = entries.reduce((acc, entry) => {
    acc[entry.category] = (acc[entry.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filter entries by category and search query
  const filteredEntries = entries.filter((e) => {
    const matchesCategory = !activeCategory || e.category === activeCategory;
    if (!matchesCategory) return false;

    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return (
      e.title.toLowerCase().includes(query) ||
      e.content.toLowerCase().includes(query) ||
      e.tags.some(tag => tag.toLowerCase().includes(query))
    );
  });

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
          {/* Save Status Indicator */}
          <div className={styles.saveStatus}>
            {isSaving && <span className={styles.savingIndicator}>Saving...</span>}
            {lastSaved && !isSaving && (
              <span className={styles.savedIndicator}>
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
          {profileSuggestions.length > 0 && (
            <button
              className={styles.syncButton}
              onClick={() => setShowSuggestions(!showSuggestions)}
            >
              {profileSuggestions.length} Profile Updates
            </button>
          )}
          <button
            className={styles.uploadButton}
            onClick={() => setShowDocumentUpload(!showDocumentUpload)}
            title="Upload document to auto-fill profile"
          >
            Upload Doc
          </button>
          <button
            className={styles.enrichButton}
            onClick={handleEnrich}
            disabled={enriching}
            title="Pull data from your company profile"
          >
            {enriching ? "..." : "From Profile"}
          </button>
          <div className={styles.quickAddWrapper}>
            <button
              className={styles.quickAddButton}
              onClick={() => setShowQuickAdd(!showQuickAdd)}
              title="Quick add common entries"
            >
              + Quick Add
            </button>
            {showQuickAdd && (
              <div className={styles.quickAddDropdown}>
                {QUICK_ADD_TEMPLATES.map((template) => (
                  <button
                    key={template.category}
                    className={styles.quickAddItem}
                    onClick={() => handleQuickAdd(template)}
                  >
                    <span className={styles.quickAddIcon}>{template.icon}</span>
                    <span>{template.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            className={styles.addButton}
            onClick={() => {
              setIsAddingNew(true);
              clearMessages();
            }}
          >
            + Custom
          </button>
          {isModal && onClose && (
            <button className={styles.closeButton} onClick={onClose}>
              x
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className={styles.searchBar}>
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search entries by title, content, or tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
        {searchQuery && (
          <button
            className={styles.clearSearch}
            onClick={() => setSearchQuery("")}
            title="Clear search"
          >
            x
          </button>
        )}
        <span className={styles.searchResults}>
          {searchQuery && `${filteredEntries.length} result${filteredEntries.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Document Upload Section */}
      {showDocumentUpload && (
        <div className={styles.documentUpload}>
          <div className={styles.uploadHeader}>
            <strong>Add Document</strong>
            <span className={styles.uploadHint}>
              AI will read and extract information to fill your profile and create knowledge entries
            </span>
          </div>
          <div className={styles.uploadForm}>
            <div className={styles.formGroup}>
              <label>Document Title</label>
              <input
                type="text"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                placeholder="e.g., Company Overview, Service Description"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Content (paste text or upload file)</label>
              <textarea
                value={documentText}
                onChange={(e) => setDocumentText(e.target.value)}
                placeholder="Paste your document content here... AI will read it and automatically fill in missing profile information and create knowledge entries."
                rows={6}
              />
            </div>
            <div className={styles.uploadActions}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".txt,.md"
                style={{ display: "none" }}
              />
              <button
                className={styles.secondaryButton}
                onClick={() => fileInputRef.current?.click()}
              >
                Choose File
              </button>
              <button
                className={styles.cancelButton}
                onClick={() => {
                  setShowDocumentUpload(false);
                  setDocumentText("");
                  setDocumentTitle("");
                }}
              >
                Cancel
              </button>
              <button
                className={styles.saveButton}
                onClick={handleParseDocument}
                disabled={parsing || !documentText.trim()}
              >
                {parsing ? "Processing..." : "Parse & Fill Profile"}
              </button>
            </div>
          </div>
        </div>
      )}

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
          <div className={styles.addFormHeader}>
            <span>Add New Entry</span>
            <span className={styles.addFormHint}>
              {QUICK_ADD_TEMPLATES.find(t => t.category === newEntry.category)?.placeholder || "Add details for AI to use..."}
            </span>
          </div>
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
                placeholder={
                  newEntry.category === "services" ? "e.g., Roof Repair" :
                  newEntry.category === "usps" ? "e.g., Licensed & Insured" :
                  newEntry.category === "facts" ? "e.g., Years in Business" :
                  newEntry.category === "faqs" ? "e.g., How long does it take?" :
                  newEntry.category === "locations" ? "e.g., Dallas, TX" :
                  newEntry.category === "testimonials" ? "e.g., John D. - 5 Stars" :
                  "Brief title"
                }
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>Content</label>
            <textarea
              value={newEntry.content}
              onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
              placeholder={
                QUICK_ADD_TEMPLATES.find(t => t.category === newEntry.category)?.placeholder ||
                "Details for AI to use in content..."
              }
              rows={3}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Tags (comma-separated, optional)</label>
            <input
              type="text"
              value={newEntry.tags}
              onChange={(e) => setNewEntry({ ...newEntry, tags: e.target.value })}
              placeholder={
                newEntry.category === "services" ? "residential, commercial, emergency" :
                newEntry.category === "locations" ? "north, metro, suburbs" :
                "tag1, tag2"
              }
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
            <button className={styles.saveButton} onClick={handleSaveNew} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Entry"}
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
              Build your knowledge base to help AI write better content
            </p>
            <div className={styles.emptyActions}>
              <button
                className={styles.emptyActionButton}
                onClick={() => setShowDocumentUpload(true)}
              >
                Upload Doc
              </button>
              <button
                className={styles.emptyActionButton}
                onClick={handleEnrich}
                disabled={enriching}
              >
                {enriching ? "..." : "From Profile"}
              </button>
              <button
                className={styles.emptyActionButtonPrimary}
                onClick={() => setShowQuickAdd(true)}
              >
                + Quick Add
              </button>
            </div>
            <div className={styles.emptyQuickStart}>
              <p className={styles.quickStartTitle}>Quick start - add your first entries:</p>
              <div className={styles.quickStartGrid}>
                {QUICK_ADD_TEMPLATES.slice(0, 4).map((template) => (
                  <button
                    key={template.category}
                    className={styles.quickStartItem}
                    onClick={() => handleQuickAdd(template)}
                  >
                    <span className={styles.quickStartIcon}>{template.icon}</span>
                    <span className={styles.quickStartLabel}>{template.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : filteredEntries.length === 0 && searchQuery ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>?</div>
            <p>No entries match &quot;{searchQuery}&quot;</p>
            <p className={styles.emptyHint}>
              Try a different search term or clear the search
            </p>
            <button
              className={styles.emptyActionButton}
              onClick={() => setSearchQuery("")}
            >
              Clear Search
            </button>
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
                isSaving={isSaving}
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
  isSaving?: boolean;
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
  isSaving,
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
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
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
