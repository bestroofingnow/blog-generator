// components/seo/GeoGridRankTracker/GeoGridLegend.tsx
// Color legend for rank visualization

import React from "react";
import styles from "./GeoGridRankTracker.module.css";

const LEGEND_ITEMS = [
  { label: "1-3", color: "#22c55e", description: "Excellent" },
  { label: "4-10", color: "#84cc16", description: "Good" },
  { label: "11-20", color: "#eab308", description: "Moderate" },
  { label: "21-50", color: "#f97316", description: "Poor" },
  { label: "50+", color: "#ef4444", description: "Bad" },
  { label: "N/A", color: "#6b7280", description: "Not found" }
];

export function GeoGridLegend() {
  return (
    <div className={styles.legend}>
      <span className={styles.legendTitle}>Rank Legend:</span>
      {LEGEND_ITEMS.map(item => (
        <div key={item.label} className={styles.legendItem}>
          <span
            className={styles.legendColor}
            style={{ backgroundColor: item.color }}
          />
          <span className={styles.legendLabel}>
            {item.label} <span className={styles.legendDesc}>({item.description})</span>
          </span>
        </div>
      ))}
    </div>
  );
}
