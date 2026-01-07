// pages/seo-tools.tsx
// Comprehensive SEO Tools page with Google Search Console integration

import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../lib/auth-context";
import { GoogleSearchConsoleConnect } from "../components/seo/GoogleSearchConsoleConnect";
import { SEODashboard } from "../components/seo/SEODashboard";
import styles from "../styles/SEOTools.module.css";

type SEOTab = "connect" | "dashboard" | "indexing" | "pagespeed" | "rankings" | "keywords" | "ads";

interface IndexingResult {
  url: string;
  status: "pending" | "success" | "error";
  message?: string;
}

interface PageSpeedResult {
  url: string;
  strategy: "mobile" | "desktop";
  performanceScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  seoScore: number;
  coreWebVitals?: {
    lcp: { value: number; rating: string; displayValue: string };
    fid: { value: number; rating: string; displayValue: string };
    cls: { value: number; rating: string; displayValue: string };
    fcp: { value: number; rating: string; displayValue: string };
    ttfb: { value: number; rating: string; displayValue: string };
    si: { value: number; rating: string; displayValue: string };
    tbt: { value: number; rating: string; displayValue: string };
  };
  diagnostics?: Array<{
    id: string;
    title: string;
    description: string;
    score: number | null;
    displayValue?: string;
  }>;
  opportunities: Array<{ title: string; description: string; savings: string }>;
  fetchTime: string;
}

// Keyword Research Types
interface KeywordSuggestion {
  keyword: string;
  searchVolume: number;
  difficulty: number;
  cpc: number;
  trend: "up" | "down" | "stable";
  intent: "informational" | "commercial" | "transactional" | "navigational";
}

interface RelatedKeyword {
  keyword: string;
  relevance: number;
}

interface KeywordAnalysis {
  primaryKeyword: string;
  suggestions: KeywordSuggestion[];
  relatedKeywords: RelatedKeyword[];
  questions: string[];
  longTail: string[];
}

// Ads Types
interface AdCampaign {
  campaignId: string;
  campaignName: string;
  clicks: number;
  impressions: number;
  cost: number;
  conversions: number;
  ctr: number;
  avgCpc: number;
  conversionRate: number;
}

interface AdsData {
  totalClicks: number;
  totalImpressions: number;
  totalCost: number;
  totalConversions: number;
  avgCtr: number;
  avgCpc: number;
  campaigns: AdCampaign[];
  dateRange: { startDate: string; endDate: string };
}

export default function SEOToolsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<SEOTab>("connect");

  // Indexing state
  const [indexUrl, setIndexUrl] = useState("");
  const [indexingResults, setIndexingResults] = useState<IndexingResult[]>([]);
  const [isIndexing, setIsIndexing] = useState(false);

  // PageSpeed state
  const [pagespeedUrl, setPagespeedUrl] = useState("");
  const [pagespeedResult, setPagespeedResult] = useState<PageSpeedResult | null>(null);
  const [pagespeedError, setPagespeedError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [strategy, setStrategy] = useState<"mobile" | "desktop">("mobile");

  // Connection status
  const [isConnected, setIsConnected] = useState(false);
  const [connectionLoading, setConnectionLoading] = useState(true);

  // Keyword Research state
  const [keywordInput, setKeywordInput] = useState("");
  const [keywordAnalysis, setKeywordAnalysis] = useState<KeywordAnalysis | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [keywordError, setKeywordError] = useState<string | null>(null);
  const [keywordTab, setKeywordTab] = useState<"suggestions" | "related" | "questions" | "longtail">("suggestions");

  // Ads state
  const [adsData, setAdsData] = useState<AdsData | null>(null);
  const [adsLoading, setAdsLoading] = useState(false);
  const [adsError, setAdsError] = useState<string | null>(null);
  const [adsConnected, setAdsConnected] = useState(false);
  const [adsConnectedEmail, setAdsConnectedEmail] = useState<string | null>(null);

  // Check connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Check Search Console connection
        const response = await fetch("/api/seo/connection");
        const data = await response.json();
        setIsConnected(data.connected && data.connectedSiteUrl);
        if (data.connected && data.connectedSiteUrl) {
          setActiveTab("dashboard");
        }

        // Check Ads connection
        const adsResponse = await fetch("/api/seo/ads-connection");
        const adsData = await adsResponse.json();
        setAdsConnected(adsData.connected);
        setAdsConnectedEmail(adsData.connectedEmail || null);
      } catch (error) {
        console.error("Failed to check connection:", error);
      } finally {
        setConnectionLoading(false);
      }
    };

    if (user) {
      checkConnection();
    }
  }, [user]);

  // Handle URL query params
  useEffect(() => {
    if (router.query.google_connected === "true") {
      setIsConnected(true);
      setActiveTab("dashboard");
    }
    if (router.query.ads_connected === "true") {
      setAdsConnected(true);
      setActiveTab("ads");
    }
  }, [router.query]);

  // Redirect to login if not authenticated
  if (!isLoading && !user) {
    router.push("/login");
    return null;
  }

  if (isLoading || connectionLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading SEO Tools...</span>
        </div>
      </div>
    );
  }

  const handleIndexUrl = async () => {
    if (!indexUrl.trim()) return;

    setIsIndexing(true);
    const urlToIndex = indexUrl.trim();

    // Add pending result
    setIndexingResults(prev => [...prev, { url: urlToIndex, status: "pending" }]);

    try {
      const response = await fetch("/api/seo/indexing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToIndex, type: "URL_UPDATED" }),
      });

      const data = await response.json();

      setIndexingResults(prev =>
        prev.map(r =>
          r.url === urlToIndex
            ? { ...r, status: data.success ? "success" : "error", message: data.message || data.error }
            : r
        )
      );

      setIndexUrl("");
    } catch (error) {
      setIndexingResults(prev =>
        prev.map(r =>
          r.url === urlToIndex
            ? { ...r, status: "error", message: "Network error" }
            : r
        )
      );
    } finally {
      setIsIndexing(false);
    }
  };

  const handleAnalyzePageSpeed = async () => {
    if (!pagespeedUrl.trim()) return;

    setIsAnalyzing(true);
    setPagespeedResult(null);
    setPagespeedError(null);

    try {
      const response = await fetch(`/api/seo/pagespeed?url=${encodeURIComponent(pagespeedUrl)}&strategy=${strategy}`);
      const data = await response.json();

      if (data.success && data.data) {
        setPagespeedResult(data.data);
      } else {
        setPagespeedError(data.error || "Failed to analyze page. Please check the URL and try again.");
        console.error("PageSpeed analysis failed:", data.error);
      }
    } catch (error) {
      setPagespeedError("Network error. Please try again.");
      console.error("Failed to analyze:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "#22c55e";
    if (score >= 50) return "#eab308";
    return "#ef4444";
  };

  const getRatingClass = (rating: string) => {
    const r = rating.toLowerCase().replace(/[_\s]/g, "-");
    if (r === "good") return styles.ratingGood;
    if (r === "needs-improvement") return styles.ratingWarning;
    if (r === "poor") return styles.ratingPoor;
    return "";
  };

  // Keyword Research handler
  const handleKeywordResearch = async () => {
    if (!keywordInput.trim()) return;

    setIsResearching(true);
    setKeywordError(null);

    try {
      const response = await fetch("/api/keyword-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keywordInput.trim() }),
      });

      const data = await response.json();
      if (data.success) {
        setKeywordAnalysis(data.analysis);
      } else {
        setKeywordError(data.error || "Failed to analyze keyword");
      }
    } catch (err) {
      setKeywordError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsResearching(false);
    }
  };

  // Ads data fetcher
  const fetchAdsData = async () => {
    setAdsLoading(true);
    setAdsError(null);

    try {
      const response = await fetch("/api/seo/search-ads?days=30");
      const data = await response.json();

      // Update connection status from response
      if (typeof data.connected === "boolean") {
        setAdsConnected(data.connected);
      }

      if (data.success && data.data) {
        setAdsData(data.data);
      } else if (!data.connected) {
        // Not connected - don't show as error
        setAdsData(null);
      } else {
        setAdsError(data.error || "Failed to fetch ads data");
      }
    } catch (err) {
      setAdsError(err instanceof Error ? err.message : "Failed to fetch ads data");
    } finally {
      setAdsLoading(false);
    }
  };

  // Connect to Search Ads 360
  const handleConnectAds = () => {
    window.location.href = "/api/seo/ads-connect";
  };

  // Keyword helpers
  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 30) return "#22c55e";
    if (difficulty <= 60) return "#eab308";
    return "#ef4444";
  };

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty <= 30) return "Easy";
    if (difficulty <= 60) return "Medium";
    return "Hard";
  };

  const getIntentIcon = (intent: KeywordSuggestion["intent"]) => {
    switch (intent) {
      case "informational": return "i";
      case "commercial": return "C";
      case "transactional": return "T";
      case "navigational": return "N";
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={() => router.push("/")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            SEO Tools
          </h1>
          <p className={styles.subtitle}>Track rankings, analyze performance, and optimize your content</p>
        </div>
      </header>

      <div className={styles.content}>
        <nav className={styles.sidebar}>
          <div className={styles.navGroup}>
            <span className={styles.navGroupLabel}>Setup</span>
            <button
              className={`${styles.navItem} ${activeTab === "connect" ? styles.active : ""}`}
              onClick={() => setActiveTab("connect")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              Connect Google
              {isConnected && <span className={styles.connectedBadge} />}
            </button>
          </div>

          <div className={styles.navGroup}>
            <span className={styles.navGroupLabel}>Analytics</span>
            <button
              className={`${styles.navItem} ${activeTab === "dashboard" ? styles.active : ""}`}
              onClick={() => setActiveTab("dashboard")}
              disabled={!isConnected}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
              Dashboard
            </button>
            <button
              className={`${styles.navItem} ${activeTab === "rankings" ? styles.active : ""}`}
              onClick={() => setActiveTab("rankings")}
              disabled={!isConnected}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
              Rankings
            </button>
          </div>

          <div className={styles.navGroup}>
            <span className={styles.navGroupLabel}>Tools</span>
            <button
              className={`${styles.navItem} ${activeTab === "indexing" ? styles.active : ""}`}
              onClick={() => setActiveTab("indexing")}
              disabled={!isConnected}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
              Instant Indexing
            </button>
            <button
              className={`${styles.navItem} ${activeTab === "pagespeed" ? styles.active : ""}`}
              onClick={() => setActiveTab("pagespeed")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              PageSpeed
            </button>
            <button
              className={`${styles.navItem} ${activeTab === "keywords" ? styles.active : ""}`}
              onClick={() => setActiveTab("keywords")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              Keyword Research
            </button>
            <button
              className={`${styles.navItem} ${activeTab === "ads" ? styles.active : ""}`}
              onClick={() => { setActiveTab("ads"); if (adsConnected && !adsData && !adsLoading) fetchAdsData(); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
              Ad Management
              {adsConnected && <span className={styles.connectedBadge} />}
            </button>
          </div>
        </nav>

        <main className={styles.main}>
          {activeTab === "connect" && (
            <div className={styles.tabContent}>
              <GoogleSearchConsoleConnect />

              <div className={styles.infoCard}>
                <h3>What can you do with Google Search Console?</h3>
                <ul className={styles.featureList}>
                  <li>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    View your website's search performance
                  </li>
                  <li>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    See which keywords bring traffic
                  </li>
                  <li>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Track your ranking positions
                  </li>
                  <li>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Request instant URL indexing
                  </li>
                  <li>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    AI uses data to optimize content
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "dashboard" && (
            <div className={styles.tabContent}>
              {isConnected ? (
                <SEODashboard fullPage />
              ) : (
                <div className={styles.notConnected}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <h3>Connect Google Search Console</h3>
                  <p>Connect your Google account to view SEO metrics</p>
                  <button onClick={() => setActiveTab("connect")} className={styles.primaryBtn}>
                    Connect Now
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "rankings" && (
            <div className={styles.tabContent}>
              {isConnected ? (
                <SEODashboard fullPage />
              ) : (
                <div className={styles.notConnected}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                  <h3>Connect to see rankings</h3>
                  <p>Connect your Google account to track keyword positions</p>
                  <button onClick={() => setActiveTab("connect")} className={styles.primaryBtn}>
                    Connect Now
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "indexing" && (
            <div className={styles.tabContent}>
              <div className={styles.toolCard}>
                <div className={styles.toolHeader}>
                  <div className={styles.toolIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                  </div>
                  <div>
                    <h2>Instant URL Indexing</h2>
                    <p>Request Google to immediately crawl and index your pages</p>
                  </div>
                </div>

                {!isConnected ? (
                  <div className={styles.notConnected}>
                    <p>Connect Google Search Console to use instant indexing</p>
                    <button onClick={() => setActiveTab("connect")} className={styles.primaryBtn}>
                      Connect Now
                    </button>
                  </div>
                ) : (
                  <>
                    <div className={styles.inputGroup}>
                      <input
                        type="url"
                        placeholder="https://example.com/page-to-index"
                        value={indexUrl}
                        onChange={(e) => setIndexUrl(e.target.value)}
                        className={styles.input}
                        onKeyDown={(e) => e.key === "Enter" && handleIndexUrl()}
                      />
                      <button
                        onClick={handleIndexUrl}
                        disabled={isIndexing || !indexUrl.trim()}
                        className={styles.primaryBtn}
                      >
                        {isIndexing ? (
                          <>
                            <div className={styles.btnSpinner} />
                            Requesting...
                          </>
                        ) : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                            </svg>
                            Index URL
                          </>
                        )}
                      </button>
                    </div>

                    {indexingResults.length > 0 && (
                      <div className={styles.resultsList}>
                        <h4>Recent Requests</h4>
                        {indexingResults.map((result, index) => (
                          <div key={index} className={`${styles.resultItem} ${styles[result.status]}`}>
                            <div className={styles.resultStatus}>
                              {result.status === "pending" && <div className={styles.statusSpinner} />}
                              {result.status === "success" && (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              )}
                              {result.status === "error" && (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10"/>
                                  <line x1="15" y1="9" x2="9" y2="15"/>
                                  <line x1="9" y1="9" x2="15" y2="15"/>
                                </svg>
                              )}
                            </div>
                            <div className={styles.resultContent}>
                              <span className={styles.resultUrl}>{result.url}</span>
                              {result.message && <span className={styles.resultMessage}>{result.message}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className={styles.infoBox}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="16" x2="12" y2="12"/>
                        <line x1="12" y1="8" x2="12.01" y2="8"/>
                      </svg>
                      <div>
                        <strong>Pro tip:</strong> Use this after publishing new content or making significant updates.
                        Google limits indexing requests, so use wisely.
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === "pagespeed" && (
            <div className={styles.tabContent}>
              <div className={styles.toolCard}>
                <div className={styles.toolHeader}>
                  <div className={styles.toolIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  <div>
                    <h2>PageSpeed Insights</h2>
                    <p>Analyze your website's performance and Core Web Vitals</p>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <input
                    type="url"
                    placeholder="https://example.com"
                    value={pagespeedUrl}
                    onChange={(e) => setPagespeedUrl(e.target.value)}
                    className={styles.input}
                    onKeyDown={(e) => e.key === "Enter" && handleAnalyzePageSpeed()}
                  />
                  <div className={styles.strategyToggle}>
                    <button
                      className={`${styles.strategyBtn} ${strategy === "mobile" ? styles.active : ""}`}
                      onClick={() => setStrategy("mobile")}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                        <line x1="12" y1="18" x2="12.01" y2="18"/>
                      </svg>
                      Mobile
                    </button>
                    <button
                      className={`${styles.strategyBtn} ${strategy === "desktop" ? styles.active : ""}`}
                      onClick={() => setStrategy("desktop")}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                        <line x1="8" y1="21" x2="16" y2="21"/>
                        <line x1="12" y1="17" x2="12" y2="21"/>
                      </svg>
                      Desktop
                    </button>
                  </div>
                  <button
                    onClick={handleAnalyzePageSpeed}
                    disabled={isAnalyzing || !pagespeedUrl.trim()}
                    className={styles.primaryBtn}
                  >
                    {isAnalyzing ? (
                      <>
                        <div className={styles.btnSpinner} />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="11" cy="11" r="8"/>
                          <path d="m21 21-4.35-4.35"/>
                        </svg>
                        Analyze
                      </>
                    )}
                  </button>
                </div>

                {pagespeedError && (
                  <div className={styles.errorBanner}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {pagespeedError}
                  </div>
                )}

                {pagespeedResult && (
                  <div className={styles.pagespeedResults}>
                    {/* Strategy & URL Info */}
                    <div className={styles.resultMeta}>
                      <div className={styles.resultUrl}>
                        <span className={styles.strategyBadge}>
                          {pagespeedResult.strategy === "mobile" ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                              <line x1="12" y1="18" x2="12.01" y2="18"/>
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                              <line x1="8" y1="21" x2="16" y2="21"/>
                              <line x1="12" y1="17" x2="12" y2="21"/>
                            </svg>
                          )}
                          {pagespeedResult.strategy === "mobile" ? "Mobile" : "Desktop"}
                        </span>
                        <span className={styles.analyzedUrl}>{pagespeedResult.url}</span>
                      </div>
                      <span className={styles.fetchTime}>
                        Analyzed: {new Date(pagespeedResult.fetchTime).toLocaleString()}
                      </span>
                    </div>

                    {/* Score Cards */}
                    <div className={styles.scoreCards}>
                      <div className={styles.scoreCard}>
                        <div className={styles.scoreCircle} style={{ "--score-color": getScoreColor(pagespeedResult.performanceScore) } as React.CSSProperties}>
                          <svg viewBox="0 0 36 36" className={styles.scoreRing}>
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeDasharray={`${pagespeedResult.performanceScore}, 100`}
                            />
                          </svg>
                          <span className={styles.scoreValue}>{pagespeedResult.performanceScore}</span>
                        </div>
                        <span className={styles.scoreLabel}>Performance</span>
                      </div>
                      <div className={styles.scoreCard}>
                        <div className={styles.scoreCircle} style={{ "--score-color": getScoreColor(pagespeedResult.accessibilityScore) } as React.CSSProperties}>
                          <svg viewBox="0 0 36 36" className={styles.scoreRing}>
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeDasharray={`${pagespeedResult.accessibilityScore}, 100`}
                            />
                          </svg>
                          <span className={styles.scoreValue}>{pagespeedResult.accessibilityScore}</span>
                        </div>
                        <span className={styles.scoreLabel}>Accessibility</span>
                      </div>
                      <div className={styles.scoreCard}>
                        <div className={styles.scoreCircle} style={{ "--score-color": getScoreColor(pagespeedResult.bestPracticesScore) } as React.CSSProperties}>
                          <svg viewBox="0 0 36 36" className={styles.scoreRing}>
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeDasharray={`${pagespeedResult.bestPracticesScore}, 100`}
                            />
                          </svg>
                          <span className={styles.scoreValue}>{pagespeedResult.bestPracticesScore}</span>
                        </div>
                        <span className={styles.scoreLabel}>Best Practices</span>
                      </div>
                      <div className={styles.scoreCard}>
                        <div className={styles.scoreCircle} style={{ "--score-color": getScoreColor(pagespeedResult.seoScore) } as React.CSSProperties}>
                          <svg viewBox="0 0 36 36" className={styles.scoreRing}>
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeDasharray={`${pagespeedResult.seoScore}, 100`}
                            />
                          </svg>
                          <span className={styles.scoreValue}>{pagespeedResult.seoScore}</span>
                        </div>
                        <span className={styles.scoreLabel}>SEO</span>
                      </div>
                    </div>

                    {/* Core Web Vitals - All 7 Metrics */}
                    {pagespeedResult.coreWebVitals && (
                      <div className={styles.cwvSection}>
                        <h3>Performance Metrics</h3>
                        <div className={styles.cwvGrid}>
                          <div className={`${styles.cwvCard} ${getRatingClass(pagespeedResult.coreWebVitals.fcp.rating)}`}>
                            <span className={styles.cwvLabel}>FCP</span>
                            <span className={styles.cwvName}>First Contentful Paint</span>
                            <span className={styles.cwvValue}>{pagespeedResult.coreWebVitals.fcp.displayValue}</span>
                          </div>
                          <div className={`${styles.cwvCard} ${getRatingClass(pagespeedResult.coreWebVitals.lcp.rating)}`}>
                            <span className={styles.cwvLabel}>LCP</span>
                            <span className={styles.cwvName}>Largest Contentful Paint</span>
                            <span className={styles.cwvValue}>{pagespeedResult.coreWebVitals.lcp.displayValue}</span>
                          </div>
                          <div className={`${styles.cwvCard} ${getRatingClass(pagespeedResult.coreWebVitals.tbt.rating)}`}>
                            <span className={styles.cwvLabel}>TBT</span>
                            <span className={styles.cwvName}>Total Blocking Time</span>
                            <span className={styles.cwvValue}>{pagespeedResult.coreWebVitals.tbt.displayValue}</span>
                          </div>
                          <div className={`${styles.cwvCard} ${getRatingClass(pagespeedResult.coreWebVitals.cls.rating)}`}>
                            <span className={styles.cwvLabel}>CLS</span>
                            <span className={styles.cwvName}>Cumulative Layout Shift</span>
                            <span className={styles.cwvValue}>{pagespeedResult.coreWebVitals.cls.displayValue}</span>
                          </div>
                          <div className={`${styles.cwvCard} ${getRatingClass(pagespeedResult.coreWebVitals.si.rating)}`}>
                            <span className={styles.cwvLabel}>SI</span>
                            <span className={styles.cwvName}>Speed Index</span>
                            <span className={styles.cwvValue}>{pagespeedResult.coreWebVitals.si.displayValue}</span>
                          </div>
                          <div className={`${styles.cwvCard} ${getRatingClass(pagespeedResult.coreWebVitals.ttfb.rating)}`}>
                            <span className={styles.cwvLabel}>TTFB</span>
                            <span className={styles.cwvName}>Time to First Byte</span>
                            <span className={styles.cwvValue}>{pagespeedResult.coreWebVitals.ttfb.displayValue}</span>
                          </div>
                        </div>
                        <div className={styles.cwvLegend}>
                          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: "#22c55e" }} /> Good</span>
                          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: "#eab308" }} /> Needs Improvement</span>
                          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: "#ef4444" }} /> Poor</span>
                        </div>
                      </div>
                    )}

                    {/* Opportunities */}
                    {pagespeedResult.opportunities && pagespeedResult.opportunities.length > 0 && (
                      <div className={styles.opportunities}>
                        <h3>Opportunities</h3>
                        <p className={styles.sectionDesc}>These suggestions can help your page load faster.</p>
                        {pagespeedResult.opportunities.map((opp, index) => (
                          <div key={index} className={styles.opportunityItem}>
                            <div className={styles.oppContent}>
                              <div className={styles.oppTitle}>{opp.title}</div>
                            </div>
                            {opp.savings && (
                              <span className={styles.oppSavings}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10"/>
                                  <polyline points="12 6 12 12 16 14"/>
                                </svg>
                                {opp.savings}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Diagnostics */}
                    {pagespeedResult.diagnostics && pagespeedResult.diagnostics.length > 0 && (
                      <div className={styles.diagnostics}>
                        <h3>Diagnostics</h3>
                        <p className={styles.sectionDesc}>More information about the performance of your page.</p>
                        {pagespeedResult.diagnostics.map((diag, index) => (
                          <div key={index} className={styles.diagnosticItem}>
                            <div className={styles.diagContent}>
                              <div className={styles.diagTitle}>{diag.title}</div>
                              {diag.displayValue && (
                                <span className={styles.diagValue}>{diag.displayValue}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Keywords Tab */}
          {activeTab === "keywords" && (
            <div className={styles.tabContent}>
              <div className={styles.toolCard}>
                <div className={styles.toolHeader}>
                  <div className={styles.toolIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/>
                      <path d="m21 21-4.35-4.35"/>
                    </svg>
                  </div>
                  <div>
                    <h2>Keyword Research</h2>
                    <p>Discover high-value keywords for your content strategy</p>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <input
                    type="text"
                    placeholder="Enter a seed keyword (e.g., 'solar panel installation')"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    className={styles.input}
                    onKeyDown={(e) => e.key === "Enter" && handleKeywordResearch()}
                  />
                  <button
                    onClick={handleKeywordResearch}
                    disabled={isResearching || !keywordInput.trim()}
                    className={styles.primaryBtn}
                  >
                    {isResearching ? (
                      <>
                        <div className={styles.btnSpinner} />
                        Researching...
                      </>
                    ) : (
                      "Research"
                    )}
                  </button>
                </div>

                {keywordError && (
                  <div className={styles.errorBanner}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {keywordError}
                  </div>
                )}

                {keywordAnalysis && (
                  <div className={styles.keywordResults}>
                    <div className={styles.keywordHeader}>
                      <h3>Results for &quot;{keywordAnalysis.primaryKeyword}&quot;</h3>
                      <div className={styles.keywordTabs}>
                        <button
                          className={`${styles.kwTabBtn} ${keywordTab === "suggestions" ? styles.active : ""}`}
                          onClick={() => setKeywordTab("suggestions")}
                        >
                          Suggestions ({keywordAnalysis.suggestions.length})
                        </button>
                        <button
                          className={`${styles.kwTabBtn} ${keywordTab === "related" ? styles.active : ""}`}
                          onClick={() => setKeywordTab("related")}
                        >
                          Related ({keywordAnalysis.relatedKeywords.length})
                        </button>
                        <button
                          className={`${styles.kwTabBtn} ${keywordTab === "questions" ? styles.active : ""}`}
                          onClick={() => setKeywordTab("questions")}
                        >
                          Questions ({keywordAnalysis.questions.length})
                        </button>
                        <button
                          className={`${styles.kwTabBtn} ${keywordTab === "longtail" ? styles.active : ""}`}
                          onClick={() => setKeywordTab("longtail")}
                        >
                          Long-tail ({keywordAnalysis.longTail.length})
                        </button>
                      </div>
                    </div>

                    {keywordTab === "suggestions" && (
                      <div className={styles.keywordTable}>
                        <div className={styles.kwTableHeader}>
                          <span>Keyword</span>
                          <span>Volume</span>
                          <span>Difficulty</span>
                          <span>CPC</span>
                          <span>Intent</span>
                        </div>
                        {keywordAnalysis.suggestions.map((s, i) => (
                          <div key={i} className={styles.kwTableRow}>
                            <span className={styles.kwKeyword}>{s.keyword}</span>
                            <span>{s.searchVolume.toLocaleString()}</span>
                            <span>
                              <span
                                className={styles.difficultyBadge}
                                style={{ backgroundColor: `${getDifficultyColor(s.difficulty)}20`, color: getDifficultyColor(s.difficulty) }}
                              >
                                {s.difficulty} {getDifficultyLabel(s.difficulty)}
                              </span>
                            </span>
                            <span>${s.cpc.toFixed(2)}</span>
                            <span className={styles.intentBadge} title={s.intent}>
                              {getIntentIcon(s.intent)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {keywordTab === "related" && (
                      <div className={styles.relatedGrid}>
                        {keywordAnalysis.relatedKeywords.map((r, i) => (
                          <div key={i} className={styles.relatedCard}>
                            <span className={styles.relatedKeyword}>{r.keyword}</span>
                            <div className={styles.relevanceBar}>
                              <div className={styles.relevanceFill} style={{ width: `${r.relevance}%` }} />
                            </div>
                            <span className={styles.relevanceLabel}>{r.relevance}% relevant</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {keywordTab === "questions" && (
                      <div className={styles.questionsList}>
                        {keywordAnalysis.questions.map((q, i) => (
                          <div key={i} className={styles.questionItem}>
                            <span className={styles.questionIcon}>?</span>
                            <span>{q}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {keywordTab === "longtail" && (
                      <div className={styles.longTailList}>
                        {keywordAnalysis.longTail.map((lt, i) => (
                          <div key={i} className={styles.longTailItem}>
                            <span>{lt}</span>
                            <span className={styles.wordCount}>{lt.split(" ").length} words</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!keywordAnalysis && !isResearching && (
                  <div className={styles.emptyKeywords}>
                    <p>Enter a keyword above to discover related keywords, search volumes, and content opportunities.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ads Tab */}
          {activeTab === "ads" && (
            <div className={styles.tabContent}>
              <div className={styles.toolCard}>
                <div className={styles.toolHeader}>
                  <div className={styles.toolIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                    </svg>
                  </div>
                  <div>
                    <h2>Ad Management</h2>
                    <p>View campaign performance and advertising insights</p>
                  </div>
                </div>

                {adsLoading && (
                  <div className={styles.loading}>
                    <div className={styles.spinner} />
                    <span>Loading ad data...</span>
                  </div>
                )}

                {adsError && (
                  <div className={styles.errorBanner}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {adsError}
                  </div>
                )}

                {!adsConnected && !adsLoading && (
                  <div className={styles.notConnected}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                    </svg>
                    <h3>Connect Search Ads 360</h3>
                    <p>Connect your Google Ads account to view campaign performance and ad insights.</p>
                    <button onClick={handleConnectAds} className={styles.primaryBtn}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                      </svg>
                      Connect Google Ads
                    </button>
                  </div>
                )}

                {adsConnected && !adsData && !adsLoading && !adsError && (
                  <div className={styles.notConnected}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                    </svg>
                    <h3>No Campaign Data</h3>
                    <p>Connected as {adsConnectedEmail}. No campaigns found or select an advertiser account.</p>
                    <button onClick={fetchAdsData} className={styles.primaryBtn}>
                      Refresh Data
                    </button>
                  </div>
                )}

                {adsData && (
                  <div className={styles.adsResults}>
                    <div className={styles.adsDateRange}>
                      {adsData.dateRange.startDate} to {adsData.dateRange.endDate}
                    </div>

                    <div className={styles.adsSummary}>
                      <div className={styles.adsStat}>
                        <span className={styles.adsStatValue}>{adsData.totalClicks.toLocaleString()}</span>
                        <span className={styles.adsStatLabel}>Clicks</span>
                      </div>
                      <div className={styles.adsStat}>
                        <span className={styles.adsStatValue}>{adsData.totalImpressions.toLocaleString()}</span>
                        <span className={styles.adsStatLabel}>Impressions</span>
                      </div>
                      <div className={styles.adsStat}>
                        <span className={styles.adsStatValue}>${adsData.totalCost.toFixed(2)}</span>
                        <span className={styles.adsStatLabel}>Cost</span>
                      </div>
                      <div className={styles.adsStat}>
                        <span className={styles.adsStatValue}>{adsData.totalConversions}</span>
                        <span className={styles.adsStatLabel}>Conversions</span>
                      </div>
                      <div className={styles.adsStat}>
                        <span className={styles.adsStatValue}>{(adsData.avgCtr * 100).toFixed(2)}%</span>
                        <span className={styles.adsStatLabel}>CTR</span>
                      </div>
                      <div className={styles.adsStat}>
                        <span className={styles.adsStatValue}>${adsData.avgCpc.toFixed(2)}</span>
                        <span className={styles.adsStatLabel}>Avg CPC</span>
                      </div>
                    </div>

                    {adsData.campaigns.length > 0 && (
                      <div className={styles.campaignsList}>
                        <h3>Campaigns</h3>
                        <div className={styles.campaignTable}>
                          <div className={styles.campaignHeader}>
                            <span>Campaign</span>
                            <span>Clicks</span>
                            <span>Impr.</span>
                            <span>Cost</span>
                            <span>Conv.</span>
                            <span>CTR</span>
                          </div>
                          {adsData.campaigns.map((c, i) => (
                            <div key={i} className={styles.campaignRow}>
                              <span className={styles.campaignName}>{c.campaignName}</span>
                              <span>{c.clicks.toLocaleString()}</span>
                              <span>{c.impressions.toLocaleString()}</span>
                              <span>${c.cost.toFixed(2)}</span>
                              <span>{c.conversions}</span>
                              <span>{(c.ctr * 100).toFixed(2)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
