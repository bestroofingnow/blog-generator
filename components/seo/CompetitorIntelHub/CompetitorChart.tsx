// components/seo/CompetitorIntelHub/CompetitorChart.tsx
// Comparison charts for competitors

import React, { useState } from "react";
import styles from "./CompetitorIntelHub.module.css";
import { CompetitorComparison } from "./index";

interface CompetitorChartProps {
  comparisons: CompetitorComparison[];
}

type MetricType = "content" | "social" | "reviews" | "overall";

export function CompetitorChart({ comparisons }: CompetitorChartProps) {
  const [metricType, setMetricType] = useState<MetricType>("overall");

  if (comparisons.length < 2) {
    return (
      <div className={styles.chartEmpty}>
        <div className={styles.emptyIcon}>📊</div>
        <h4>Not enough data to compare</h4>
        <p>Add at least 2 competitors and run scans to see comparison charts.</p>
      </div>
    );
  }

  // Calculate scores for each competitor
  const scores = comparisons.map((comp) => {
    const contentScore = calculateContentScore(comp);
    const socialScore = calculateSocialScore(comp);
    const reviewScore = calculateReviewScore(comp);
    const overallScore = Math.round((contentScore + socialScore + reviewScore) / 3);

    return {
      ...comp,
      contentScore,
      socialScore,
      reviewScore,
      overallScore,
    };
  });

  // Sort by selected metric
  const sortedScores = [...scores].sort((a, b) => {
    switch (metricType) {
      case "content":
        return b.contentScore - a.contentScore;
      case "social":
        return b.socialScore - a.socialScore;
      case "reviews":
        return b.reviewScore - a.reviewScore;
      default:
        return b.overallScore - a.overallScore;
    }
  });

  const maxScore = Math.max(...sortedScores.map((s) => {
    switch (metricType) {
      case "content":
        return s.contentScore;
      case "social":
        return s.socialScore;
      case "reviews":
        return s.reviewScore;
      default:
        return s.overallScore;
    }
  }));

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3>Competitor Comparison</h3>
        <div className={styles.metricTabs}>
          <button
            className={`${styles.metricTab} ${metricType === "overall" ? styles.active : ""}`}
            onClick={() => setMetricType("overall")}
          >
            Overall
          </button>
          <button
            className={`${styles.metricTab} ${metricType === "content" ? styles.active : ""}`}
            onClick={() => setMetricType("content")}
          >
            Content
          </button>
          <button
            className={`${styles.metricTab} ${metricType === "social" ? styles.active : ""}`}
            onClick={() => setMetricType("social")}
          >
            Social
          </button>
          <button
            className={`${styles.metricTab} ${metricType === "reviews" ? styles.active : ""}`}
            onClick={() => setMetricType("reviews")}
          >
            Reviews
          </button>
        </div>
      </div>

      {/* Bar Chart */}
      <div className={styles.barChart}>
        {sortedScores.map((comp, index) => {
          const score = metricType === "content" ? comp.contentScore :
                        metricType === "social" ? comp.socialScore :
                        metricType === "reviews" ? comp.reviewScore :
                        comp.overallScore;
          const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

          return (
            <div key={comp.id} className={styles.barRow}>
              <div className={styles.barLabel}>
                <span className={styles.barRank}>#{index + 1}</span>
                <span className={styles.barName}>{comp.name}</span>
              </div>
              <div className={styles.barContainer}>
                <div
                  className={`${styles.bar} ${getBarColorClass(index)}`}
                  style={{ width: `${percentage}%` }}
                >
                  <span className={styles.barValue}>{score}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Comparison Table */}
      <div className={styles.comparisonTable}>
        <h4>Detailed Metrics</h4>
        <table>
          <thead>
            <tr>
              <th>Competitor</th>
              <th>Content Score</th>
              <th>Social Score</th>
              <th>Review Score</th>
              <th>Overall</th>
            </tr>
          </thead>
          <tbody>
            {sortedScores.map((comp) => (
              <tr key={comp.id}>
                <td>
                  <strong>{comp.name}</strong>
                  <span className={styles.tableDomain}>{comp.domain}</span>
                </td>
                <td>
                  <span className={`${styles.scoreCell} ${getScoreClass(comp.contentScore)}`}>
                    {comp.contentScore}
                  </span>
                </td>
                <td>
                  <span className={`${styles.scoreCell} ${getScoreClass(comp.socialScore)}`}>
                    {comp.socialScore}
                  </span>
                </td>
                <td>
                  <span className={`${styles.scoreCell} ${getScoreClass(comp.reviewScore)}`}>
                    {comp.reviewScore}
                  </span>
                </td>
                <td>
                  <span className={`${styles.scoreCell} ${styles.overall} ${getScoreClass(comp.overallScore)}`}>
                    {comp.overallScore}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Radar-style comparison for top 3 */}
      {sortedScores.length >= 2 && (
        <div className={styles.radarComparison}>
          <h4>Quick Comparison: Top Competitors</h4>
          <div className={styles.radarGrid}>
            {sortedScores.slice(0, 3).map((comp, index) => (
              <div key={comp.id} className={styles.radarCard}>
                <div className={styles.radarHeader}>
                  <span className={styles.radarRank}>#{index + 1}</span>
                  <span className={styles.radarName}>{comp.name}</span>
                </div>
                <div className={styles.radarMetrics}>
                  <div className={styles.radarMetric}>
                    <div className={styles.radarBar}>
                      <div
                        className={styles.radarFill}
                        style={{ width: `${comp.contentScore}%` }}
                      />
                    </div>
                    <span className={styles.radarLabel}>Content</span>
                  </div>
                  <div className={styles.radarMetric}>
                    <div className={styles.radarBar}>
                      <div
                        className={styles.radarFill}
                        style={{ width: `${comp.socialScore}%` }}
                      />
                    </div>
                    <span className={styles.radarLabel}>Social</span>
                  </div>
                  <div className={styles.radarMetric}>
                    <div className={styles.radarBar}>
                      <div
                        className={styles.radarFill}
                        style={{ width: `${comp.reviewScore}%` }}
                      />
                    </div>
                    <span className={styles.radarLabel}>Reviews</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function calculateContentScore(comp: CompetitorComparison): number {
  if (!comp.content) return 0;

  let score = 0;

  // Word count (max 30 points)
  const wordScore = Math.min(comp.content.wordCount / 100, 30);
  score += wordScore;

  // Heading structure (max 20 points)
  const headingScore = Math.min(comp.content.headingCount * 2, 20);
  score += headingScore;

  // Blog posts (max 25 points)
  const blogScore = Math.min((comp.content.blogPostCount || 0) * 2.5, 25);
  score += blogScore;

  // Schema markup (25 points if present)
  if (comp.content.hasSchema) {
    score += 25;
  }

  return Math.round(score);
}

function calculateSocialScore(comp: CompetitorComparison): number {
  if (!comp.social) return 0;

  let score = 0;

  // Total followers (max 60 points)
  const followers = comp.social.totalFollowers;
  if (followers >= 1000000) score += 60;
  else if (followers >= 100000) score += 50;
  else if (followers >= 10000) score += 40;
  else if (followers >= 1000) score += 25;
  else if (followers >= 100) score += 10;
  else score += 5;

  // Platform diversity (max 40 points)
  const platformCount = comp.social.platforms.length;
  score += Math.min(platformCount * 10, 40);

  return Math.round(score);
}

function calculateReviewScore(comp: CompetitorComparison): number {
  if (!comp.reviews) return 0;

  let score = 0;

  // Rating (max 60 points)
  const ratingScore = (comp.reviews.averageRating / 5) * 60;
  score += ratingScore;

  // Review count (max 40 points)
  const reviewCount = comp.reviews.totalReviews;
  if (reviewCount >= 1000) score += 40;
  else if (reviewCount >= 500) score += 35;
  else if (reviewCount >= 100) score += 25;
  else if (reviewCount >= 50) score += 15;
  else if (reviewCount >= 10) score += 10;
  else score += 5;

  return Math.round(score);
}

function getBarColorClass(index: number): string {
  const colors = [styles.barGold, styles.barSilver, styles.barBronze, styles.barDefault];
  return colors[Math.min(index, colors.length - 1)];
}

function getScoreClass(score: number): string {
  if (score >= 70) return styles.scoreHigh;
  if (score >= 40) return styles.scoreMedium;
  return styles.scoreLow;
}
