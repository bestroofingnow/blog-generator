// pages/seo-tools.tsx
// Comprehensive SEO Tools page with Google Search Console integration

import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../lib/auth-context";
import { GoogleSearchConsoleConnect } from "../components/seo/GoogleSearchConsoleConnect";
import { SEODashboard } from "../components/seo/SEODashboard";
import styles from "../styles/SEOTools.module.css";

type SEOTab = "connect" | "dashboard" | "indexing" | "pagespeed" | "rankings";

interface IndexingResult {
  url: string;
  status: "pending" | "success" | "error";
  message?: string;
}

interface PageSpeedResult {
  url: string;
  performanceScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  seoScore: number;
  coreWebVitals?: {
    lcp: { value: number; rating: string };
    fid: { value: number; rating: string };
    cls: { value: number; rating: string };
    fcp: { value: number; rating: string };
    ttfb: { value: number; rating: string };
  };
  opportunities: Array<{ title: string; description: string; savings: string }>;
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

  // Check connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch("/api/seo/connection");
        const data = await response.json();
        setIsConnected(data.connected && data.connectedSiteUrl);
        if (data.connected && data.connectedSiteUrl) {
          setActiveTab("dashboard");
        }
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
    switch (rating.toLowerCase()) {
      case "good": return styles.ratingGood;
      case "needs_improvement":
      case "needs improvement": return styles.ratingWarning;
      case "poor": return styles.ratingPoor;
      default: return "";
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

                    {pagespeedResult.coreWebVitals && (
                      <div className={styles.cwvSection}>
                        <h3>Core Web Vitals</h3>
                        <div className={styles.cwvGrid}>
                          <div className={`${styles.cwvCard} ${getRatingClass(pagespeedResult.coreWebVitals.lcp.rating)}`}>
                            <span className={styles.cwvLabel}>LCP</span>
                            <span className={styles.cwvName}>Largest Contentful Paint</span>
                            <span className={styles.cwvValue}>{(pagespeedResult.coreWebVitals.lcp.value / 1000).toFixed(1)}s</span>
                          </div>
                          <div className={`${styles.cwvCard} ${getRatingClass(pagespeedResult.coreWebVitals.fid?.rating || "good")}`}>
                            <span className={styles.cwvLabel}>FID</span>
                            <span className={styles.cwvName}>First Input Delay</span>
                            <span className={styles.cwvValue}>{pagespeedResult.coreWebVitals.fid?.value || 0}ms</span>
                          </div>
                          <div className={`${styles.cwvCard} ${getRatingClass(pagespeedResult.coreWebVitals.cls.rating)}`}>
                            <span className={styles.cwvLabel}>CLS</span>
                            <span className={styles.cwvName}>Cumulative Layout Shift</span>
                            <span className={styles.cwvValue}>{pagespeedResult.coreWebVitals.cls.value.toFixed(3)}</span>
                          </div>
                          <div className={`${styles.cwvCard} ${getRatingClass(pagespeedResult.coreWebVitals.fcp.rating)}`}>
                            <span className={styles.cwvLabel}>FCP</span>
                            <span className={styles.cwvName}>First Contentful Paint</span>
                            <span className={styles.cwvValue}>{(pagespeedResult.coreWebVitals.fcp.value / 1000).toFixed(1)}s</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {pagespeedResult.opportunities && pagespeedResult.opportunities.length > 0 && (
                      <div className={styles.opportunities}>
                        <h3>Opportunities</h3>
                        {pagespeedResult.opportunities.slice(0, 5).map((opp, index) => (
                          <div key={index} className={styles.opportunityItem}>
                            <div className={styles.oppTitle}>{opp.title}</div>
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
