// components/seo/GeoGridRankTracker/GeoGridHistory.tsx
// Historical scans list

import React from "react";
import styles from "./GeoGridRankTracker.module.css";
import type { Scan } from "./index";

interface GeoGridHistoryProps {
  scans: Scan[];
  onLoadResults: (scanId: string) => void;
  loading: boolean;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function getStatusBadge(status: Scan["status"]) {
  const statusStyles: Record<string, { bg: string; text: string }> = {
    pending: { bg: "#fef3c7", text: "#92400e" },
    running: { bg: "#dbeafe", text: "#1e40af" },
    completed: { bg: "#dcfce7", text: "#166534" },
    failed: { bg: "#fee2e2", text: "#991b1b" }
  };

  const style = statusStyles[status] || statusStyles.pending;

  return (
    <span
      className={styles.statusBadge}
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {status}
    </span>
  );
}

export function GeoGridHistory({
  scans,
  onLoadResults,
  loading
}: GeoGridHistoryProps) {
  if (scans.length === 0) {
    return (
      <div className={styles.historyEmpty}>
        <p>No scan history yet. Run your first scan to start tracking rankings over time.</p>
      </div>
    );
  }

  return (
    <div className={styles.historyContainer}>
      <h3 className={styles.sectionTitle}>Scan History</h3>

      <div className={styles.historyList}>
        {scans.map(scan => (
          <div key={scan.id} className={styles.historyItem}>
            <div className={styles.historyItemHeader}>
              <div className={styles.historyItemDate}>
                {formatDate(scan.createdAt)}
              </div>
              {getStatusBadge(scan.status)}
            </div>

            <div className={styles.historyItemDetails}>
              <span>Week {scan.weekNumber}, {scan.year}</span>
              <span>{scan.gridSize}×{scan.gridSize} grid</span>
              <span>{scan.radiusMiles}mi radius</span>
            </div>

            <div className={styles.historyItemStats}>
              <div>
                <span className={styles.statLabel}>Points:</span>
                <span className={styles.statValue}>
                  {scan.pointsCompleted}/{scan.totalPoints}
                </span>
              </div>
              <div>
                <span className={styles.statLabel}>API Calls:</span>
                <span className={styles.statValue}>{scan.apiCallsMade}</span>
              </div>
              {scan.errorCount > 0 && (
                <div className={styles.errorStat}>
                  <span className={styles.statLabel}>Errors:</span>
                  <span className={styles.statValue}>{scan.errorCount}</span>
                </div>
              )}
            </div>

            {scan.status === "completed" && (
              <button
                className={styles.btnSecondary}
                onClick={() => onLoadResults(scan.id)}
                disabled={loading}
              >
                View Results
              </button>
            )}

            {scan.status === "running" && (
              <div className={styles.progressMini}>
                <div
                  className={styles.progressFillMini}
                  style={{ width: `${(scan.pointsCompleted / scan.totalPoints) * 100}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
