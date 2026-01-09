// components/seo/GeoGridRankTracker/GeoGridConfig.tsx
// Configuration panel for grid settings, keywords, and target domain

import React, { useState } from "react";
import styles from "./GeoGridRankTracker.module.css";
import type { GridConfiguration, Keyword, Scan } from "./index";

interface GeoGridConfigProps {
  configs: GridConfiguration[];
  selectedConfig: GridConfiguration | null;
  keywords: Keyword[];
  onSelectConfig: (config: GridConfiguration) => void;
  onCreateConfig: (config: Partial<GridConfiguration>) => void;
  onUpdateConfig: (configId: string, updates: Partial<GridConfiguration>) => void;
  onDeleteConfig: (configId: string) => void;
  onAddKeyword: (keyword: string) => void;
  onDeleteKeyword: (keywordId: string) => void;
  onStartScan: () => void;
  loading: boolean;
  activeScan: Scan | null;
}

const GRID_SIZES = [
  { value: 3, label: "3×3 (9 points)" },
  { value: 5, label: "5×5 (25 points)" },
  { value: 7, label: "7×7 (49 points)" }
];

const RADIUS_OPTIONS = [
  { value: 1, label: "1 mile" },
  { value: 3, label: "3 miles" },
  { value: 5, label: "5 miles" },
  { value: 10, label: "10 miles" },
  { value: 15, label: "15 miles" },
  { value: 25, label: "25 miles" }
];

export function GeoGridConfig({
  configs,
  selectedConfig,
  keywords,
  onSelectConfig,
  onCreateConfig,
  onUpdateConfig,
  onDeleteConfig,
  onAddKeyword,
  onDeleteKeyword,
  onStartScan,
  loading,
  activeScan
}: GeoGridConfigProps) {
  const [showNewForm, setShowNewForm] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    centerLat: "",
    centerLng: "",
    centerCity: "",
    centerState: "",
    gridSize: 5 as 3 | 5 | 7,
    radiusMiles: 10,
    targetDomain: ""
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.centerLat || !formData.centerLng || !formData.targetDomain) {
      return;
    }
    onCreateConfig({
      ...formData,
      centerLat: parseFloat(formData.centerLat),
      centerLng: parseFloat(formData.centerLng)
    });
    setShowNewForm(false);
    setFormData({
      name: "",
      centerLat: "",
      centerLng: "",
      centerCity: "",
      centerState: "",
      gridSize: 5,
      radiusMiles: 10,
      targetDomain: ""
    });
  };

  const handleAddKeywordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;
    onAddKeyword(newKeyword.trim());
    setNewKeyword("");
  };

  const activeKeywords = keywords.filter(k => k.isActive);
  const totalPoints = selectedConfig ? selectedConfig.gridSize * selectedConfig.gridSize : 0;
  const totalQueries = totalPoints * activeKeywords.length;

  return (
    <div className={styles.configPanel}>
      {/* Configuration Selector */}
      <div className={styles.configSection}>
        <div className={styles.sectionHeader}>
          <h3>Configuration</h3>
          <button
            className={styles.btnSmall}
            onClick={() => setShowNewForm(!showNewForm)}
          >
            {showNewForm ? "Cancel" : "+ New"}
          </button>
        </div>

        {showNewForm && (
          <form className={styles.configForm} onSubmit={handleCreateSubmit}>
            <div className={styles.formRow}>
              <label>
                Name
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Phoenix Downtown"
                  required
                />
              </label>
            </div>

            <div className={styles.formRow}>
              <label>
                Target Domain
                <input
                  type="text"
                  value={formData.targetDomain}
                  onChange={e => setFormData(prev => ({ ...prev, targetDomain: e.target.value }))}
                  placeholder="e.g., mybusiness.com"
                  required
                />
              </label>
            </div>

            <div className={styles.formRowDouble}>
              <label>
                Center Latitude
                <input
                  type="number"
                  step="any"
                  value={formData.centerLat}
                  onChange={e => setFormData(prev => ({ ...prev, centerLat: e.target.value }))}
                  placeholder="33.4484"
                  required
                />
              </label>
              <label>
                Center Longitude
                <input
                  type="number"
                  step="any"
                  value={formData.centerLng}
                  onChange={e => setFormData(prev => ({ ...prev, centerLng: e.target.value }))}
                  placeholder="-112.0740"
                  required
                />
              </label>
            </div>

            <div className={styles.formRowDouble}>
              <label>
                City (optional)
                <input
                  type="text"
                  value={formData.centerCity}
                  onChange={e => setFormData(prev => ({ ...prev, centerCity: e.target.value }))}
                  placeholder="Phoenix"
                />
              </label>
              <label>
                State (optional)
                <input
                  type="text"
                  value={formData.centerState}
                  onChange={e => setFormData(prev => ({ ...prev, centerState: e.target.value }))}
                  placeholder="AZ"
                />
              </label>
            </div>

            <div className={styles.formRowDouble}>
              <label>
                Grid Size
                <select
                  value={formData.gridSize}
                  onChange={e => setFormData(prev => ({ ...prev, gridSize: parseInt(e.target.value) as 3 | 5 | 7 }))}
                >
                  {GRID_SIZES.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Radius
                <select
                  value={formData.radiusMiles}
                  onChange={e => setFormData(prev => ({ ...prev, radiusMiles: parseInt(e.target.value) }))}
                >
                  {RADIUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button type="submit" className={styles.btnPrimary} disabled={loading}>
              Create Configuration
            </button>
          </form>
        )}

        {configs.length > 0 && (
          <div className={styles.configList}>
            {configs.map(config => (
              <div
                key={config.id}
                className={`${styles.configItem} ${selectedConfig?.id === config.id ? styles.selected : ""}`}
                onClick={() => onSelectConfig(config)}
              >
                <div className={styles.configItemName}>{config.name}</div>
                <div className={styles.configItemDetails}>
                  {config.gridSize}×{config.gridSize} • {config.radiusMiles}mi • {config.targetDomain}
                </div>
                <button
                  className={styles.deleteBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConfig(config.id);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {configs.length === 0 && !showNewForm && (
          <div className={styles.emptyState}>
            <p>No configurations yet. Create one to start tracking.</p>
          </div>
        )}
      </div>

      {/* Keywords Section */}
      {selectedConfig && (
        <div className={styles.configSection}>
          <div className={styles.sectionHeader}>
            <h3>Keywords</h3>
            <span className={styles.badge}>{activeKeywords.length}</span>
          </div>

          <form className={styles.addKeywordForm} onSubmit={handleAddKeywordSubmit}>
            <input
              type="text"
              value={newKeyword}
              onChange={e => setNewKeyword(e.target.value)}
              placeholder="Add a keyword..."
            />
            <button type="submit" disabled={!newKeyword.trim()}>
              Add
            </button>
          </form>

          <div className={styles.keywordList}>
            {keywords.map(kw => (
              <div key={kw.id} className={styles.keywordItem}>
                <span className={kw.isActive ? "" : styles.inactive}>
                  {kw.keyword}
                </span>
                <button
                  className={styles.deleteBtn}
                  onClick={() => onDeleteKeyword(kw.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {keywords.length === 0 && (
            <div className={styles.emptyState}>
              <p>Add keywords to track their rankings.</p>
            </div>
          )}
        </div>
      )}

      {/* Scan Section */}
      {selectedConfig && activeKeywords.length > 0 && (
        <div className={styles.configSection}>
          <div className={styles.sectionHeader}>
            <h3>Run Scan</h3>
          </div>

          <div className={styles.scanInfo}>
            <div className={styles.scanInfoRow}>
              <span>Grid Points:</span>
              <strong>{totalPoints}</strong>
            </div>
            <div className={styles.scanInfoRow}>
              <span>Keywords:</span>
              <strong>{activeKeywords.length}</strong>
            </div>
            <div className={styles.scanInfoRow}>
              <span>Total Queries:</span>
              <strong>{totalQueries}</strong>
            </div>
            <div className={styles.scanInfoRow}>
              <span>Est. Credits:</span>
              <strong>{totalQueries}</strong>
            </div>
          </div>

          {activeScan ? (
            <div className={styles.scanProgress}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${(activeScan.pointsCompleted / activeScan.totalPoints) * 100}%`
                  }}
                />
              </div>
              <p>
                Scanning... {activeScan.pointsCompleted} / {activeScan.totalPoints} points
              </p>
            </div>
          ) : (
            <button
              className={styles.btnPrimary}
              onClick={onStartScan}
              disabled={loading}
            >
              {loading ? "Starting..." : "Start Scan"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
