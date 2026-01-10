// components/seo/AIVisibilityTracker/AIVisibilityConfig.tsx
// Configuration panel for AI visibility tracking

import React, { useState } from "react";
import styles from "./AIVisibilityTracker.module.css";
import { VisibilityConfiguration, TrackingQuery, Scan } from "./index";

interface Props {
  configs: VisibilityConfiguration[];
  selectedConfig: VisibilityConfiguration | null;
  queries: TrackingQuery[];
  onSelectConfig: (config: VisibilityConfiguration) => void;
  onCreateConfig: (data: Partial<VisibilityConfiguration>) => Promise<void>;
  onUpdateConfig: (id: string, data: Partial<VisibilityConfiguration>) => Promise<void>;
  onDeleteConfig: (id: string) => Promise<void>;
  onAddQuery: (queryText: string, queryCategory: string) => Promise<void>;
  onDeleteQuery: (id: string) => Promise<void>;
  onStartScan: () => Promise<void>;
  loading: boolean;
  activeScan: Scan | null;
}

const PLATFORMS = [
  { id: "chatgpt", name: "ChatGPT", icon: "🤖" },
  { id: "perplexity", name: "Perplexity", icon: "🔍" },
  { id: "google_aio", name: "Google AI Overview", icon: "🔮" },
  { id: "claude", name: "Claude", icon: "🧠" },
  { id: "gemini", name: "Gemini", icon: "✨" },
];

const QUERY_CATEGORIES = [
  { id: "general", name: "General" },
  { id: "product", name: "Product/Service" },
  { id: "comparison", name: "Comparison" },
  { id: "best_of", name: "Best of/Top" },
  { id: "how_to", name: "How-to" },
];

export function AIVisibilityConfig({
  configs,
  selectedConfig,
  queries,
  onSelectConfig,
  onCreateConfig,
  onUpdateConfig,
  onDeleteConfig,
  onAddQuery,
  onDeleteQuery,
  onStartScan,
  loading,
  activeScan,
}: Props) {
  const [showNewConfigForm, setShowNewConfigForm] = useState(false);
  const [newConfig, setNewConfig] = useState({
    name: "",
    brandName: "",
    brandDomain: "",
    alternateNames: "",
    platforms: PLATFORMS.map((p) => p.id),
  });
  const [newQuery, setNewQuery] = useState({ queryText: "", queryCategory: "general" });

  const handleCreateConfig = async () => {
    if (!newConfig.name || !newConfig.brandName || !newConfig.brandDomain) return;

    await onCreateConfig({
      name: newConfig.name,
      brandName: newConfig.brandName,
      brandDomain: newConfig.brandDomain,
      alternateNames: newConfig.alternateNames.split(",").map((n) => n.trim()).filter(Boolean),
      platforms: newConfig.platforms,
    });

    setNewConfig({
      name: "",
      brandName: "",
      brandDomain: "",
      alternateNames: "",
      platforms: PLATFORMS.map((p) => p.id),
    });
    setShowNewConfigForm(false);
  };

  const handleAddQuery = async () => {
    if (!newQuery.queryText) return;
    await onAddQuery(newQuery.queryText, newQuery.queryCategory);
    setNewQuery({ queryText: "", queryCategory: "general" });
  };

  const togglePlatform = (platformId: string) => {
    setNewConfig((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platformId)
        ? prev.platforms.filter((p) => p !== platformId)
        : [...prev.platforms, platformId],
    }));
  };

  return (
    <div className={styles.configPanel}>
      {/* Config Selection */}
      <div className={styles.configSection}>
        <div className={styles.sectionHeader}>
          <h3>Brand Configurations</h3>
          <button
            className={styles.btnSmall}
            onClick={() => setShowNewConfigForm(!showNewConfigForm)}
          >
            {showNewConfigForm ? "Cancel" : "+ New Config"}
          </button>
        </div>

        {showNewConfigForm && (
          <div className={styles.newConfigForm}>
            <div className={styles.formGroup}>
              <label>Configuration Name</label>
              <input
                type="text"
                placeholder="e.g., Main Brand Tracking"
                value={newConfig.name}
                onChange={(e) => setNewConfig((prev) => ({ ...prev, name: e.target.value }))}
                className={styles.input}
              />
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Brand Name</label>
                <input
                  type="text"
                  placeholder="e.g., Acme Inc"
                  value={newConfig.brandName}
                  onChange={(e) => setNewConfig((prev) => ({ ...prev, brandName: e.target.value }))}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Domain</label>
                <input
                  type="text"
                  placeholder="e.g., acme.com"
                  value={newConfig.brandDomain}
                  onChange={(e) => setNewConfig((prev) => ({ ...prev, brandDomain: e.target.value }))}
                  className={styles.input}
                />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>Alternate Names (comma-separated)</label>
              <input
                type="text"
                placeholder="e.g., ACME, Acme Corporation"
                value={newConfig.alternateNames}
                onChange={(e) => setNewConfig((prev) => ({ ...prev, alternateNames: e.target.value }))}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Platforms to Track</label>
              <div className={styles.platformCheckboxes}>
                {PLATFORMS.map((platform) => (
                  <label key={platform.id} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={newConfig.platforms.includes(platform.id)}
                      onChange={() => togglePlatform(platform.id)}
                    />
                    <span>{platform.icon} {platform.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <button
              className={styles.btnPrimary}
              onClick={handleCreateConfig}
              disabled={loading || !newConfig.name || !newConfig.brandName || !newConfig.brandDomain}
            >
              Create Configuration
            </button>
          </div>
        )}

        {configs.length > 0 ? (
          <div className={styles.configList}>
            {configs.map((config) => (
              <div
                key={config.id}
                className={`${styles.configItem} ${selectedConfig?.id === config.id ? styles.selected : ""}`}
                onClick={() => onSelectConfig(config)}
              >
                <div className={styles.configInfo}>
                  <span className={styles.configName}>{config.name}</span>
                  <span className={styles.configBrand}>{config.brandName} ({config.brandDomain})</span>
                </div>
                <div className={styles.configActions}>
                  <span className={styles.platformCount}>
                    {(config.platforms as string[])?.length || 0} platforms
                  </span>
                  <button
                    className={styles.btnDelete}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConfig(config.id);
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !showNewConfigForm && (
            <div className={styles.emptyState}>
              <p>No configurations yet. Create one to start tracking your brand visibility.</p>
            </div>
          )
        )}
      </div>

      {/* Queries Section */}
      {selectedConfig && (
        <div className={styles.configSection}>
          <div className={styles.sectionHeader}>
            <h3>Tracking Queries</h3>
            <span className={styles.badge}>{queries.length} queries</span>
          </div>

          <div className={styles.addQueryForm}>
            <div className={styles.queryInputRow}>
              <input
                type="text"
                placeholder="Enter a query to track (e.g., 'best solar panel companies')"
                value={newQuery.queryText}
                onChange={(e) => setNewQuery((prev) => ({ ...prev, queryText: e.target.value }))}
                className={styles.input}
                onKeyDown={(e) => e.key === "Enter" && handleAddQuery()}
              />
              <select
                value={newQuery.queryCategory}
                onChange={(e) => setNewQuery((prev) => ({ ...prev, queryCategory: e.target.value }))}
                className={styles.select}
              >
                {QUERY_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <button className={styles.btnAdd} onClick={handleAddQuery} disabled={!newQuery.queryText}>
                Add
              </button>
            </div>
          </div>

          {queries.length > 0 ? (
            <div className={styles.queryList}>
              {queries.map((query) => (
                <div key={query.id} className={styles.queryItem}>
                  <div className={styles.queryInfo}>
                    <span className={styles.queryText}>{query.queryText}</span>
                    <span className={styles.queryCategory}>{query.queryCategory}</span>
                  </div>
                  <button className={styles.btnDelete} onClick={() => onDeleteQuery(query.id)}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p>Add queries that potential customers might ask AI platforms about your industry.</p>
            </div>
          )}
        </div>
      )}

      {/* Run Scan Button */}
      {selectedConfig && queries.length > 0 && (
        <div className={styles.configSection}>
          <button
            className={styles.btnPrimary}
            onClick={onStartScan}
            disabled={loading || activeScan !== null}
          >
            {activeScan ? (
              <>
                <span className={styles.spinner} />
                Scanning... ({activeScan.completedQueries}/{activeScan.totalQueries})
              </>
            ) : loading ? (
              <>
                <span className={styles.spinner} />
                Starting Scan...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                Run AI Visibility Scan
              </>
            )}
          </button>
          <p className={styles.scanInfo}>
            This will check {queries.length} queries across {(selectedConfig.platforms as string[])?.length || 5} AI platforms.
          </p>
        </div>
      )}
    </div>
  );
}

export default AIVisibilityConfig;
