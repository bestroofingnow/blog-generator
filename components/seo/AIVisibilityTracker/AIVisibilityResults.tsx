// components/seo/AIVisibilityTracker/AIVisibilityResults.tsx
// Results table showing per-query per-platform results

import React, { useState } from "react";
import styles from "./AIVisibilityTracker.module.css";
import { VisibilityConfiguration, ScanResult, TrackingQuery } from "./index";

interface Props {
  config: VisibilityConfiguration;
  results: ScanResult[];
  queries: TrackingQuery[];
}

const PLATFORM_INFO: Record<string, { name: string; icon: string }> = {
  chatgpt: { name: "ChatGPT", icon: "🤖" },
  perplexity: { name: "Perplexity", icon: "🔍" },
  google_aio: { name: "Google AI", icon: "🔮" },
  claude: { name: "Claude", icon: "🧠" },
  gemini: { name: "Gemini", icon: "✨" },
};

export function AIVisibilityResults({ config, results, queries }: Props) {
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterMentioned, setFilterMentioned] = useState<string>("all");
  const [expandedResult, setExpandedResult] = useState<string | null>(null);

  const platforms = Array.from(new Set(results.map((r) => r.platform)));

  const filteredResults = results.filter((r) => {
    if (filterPlatform !== "all" && r.platform !== filterPlatform) return false;
    if (filterMentioned === "mentioned" && !r.isMentioned) return false;
    if (filterMentioned === "not_mentioned" && r.isMentioned) return false;
    return true;
  });

  const getSentimentColor = (score: number | null) => {
    if (score === null) return "#6b7280";
    if (score >= 0.5) return "#22c55e";
    if (score >= 0) return "#eab308";
    return "#ef4444";
  };

  const getSentimentLabel = (score: number | null) => {
    if (score === null) return "N/A";
    if (score >= 0.5) return "Positive";
    if (score >= 0) return "Neutral";
    return "Negative";
  };

  return (
    <div className={styles.resultsContainer}>
      <div className={styles.resultsHeader}>
        <h3>Scan Results for {config.brandName}</h3>
        <div className={styles.resultFilters}>
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Platforms</option>
            {platforms.map((p) => (
              <option key={p} value={p}>
                {PLATFORM_INFO[p]?.icon} {PLATFORM_INFO[p]?.name || p}
              </option>
            ))}
          </select>
          <select
            value={filterMentioned}
            onChange={(e) => setFilterMentioned(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Results</option>
            <option value="mentioned">Mentioned Only</option>
            <option value="not_mentioned">Not Mentioned</option>
          </select>
        </div>
      </div>

      {filteredResults.length > 0 ? (
        <div className={styles.resultsTable}>
          <div className={styles.tableHeader}>
            <span className={styles.colQuery}>Query</span>
            <span className={styles.colPlatform}>Platform</span>
            <span className={styles.colMentioned}>Mentioned</span>
            <span className={styles.colCitation}>Citation</span>
            <span className={styles.colSentiment}>Sentiment</span>
            <span className={styles.colActions}>Details</span>
          </div>

          {filteredResults.map((result) => {
            const platformInfo = PLATFORM_INFO[result.platform] || { name: result.platform, icon: "🤖" };
            const isExpanded = expandedResult === result.id;

            return (
              <div key={result.id} className={styles.resultRow}>
                <div className={styles.resultMain}>
                  <span className={styles.colQuery}>{result.queryText}</span>
                  <span className={styles.colPlatform}>
                    {platformInfo.icon} {platformInfo.name}
                  </span>
                  <span className={`${styles.colMentioned} ${result.isMentioned ? styles.yes : styles.no}`}>
                    {result.isMentioned ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {result.mentionPosition && `#${result.mentionPosition}`}
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        No
                      </>
                    )}
                  </span>
                  <span className={`${styles.colCitation} ${result.hasCitation ? styles.yes : styles.no}`}>
                    {result.hasCitation ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                    ) : (
                      "—"
                    )}
                  </span>
                  <span className={styles.colSentiment}>
                    <span
                      className={styles.sentimentDot}
                      style={{ backgroundColor: getSentimentColor(result.sentimentScore) }}
                    />
                    {getSentimentLabel(result.sentimentScore)}
                  </span>
                  <span className={styles.colActions}>
                    <button
                      className={styles.expandBtn}
                      onClick={() => setExpandedResult(isExpanded ? null : result.id)}
                    >
                      {isExpanded ? "Hide" : "Show"}
                    </button>
                  </span>
                </div>

                {isExpanded && (
                  <div className={styles.resultDetails}>
                    {result.mentionContext && (
                      <div className={styles.detailItem}>
                        <strong>Context:</strong> {result.mentionContext}
                      </div>
                    )}
                    {result.citationUrl && (
                      <div className={styles.detailItem}>
                        <strong>Citation URL:</strong>{" "}
                        <a href={result.citationUrl} target="_blank" rel="noopener noreferrer">
                          {result.citationUrl}
                        </a>
                      </div>
                    )}
                    {result.hasHallucination && (
                      <div className={styles.detailItem + " " + styles.warning}>
                        <strong>Hallucination Detected:</strong> {result.hallucinationDetails}
                      </div>
                    )}
                    {result.competitorsMentioned && result.competitorsMentioned.length > 0 && (
                      <div className={styles.detailItem}>
                        <strong>Competitors Mentioned:</strong> {result.competitorsMentioned.join(", ")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyResults}>
          <p>No results match your filters.</p>
        </div>
      )}

      {/* Summary Stats */}
      {results.length > 0 && (
        <div className={styles.resultsSummary}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryNumber}>
              {results.filter((r) => r.isMentioned).length}/{results.length}
            </span>
            <span className={styles.summaryText}>Mentioned</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryNumber}>{results.filter((r) => r.hasCitation).length}</span>
            <span className={styles.summaryText}>Citations</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryNumber}>{results.filter((r) => r.hasHallucination).length}</span>
            <span className={styles.summaryText}>Hallucinations</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIVisibilityResults;
