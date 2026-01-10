// components/seo/CompetitorIntelHub/CompetitorCard.tsx
// Summary card for competitor overview

import React from "react";
import styles from "./CompetitorIntelHub.module.css";
import { CompetitorComparison } from "./index";

interface CompetitorCardProps {
  competitor: CompetitorComparison;
  onSelect: () => void;
  onRunScan: () => void;
}

export function CompetitorCard({ competitor, onSelect, onRunScan }: CompetitorCardProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getScoreColor = (score: number, max: number = 100) => {
    const percentage = (score / max) * 100;
    if (percentage >= 70) return styles.scoreGood;
    if (percentage >= 40) return styles.scoreMedium;
    return styles.scoreLow;
  };

  const getRatingStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

    return (
      <>
        {"★".repeat(fullStars)}
        {hasHalf && "½"}
        {"☆".repeat(emptyStars)}
      </>
    );
  };

  return (
    <div className={styles.competitorCard}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>
          <h4>{competitor.name}</h4>
          <span className={styles.cardDomain}>{competitor.domain}</span>
        </div>
        {competitor.industry && (
          <span className={styles.industryTag}>{competitor.industry}</span>
        )}
      </div>

      <div className={styles.cardMetrics}>
        {/* Content Metrics */}
        <div className={styles.metricSection}>
          <h5>📝 Content</h5>
          {competitor.content ? (
            <div className={styles.metricGrid}>
              <div className={styles.metric}>
                <span className={styles.metricValue}>{competitor.content.wordCount.toLocaleString()}</span>
                <span className={styles.metricLabel}>Words</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricValue}>{competitor.content.headingCount}</span>
                <span className={styles.metricLabel}>Headings</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricValue}>{competitor.content.blogPostCount || 0}</span>
                <span className={styles.metricLabel}>Blog Posts</span>
              </div>
              <div className={styles.metric}>
                <span className={`${styles.metricValue} ${competitor.content.hasSchema ? styles.hasFeature : ""}`}>
                  {competitor.content.hasSchema ? "✓" : "✗"}
                </span>
                <span className={styles.metricLabel}>Schema</span>
              </div>
            </div>
          ) : (
            <div className={styles.noData}>No content data</div>
          )}
        </div>

        {/* Social Metrics */}
        <div className={styles.metricSection}>
          <h5>📱 Social</h5>
          {competitor.social ? (
            <div className={styles.metricGrid}>
              <div className={styles.metric}>
                <span className={`${styles.metricValue} ${styles.large}`}>
                  {formatNumber(competitor.social.totalFollowers)}
                </span>
                <span className={styles.metricLabel}>Total Followers</span>
              </div>
              <div className={styles.platformIcons}>
                {competitor.social.platforms.map((p) => (
                  <span key={p.platform} className={styles.platformIcon} title={`${p.platform}: ${formatNumber(p.followers)}`}>
                    {getPlatformIcon(p.platform)}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.noData}>No social data</div>
          )}
        </div>

        {/* Review Metrics */}
        <div className={styles.metricSection}>
          <h5>⭐ Reviews</h5>
          {competitor.reviews ? (
            <div className={styles.reviewMetrics}>
              <div className={styles.ratingDisplay}>
                <span className={styles.ratingNumber}>{competitor.reviews.averageRating.toFixed(1)}</span>
                <span className={styles.ratingStars}>{getRatingStars(competitor.reviews.averageRating)}</span>
              </div>
              <span className={styles.reviewCount}>{competitor.reviews.totalReviews} reviews</span>
            </div>
          ) : (
            <div className={styles.noData}>No review data</div>
          )}
        </div>
      </div>

      {competitor.updatedAt && (
        <div className={styles.cardFooter}>
          <span className={styles.lastUpdated}>
            Updated {new Date(competitor.updatedAt).toLocaleDateString()}
          </span>
        </div>
      )}

      <div className={styles.cardActions}>
        <button className={styles.cardButton} onClick={onSelect}>
          View Details
        </button>
        <button className={styles.cardButtonSecondary} onClick={onRunScan}>
          Refresh Data
        </button>
      </div>
    </div>
  );
}

function getPlatformIcon(platform: string): string {
  const icons: Record<string, string> = {
    facebook: "📘",
    twitter: "🐦",
    x: "𝕏",
    instagram: "📷",
    linkedin: "💼",
    youtube: "📺",
    tiktok: "🎵",
    pinterest: "📌",
  };
  return icons[platform.toLowerCase()] || "🌐";
}
