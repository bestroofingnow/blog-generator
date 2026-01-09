// components/seo/GeoGridRankTracker/index.tsx
// Main Geo-Grid Rank Tracker container component

import React, { useState, useEffect, useCallback } from "react";
import styles from "./GeoGridRankTracker.module.css";
import { GeoGridConfig } from "./GeoGridConfig";
import { GeoGridMap } from "./GeoGridMap";
import { GeoGridHistory } from "./GeoGridHistory";
import { GeoGridChart } from "./GeoGridChart";

export interface GridConfiguration {
  id: string;
  name: string;
  centerLat: number;
  centerLng: number;
  centerCity?: string;
  centerState?: string;
  gridSize: 3 | 5 | 7;
  radiusMiles: number;
  targetDomain: string;
  isActive: boolean;
  createdAt: string;
}

export interface Keyword {
  id: string;
  configId: string;
  keyword: string;
  isActive: boolean;
}

export interface Scan {
  id: string;
  configId: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  gridSize: number;
  radiusMiles: number;
  totalPoints: number;
  pointsCompleted: number;
  apiCallsMade: number;
  errorCount: number;
  weekNumber: number;
  year: number;
  createdAt: string;
}

export interface GridPointResult {
  row: number;
  col: number;
  lat: number;
  lng: number;
  rankPosition: number | null;
  serpUrl: string | null;
  serpTitle: string | null;
  localPackPosition: number | null;
  isInLocalPack: boolean;
  topCompetitors: Array<{ domain: string; position: number; title: string }>;
}

type TabType = "setup" | "map" | "history" | "trends";

export function GeoGridRankTracker() {
  const [activeTab, setActiveTab] = useState<TabType>("setup");
  const [configs, setConfigs] = useState<GridConfiguration[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<GridConfiguration | null>(null);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [activeScan, setActiveScan] = useState<Scan | null>(null);
  const [scanResults, setScanResults] = useState<Map<string, GridPointResult[]>>(new Map());
  const [selectedKeywordId, setSelectedKeywordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch configurations on mount
  useEffect(() => {
    fetchConfigs();
  }, []);

  // Fetch keywords and scans when config is selected
  useEffect(() => {
    if (selectedConfig) {
      fetchKeywords(selectedConfig.id);
      fetchScans(selectedConfig.id);
    }
  }, [selectedConfig]);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/geo-grid/configs");
      if (!response.ok) throw new Error("Failed to fetch configurations");
      const data = await response.json();
      setConfigs(data.configs || []);
      if (data.configs?.length > 0 && !selectedConfig) {
        setSelectedConfig(data.configs[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load configurations");
    } finally {
      setLoading(false);
    }
  };

  const fetchKeywords = async (configId: string) => {
    try {
      const response = await fetch(`/api/geo-grid/keywords?configId=${configId}`);
      if (!response.ok) throw new Error("Failed to fetch keywords");
      const data = await response.json();
      setKeywords(data.keywords || []);
      if (data.keywords?.length > 0 && !selectedKeywordId) {
        setSelectedKeywordId(data.keywords[0].id);
      }
    } catch (err) {
      console.error("Error fetching keywords:", err);
    }
  };

  const fetchScans = async (configId: string) => {
    try {
      const response = await fetch(`/api/geo-grid/scans?configId=${configId}`);
      if (!response.ok) throw new Error("Failed to fetch scans");
      const data = await response.json();
      setScans(data.scans || []);

      // Check for active scan
      const running = data.scans?.find((s: Scan) => s.status === "running");
      if (running) {
        setActiveScan(running);
        pollScanStatus(running.id);
      }
    } catch (err) {
      console.error("Error fetching scans:", err);
    }
  };

  const pollScanStatus = useCallback(async (scanId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/geo-grid/scans/${scanId}`);
        if (!response.ok) {
          clearInterval(interval);
          return;
        }
        const data = await response.json();
        setActiveScan(data.scan);

        if (data.scan.status === "completed" || data.scan.status === "failed") {
          clearInterval(interval);
          setActiveScan(null);
          if (selectedConfig) {
            fetchScans(selectedConfig.id);
          }
          // Load results
          if (data.results) {
            const resultsMap = new Map<string, GridPointResult[]>();
            for (const result of data.results) {
              resultsMap.set(result.keywordId, result.points);
            }
            setScanResults(resultsMap);
          }
        }
      } catch (err) {
        console.error("Error polling scan status:", err);
        clearInterval(interval);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [selectedConfig]);

  const handleCreateConfig = async (configData: Partial<GridConfiguration>) => {
    try {
      setLoading(true);
      const response = await fetch("/api/geo-grid/configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configData)
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to create configuration");
      }
      const data = await response.json();
      setConfigs(prev => [data.config, ...prev]);
      setSelectedConfig(data.config);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async (configId: string, updates: Partial<GridConfiguration>) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/geo-grid/configs/${configId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error("Failed to update configuration");
      const data = await response.json();
      setConfigs(prev => prev.map(c => c.id === configId ? data.config : c));
      if (selectedConfig?.id === configId) {
        setSelectedConfig(data.config);
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
      const response = await fetch(`/api/geo-grid/configs/${configId}`, {
        method: "DELETE"
      });
      if (!response.ok) throw new Error("Failed to delete configuration");
      setConfigs(prev => prev.filter(c => c.id !== configId));
      if (selectedConfig?.id === configId) {
        setSelectedConfig(configs.find(c => c.id !== configId) || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleAddKeyword = async (keyword: string) => {
    if (!selectedConfig) return;
    try {
      const response = await fetch("/api/geo-grid/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId: selectedConfig.id, keyword })
      });
      if (!response.ok) throw new Error("Failed to add keyword");
      const data = await response.json();
      setKeywords(prev => [...data.keywords, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add keyword");
    }
  };

  const handleDeleteKeyword = async (keywordId: string) => {
    try {
      const response = await fetch(`/api/geo-grid/keywords/${keywordId}`, {
        method: "DELETE"
      });
      if (!response.ok) throw new Error("Failed to delete keyword");
      setKeywords(prev => prev.filter(k => k.id !== keywordId));
      if (selectedKeywordId === keywordId) {
        setSelectedKeywordId(keywords.find(k => k.id !== keywordId)?.id || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete keyword");
    }
  };

  const handleStartScan = async () => {
    if (!selectedConfig) return;
    try {
      setLoading(true);
      // Create scan record
      const createResponse = await fetch("/api/geo-grid/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId: selectedConfig.id })
      });
      if (!createResponse.ok) {
        const errData = await createResponse.json();
        throw new Error(errData.error || "Failed to create scan");
      }
      const { scan } = await createResponse.json();
      setActiveScan(scan);
      setScans(prev => [scan, ...prev]);

      // Start the scan
      const runResponse = await fetch("/api/geo-grid/run-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId: scan.id })
      });

      if (!runResponse.ok) {
        const errData = await runResponse.json();
        throw new Error(errData.error || "Scan failed");
      }

      // Poll for results
      pollScanStatus(scan.id);
      setActiveTab("map");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start scan");
      setActiveScan(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadScanResults = async (scanId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/geo-grid/scans/${scanId}`);
      if (!response.ok) throw new Error("Failed to load scan results");
      const data = await response.json();

      if (data.results) {
        const resultsMap = new Map<string, GridPointResult[]>();
        for (const result of data.results) {
          resultsMap.set(result.keywordId, result.points);
        }
        setScanResults(resultsMap);
        if (data.results.length > 0) {
          setSelectedKeywordId(data.results[0].keywordId);
        }
      }
      setActiveTab("map");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load scan results");
    } finally {
      setLoading(false);
    }
  };

  const currentResults = selectedKeywordId ? scanResults.get(selectedKeywordId) : undefined;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Geo-Grid Rank Tracker</h2>
        <p className={styles.subtitle}>
          Track your keyword rankings across a geographic grid using geo-targeted SERP data
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

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "setup" ? styles.active : ""}`}
          onClick={() => setActiveTab("setup")}
        >
          Setup
        </button>
        <button
          className={`${styles.tab} ${activeTab === "map" ? styles.active : ""}`}
          onClick={() => setActiveTab("map")}
          disabled={!selectedConfig}
        >
          Map
        </button>
        <button
          className={`${styles.tab} ${activeTab === "history" ? styles.active : ""}`}
          onClick={() => setActiveTab("history")}
          disabled={!selectedConfig}
        >
          History
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
          <GeoGridConfig
            configs={configs}
            selectedConfig={selectedConfig}
            keywords={keywords}
            onSelectConfig={setSelectedConfig}
            onCreateConfig={handleCreateConfig}
            onUpdateConfig={handleUpdateConfig}
            onDeleteConfig={handleDeleteConfig}
            onAddKeyword={handleAddKeyword}
            onDeleteKeyword={handleDeleteKeyword}
            onStartScan={handleStartScan}
            loading={loading}
            activeScan={activeScan}
          />
        )}

        {activeTab === "map" && selectedConfig && (
          <GeoGridMap
            config={selectedConfig}
            keywords={keywords}
            selectedKeywordId={selectedKeywordId}
            onSelectKeyword={setSelectedKeywordId}
            results={currentResults}
            activeScan={activeScan}
          />
        )}

        {activeTab === "history" && selectedConfig && (
          <GeoGridHistory
            scans={scans}
            onLoadResults={handleLoadScanResults}
            loading={loading}
          />
        )}

        {activeTab === "trends" && selectedConfig && (
          <GeoGridChart
            configId={selectedConfig.id}
            keywords={keywords}
            selectedKeywordId={selectedKeywordId}
            onSelectKeyword={setSelectedKeywordId}
          />
        )}
      </div>
    </div>
  );
}

export default GeoGridRankTracker;
