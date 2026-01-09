// components/seo/GeoGridRankTracker/GeoGridChart.tsx
// Weekly trend charts

import React, { useState, useEffect, useMemo } from "react";
import styles from "./GeoGridRankTracker.module.css";
import type { Keyword } from "./index";

interface WeeklyData {
  weekNumber: number;
  year: number;
  weekLabel: string;
  avgRank: number | null;
  bestRank: number | null;
  worstRank: number | null;
  visibilityScore: number;
  pointsTop3: number;
  pointsTop10: number;
  pointsTop20: number;
  pointsRanking: number;
  pointsNotFound: number;
  totalPoints: number;
  pointsInLocalPack: number;
}

interface KeywordStats {
  keywordId: string;
  keyword: string;
  data: WeeklyData[];
}

interface GeoGridChartProps {
  configId: string;
  keywords: Keyword[];
  selectedKeywordId: string | null;
  onSelectKeyword: (keywordId: string) => void;
}

type MetricType = "avgRank" | "visibilityScore" | "top10Coverage";

export function GeoGridChart({
  configId,
  keywords,
  selectedKeywordId,
  onSelectKeyword
}: GeoGridChartProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<KeywordStats[]>([]);
  const [metric, setMetric] = useState<MetricType>("avgRank");

  useEffect(() => {
    if (!configId) return;
    fetchStats();
  }, [configId]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/geo-grid/stats/weekly?configId=${configId}&weeks=12`);
      if (!response.ok) throw new Error("Failed to fetch stats");
      const data = await response.json();
      setStats(data.keywords || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trend data");
    } finally {
      setLoading(false);
    }
  };

  const selectedStats = useMemo(() => {
    return stats.find(s => s.keywordId === selectedKeywordId);
  }, [stats, selectedKeywordId]);

  const chartData = useMemo(() => {
    if (!selectedStats?.data) return [];
    return selectedStats.data;
  }, [selectedStats]);

  // Calculate chart dimensions
  const chartHeight = 200;
  const chartWidth = 600;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Get values for selected metric
  const getMetricValue = (d: WeeklyData): number | null => {
    switch (metric) {
      case "avgRank":
        return d.avgRank;
      case "visibilityScore":
        return d.visibilityScore;
      case "top10Coverage":
        return d.totalPoints > 0 ? (d.pointsTop10 / d.totalPoints) * 100 : 0;
      default:
        return null;
    }
  };

  const metricLabel: Record<MetricType, string> = {
    avgRank: "Average Rank",
    visibilityScore: "Visibility Score",
    top10Coverage: "Top 10 Coverage %"
  };

  // Calculate scales
  const values = chartData.map(d => getMetricValue(d)).filter((v): v is number => v !== null);
  const minValue = values.length > 0 ? Math.min(...values) : 0;
  const maxValue = values.length > 0 ? Math.max(...values) : 100;
  const valueRange = maxValue - minValue || 1;

  // For rank, lower is better (invert scale)
  const invertY = metric === "avgRank";

  const getY = (value: number | null): number => {
    if (value === null) return innerHeight;
    const normalized = (value - minValue) / valueRange;
    return invertY
      ? padding.top + normalized * innerHeight
      : padding.top + (1 - normalized) * innerHeight;
  };

  const getX = (index: number): number => {
    if (chartData.length <= 1) return padding.left + innerWidth / 2;
    return padding.left + (index / (chartData.length - 1)) * innerWidth;
  };

  // Generate path
  const linePath = useMemo(() => {
    if (chartData.length === 0) return "";

    return chartData
      .map((d, i) => {
        const value = getMetricValue(d);
        const x = getX(i);
        const y = getY(value);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  }, [chartData, metric]);

  if (loading) {
    return (
      <div className={styles.chartLoading}>
        <div className={styles.spinner} />
        <p>Loading trend data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.chartError}>
        <p>{error}</p>
        <button onClick={fetchStats} className={styles.btnSecondary}>
          Retry
        </button>
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className={styles.chartEmpty}>
        <p>No historical data yet. Run scans to track your rankings over time.</p>
      </div>
    );
  }

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartControls}>
        <div className={styles.keywordSelector}>
          <label>Keyword:</label>
          <select
            value={selectedKeywordId || ""}
            onChange={e => onSelectKeyword(e.target.value)}
          >
            {keywords.map(kw => (
              <option key={kw.id} value={kw.id}>
                {kw.keyword}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.metricSelector}>
          <label>Metric:</label>
          <select
            value={metric}
            onChange={e => setMetric(e.target.value as MetricType)}
          >
            <option value="avgRank">Average Rank</option>
            <option value="visibilityScore">Visibility Score</option>
            <option value="top10Coverage">Top 10 Coverage %</option>
          </select>
        </div>
      </div>

      {selectedStats && chartData.length > 0 ? (
        <div className={styles.chart}>
          <h4 className={styles.chartTitle}>{metricLabel[metric]} Over Time</h4>

          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className={styles.chartSvg}
          >
            {/* Y-axis */}
            <line
              x1={padding.left}
              y1={padding.top}
              x2={padding.left}
              y2={chartHeight - padding.bottom}
              stroke="var(--border-color, #e5e7eb)"
              strokeWidth="1"
            />

            {/* X-axis */}
            <line
              x1={padding.left}
              y1={chartHeight - padding.bottom}
              x2={chartWidth - padding.right}
              y2={chartHeight - padding.bottom}
              stroke="var(--border-color, #e5e7eb)"
              strokeWidth="1"
            />

            {/* Y-axis labels */}
            <text
              x={padding.left - 10}
              y={padding.top}
              textAnchor="end"
              fontSize="10"
              fill="var(--text-secondary, #6b7280)"
            >
              {invertY ? minValue.toFixed(0) : maxValue.toFixed(0)}
            </text>
            <text
              x={padding.left - 10}
              y={chartHeight - padding.bottom}
              textAnchor="end"
              fontSize="10"
              fill="var(--text-secondary, #6b7280)"
            >
              {invertY ? maxValue.toFixed(0) : minValue.toFixed(0)}
            </text>

            {/* Data line */}
            <path
              d={linePath}
              fill="none"
              stroke="var(--primary-color, #3b82f6)"
              strokeWidth="2"
            />

            {/* Data points */}
            {chartData.map((d, i) => {
              const value = getMetricValue(d);
              return (
                <g key={i}>
                  <circle
                    cx={getX(i)}
                    cy={getY(value)}
                    r="4"
                    fill="var(--primary-color, #3b82f6)"
                  />
                  {/* X-axis labels */}
                  {(i === 0 || i === chartData.length - 1 || chartData.length < 8) && (
                    <text
                      x={getX(i)}
                      y={chartHeight - padding.bottom + 15}
                      textAnchor="middle"
                      fontSize="9"
                      fill="var(--text-secondary, #6b7280)"
                    >
                      {d.weekLabel}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Summary stats */}
          <div className={styles.chartSummary}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Latest</span>
              <span className={styles.summaryValue}>
                {chartData.length > 0 ? getMetricValue(chartData[chartData.length - 1])?.toFixed(1) || "N/A" : "N/A"}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Best</span>
              <span className={styles.summaryValue}>
                {metric === "avgRank"
                  ? Math.min(...values).toFixed(1)
                  : Math.max(...values).toFixed(1)}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Change</span>
              <span className={styles.summaryValue}>
                {chartData.length > 1
                  ? (() => {
                      const first = getMetricValue(chartData[0]);
                      const last = getMetricValue(chartData[chartData.length - 1]);
                      if (first === null || last === null) return "N/A";
                      const change = last - first;
                      const sign = change > 0 ? "+" : "";
                      return `${sign}${change.toFixed(1)}`;
                    })()
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.chartEmpty}>
          <p>Select a keyword to view its trend chart.</p>
        </div>
      )}

      {/* Weekly breakdown table */}
      {selectedStats && chartData.length > 0 && (
        <div className={styles.weeklyTable}>
          <h4 className={styles.tableTitle}>Weekly Breakdown</h4>
          <table>
            <thead>
              <tr>
                <th>Week</th>
                <th>Avg Rank</th>
                <th>Best</th>
                <th>Top 3</th>
                <th>Top 10</th>
                <th>Not Found</th>
                <th>Visibility</th>
              </tr>
            </thead>
            <tbody>
              {[...chartData].reverse().map((d, i) => (
                <tr key={i}>
                  <td>{d.weekLabel}</td>
                  <td>{d.avgRank?.toFixed(1) || "N/A"}</td>
                  <td>{d.bestRank || "N/A"}</td>
                  <td>{d.pointsTop3}/{d.totalPoints}</td>
                  <td>{d.pointsTop10}/{d.totalPoints}</td>
                  <td>{d.pointsNotFound}</td>
                  <td>{d.visibilityScore.toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
