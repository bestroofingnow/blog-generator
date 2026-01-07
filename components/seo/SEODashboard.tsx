// components/seo/SEODashboard.tsx
// Comprehensive SEO Dashboard displaying Google API data

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SEOScoreGauge, MiniScoreBadge } from "./SEOScoreGauge";
import styles from "../../styles/SEODashboard.module.css";

interface TopQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface TopPage {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface CoreWebVital {
  value: number;
  rating: string;
}

interface PageSpeedData {
  url: string;
  performanceScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  seoScore: number;
  coreWebVitals: {
    lcp: CoreWebVital;
    fid: CoreWebVital;
    cls: CoreWebVital;
    fcp: CoreWebVital;
    ttfb: CoreWebVital;
  };
  opportunities: Array<{
    title: string;
    description: string;
    savings: string;
  }>;
}

interface SearchConsoleData {
  topQueries: TopQuery[];
  topPages: TopPage[];
  totals: {
    clicks: number;
    impressions: number;
    ctr: number;
    avgPosition: number;
  };
  dateRange: { startDate: string; endDate: string };
}

interface SEOScoreData {
  overall: number;
  breakdown: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  recommendations: string[];
}

interface DashboardData {
  siteUrl: string;
  searchConsole?: SearchConsoleData;
  pageSpeed?: {
    mobile?: PageSpeedData;
    desktop?: PageSpeedData;
  };
  seoScore?: SEOScoreData;
}

interface SEODashboardProps {
  onClose?: () => void;
  fullPage?: boolean;
}

type TabType = "overview" | "search" | "performance" | "ads";

export function SEODashboard({ onClose, fullPage = false }: SEODashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch("/api/seo/dashboard");
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch SEO data");
      }

      setData(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getGrade = (score: number): "A+" | "A" | "B" | "C" | "D" | "F" => {
    if (score >= 95) return "A+";
    if (score >= 85) return "A";
    if (score >= 70) return "B";
    if (score >= 55) return "C";
    if (score >= 40) return "D";
    return "F";
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    {
      id: "overview",
      label: "Overview",
      icon: (
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      id: "search",
      label: "Search",
      icon: (
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      id: "performance",
      label: "Performance",
      icon: (
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      id: "ads",
      label: "Ads",
      icon: (
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
      ),
    },
  ];

  const containerClass = fullPage ? styles.fullPage : styles.sidebar;

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h2 className={styles.title}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            SEO Dashboard
          </h2>
          <div className={styles.headerActions}>
            <button
              className={styles.refreshBtn}
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh data"
            >
              <svg
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className={refreshing ? styles.spinning : ""}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            {onClose && (
              <button className={styles.closeBtn} onClick={onClose}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {data?.siteUrl && (
          <div className={styles.siteInfo}>
            <span className={styles.siteLabel}>Analyzing:</span>
            <a href={data.siteUrl} target="_blank" rel="noopener noreferrer" className={styles.siteUrl}>
              {data.siteUrl.replace(/^https?:\/\//, "")}
            </a>
          </div>
        )}

        {/* Tabs */}
        <div className={styles.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.tab} ${activeTab === tab.id ? styles.active : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>Loading SEO data...</span>
          </div>
        ) : error ? (
          <div className={styles.error}>
            <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p>{error}</p>
            <button className={styles.retryBtn} onClick={handleRefresh}>
              Try Again
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "overview" && <OverviewTab data={data} formatNumber={formatNumber} getGrade={getGrade} />}
              {activeTab === "search" && <SearchTab data={data} formatNumber={formatNumber} />}
              {activeTab === "performance" && <PerformanceTab data={data} getGrade={getGrade} />}
              {activeTab === "ads" && <AdsTab />}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({
  data,
  formatNumber,
  getGrade,
}: {
  data: DashboardData | null;
  formatNumber: (n: number) => string;
  getGrade: (score: number) => "A+" | "A" | "B" | "C" | "D" | "F";
}) {
  const seoScore = data?.seoScore;
  const searchConsole = data?.searchConsole;

  return (
    <div className={styles.overviewTab}>
      {/* Main Score */}
      {seoScore && (
        <div className={styles.mainScoreSection}>
          <SEOScoreGauge
            score={seoScore.overall}
            grade={getGrade(seoScore.overall)}
            label="Overall SEO Score"
            size="large"
          />
          <div className={styles.scoreBreakdown}>
            <MiniScoreBadge score={seoScore.breakdown.performance} label="Performance" />
            <MiniScoreBadge score={seoScore.breakdown.accessibility} label="Accessibility" />
            <MiniScoreBadge score={seoScore.breakdown.bestPractices} label="Best Practices" />
            <MiniScoreBadge score={seoScore.breakdown.seo} label="SEO" />
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {searchConsole && (
        <div className={styles.quickStatsSection}>
          <h3 className={styles.sectionTitle}>Search Performance (28 days)</h3>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{formatNumber(searchConsole.totals.clicks)}</span>
              <span className={styles.statLabel}>Total Clicks</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{formatNumber(searchConsole.totals.impressions)}</span>
              <span className={styles.statLabel}>Impressions</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{(searchConsole.totals.ctr * 100).toFixed(1)}%</span>
              <span className={styles.statLabel}>Avg CTR</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{searchConsole.totals.avgPosition?.toFixed(1) || "—"}</span>
              <span className={styles.statLabel}>Avg Position</span>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {seoScore?.recommendations && seoScore.recommendations.length > 0 && (
        <div className={styles.recommendationsSection}>
          <h3 className={styles.sectionTitle}>Top Recommendations</h3>
          <div className={styles.recommendations}>
            {seoScore.recommendations.map((rec, i) => (
              <div key={i} className={styles.recommendationItem}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Data State */}
      {!seoScore && !searchConsole && (
        <div className={styles.emptyState}>
          <svg width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p>No SEO data available</p>
          <span>Configure your Google APIs in Settings to see analytics</span>
        </div>
      )}
    </div>
  );
}

// Search Tab Component
function SearchTab({
  data,
  formatNumber,
}: {
  data: DashboardData | null;
  formatNumber: (n: number) => string;
}) {
  const searchConsole = data?.searchConsole;

  if (!searchConsole) {
    return (
      <div className={styles.emptyState}>
        <svg width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <p>Search Console not connected</p>
        <span>Configure Google Search Console API to see ranking data</span>
      </div>
    );
  }

  return (
    <div className={styles.searchTab}>
      {/* Date Range */}
      <div className={styles.dateRange}>
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>{searchConsole.dateRange.startDate} to {searchConsole.dateRange.endDate}</span>
      </div>

      {/* Top Queries */}
      <div className={styles.dataSection}>
        <h3 className={styles.sectionTitle}>Top Search Queries</h3>
        <div className={styles.tableWrapper}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Query</th>
                <th>Clicks</th>
                <th>Impressions</th>
                <th>CTR</th>
                <th>Position</th>
              </tr>
            </thead>
            <tbody>
              {searchConsole.topQueries.slice(0, 10).map((query, i) => (
                <tr key={i}>
                  <td className={styles.queryCell}>{query.query}</td>
                  <td>{formatNumber(query.clicks)}</td>
                  <td>{formatNumber(query.impressions)}</td>
                  <td>{(query.ctr * 100).toFixed(1)}%</td>
                  <td>
                    <span className={`${styles.positionBadge} ${query.position <= 3 ? styles.top3 : query.position <= 10 ? styles.top10 : ""}`}>
                      {query.position.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Pages */}
      <div className={styles.dataSection}>
        <h3 className={styles.sectionTitle}>Top Pages</h3>
        <div className={styles.tableWrapper}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Page</th>
                <th>Clicks</th>
                <th>Impressions</th>
                <th>CTR</th>
                <th>Position</th>
              </tr>
            </thead>
            <tbody>
              {searchConsole.topPages.slice(0, 10).map((page, i) => (
                <tr key={i}>
                  <td className={styles.pageCell}>
                    <a href={page.page} target="_blank" rel="noopener noreferrer">
                      {new URL(page.page).pathname || "/"}
                    </a>
                  </td>
                  <td>{formatNumber(page.clicks)}</td>
                  <td>{formatNumber(page.impressions)}</td>
                  <td>{(page.ctr * 100).toFixed(1)}%</td>
                  <td>
                    <span className={`${styles.positionBadge} ${page.position <= 3 ? styles.top3 : page.position <= 10 ? styles.top10 : ""}`}>
                      {page.position.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Performance Tab Component
function PerformanceTab({
  data,
  getGrade,
}: {
  data: DashboardData | null;
  getGrade: (score: number) => "A+" | "A" | "B" | "C" | "D" | "F";
}) {
  const [strategy, setStrategy] = useState<"mobile" | "desktop">("mobile");
  const pageSpeed = data?.pageSpeed?.[strategy];

  if (!data?.pageSpeed?.mobile && !data?.pageSpeed?.desktop) {
    return (
      <div className={styles.emptyState}>
        <svg width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <p>PageSpeed data not available</p>
        <span>Configure GOOGLE_PAGESPEED_API_KEY to see performance metrics</span>
      </div>
    );
  }

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case "good": return "#22c55e";
      case "needs-improvement": return "#eab308";
      case "poor": return "#ef4444";
      default: return "#6b7280";
    }
  };

  return (
    <div className={styles.performanceTab}>
      {/* Strategy Toggle */}
      <div className={styles.strategyToggle}>
        <button
          className={`${styles.strategyBtn} ${strategy === "mobile" ? styles.active : ""}`}
          onClick={() => setStrategy("mobile")}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Mobile
        </button>
        <button
          className={`${styles.strategyBtn} ${strategy === "desktop" ? styles.active : ""}`}
          onClick={() => setStrategy("desktop")}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Desktop
        </button>
      </div>

      {pageSpeed ? (
        <>
          {/* Lighthouse Scores */}
          <div className={styles.lighthouseScores}>
            <div className={styles.scoreItem}>
              <SEOScoreGauge score={pageSpeed.performanceScore} grade={getGrade(pageSpeed.performanceScore)} label="Performance" size="small" showGrade={false} />
            </div>
            <div className={styles.scoreItem}>
              <SEOScoreGauge score={pageSpeed.accessibilityScore} grade={getGrade(pageSpeed.accessibilityScore)} label="Accessibility" size="small" showGrade={false} />
            </div>
            <div className={styles.scoreItem}>
              <SEOScoreGauge score={pageSpeed.bestPracticesScore} grade={getGrade(pageSpeed.bestPracticesScore)} label="Best Practices" size="small" showGrade={false} />
            </div>
            <div className={styles.scoreItem}>
              <SEOScoreGauge score={pageSpeed.seoScore} grade={getGrade(pageSpeed.seoScore)} label="SEO" size="small" showGrade={false} />
            </div>
          </div>

          {/* Core Web Vitals */}
          <div className={styles.cwvSection}>
            <h3 className={styles.sectionTitle}>Core Web Vitals</h3>
            <div className={styles.cwvGrid}>
              <div className={styles.cwvCard}>
                <div className={styles.cwvHeader}>
                  <span className={styles.cwvLabel}>LCP</span>
                  <span className={styles.cwvName}>Largest Contentful Paint</span>
                </div>
                <div className={styles.cwvValue} style={{ color: getRatingColor(pageSpeed.coreWebVitals.lcp.rating) }}>
                  {(pageSpeed.coreWebVitals.lcp.value / 1000).toFixed(2)}s
                </div>
                <div className={`${styles.cwvRating} ${styles[pageSpeed.coreWebVitals.lcp.rating.replace("-", "")]}`}>
                  {pageSpeed.coreWebVitals.lcp.rating}
                </div>
              </div>

              <div className={styles.cwvCard}>
                <div className={styles.cwvHeader}>
                  <span className={styles.cwvLabel}>FID</span>
                  <span className={styles.cwvName}>First Input Delay</span>
                </div>
                <div className={styles.cwvValue} style={{ color: getRatingColor(pageSpeed.coreWebVitals.fid.rating) }}>
                  {pageSpeed.coreWebVitals.fid.value}ms
                </div>
                <div className={`${styles.cwvRating} ${styles[pageSpeed.coreWebVitals.fid.rating.replace("-", "")]}`}>
                  {pageSpeed.coreWebVitals.fid.rating}
                </div>
              </div>

              <div className={styles.cwvCard}>
                <div className={styles.cwvHeader}>
                  <span className={styles.cwvLabel}>CLS</span>
                  <span className={styles.cwvName}>Cumulative Layout Shift</span>
                </div>
                <div className={styles.cwvValue} style={{ color: getRatingColor(pageSpeed.coreWebVitals.cls.rating) }}>
                  {pageSpeed.coreWebVitals.cls.value.toFixed(3)}
                </div>
                <div className={`${styles.cwvRating} ${styles[pageSpeed.coreWebVitals.cls.rating.replace("-", "")]}`}>
                  {pageSpeed.coreWebVitals.cls.rating}
                </div>
              </div>

              <div className={styles.cwvCard}>
                <div className={styles.cwvHeader}>
                  <span className={styles.cwvLabel}>FCP</span>
                  <span className={styles.cwvName}>First Contentful Paint</span>
                </div>
                <div className={styles.cwvValue} style={{ color: getRatingColor(pageSpeed.coreWebVitals.fcp.rating) }}>
                  {(pageSpeed.coreWebVitals.fcp.value / 1000).toFixed(2)}s
                </div>
                <div className={`${styles.cwvRating} ${styles[pageSpeed.coreWebVitals.fcp.rating.replace("-", "")]}`}>
                  {pageSpeed.coreWebVitals.fcp.rating}
                </div>
              </div>

              <div className={styles.cwvCard}>
                <div className={styles.cwvHeader}>
                  <span className={styles.cwvLabel}>TTFB</span>
                  <span className={styles.cwvName}>Time to First Byte</span>
                </div>
                <div className={styles.cwvValue} style={{ color: getRatingColor(pageSpeed.coreWebVitals.ttfb.rating) }}>
                  {pageSpeed.coreWebVitals.ttfb.value}ms
                </div>
                <div className={`${styles.cwvRating} ${styles[pageSpeed.coreWebVitals.ttfb.rating.replace("-", "")]}`}>
                  {pageSpeed.coreWebVitals.ttfb.rating}
                </div>
              </div>
            </div>
          </div>

          {/* Opportunities */}
          {pageSpeed.opportunities.length > 0 && (
            <div className={styles.opportunitiesSection}>
              <h3 className={styles.sectionTitle}>Optimization Opportunities</h3>
              <div className={styles.opportunities}>
                {pageSpeed.opportunities.map((opp, i) => (
                  <div key={i} className={styles.opportunityCard}>
                    <div className={styles.opportunityTitle}>{opp.title}</div>
                    {opp.savings && (
                      <div className={styles.opportunitySavings}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {opp.savings}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className={styles.noStrategy}>
          <p>No {strategy} data available</p>
        </div>
      )}
    </div>
  );
}

// Ads Tab Component
function AdsTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adsData, setAdsData] = useState<{
    totalClicks: number;
    totalImpressions: number;
    totalCost: number;
    totalConversions: number;
    avgCtr: number;
    avgCpc: number;
    campaigns: Array<{
      campaignName: string;
      clicks: number;
      impressions: number;
      cost: number;
      ctr: number;
      avgCpc: number;
    }>;
  } | null>(null);

  useEffect(() => {
    async function fetchAdsData() {
      try {
        const response = await fetch("/api/seo/search-ads");
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to fetch ads data");
        }

        setAdsData(result.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load ads data");
      } finally {
        setLoading(false);
      }
    }

    fetchAdsData();
  }, []);

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>Loading ads data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.emptyState}>
        <svg width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
        <p>Search Ads 360 not connected</p>
        <span>{error}</span>
      </div>
    );
  }

  if (!adsData) {
    return (
      <div className={styles.emptyState}>
        <svg width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
        </svg>
        <p>No ads data available</p>
        <span>Configure Search Ads 360 to see campaign performance</span>
      </div>
    );
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  return (
    <div className={styles.adsTab}>
      {/* Summary Stats */}
      <div className={styles.adsSummary}>
        <div className={styles.adsStat}>
          <span className={styles.adsStatValue}>{adsData.totalClicks.toLocaleString()}</span>
          <span className={styles.adsStatLabel}>Total Clicks</span>
        </div>
        <div className={styles.adsStat}>
          <span className={styles.adsStatValue}>{adsData.totalImpressions.toLocaleString()}</span>
          <span className={styles.adsStatLabel}>Impressions</span>
        </div>
        <div className={styles.adsStat}>
          <span className={styles.adsStatValue}>{formatCurrency(adsData.totalCost)}</span>
          <span className={styles.adsStatLabel}>Total Spend</span>
        </div>
        <div className={styles.adsStat}>
          <span className={styles.adsStatValue}>{adsData.totalConversions}</span>
          <span className={styles.adsStatLabel}>Conversions</span>
        </div>
      </div>

      {/* Campaigns */}
      {adsData.campaigns.length > 0 && (
        <div className={styles.dataSection}>
          <h3 className={styles.sectionTitle}>Campaign Performance</h3>
          <div className={styles.tableWrapper}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Clicks</th>
                  <th>Impressions</th>
                  <th>Cost</th>
                  <th>CTR</th>
                  <th>Avg CPC</th>
                </tr>
              </thead>
              <tbody>
                {adsData.campaigns.map((campaign, i) => (
                  <tr key={i}>
                    <td className={styles.queryCell}>{campaign.campaignName}</td>
                    <td>{campaign.clicks.toLocaleString()}</td>
                    <td>{campaign.impressions.toLocaleString()}</td>
                    <td>{formatCurrency(campaign.cost)}</td>
                    <td>{(campaign.ctr * 100).toFixed(2)}%</td>
                    <td>{formatCurrency(campaign.avgCpc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default SEODashboard;
