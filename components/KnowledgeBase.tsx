// components/KnowledgeBase.tsx
import { useState, useEffect, useCallback, useRef, DragEvent } from "react";
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
  { value: "services", label: "Services", icon: "🛠️", color: "#3b82f6" },
  { value: "usps", label: "USPs", icon: "⭐", color: "#8b5cf6" },
  { value: "facts", label: "Facts", icon: "📊", color: "#06b6d4" },
  { value: "locations", label: "Areas", icon: "📍", color: "#10b981" },
  { value: "certifications", label: "Certs", icon: "🏆", color: "#f59e0b" },
  { value: "team", label: "Team", icon: "👥", color: "#ec4899" },
  { value: "faqs", label: "FAQs", icon: "❓", color: "#6366f1" },
  { value: "testimonials", label: "Reviews", icon: "💬", color: "#14b8a6" },
  { value: "custom", label: "Other", icon: "📝", color: "#6b7280" },
];

interface KnowledgeBaseProps {
  onClose?: () => void;
  isModal?: boolean;
}

// Quick-add templates for common entries
const QUICK_ADD_TEMPLATES = [
  { category: "services", title: "Service", placeholder: "Describe the service you offer...", icon: "🛠️" },
  { category: "usps", title: "Unique Selling Point", placeholder: "What makes you different from competitors?", icon: "⭐" },
  { category: "facts", title: "Company Fact", placeholder: "e.g., Founded in 2010, 500+ projects completed...", icon: "📊" },
  { category: "faqs", title: "FAQ", placeholder: "Q: [Question]\nA: [Answer]", icon: "❓" },
  { category: "locations", title: "Service Area", placeholder: "City/area you serve with any specific details...", icon: "📍" },
  { category: "testimonials", title: "Customer Review", placeholder: "Customer quote or review...", icon: "💬" },
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
  const [viewMode, setViewMode] = useState<"compact" | "expanded">("expanded");
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
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
  const dropZoneRef = useRef<HTMLDivElement>(null);

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

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape" && searchQuery) {
        setSearchQuery("");
        searchInputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchQuery]);

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
    processFile(file);
  };

  const processFile = (file: File) => {
    setDocumentTitle(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setDocumentText(content);
      setShowDocumentUpload(true);
    };

    if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
      reader.readAsText(file);
    } else {
      setError("Please upload a text file (.txt or .md)");
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === dropZoneRef.current) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
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
        setSuccessMessage("Entry saved successfully!");
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
        setSuccessMessage("Changes saved!");
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
        setSuccessMessage("Entry verified!");
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
    if (!confirm("Are you sure you want to delete this entry?")) return;

    try {
      const response = await fetch(`/api/knowledge-base?id=${id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        setSuccessMessage("Entry deleted");
        fetchEntries();
      }
    } catch {
      setError("Failed to delete");
    }
  };

  const toggleEntryExpanded = (id: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  // Auto-dismiss success messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Quick add handler
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
  const verifiedCount = entries.filter((e) => e.isVerified).length;

  const containerClass = isModal
    ? `${styles.container} ${styles.modal}`
    : styles.container;

  return (
    <div
      className={containerClass}
      ref={dropZoneRef}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      {isDragging && (
        <div className={styles.dragOverlay}>
          <div className={styles.dragContent}>
            <span className={styles.dragIcon}>📄</span>
            <span className={styles.dragText}>Drop file to upload</span>
            <span className={styles.dragHint}>Supported: .txt, .md files</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.titleSection}>
            <h2 className={styles.title}>
              <span className={styles.titleIcon}>📚</span>
              Knowledge Base
            </h2>
            <div className={styles.statsRow}>
              <span className={styles.statItem}>
                <span className={styles.statNumber}>{entries.length}</span> entries
              </span>
              {verifiedCount > 0 && (
                <span className={styles.statItem}>
                  <span className={styles.statIcon}>✓</span>
                  <span className={styles.statNumber}>{verifiedCount}</span> verified
                </span>
              )}
              {unverifiedCount > 0 && (
                <span className={`${styles.statItem} ${styles.statWarning}`}>
                  <span className={styles.statNumber}>{unverifiedCount}</span> need review
                </span>
              )}
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          {/* Save Status */}
          {(isSaving || lastSaved) && (
            <div className={styles.saveStatus}>
              {isSaving ? (
                <span className={styles.savingIndicator}>
                  <span className={styles.savingSpinner}></span>
                  Saving...
                </span>
              ) : lastSaved && (
                <span className={styles.savedIndicator}>
                  ✓ Saved
                </span>
              )}
            </div>
          )}

          {/* View Mode Toggle */}
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewToggleBtn} ${viewMode === "compact" ? styles.active : ""}`}
              onClick={() => setViewMode("compact")}
              title="Compact view"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="2" width="14" height="2" rx="0.5"/>
                <rect x="1" y="7" width="14" height="2" rx="0.5"/>
                <rect x="1" y="12" width="14" height="2" rx="0.5"/>
              </svg>
            </button>
            <button
              className={`${styles.viewToggleBtn} ${viewMode === "expanded" ? styles.active : ""}`}
              onClick={() => setViewMode("expanded")}
              title="Expanded view"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="1" width="6" height="6" rx="1"/>
                <rect x="9" y="1" width="6" height="6" rx="1"/>
                <rect x="1" y="9" width="6" height="6" rx="1"/>
                <rect x="9" y="9" width="6" height="6" rx="1"/>
              </svg>
            </button>
          </div>

          {/* Profile Sync Button */}
          {profileSuggestions.length > 0 && (
            <button
              className={styles.syncButton}
              onClick={() => setShowSuggestions(!showSuggestions)}
            >
              <span className={styles.syncBadge}>{profileSuggestions.length}</span>
              Sync to Profile
            </button>
          )}

          {/* Action Buttons Group */}
          <div className={styles.actionGroup}>
            <button
              className={styles.actionBtn}
              onClick={() => setShowDocumentUpload(!showDocumentUpload)}
              title="Upload a document to extract knowledge"
            >
              <span className={styles.actionIcon}>📤</span>
              <span className={styles.actionLabel}>Upload</span>
            </button>
            <button
              className={styles.actionBtn}
              onClick={handleEnrich}
              disabled={enriching}
              title="Import knowledge from your company profile"
            >
              <span className={styles.actionIcon}>{enriching ? "⏳" : "📥"}</span>
              <span className={styles.actionLabel}>{enriching ? "Importing..." : "Import"}</span>
            </button>
          </div>

          {/* Add Button Group */}
          <div className={styles.addGroup}>
            <div className={styles.quickAddWrapper}>
              <button
                className={styles.quickAddToggle}
                onClick={() => setShowQuickAdd(!showQuickAdd)}
              >
                <span className={styles.addIcon}>+</span>
                <span>Add Entry</span>
                <span className={styles.dropdownArrow}>▾</span>
              </button>
              {showQuickAdd && (
                <div className={styles.quickAddDropdown}>
                  <div className={styles.dropdownHeader}>Quick Add</div>
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
                  <div className={styles.dropdownDivider}></div>
                  <button
                    className={styles.quickAddItem}
                    onClick={() => {
                      setIsAddingNew(true);
                      setShowQuickAdd(false);
                      clearMessages();
                    }}
                  >
                    <span className={styles.quickAddIcon}>✏️</span>
                    <span>Custom Entry</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {isModal && onClose && (
            <button className={styles.closeButton} onClick={onClose} title="Close">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className={styles.searchBar}>
        <div className={styles.searchInputWrapper}>
          <span className={styles.searchIcon}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 001.415-1.414l-3.85-3.85a1.007 1.007 0 00-.115-.1zM12 6.5a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z"/>
            </svg>
          </span>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          {searchQuery ? (
            <button
              className={styles.clearSearch}
              onClick={() => setSearchQuery("")}
              title="Clear search"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <path d="M4.293 4.293a1 1 0 011.414 0L7 5.586l1.293-1.293a1 1 0 111.414 1.414L8.414 7l1.293 1.293a1 1 0 01-1.414 1.414L7 8.414l-1.293 1.293a1 1 0 01-1.414-1.414L5.586 7 4.293 5.707a1 1 0 010-1.414z"/>
              </svg>
            </button>
          ) : (
            <span className={styles.searchHint}>⌘K</span>
          )}
        </div>
        {searchQuery && (
          <span className={styles.searchResults}>
            {filteredEntries.length} {filteredEntries.length === 1 ? "result" : "results"}
          </span>
        )}
      </div>

      {/* Document Upload Section */}
      {showDocumentUpload && (
        <div className={styles.documentUpload}>
          <div className={styles.uploadHeader}>
            <div className={styles.uploadTitle}>
              <span className={styles.uploadTitleIcon}>📄</span>
              <strong>Add Document</strong>
            </div>
            <button
              className={styles.uploadClose}
              onClick={() => {
                setShowDocumentUpload(false);
                setDocumentText("");
                setDocumentTitle("");
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4.293 4.293a1 1 0 011.414 0L8 6.586l2.293-2.293a1 1 0 111.414 1.414L9.414 8l2.293 2.293a1 1 0 01-1.414 1.414L8 9.414l-2.293 2.293a1 1 0 01-1.414-1.414L6.586 8 4.293 5.707a1 1 0 010-1.414z"/>
              </svg>
            </button>
          </div>
          <p className={styles.uploadHint}>
            AI will analyze your document and extract relevant information to enrich your knowledge base.
          </p>
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
              <label>Content</label>
              <textarea
                value={documentText}
                onChange={(e) => setDocumentText(e.target.value)}
                placeholder="Paste your document content here, or drag and drop a file onto this page..."
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
                <span>📁</span> Choose File
              </button>
              <div className={styles.uploadActionsRight}>
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
                  {parsing ? (
                    <>
                      <span className={styles.buttonSpinner}></span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <span>✨</span> Extract Knowledge
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Sync Suggestions */}
      {showSuggestions && profileSuggestions.length > 0 && (
        <div className={styles.syncPanel}>
          <div className={styles.syncHeader}>
            <div className={styles.syncTitle}>
              <span className={styles.syncTitleIcon}>🔄</span>
              <strong>Sync to Company Profile</strong>
            </div>
            <span className={styles.syncInfo}>
              {profileSuggestions.length} updates available
            </span>
          </div>
          <div className={styles.syncList}>
            {profileSuggestions.map((suggestion, idx) => (
              <div key={idx} className={styles.syncItem}>
                <span className={styles.syncField}>{suggestion.field}</span>
                <span className={styles.syncArrow}>→</span>
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
              {syncing ? (
                <>
                  <span className={styles.buttonSpinner}></span>
                  Syncing...
                </>
              ) : (
                <>Apply All Updates</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className={styles.error}>
          <span className={styles.messageIcon}>⚠️</span>
          <span className={styles.messageText}>{error}</span>
          <button onClick={clearMessages} className={styles.dismissButton}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M4.293 4.293a1 1 0 011.414 0L7 5.586l1.293-1.293a1 1 0 111.414 1.414L8.414 7l1.293 1.293a1 1 0 01-1.414 1.414L7 8.414l-1.293 1.293a1 1 0 01-1.414-1.414L5.586 7 4.293 5.707a1 1 0 010-1.414z"/>
            </svg>
          </button>
        </div>
      )}
      {successMessage && (
        <div className={styles.success}>
          <span className={styles.messageIcon}>✓</span>
          <span className={styles.messageText}>{successMessage}</span>
          <button onClick={clearMessages} className={styles.dismissButton}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M4.293 4.293a1 1 0 011.414 0L7 5.586l1.293-1.293a1 1 0 111.414 1.414L8.414 7l1.293 1.293a1 1 0 01-1.414 1.414L7 8.414l-1.293 1.293a1 1 0 01-1.414-1.414L5.586 7 4.293 5.707a1 1 0 010-1.414z"/>
            </svg>
          </button>
        </div>
      )}

      {/* Category Pills */}
      <div className={styles.categoryTabs}>
        <button
          className={`${styles.categoryTab} ${!activeCategory ? styles.active : ""}`}
          onClick={() => setActiveCategory(null)}
        >
          <span className={styles.catIcon}>📋</span>
          All
          <span className={styles.catCount}>{entries.length}</span>
        </button>
        {CATEGORIES.map((cat) => {
          const count = entryCounts[cat.value] || 0;
          return (
            <button
              key={cat.value}
              className={`${styles.categoryTab} ${activeCategory === cat.value ? styles.active : ""} ${count === 0 ? styles.empty : ""}`}
              onClick={() => setActiveCategory(cat.value)}
              style={{
                "--cat-color": cat.color,
              } as React.CSSProperties}
            >
              <span className={styles.catIcon}>{cat.icon}</span>
              {cat.label}
              <span className={styles.catCount}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Add New Form */}
      {isAddingNew && (
        <div className={styles.addForm}>
          <div className={styles.addFormHeader}>
            <div className={styles.addFormTitle}>
              <span>{CATEGORIES.find(c => c.value === newEntry.category)?.icon || "📝"}</span>
              <span>Add New {CATEGORIES.find(c => c.value === newEntry.category)?.label || "Entry"}</span>
            </div>
            <button
              className={styles.formCloseBtn}
              onClick={() => {
                setIsAddingNew(false);
                setNewEntry({ category: "services", title: "", content: "", tags: "" });
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4.293 4.293a1 1 0 011.414 0L8 6.586l2.293-2.293a1 1 0 111.414 1.414L9.414 8l2.293 2.293a1 1 0 01-1.414 1.414L8 9.414l-2.293 2.293a1 1 0 01-1.414-1.414L6.586 8 4.293 5.707a1 1 0 010-1.414z"/>
              </svg>
            </button>
          </div>
          <div className={styles.addFormHint}>
            {QUICK_ADD_TEMPLATES.find(t => t.category === newEntry.category)?.placeholder || "Add details that AI can use when generating content..."}
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
                placeholder={
                  newEntry.category === "services" ? "e.g., Roof Repair, Commercial Plumbing" :
                  newEntry.category === "usps" ? "e.g., Licensed & Insured, 24/7 Availability" :
                  newEntry.category === "facts" ? "e.g., Years in Business, Projects Completed" :
                  newEntry.category === "faqs" ? "e.g., What is your turnaround time?" :
                  newEntry.category === "locations" ? "e.g., Dallas, TX" :
                  newEntry.category === "testimonials" ? "e.g., John D. - 5 Stars" :
                  "Brief, descriptive title"
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
                "Provide details that AI can reference when creating content..."
              }
              rows={4}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Tags <span className={styles.labelHint}>(optional, comma-separated)</span></label>
            <input
              type="text"
              value={newEntry.tags}
              onChange={(e) => setNewEntry({ ...newEntry, tags: e.target.value })}
              placeholder={
                newEntry.category === "services" ? "e.g., residential, commercial, emergency" :
                newEntry.category === "locations" ? "e.g., north, metro, suburbs" :
                "Add tags to help organize entries"
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
            <button
              className={styles.saveButton}
              onClick={handleSaveNew}
              disabled={isSaving || !newEntry.title || !newEntry.content}
            >
              {isSaving ? (
                <>
                  <span className={styles.buttonSpinner}></span>
                  Saving...
                </>
              ) : (
                <>Save Entry</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={styles.content}>
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.loadingSpinner}></div>
            <span>Loading knowledge base...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📚</div>
            <h3 className={styles.emptyTitle}>Your knowledge base is empty</h3>
            <p className={styles.emptyHint}>
              Add information about your business to help AI generate more accurate and personalized content.
            </p>
            <div className={styles.emptyActions}>
              <button
                className={styles.emptyActionButton}
                onClick={() => setShowDocumentUpload(true)}
              >
                <span>📤</span> Upload Document
              </button>
              <button
                className={styles.emptyActionButton}
                onClick={handleEnrich}
                disabled={enriching}
              >
                <span>{enriching ? "⏳" : "📥"}</span> {enriching ? "Importing..." : "Import from Profile"}
              </button>
            </div>
            <div className={styles.emptyDivider}>
              <span>or start with a template</span>
            </div>
            <div className={styles.emptyQuickStart}>
              <div className={styles.quickStartGrid}>
                {QUICK_ADD_TEMPLATES.map((template) => (
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
            <div className={styles.emptyIcon}>🔍</div>
            <h3 className={styles.emptyTitle}>No results found</h3>
            <p className={styles.emptyHint}>
              No entries match &quot;{searchQuery}&quot;
            </p>
            <button
              className={styles.emptyActionButton}
              onClick={() => setSearchQuery("")}
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className={`${styles.entriesList} ${viewMode === "compact" ? styles.compact : ""}`}>
            {filteredEntries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                category={CATEGORIES.find((c) => c.value === entry.category)}
                isEditing={editingEntry?.id === entry.id}
                isExpanded={expandedEntries.has(entry.id)}
                viewMode={viewMode}
                onEdit={() => setEditingEntry(entry)}
                onSave={handleUpdate}
                onCancel={() => setEditingEntry(null)}
                onVerify={() => handleVerify(entry)}
                onDelete={() => handleDelete(entry.id)}
                onToggleExpand={() => toggleEntryExpanded(entry.id)}
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
  isExpanded: boolean;
  viewMode: "compact" | "expanded";
  onEdit: () => void;
  onSave: (entry: KnowledgeEntry) => void;
  onCancel: () => void;
  onVerify: () => void;
  onDelete: () => void;
  onToggleExpand: () => void;
  editingEntry: KnowledgeEntry | null;
  setEditingEntry: (entry: KnowledgeEntry | null) => void;
  isSaving?: boolean;
}

function EntryCard({
  entry,
  category,
  isEditing,
  isExpanded,
  viewMode,
  onEdit,
  onSave,
  onCancel,
  onVerify,
  onDelete,
  onToggleExpand,
  editingEntry,
  setEditingEntry,
  isSaving,
}: EntryCardProps) {
  const contentRef = useRef<HTMLParagraphElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    if (contentRef.current) {
      setIsOverflowing(contentRef.current.scrollHeight > contentRef.current.clientHeight);
    }
  }, [entry.content, viewMode]);

  if (isEditing && editingEntry) {
    return (
      <div className={`${styles.entryCard} ${styles.editing}`}>
        <div className={styles.editFormHeader}>
          <span>{category?.icon || "📝"} Editing: {editingEntry.title}</span>
        </div>
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
            rows={4}
          />
        </div>
        <div className={styles.formGroup}>
          <label>Tags</label>
          <input
            type="text"
            value={editingEntry.tags.join(", ")}
            onChange={(e) =>
              setEditingEntry({
                ...editingEntry,
                tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean)
              })
            }
            placeholder="Comma-separated tags"
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
            {isSaving ? (
              <>
                <span className={styles.buttonSpinner}></span>
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.entryCard} ${!entry.isVerified ? styles.unverified : ""} ${viewMode === "compact" ? styles.compactCard : ""}`}
      style={{
        "--entry-color": category?.color || "#6b7280",
      } as React.CSSProperties}
    >
      <div className={styles.entryHeader}>
        <div className={styles.entryLeft}>
          <span
            className={styles.entryCatBadge}
            style={{ background: category?.color || "#6b7280" }}
            title={category?.label}
          >
            {category?.icon || "📝"}
          </span>
          <h4 className={styles.entryTitle}>{entry.title}</h4>
        </div>
        <div className={styles.entryBadges}>
          {entry.isVerified && (
            <span className={styles.verifiedBadge} title="Verified">
              ✓
            </span>
          )}
          {entry.isAiGenerated && (
            <span className={styles.aiBadge} title="AI Generated">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              AI
            </span>
          )}
          {!entry.isVerified && (
            <span className={styles.reviewBadge} title="Needs Review">
              Review
            </span>
          )}
          {entry.usageCount > 0 && (
            <span className={styles.usageBadge} title={`Used ${entry.usageCount} times`}>
              {entry.usageCount}×
            </span>
          )}
        </div>
      </div>

      <p
        ref={contentRef}
        className={`${styles.entryContent} ${isExpanded ? styles.expanded : ""}`}
      >
        {entry.content}
      </p>

      {isOverflowing && viewMode === "expanded" && (
        <button className={styles.expandButton} onClick={onToggleExpand}>
          {isExpanded ? "Show less" : "Show more"}
        </button>
      )}

      {entry.tags.length > 0 && viewMode === "expanded" && (
        <div className={styles.entryTags}>
          {entry.tags.slice(0, 5).map((tag, i) => (
            <span key={i} className={styles.tag}>
              {tag}
            </span>
          ))}
          {entry.tags.length > 5 && (
            <span className={styles.tagMore}>+{entry.tags.length - 5}</span>
          )}
        </div>
      )}

      <div className={styles.entryActions}>
        {!entry.isVerified && (
          <button
            className={styles.verifyButton}
            onClick={onVerify}
            title="Mark as verified"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.854 3.646a.5.5 0 010 .708l-7 7a.5.5 0 01-.708 0l-3.5-3.5a.5.5 0 11.708-.708L6.5 10.293l6.646-6.647a.5.5 0 01.708 0z"/>
            </svg>
            Verify
          </button>
        )}
        <button className={styles.editButton} onClick={onEdit} title="Edit entry">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M12.854.146a.5.5 0 00-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 000-.708l-3-3zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 01.5.5v.5h.5a.5.5 0 01.5.5v.5h.5a.5.5 0 01.5.5v.5h.5a.5.5 0 01.5.5v.207l6.5-6.5zm-7.468 7.468A.5.5 0 016 13.5V13h-.5a.5.5 0 01-.5-.5V12h-.5a.5.5 0 01-.5-.5V11h-.5a.5.5 0 01-.5-.5V10h-.5a.499.499 0 01-.175-.032l-.179.178a.5.5 0 00-.11.168l-2 5a.5.5 0 00.65.65l5-2a.5.5 0 00.168-.11l.178-.178z"/>
          </svg>
          Edit
        </button>
        <button className={styles.deleteButton} onClick={onDelete} title="Delete entry">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z"/>
            <path fillRule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 01-1-1V2a1 1 0 011-1H6a1 1 0 011-1h2a1 1 0 011 1h3.5a1 1 0 011 1v1zM4.118 4L4 4.059V13a1 1 0 001 1h6a1 1 0 001-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
          </svg>
          Delete
        </button>
      </div>
    </div>
  );
}
