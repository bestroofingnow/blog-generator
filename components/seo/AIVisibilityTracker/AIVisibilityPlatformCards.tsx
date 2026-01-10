// components/seo/AIVisibilityTracker/AIVisibilityPlatformCards.tsx
// Platform visibility cards showing metrics per AI platform

import React from "react";
import styles from "./AIVisibilityTracker.module.css";
import { VisibilityConfiguration, PlatformSummary, Scan } from "./index";

interface Props {
  config: VisibilityConfiguration;
  platformSummary: PlatformSummary[];
  scans: Scan[];
  onLoadResults: (scanId: string) => void;
  loading: boolean;
}

const PLATFORM_INFO: Record<string, { name: string; icon: string; color: string }> = {
  chatgpt: { name: "ChatGPT", icon: "🤖", color: "#10a37f" },
  perplexity: { name: "Perplexity", icon: "🔍", color: "#1a73e8" },
  google_aio: { name: "Google AI", icon: "🔮", color: "#4285f4" },
  claude: { name: "Claude", icon: "🧠", color: "#d97757" },
  gemini: { name: "Gemini", icon: "✨", color: "#886ce4" },
};

export function AIVisibilityPlatformCards({
  config,
  platformSummary,
  scans,
  onLoadResults,
  loading,
}: Props) {
  const getScoreColor = (score: number) => {
    if (score >= 70) return "#22c55e";
    if (score >= 40) return "#eab308";
    return "#ef4444";
  };

  const getSentimentLabel = (sentiment: number) => {
    if (sentiment >= 0.5) return { text: "Positive", color: "#22c55e" };
    if (sentiment >= 0) return { text: "Neutral", color: "#6b7280" };
    return { text: "Negative", color: "#ef4444" };
  };

  const completedScans = scans.filter((s) => s.status === "completed");
  const latestScan = completedScans[0];

  return (
    <div className={styles.platformsContainer}>
      <div className={styles.platformsHeader}>
        <h3>Platform Performance for {config.brandName}</h3>
        {latestScan && (
          <span className={styles.lastScan}>
            Last scan: {new Date(latestScan.completedAt || latestScan.startedAt || "").toLocaleDateString()}
          </span>
        )}
      </div>

      {platformSummary.length > 0 ? (
        <>
          <div className={styles.platformCards}>
            {platformSummary.map((platform) => {
              const info = PLATFORM_INFO[platform.platform] || {
                name: platform.platform,
                icon: "🤖",
                color: "#6b7280",
              };
              const sentiment = getSentimentLabel(platform.avgSentiment);

              return (
                <div
                  key={platform.platform}
                  className={styles.platformCard}
                  style={{ borderTopColor: info.color }}
                >
                  <div className={styles.platformHeader}>
                    <span className={styles.platformIcon}>{info.icon}</span>
                    <span className={styles.platformName}>{info.name}</span>
                  </div>

                  <div className={styles.visibilityScore}>
                    <div
                      className={styles.scoreCircle}
                      style={{ borderColor: getScoreColor(platform.visibilityScore) }}
                    >
                      <span style={{ color: getScoreColor(platform.visibilityScore) }}>
                        {Math.round(platform.visibilityScore)}
                      </span>
                    </div>
                    <span className={styles.scoreLabel}>Visibility Score</span>
                  </div>

                  <div className={styles.platformMetrics}>
                    <div className={styles.metric}>
                      <span className={styles.metricLabel}>Mention Rate</span>
                      <div className={styles.metricBar}>
                        <div
                          className={styles.metricFill}
                          style={{
                            width: `${platform.mentionRate}%`,
                            backgroundColor: getScoreColor(platform.mentionRate),
                          }}
                        />
                      </div>
                      <span className={styles.metricValue}>{platform.mentionRate}%</span>
                    </div>

                    <div className={styles.metric}>
                      <span className={styles.metricLabel}>Citation Rate</span>
                      <div className={styles.metricBar}>
                        <div
                          className={styles.metricFill}
                          style={{
                            width: `${platform.citationRate}%`,
                            backgroundColor: getScoreColor(platform.citationRate),
                          }}
                        />
                      </div>
                      <span className={styles.metricValue}>{platform.citationRate}%</span>
                    </div>

                    <div className={styles.metric}>
                      <span className={styles.metricLabel}>Sentiment</span>
                      <span className={styles.sentimentBadge} style={{ color: sentiment.color }}>
                        {sentiment.text}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Overall Summary */}
          <div className={styles.overallSummary}>
            <h4>Overall AI Visibility</h4>
            <div className={styles.summaryStats}>
              <div className={styles.summaryStat}>
                <span className={styles.summaryValue}>
                  {Math.round(
                    platformSummary.reduce((sum, p) => sum + p.mentionRate, 0) / platformSummary.length
                  )}%
                </span>
                <span className={styles.summaryLabel}>Avg Mention Rate</span>
              </div>
              <div className={styles.summaryStat}>
                <span className={styles.summaryValue}>
                  {Math.round(
                    platformSummary.reduce((sum, p) => sum + p.citationRate, 0) / platformSummary.length
                  )}%
                </span>
                <span className={styles.summaryLabel}>Avg Citation Rate</span>
              </div>
              <div className={styles.summaryStat}>
                <span className={styles.summaryValue}>
                  {Math.round(
                    platformSummary.reduce((sum, p) => sum + p.visibilityScore, 0) / platformSummary.length
                  )}
                </span>
                <span className={styles.summaryLabel}>Avg Visibility Score</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className={styles.emptyPlatforms}>
          <div className={styles.emptyIcon}>📊</div>
          <h4>No scan data yet</h4>
          <p>Run your first AI visibility scan to see platform performance metrics.</p>
        </div>
      )}

      {/* Recent Scans */}
      {completedScans.length > 0 && (
        <div className={styles.recentScans}>
          <h4>Recent Scans</h4>
          <div className={styles.scanList}>
            {completedScans.slice(0, 5).map((scan) => (
              <div key={scan.id} className={styles.scanItem}>
                <div className={styles.scanInfo}>
                  <span className={styles.scanDate}>
                    {new Date(scan.completedAt || scan.startedAt || "").toLocaleDateString()}
                  </span>
                  <span className={styles.scanStats}>
                    {scan.completedQueries} queries • Week {scan.weekNumber}
                  </span>
                </div>
                <button
                  className={styles.btnSmall}
                  onClick={() => onLoadResults(scan.id)}
                  disabled={loading}
                >
                  View Results
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AIVisibilityPlatformCards;
