// components/seo/AIVisibilityTracker/index.tsx
// Main AI Visibility Tracker container component

import React, { useState, useEffect, useCallback } from "react";
import styles from "./AIVisibilityTracker.module.css";
import { AIVisibilityConfig } from "./AIVisibilityConfig";
import { AIVisibilityPlatformCards } from "./AIVisibilityPlatformCards";
import { AIVisibilityResults } from "./AIVisibilityResults";
import { AIVisibilityChart } from "./AIVisibilityChart";

export interface VisibilityConfiguration {
  id: string;
  name: string;
  brandName: string;
  brandDomain: string;
  alternateNames: string[];
  platforms: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrackingQuery {
  id: string;
  configId: string;
  queryText: string;
  queryCategory: string;
  isActive: boolean;
  createdAt: string;
}

export interface Scan {
  id: string;
  configId: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  totalQueries: number;
  completedQueries: number;
  errorCount: number;
  weekNumber: number;
  year: number;
}

export interface ScanResult {
  id: string;
  queryId: string;
  queryText: string;
  platform: string;
  isMentioned: boolean;
  mentionPosition: number | null;
  mentionContext: string | null;
  sentimentScore: number | null;
  hasCitation: boolean;
  citationUrl: string | null;
  hasHallucination: boolean;
  hallucinationDetails: string | null;
  competitorsMentioned: string[];
}

export interface PlatformSummary {
  platform: string;
  mentionRate: number;
  citationRate: number;
  avgSentiment: number;
  visibilityScore: number;
}

export interface WeeklyTrend {
  weekNumber: number;
  year: number;
  platform: string;
  mentionRate: number;
  citationRate: number;
  avgSentiment: number;
  totalQueries: number;
}

type TabType = "setup" | "platforms" | "results" | "trends";

export function AIVisibilityTracker() {
  const [activeTab, setActiveTab] = useState<TabType>("setup");
  const [configs, setConfigs] = useState<VisibilityConfiguration[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<VisibilityConfiguration | null>(null);
  const [queries, setQueries] = useState<TrackingQuery[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [activeScan, setActiveScan] = useState<Scan | null>(null);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [platformSummary, setPlatformSummary] = useState<PlatformSummary[]>([]);
  const [weeklyTrends, setWeeklyTrends] = useState<WeeklyTrend[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch configurations on mount
  useEffect(() => {
    fetchConfigs();
  }, []);

  // Fetch queries and scans when config is selected
  useEffect(() => {
    if (selectedConfig) {
      fetchQueries(selectedConfig.id);
      fetchScans(selectedConfig.id);
      fetchWeeklyStats(selectedConfig.id);
    }
  }, [selectedConfig]);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/ai-visibility/configs");
      if (!response.ok) throw new Error("Failed to fetch configurations");
      const data = await response.json();
      if (data.success) {
        setConfigs(data.data || []);
        if (data.data?.length > 0 && !selectedConfig) {
          setSelectedConfig(data.data[0]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load configurations");
    } finally {
      setLoading(false);
    }
  };

  const fetchQueries = async (configId: string) => {
    try {
      const response = await fetch(`/api/ai-visibility/queries?configId=${configId}`);
      if (!response.ok) throw new Error("Failed to fetch queries");
      const data = await response.json();
      if (data.success) {
        setQueries(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching queries:", err);
    }
  };

  const fetchScans = async (configId: string) => {
    try {
      const response = await fetch(`/api/ai-visibility/scans?configId=${configId}`);
      if (!response.ok) throw new Error("Failed to fetch scans");
      const data = await response.json();
      if (data.success) {
        setScans(data.data || []);

        // Check for active scan
        const running = data.data?.find((s: Scan) => s.status === "running");
        if (running) {
          setActiveScan(running);
          pollScanStatus(running.id);
        }
      }
    } catch (err) {
      console.error("Error fetching scans:", err);
    }
  };

  const fetchWeeklyStats = async (configId: string) => {
    try {
      const response = await fetch(`/api/ai-visibility/stats/weekly?configId=${configId}`);
      if (!response.ok) throw new Error("Failed to fetch weekly stats");
      const data = await response.json();
      if (data.success && data.data) {
        setWeeklyTrends(data.data.weeklyTrends || []);
        setPlatformSummary(data.data.platformSummary || []);
        setInsights(data.data.insights || []);
      }
    } catch (err) {
      console.error("Error fetching weekly stats:", err);
    }
  };

  const pollScanStatus = useCallback(async (scanId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/ai-visibility/scans/${scanId}`);
        if (!response.ok) {
          clearInterval(interval);
          return;
        }
        const data = await response.json();
        if (data.success && data.data) {
          setActiveScan(data.data.scan);

          if (data.data.scan.status === "completed" || data.data.scan.status === "failed") {
            clearInterval(interval);
            setActiveScan(null);
            if (selectedConfig) {
              fetchScans(selectedConfig.id);
              fetchWeeklyStats(selectedConfig.id);
            }
            // Load results
            if (data.data.results) {
              setScanResults(data.data.results);
            }
            if (data.data.platformStats) {
              const summaries: PlatformSummary[] = Object.entries(data.data.platformStats).map(
                ([platform, stats]: [string, unknown]) => {
                  const s = stats as { total: number; mentioned: number; cited: number; avgSentiment: number };
                  return {
                    platform,
                    mentionRate: s.total > 0 ? Math.round((s.mentioned / s.total) * 100) : 0,
                    citationRate: s.total > 0 ? Math.round((s.cited / s.total) * 100) : 0,
                    avgSentiment: s.avgSentiment,
                    visibilityScore: s.total > 0 ? Math.round((s.mentioned / s.total) * 50 + (s.cited / s.total) * 30 + (s.avgSentiment + 1) * 10) : 0,
                  };
                }
              );
              setPlatformSummary(summaries);
            }
            setActiveTab("platforms");
          }
        }
      } catch (err) {
        console.error("Error polling scan status:", err);
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedConfig]);

  const handleCreateConfig = async (configData: Partial<VisibilityConfiguration>) => {
    try {
      setLoading(true);
      const response = await fetch("/api/ai-visibility/configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configData),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to create configuration");
      }
      const data = await response.json();
      if (data.success) {
        setConfigs((prev) => [data.data, ...prev]);
        setSelectedConfig(data.data);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async (configId: string, updates: Partial<VisibilityConfiguration>) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ai-visibility/configs/${configId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update configuration");
      const data = await response.json();
      if (data.success) {
        setConfigs((prev) => prev.map((c) => (c.id === configId ? data.data : c)));
        if (selectedConfig?.id === configId) {
          setSelectedConfig(data.data);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfig = async (configId: string) => {
    if (!confirm("Are you sure you want to delete this configuration and all its data?")) {
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(`/api/ai-visibility/configs/${configId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete configuration");
      setConfigs((prev) => prev.filter((c) => c.id !== configId));
      if (selectedConfig?.id === configId) {
        setSelectedConfig(configs.find((c) => c.id !== configId) || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuery = async (queryText: string, queryCategory: string) => {
    if (!selectedConfig) return;
    try {
      const response = await fetch("/api/ai-visibility/queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId: selectedConfig.id, queryText, queryCategory }),
      });
      if (!response.ok) throw new Error("Failed to add query");
      const data = await response.json();
      if (data.success) {
        setQueries((prev) => [data.data, ...prev]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add query");
    }
  };

  const handleDeleteQuery = async (queryId: string) => {
    try {
      const response = await fetch(`/api/ai-visibility/queries/${queryId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete query");
      setQueries((prev) => prev.filter((q) => q.id !== queryId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete query");
    }
  };

  const handleStartScan = async () => {
    if (!selectedConfig) return;
    try {
      setLoading(true);
      const response = await fetch("/api/ai-visibility/run-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId: selectedConfig.id }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to start scan");
      }

      const data = await response.json();
      if (data.success && data.data) {
        // Scan completed immediately (or use polling for long scans)
        setScanResults(data.data.results || []);
        if (selectedConfig) {
          fetchScans(selectedConfig.id);
          fetchWeeklyStats(selectedConfig.id);
        }
        setActiveTab("platforms");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start scan");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadScanResults = async (scanId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ai-visibility/scans/${scanId}`);
      if (!response.ok) throw new Error("Failed to load scan results");
      const data = await response.json();

      if (data.success && data.data) {
        setScanResults(data.data.results || []);
        setActiveTab("results");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load scan results");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>AI Search Visibility Tracker</h2>
        <p className={styles.subtitle}>
          Track how your brand appears across AI platforms: ChatGPT, Perplexity, Google AI Overview, Claude, and Gemini
        </p>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
          <button onClick={() => setError(null)} className={styles.dismissError}>
            ×
          </button>
        </div>
      )}

      {insights.length > 0 && (
        <div className={styles.insightsBar}>
          <span className={styles.insightsIcon}>💡</span>
          <div className={styles.insightsList}>
            {insights.map((insight, i) => (
              <span key={i} className={styles.insight}>
                {insight}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "setup" ? styles.active : ""}`}
          onClick={() => setActiveTab("setup")}
        >
          Setup
        </button>
        <button
          className={`${styles.tab} ${activeTab === "platforms" ? styles.active : ""}`}
          onClick={() => setActiveTab("platforms")}
          disabled={!selectedConfig}
        >
          Platforms
        </button>
        <button
          className={`${styles.tab} ${activeTab === "results" ? styles.active : ""}`}
          onClick={() => setActiveTab("results")}
          disabled={!selectedConfig}
        >
          Results
        </button>
        <button
          className={`${styles.tab} ${activeTab === "trends" ? styles.active : ""}`}
          onClick={() => setActiveTab("trends")}
          disabled={!selectedConfig}
        >
          Trends
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === "setup" && (
          <AIVisibilityConfig
            configs={configs}
            selectedConfig={selectedConfig}
            queries={queries}
            onSelectConfig={setSelectedConfig}
            onCreateConfig={handleCreateConfig}
            onUpdateConfig={handleUpdateConfig}
            onDeleteConfig={handleDeleteConfig}
            onAddQuery={handleAddQuery}
            onDeleteQuery={handleDeleteQuery}
            onStartScan={handleStartScan}
            loading={loading}
            activeScan={activeScan}
          />
        )}

        {activeTab === "platforms" && selectedConfig && (
          <AIVisibilityPlatformCards
            config={selectedConfig}
            platformSummary={platformSummary}
            scans={scans}
            onLoadResults={handleLoadScanResults}
            loading={loading}
          />
        )}

        {activeTab === "results" && selectedConfig && (
          <AIVisibilityResults
            config={selectedConfig}
            results={scanResults}
            queries={queries}
          />
        )}

        {activeTab === "trends" && selectedConfig && (
          <AIVisibilityChart
            configId={selectedConfig.id}
            weeklyTrends={weeklyTrends}
            platformSummary={platformSummary}
          />
        )}
      </div>
    </div>
  );
}

export default AIVisibilityTracker;
