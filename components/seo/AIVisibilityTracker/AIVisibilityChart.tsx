// components/seo/AIVisibilityTracker/AIVisibilityChart.tsx
// Weekly trend charts for AI visibility metrics

import React, { useState } from "react";
import styles from "./AIVisibilityTracker.module.css";
import { WeeklyTrend, PlatformSummary } from "./index";

interface Props {
  configId: string;
  weeklyTrends: WeeklyTrend[];
  platformSummary: PlatformSummary[];
}

const PLATFORM_COLORS: Record<string, string> = {
  chatgpt: "#10a37f",
  perplexity: "#1a73e8",
  google_aio: "#4285f4",
  claude: "#d97757",
  gemini: "#886ce4",
};

const PLATFORM_NAMES: Record<string, string> = {
  chatgpt: "ChatGPT",
  perplexity: "Perplexity",
  google_aio: "Google AI",
  claude: "Claude",
  gemini: "Gemini",
};

export function AIVisibilityChart({ configId, weeklyTrends, platformSummary }: Props) {
  const [selectedMetric, setSelectedMetric] = useState<"mentionRate" | "citationRate" | "avgSentiment">("mentionRate");

  // Group trends by week
  const weeklyData = new Map<string, Record<string, number>>();
  for (const trend of weeklyTrends) {
    const weekKey = `W${trend.weekNumber} ${trend.year}`;
    if (!weeklyData.has(weekKey)) {
      weeklyData.set(weekKey, {});
    }
    weeklyData.get(weekKey)![trend.platform] = trend[selectedMetric];
  }

  const weeks = Array.from(weeklyData.keys()).slice(-8); // Last 8 weeks
  const platforms = Array.from(new Set(weeklyTrends.map((t) => t.platform)));

  // Calculate max value for scaling
  const allValues = weeklyTrends.map((t) => t[selectedMetric]);
  const maxValue = Math.max(...allValues, 1);

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case "mentionRate":
        return "Mention Rate (%)";
      case "citationRate":
        return "Citation Rate (%)";
      case "avgSentiment":
        return "Avg Sentiment (-1 to 1)";
      default:
        return metric;
    }
  };

  const formatValue = (value: number, metric: string) => {
    if (metric === "avgSentiment") {
      return value.toFixed(2);
    }
    return `${Math.round(value)}%`;
  };

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3>Visibility Trends Over Time</h3>
        <div className={styles.metricSelector}>
          <button
            className={`${styles.metricBtn} ${selectedMetric === "mentionRate" ? styles.active : ""}`}
            onClick={() => setSelectedMetric("mentionRate")}
          >
            Mention Rate
          </button>
          <button
            className={`${styles.metricBtn} ${selectedMetric === "citationRate" ? styles.active : ""}`}
            onClick={() => setSelectedMetric("citationRate")}
          >
            Citation Rate
          </button>
          <button
            className={`${styles.metricBtn} ${selectedMetric === "avgSentiment" ? styles.active : ""}`}
            onClick={() => setSelectedMetric("avgSentiment")}
          >
            Sentiment
          </button>
        </div>
      </div>

      {weeks.length > 0 ? (
        <>
          <div className={styles.chartArea}>
            <div className={styles.yAxis}>
              <span>{selectedMetric === "avgSentiment" ? "1.0" : "100%"}</span>
              <span>{selectedMetric === "avgSentiment" ? "0.5" : "75%"}</span>
              <span>{selectedMetric === "avgSentiment" ? "0" : "50%"}</span>
              <span>{selectedMetric === "avgSentiment" ? "-0.5" : "25%"}</span>
              <span>{selectedMetric === "avgSentiment" ? "-1.0" : "0%"}</span>
            </div>
            <div className={styles.chartBars}>
              {weeks.map((week) => {
                const data = weeklyData.get(week) || {};
                return (
                  <div key={week} className={styles.weekColumn}>
                    <div className={styles.barGroup}>
                      {platforms.map((platform) => {
                        const value = data[platform] || 0;
                        let height: number;
                        if (selectedMetric === "avgSentiment") {
                          // Sentiment ranges from -1 to 1, normalize to 0-100
                          height = ((value + 1) / 2) * 100;
                        } else {
                          height = (value / 100) * 100;
                        }
                        return (
                          <div
                            key={platform}
                            className={styles.bar}
                            style={{
                              height: `${Math.max(height, 2)}%`,
                              backgroundColor: PLATFORM_COLORS[platform] || "#6b7280",
                            }}
                            title={`${PLATFORM_NAMES[platform] || platform}: ${formatValue(value, selectedMetric)}`}
                          />
                        );
                      })}
                    </div>
                    <span className={styles.weekLabel}>{week}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.chartLegend}>
            {platforms.map((platform) => (
              <div key={platform} className={styles.legendItem}>
                <span
                  className={styles.legendColor}
                  style={{ backgroundColor: PLATFORM_COLORS[platform] || "#6b7280" }}
                />
                <span>{PLATFORM_NAMES[platform] || platform}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className={styles.emptyChart}>
          <p>No trend data available yet. Run scans weekly to track visibility over time.</p>
        </div>
      )}

      {/* Platform Comparison Table */}
      {platformSummary.length > 0 && (
        <div className={styles.comparisonTable}>
          <h4>Platform Comparison</h4>
          <table>
            <thead>
              <tr>
                <th>Platform</th>
                <th>Mention Rate</th>
                <th>Citation Rate</th>
                <th>Sentiment</th>
                <th>Visibility Score</th>
              </tr>
            </thead>
            <tbody>
              {platformSummary.map((p) => (
                <tr key={p.platform}>
                  <td>
                    <span
                      className={styles.platformDot}
                      style={{ backgroundColor: PLATFORM_COLORS[p.platform] || "#6b7280" }}
                    />
                    {PLATFORM_NAMES[p.platform] || p.platform}
                  </td>
                  <td>{p.mentionRate}%</td>
                  <td>{p.citationRate}%</td>
                  <td>{p.avgSentiment.toFixed(2)}</td>
                  <td>
                    <span className={styles.scoreValue}>{Math.round(p.visibilityScore)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recommendations */}
      <div className={styles.recommendations}>
        <h4>Optimization Tips</h4>
        <ul>
          <li>
            <strong>Improve mentions:</strong> Ensure your brand is mentioned in industry publications and
            authoritative sources that AI models train on.
          </li>
          <li>
            <strong>Increase citations:</strong> Create comprehensive, well-structured content with clear
            facts and statistics that AI can reference.
          </li>
          <li>
            <strong>Monitor hallucinations:</strong> Regularly check AI responses for inaccurate claims
            about your brand and address them through official channels.
          </li>
          <li>
            <strong>Boost sentiment:</strong> Actively manage your online reputation and respond to
            negative reviews or mentions.
          </li>
        </ul>
      </div>
    </div>
  );
}

export default AIVisibilityChart;
