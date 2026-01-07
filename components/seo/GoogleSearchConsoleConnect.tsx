// components/seo/GoogleSearchConsoleConnect.tsx
// UI component for connecting/disconnecting Google Search Console

import React, { useState, useEffect } from "react";
import styles from "../../styles/GoogleConnect.module.css";

interface ConnectionStatus {
  connected: boolean;
  googleEmail?: string;
  connectedSiteUrl?: string;
  connectedAt?: string;
  isActive?: boolean;
  errorMessage?: string;
}

interface Site {
  siteUrl: string;
  permissionLevel: string;
}

export function GoogleSearchConsoleConnect() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showSiteSelector, setShowSiteSelector] = useState(false);
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [savingSite, setSavingSite] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/seo/connection");
      const data = await response.json();
      setStatus(data);
      if (data.connected && !data.connectedSiteUrl) {
        // Connected but no site selected - fetch sites
        fetchSites();
        setShowSiteSelector(true);
      }
    } catch (error) {
      console.error("Failed to fetch connection status:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSites = async () => {
    setSitesLoading(true);
    try {
      const response = await fetch("/api/seo/sites");
      const data = await response.json();
      if (data.success && data.sites) {
        setSites(data.sites);
      }
    } catch (error) {
      console.error("Failed to fetch sites:", error);
    } finally {
      setSitesLoading(false);
    }
  };

  const handleConnect = () => {
    // Redirect to OAuth flow
    window.location.href = `/api/seo/connect?returnUrl=${encodeURIComponent(window.location.pathname)}`;
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Google Search Console?")) {
      return;
    }

    setDisconnecting(true);
    try {
      const response = await fetch("/api/seo/connection", { method: "DELETE" });
      if (response.ok) {
        setStatus({ connected: false });
        setSites([]);
        setShowSiteSelector(false);
      }
    } catch (error) {
      console.error("Failed to disconnect:", error);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSaveSite = async () => {
    if (!selectedSite) return;

    setSavingSite(true);
    try {
      const response = await fetch("/api/seo/connection", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteUrl: selectedSite }),
      });
      if (response.ok) {
        setStatus((prev) => prev ? { ...prev, connectedSiteUrl: selectedSite } : null);
        setShowSiteSelector(false);
      }
    } catch (error) {
      console.error("Failed to save site:", error);
    } finally {
      setSavingSite(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Checking connection...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        </div>
        <div className={styles.titleSection}>
          <h3 className={styles.title}>Google Search Console</h3>
          <p className={styles.description}>
            Connect to see your real search rankings, clicks, and impressions
          </p>
        </div>
      </div>

      {status?.connected ? (
        <div className={styles.connectedState}>
          <div className={styles.statusBadge}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Connected
          </div>

          <div className={styles.connectionInfo}>
            {status.googleEmail && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Account:</span>
                <span className={styles.infoValue}>{status.googleEmail}</span>
              </div>
            )}
            {status.connectedSiteUrl && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Website:</span>
                <span className={styles.infoValue}>{status.connectedSiteUrl}</span>
              </div>
            )}
            {status.connectedAt && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Connected:</span>
                <span className={styles.infoValue}>
                  {new Date(status.connectedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {status.errorMessage && (
            <div className={styles.errorBanner}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {status.errorMessage}
            </div>
          )}

          {/* Site selector if connected but no site selected */}
          {showSiteSelector && (
            <div className={styles.siteSelector}>
              <label className={styles.selectLabel}>Select a website to track:</label>
              {sitesLoading ? (
                <div className={styles.loading}>
                  <div className={styles.spinner} />
                  <span>Loading sites...</span>
                </div>
              ) : sites.length > 0 ? (
                <>
                  <select
                    className={styles.select}
                    value={selectedSite}
                    onChange={(e) => setSelectedSite(e.target.value)}
                  >
                    <option value="">Select a website...</option>
                    {sites.map((site) => (
                      <option key={site.siteUrl} value={site.siteUrl}>
                        {site.siteUrl} ({site.permissionLevel})
                      </option>
                    ))}
                  </select>
                  <button
                    className={styles.saveBtn}
                    onClick={handleSaveSite}
                    disabled={!selectedSite || savingSite}
                  >
                    {savingSite ? "Saving..." : "Save Selection"}
                  </button>
                </>
              ) : (
                <p className={styles.noSites}>
                  No Search Console properties found. Make sure you have added your website to Google Search Console.
                </p>
              )}
            </div>
          )}

          <div className={styles.actions}>
            {!showSiteSelector && (
              <button
                className={styles.changeSiteBtn}
                onClick={() => {
                  fetchSites();
                  setShowSiteSelector(true);
                }}
              >
                Change Website
              </button>
            )}
            <button
              className={styles.disconnectBtn}
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? "Disconnecting..." : "Disconnect"}
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.disconnectedState}>
          <div className={styles.benefits}>
            <div className={styles.benefit}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              <span>Track your keyword rankings</span>
            </div>
            <div className={styles.benefit}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <span>See clicks & impressions data</span>
            </div>
            <div className={styles.benefit}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <span>AI uses data to improve content</span>
            </div>
            <div className={styles.benefit}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
              <span>Request instant indexing</span>
            </div>
          </div>

          <button className={styles.connectBtn} onClick={handleConnect}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Connect Google Search Console
          </button>
        </div>
      )}
    </div>
  );
}

export default GoogleSearchConsoleConnect;
