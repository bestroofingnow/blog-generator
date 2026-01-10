// components/seo/CompetitorIntelHub/index.tsx
// Main Competitor Intelligence Hub container component

import React, { useState, useEffect, useCallback } from "react";
import styles from "./CompetitorIntelHub.module.css";
import { CompetitorList } from "./CompetitorList";
import { CompetitorCard } from "./CompetitorCard";
import { CompetitorDetail } from "./CompetitorDetail";
import { CompetitorChart } from "./CompetitorChart";

export interface Competitor {
  id: string;
  name: string;
  domain: string;
  description?: string;
  industry?: string;
  competitorType?: string;
  priority: number;
  socialLinks?: Record<string, string>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContentSnapshot {
  pageTitle?: string;
  metaDescription?: string;
  wordCount: number;
  headingCount: number;
  keywordCount: number;
  hasSchema: boolean;
  schemaTypes?: string[];
  blogPostCount?: number;
}

export interface SocialSnapshot {
  platform: string;
  followers: number;
  posts?: number;
  engagementRate?: string;
}

export interface ReviewSnapshot {
  platform: string;
  rating: number;
  reviewCount: number;
}

export interface CompetitorComparison {
  id: string;
  name: string;
  domain: string;
  industry?: string;
  updatedAt?: string;
  content?: ContentSnapshot;
  social?: {
    totalFollowers: number;
    platforms: SocialSnapshot[];
  };
  reviews?: {
    averageRating: number;
    totalReviews: number;
  };
}

export interface Scan {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  scanType: string;
  startedAt?: string;
  completedAt?: string;
  competitorsScanned: number;
}

type TabType = "list" | "cards" | "detail" | "compare";

export function CompetitorIntelHub() {
  const [activeTab, setActiveTab] = useState<TabType>("list");
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
  const [comparisons, setComparisons] = useState<CompetitorComparison[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [activeScan, setActiveScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch competitors on mount
  useEffect(() => {
    fetchCompetitors();
    fetchComparison();
  }, []);

  const fetchCompetitors = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/competitor-intel/competitors");
      if (!response.ok) throw new Error("Failed to fetch competitors");
      const data = await response.json();
      if (data.success) {
        setCompetitors(data.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load competitors");
    } finally {
      setLoading(false);
    }
  };

  const fetchComparison = async () => {
    try {
      const response = await fetch("/api/competitor-intel/stats/comparison");
      if (!response.ok) throw new Error("Failed to fetch comparison data");
      const data = await response.json();
      if (data.success && data.data) {
        setComparisons(data.data.competitors || []);
        setInsights(data.data.insights || []);
      }
    } catch (err) {
      console.error("Error fetching comparison:", err);
    }
  };

  const fetchScans = async (competitorId: string) => {
    try {
      const response = await fetch(`/api/competitor-intel/scans?competitorId=${competitorId}`);
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

  const pollScanStatus = useCallback(async (scanId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/competitor-intel/scans/${scanId}`);
        if (!response.ok) {
          clearInterval(interval);
          return;
        }
        const data = await response.json();
        if (data.success && data.data) {
          setActiveScan(data.data);

          if (data.data.status === "completed" || data.data.status === "failed") {
            clearInterval(interval);
            setActiveScan(null);
            fetchCompetitors();
            fetchComparison();
          }
        }
      } catch (err) {
        console.error("Error polling scan status:", err);
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleAddCompetitor = async (competitorData: Partial<Competitor>) => {
    try {
      setLoading(true);
      const response = await fetch("/api/competitor-intel/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(competitorData),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to add competitor");
      }
      const data = await response.json();
      if (data.success) {
        setCompetitors((prev) => [data.data, ...prev]);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add competitor");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCompetitor = async (id: string, updates: Partial<Competitor>) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/competitor-intel/competitors/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update competitor");
      const data = await response.json();
      if (data.success) {
        setCompetitors((prev) => prev.map((c) => (c.id === id ? data.data : c)));
        if (selectedCompetitor?.id === id) {
          setSelectedCompetitor(data.data);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update competitor");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCompetitor = async (id: string) => {
    if (!confirm("Are you sure you want to delete this competitor?")) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/competitor-intel/competitors/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete competitor");
      setCompetitors((prev) => prev.filter((c) => c.id !== id));
      if (selectedCompetitor?.id === id) {
        setSelectedCompetitor(null);
        setActiveTab("list");
      }
      fetchComparison();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete competitor");
    } finally {
      setLoading(false);
    }
  };

  const handleRunScan = async (competitorId: string, scanType: string = "full") => {
    try {
      setLoading(true);
      const response = await fetch("/api/competitor-intel/run-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitorId, scanType }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to start scan");
      }

      const data = await response.json();
      if (data.success) {
        // Refresh data after scan
        fetchCompetitors();
        fetchComparison();
        if (selectedCompetitor) {
          fetchScans(selectedCompetitor.id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run scan");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCompetitor = (competitor: Competitor) => {
    setSelectedCompetitor(competitor);
    fetchScans(competitor.id);
    setActiveTab("detail");
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Competitor Intelligence Hub</h2>
        <p className={styles.subtitle}>
          Track and analyze your competitors&apos; content, social presence, and reviews
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
            {insights.slice(0, 3).map((insight, i) => (
              <span key={i} className={styles.insight}>
                {insight}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "list" ? styles.active : ""}`}
          onClick={() => setActiveTab("list")}
        >
          Competitors
        </button>
        <button
          className={`${styles.tab} ${activeTab === "cards" ? styles.active : ""}`}
          onClick={() => setActiveTab("cards")}
          disabled={competitors.length === 0}
        >
          Overview
        </button>
        <button
          className={`${styles.tab} ${activeTab === "detail" ? styles.active : ""}`}
          onClick={() => setActiveTab("detail")}
          disabled={!selectedCompetitor}
        >
          Details
        </button>
        <button
          className={`${styles.tab} ${activeTab === "compare" ? styles.active : ""}`}
          onClick={() => setActiveTab("compare")}
          disabled={comparisons.length < 2}
        >
          Compare
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === "list" && (
          <CompetitorList
            competitors={competitors}
            onAdd={handleAddCompetitor}
            onSelect={handleSelectCompetitor}
            onDelete={handleDeleteCompetitor}
            onRunScan={handleRunScan}
            loading={loading}
            activeScan={activeScan}
          />
        )}

        {activeTab === "cards" && (
          <div className={styles.cardsGrid}>
            {comparisons.map((comp) => (
              <CompetitorCard
                key={comp.id}
                competitor={comp}
                onSelect={() => {
                  const fullCompetitor = competitors.find((c) => c.id === comp.id);
                  if (fullCompetitor) handleSelectCompetitor(fullCompetitor);
                }}
                onRunScan={() => handleRunScan(comp.id)}
              />
            ))}
          </div>
        )}

        {activeTab === "detail" && selectedCompetitor && (
          <CompetitorDetail
            competitor={selectedCompetitor}
            comparison={comparisons.find((c) => c.id === selectedCompetitor.id)}
            scans={scans}
            onUpdate={handleUpdateCompetitor}
            onRunScan={handleRunScan}
            loading={loading}
            activeScan={activeScan}
          />
        )}

        {activeTab === "compare" && (
          <CompetitorChart comparisons={comparisons} />
        )}
      </div>
    </div>
  );
}

export default CompetitorIntelHub;
