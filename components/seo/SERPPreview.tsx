// components/seo/SERPPreview.tsx
// Google SERP preview showing how content will appear in search results

import React from "react";
import styles from "../../styles/SEO.module.css";

interface SERPPreviewProps {
  title: string;
  metaDescription: string;
  url?: string;
  siteName?: string;
  favicon?: string;
}

// Truncate text to fit SERP limits
function truncateTitle(title: string, maxLength = 60): string {
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength - 3) + "...";
}

function truncateDescription(description: string, maxLength = 160): string {
  if (description.length <= maxLength) return description;
  return description.substring(0, maxLength - 3) + "...";
}

// Format URL for display
function formatUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.host}${urlObj.pathname}`.replace(/\/$/, "");
  } catch {
    return url || "example.com/page";
  }
}

export function SERPPreview({
  title,
  metaDescription,
  url = "",
  siteName = "Your Site",
  favicon,
}: SERPPreviewProps) {
  const displayTitle = truncateTitle(title || "Page Title Goes Here");
  const displayDescription = truncateDescription(
    metaDescription || "Your meta description will appear here. Write a compelling description to encourage clicks from search results."
  );
  const displayUrl = formatUrl(url);

  // Character counters
  const titleLength = title.length;
  const descLength = metaDescription.length;
  const titleOk = titleLength >= 30 && titleLength <= 60;
  const descOk = descLength >= 120 && descLength <= 160;

  return (
    <div className={styles.serpPreview}>
      <div className={styles.serpHeader}>
        <span className={styles.serpLabel}>Google Preview</span>
        <div className={styles.serpCounters}>
          <span className={titleOk ? styles.counterOk : styles.counterWarn}>
            Title: {titleLength}/60
          </span>
          <span className={descOk ? styles.counterOk : styles.counterWarn}>
            Desc: {descLength}/160
          </span>
        </div>
      </div>

      <div className={styles.serpResult}>
        {/* URL and breadcrumb */}
        <div className={styles.serpUrl}>
          <div className={styles.serpFavicon}>
            {favicon ? (
              <img src={favicon} alt="" />
            ) : (
              <div className={styles.defaultFavicon}>
                {siteName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className={styles.serpBreadcrumb}>
            <span className={styles.serpDomain}>{siteName}</span>
            <span className={styles.serpPath}>{displayUrl}</span>
          </div>
          <button className={styles.serpMenu}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="5" r="1" fill="currentColor" />
              <circle cx="12" cy="12" r="1" fill="currentColor" />
              <circle cx="12" cy="19" r="1" fill="currentColor" />
            </svg>
          </button>
        </div>

        {/* Title */}
        <h3 className={styles.serpTitle}>{displayTitle}</h3>

        {/* Description */}
        <p className={styles.serpDescription}>{displayDescription}</p>
      </div>

      <div className={styles.serpTips}>
        <h5>Tips for better SERP appearance:</h5>
        <ul>
          <li>
            {titleOk ? "✓" : "○"} Title between 50-60 characters
          </li>
          <li>
            {descOk ? "✓" : "○"} Description between 150-160 characters
          </li>
          <li>
            {title.toLowerCase().includes(siteName.toLowerCase().split(" ")[0]) ? "✓" : "○"} Include brand name in title
          </li>
          <li>○ Use power words (Free, Guide, Best, etc.)</li>
        </ul>
      </div>
    </div>
  );
}

// Bing preview variant
export function BingSERPPreview({
  title,
  metaDescription,
  url = "",
}: SERPPreviewProps) {
  const displayTitle = truncateTitle(title || "Page Title Goes Here", 65);
  const displayDescription = truncateDescription(
    metaDescription || "Your meta description will appear here.",
    170
  );

  return (
    <div className={styles.bingPreview}>
      <div className={styles.serpHeader}>
        <span className={styles.serpLabel}>Bing Preview</span>
      </div>

      <div className={styles.bingResult}>
        <h3 className={styles.bingTitle}>{displayTitle}</h3>
        <span className={styles.bingUrl}>{formatUrl(url)}</span>
        <p className={styles.bingDescription}>{displayDescription}</p>
      </div>
    </div>
  );
}
