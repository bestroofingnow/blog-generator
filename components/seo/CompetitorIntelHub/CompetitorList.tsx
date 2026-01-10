// components/seo/CompetitorIntelHub/CompetitorList.tsx
// List and manage competitors with add functionality

import React, { useState } from "react";
import styles from "./CompetitorIntelHub.module.css";
import { Competitor, Scan } from "./index";

interface CompetitorListProps {
  competitors: Competitor[];
  onAdd: (competitor: Partial<Competitor>) => void;
  onSelect: (competitor: Competitor) => void;
  onDelete: (id: string) => void;
  onRunScan: (competitorId: string, scanType?: string) => void;
  loading: boolean;
  activeScan: Scan | null;
}

export function CompetitorList({
  competitors,
  onAdd,
  onSelect,
  onDelete,
  onRunScan,
  loading,
  activeScan,
}: CompetitorListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    domain: "",
    description: "",
    industry: "",
    competitorType: "direct",
    priority: 1,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.domain.trim()) return;

    onAdd({
      name: formData.name.trim(),
      domain: formData.domain.trim().replace(/^https?:\/\//, "").replace(/\/$/, ""),
      description: formData.description.trim() || undefined,
      industry: formData.industry.trim() || undefined,
      competitorType: formData.competitorType,
      priority: formData.priority,
      isActive: true,
    });

    setFormData({
      name: "",
      domain: "",
      description: "",
      industry: "",
      competitorType: "direct",
      priority: 1,
    });
    setShowAddForm(false);
  };

  const getPriorityLabel = (priority: number) => {
    if (priority <= 1) return "High";
    if (priority <= 2) return "Medium";
    return "Low";
  };

  const getPriorityClass = (priority: number) => {
    if (priority <= 1) return styles.priorityHigh;
    if (priority <= 2) return styles.priorityMedium;
    return styles.priorityLow;
  };

  return (
    <div className={styles.competitorList}>
      <div className={styles.listHeader}>
        <h3>Tracked Competitors</h3>
        <div className={styles.listActions}>
          {competitors.length > 0 && (
            <button
              className={styles.scanAllButton}
              onClick={() => competitors.forEach((c) => onRunScan(c.id))}
              disabled={loading || activeScan !== null}
            >
              {activeScan ? "Scanning..." : "Scan All"}
            </button>
          )}
          <button
            className={styles.addButton}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? "Cancel" : "+ Add Competitor"}
          </button>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className={styles.addForm}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Competitor Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Acme Corp"
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Domain *</label>
              <input
                type="text"
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                placeholder="e.g., acmecorp.com"
                required
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Industry</label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                placeholder="e.g., SaaS, E-commerce"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Competitor Type</label>
              <select
                value={formData.competitorType}
                onChange={(e) => setFormData({ ...formData, competitorType: e.target.value })}
              >
                <option value="direct">Direct Competitor</option>
                <option value="indirect">Indirect Competitor</option>
                <option value="aspirational">Aspirational</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
              >
                <option value={1}>High</option>
                <option value={2}>Medium</option>
                <option value={3}>Low</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this competitor..."
              rows={2}
            />
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={styles.submitButton} disabled={loading}>
              Add Competitor
            </button>
          </div>
        </form>
      )}

      {competitors.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🎯</div>
          <h4>No competitors tracked yet</h4>
          <p>Add your first competitor to start monitoring their content, social presence, and reviews.</p>
        </div>
      ) : (
        <div className={styles.competitorTable}>
          <div className={styles.tableHeader}>
            <div className={styles.colName}>Competitor</div>
            <div className={styles.colType}>Type</div>
            <div className={styles.colPriority}>Priority</div>
            <div className={styles.colStatus}>Status</div>
            <div className={styles.colActions}>Actions</div>
          </div>
          {competitors.map((competitor) => (
            <div
              key={competitor.id}
              className={`${styles.tableRow} ${!competitor.isActive ? styles.inactive : ""}`}
            >
              <div className={styles.colName}>
                <button
                  className={styles.competitorName}
                  onClick={() => onSelect(competitor)}
                >
                  {competitor.name}
                </button>
                <span className={styles.competitorDomain}>{competitor.domain}</span>
              </div>
              <div className={styles.colType}>
                <span className={styles.typeTag}>
                  {competitor.competitorType || "direct"}
                </span>
              </div>
              <div className={styles.colPriority}>
                <span className={`${styles.priorityTag} ${getPriorityClass(competitor.priority)}`}>
                  {getPriorityLabel(competitor.priority)}
                </span>
              </div>
              <div className={styles.colStatus}>
                <span className={`${styles.statusDot} ${competitor.isActive ? styles.active : styles.inactive}`} />
                {competitor.isActive ? "Active" : "Inactive"}
              </div>
              <div className={styles.colActions}>
                <button
                  className={styles.actionButton}
                  onClick={() => onRunScan(competitor.id)}
                  disabled={loading || activeScan !== null}
                  title="Run scan"
                >
                  🔍
                </button>
                <button
                  className={styles.actionButton}
                  onClick={() => onSelect(competitor)}
                  title="View details"
                >
                  👁️
                </button>
                <button
                  className={`${styles.actionButton} ${styles.deleteButton}`}
                  onClick={() => onDelete(competitor.id)}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
