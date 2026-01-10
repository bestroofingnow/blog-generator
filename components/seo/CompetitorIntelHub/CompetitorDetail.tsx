// components/seo/CompetitorIntelHub/CompetitorDetail.tsx
// Full detail view for a selected competitor

import React, { useState } from "react";
import styles from "./CompetitorIntelHub.module.css";
import { Competitor, CompetitorComparison, Scan } from "./index";

interface CompetitorDetailProps {
  competitor: Competitor;
  comparison?: CompetitorComparison;
  scans: Scan[];
  onUpdate: (id: string, updates: Partial<Competitor>) => void;
  onRunScan: (competitorId: string, scanType?: string) => void;
  loading: boolean;
  activeScan: Scan | null;
}

export function CompetitorDetail({
  competitor,
  comparison,
  scans,
  onUpdate,
  onRunScan,
  loading,
  activeScan,
}: CompetitorDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: competitor.name,
    description: competitor.description || "",
    industry: competitor.industry || "",
    competitorType: competitor.competitorType || "direct",
    priority: competitor.priority,
  });

  const handleSave = () => {
    onUpdate(competitor.id, {
      name: editData.name,
      description: editData.description || undefined,
      industry: editData.industry || undefined,
      competitorType: editData.competitorType,
      priority: editData.priority,
    });
    setIsEditing(false);
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return "Never";
    return new Date(date).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return styles.statusCompleted;
      case "running":
        return styles.statusRunning;
      case "failed":
        return styles.statusFailed;
      default:
        return styles.statusPending;
    }
  };

  return (
    <div className={styles.detailView}>
      {/* Header */}
      <div className={styles.detailHeader}>
        <div className={styles.detailTitle}>
          {isEditing ? (
            <input
              type="text"
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              className={styles.editInput}
            />
          ) : (
            <h3>{competitor.name}</h3>
          )}
          <a
            href={`https://${competitor.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.domainLink}
          >
            {competitor.domain} ↗
          </a>
        </div>
        <div className={styles.detailActions}>
          {isEditing ? (
            <>
              <button className={styles.saveButton} onClick={handleSave}>
                Save
              </button>
              <button
                className={styles.cancelButton}
                onClick={() => {
                  setIsEditing(false);
                  setEditData({
                    name: competitor.name,
                    description: competitor.description || "",
                    industry: competitor.industry || "",
                    competitorType: competitor.competitorType || "direct",
                    priority: competitor.priority,
                  });
                }}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button className={styles.editButton} onClick={() => setIsEditing(true)}>
                ✏️ Edit
              </button>
              <button
                className={styles.scanButton}
                onClick={() => onRunScan(competitor.id)}
                disabled={loading || activeScan !== null}
              >
                {activeScan ? "Scanning..." : "🔍 Run Scan"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Active Scan Progress */}
      {activeScan && (
        <div className={styles.scanProgress}>
          <div className={styles.progressHeader}>
            <span>Scan in progress...</span>
            <span>{activeScan.competitorsScanned} completed</span>
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${Math.min((activeScan.competitorsScanned / 4) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className={styles.detailSection}>
        <h4>Competitor Info</h4>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <label>Industry</label>
            {isEditing ? (
              <input
                type="text"
                value={editData.industry}
                onChange={(e) => setEditData({ ...editData, industry: e.target.value })}
                className={styles.editInput}
                placeholder="e.g., SaaS, E-commerce"
              />
            ) : (
              <span>{competitor.industry || "Not specified"}</span>
            )}
          </div>
          <div className={styles.infoItem}>
            <label>Type</label>
            {isEditing ? (
              <select
                value={editData.competitorType}
                onChange={(e) => setEditData({ ...editData, competitorType: e.target.value })}
                className={styles.editSelect}
              >
                <option value="direct">Direct</option>
                <option value="indirect">Indirect</option>
                <option value="aspirational">Aspirational</option>
              </select>
            ) : (
              <span>{competitor.competitorType || "Direct"}</span>
            )}
          </div>
          <div className={styles.infoItem}>
            <label>Priority</label>
            {isEditing ? (
              <select
                value={editData.priority}
                onChange={(e) => setEditData({ ...editData, priority: parseInt(e.target.value) })}
                className={styles.editSelect}
              >
                <option value={1}>High</option>
                <option value={2}>Medium</option>
                <option value={3}>Low</option>
              </select>
            ) : (
              <span>{editData.priority <= 1 ? "High" : editData.priority <= 2 ? "Medium" : "Low"}</span>
            )}
          </div>
          <div className={styles.infoItem}>
            <label>Status</label>
            <span className={competitor.isActive ? styles.statusActive : styles.statusInactive}>
              {competitor.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        {isEditing ? (
          <div className={styles.infoItem} style={{ marginTop: "1rem" }}>
            <label>Description</label>
            <textarea
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              className={styles.editTextarea}
              rows={3}
              placeholder="Brief description..."
            />
          </div>
        ) : competitor.description ? (
          <div className={styles.description}>{competitor.description}</div>
        ) : null}
      </div>

      {/* Social Links */}
      {competitor.socialLinks && Object.keys(competitor.socialLinks).length > 0 && (
        <div className={styles.detailSection}>
          <h4>Social Profiles</h4>
          <div className={styles.socialLinks}>
            {Object.entries(competitor.socialLinks).map(([platform, url]) => (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialLink}
              >
                {getPlatformIcon(platform)} {platform}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Latest Data */}
      {comparison && (
        <>
          {/* Content Analysis */}
          {comparison.content && (
            <div className={styles.detailSection}>
              <h4>📝 Content Analysis</h4>
              <div className={styles.dataGrid}>
                <div className={styles.dataCard}>
                  <div className={styles.dataValue}>{comparison.content.wordCount.toLocaleString()}</div>
                  <div className={styles.dataLabel}>Total Words</div>
                </div>
                <div className={styles.dataCard}>
                  <div className={styles.dataValue}>{comparison.content.headingCount}</div>
                  <div className={styles.dataLabel}>Headings</div>
                </div>
                <div className={styles.dataCard}>
                  <div className={styles.dataValue}>{comparison.content.keywordCount}</div>
                  <div className={styles.dataLabel}>Keywords</div>
                </div>
                <div className={styles.dataCard}>
                  <div className={styles.dataValue}>{comparison.content.blogPostCount || 0}</div>
                  <div className={styles.dataLabel}>Blog Posts</div>
                </div>
              </div>
              {comparison.content.pageTitle && (
                <div className={styles.metaInfo}>
                  <strong>Title:</strong> {comparison.content.pageTitle}
                </div>
              )}
              {comparison.content.metaDescription && (
                <div className={styles.metaInfo}>
                  <strong>Description:</strong> {comparison.content.metaDescription}
                </div>
              )}
              {comparison.content.hasSchema && comparison.content.schemaTypes && (
                <div className={styles.schemaInfo}>
                  <strong>Schema Types:</strong>{" "}
                  {comparison.content.schemaTypes.map((type) => (
                    <span key={type} className={styles.schemaTag}>
                      {type}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Social Metrics */}
          {comparison.social && (
            <div className={styles.detailSection}>
              <h4>📱 Social Presence</h4>
              <div className={styles.socialMetrics}>
                <div className={styles.totalFollowers}>
                  <span className={styles.followerCount}>
                    {formatNumber(comparison.social.totalFollowers)}
                  </span>
                  <span className={styles.followerLabel}>Total Followers</span>
                </div>
                <div className={styles.platformBreakdown}>
                  {comparison.social.platforms.map((p) => (
                    <div key={p.platform} className={styles.platformRow}>
                      <span className={styles.platformName}>
                        {getPlatformIcon(p.platform)} {p.platform}
                      </span>
                      <span className={styles.platformFollowers}>
                        {formatNumber(p.followers)} followers
                      </span>
                      {p.engagementRate && (
                        <span className={styles.engagement}>{p.engagementRate} engagement</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Review Summary */}
          {comparison.reviews && (
            <div className={styles.detailSection}>
              <h4>⭐ Review Summary</h4>
              <div className={styles.reviewSummary}>
                <div className={styles.ratingLarge}>
                  <span className={styles.ratingValue}>{comparison.reviews.averageRating.toFixed(1)}</span>
                  <span className={styles.ratingMax}>/5</span>
                </div>
                <div className={styles.ratingStarsLarge}>
                  {getRatingStars(comparison.reviews.averageRating)}
                </div>
                <div className={styles.totalReviews}>
                  Based on {comparison.reviews.totalReviews} reviews
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Scan History */}
      <div className={styles.detailSection}>
        <h4>📊 Scan History</h4>
        {scans.length === 0 ? (
          <div className={styles.noScans}>
            No scans yet. Run a scan to gather competitor data.
          </div>
        ) : (
          <div className={styles.scanHistory}>
            {scans.slice(0, 5).map((scan) => (
              <div key={scan.id} className={styles.scanItem}>
                <div className={styles.scanInfo}>
                  <span className={`${styles.scanStatus} ${getStatusColor(scan.status)}`}>
                    {scan.status}
                  </span>
                  <span className={styles.scanType}>{scan.scanType}</span>
                </div>
                <div className={styles.scanDates}>
                  <span>Started: {formatDate(scan.startedAt)}</span>
                  {scan.completedAt && <span>Completed: {formatDate(scan.completedAt)}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
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

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function getRatingStars(rating: number): string {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
  return "★".repeat(fullStars) + (hasHalf ? "½" : "") + "☆".repeat(emptyStars);
}
