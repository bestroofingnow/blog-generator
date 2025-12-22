// components/automation/AutomationSettings.tsx
// Main automation settings panel with toggles and configuration

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { UsageMeter } from "./UsageMeter";
import styles from "../../styles/Automation.module.css";

interface AutomationSettingsData {
  allowBuildEntireSite: boolean;
  allowAutoCreateDailyBlogs: boolean;
  allowAutoScheduleBlogs: boolean;
  allowAutoPostBlogs: boolean;
  dailyBlogFrequency: number;
  autoPostPlatform: "wordpress" | "ghl";
  autoCreateMode: "automatic" | "queue_for_review";
}

interface AutomationSettingsProps {
  onOpenBatchGenerator: () => void;
  onOpenSiteBuilder?: () => void; // Coming Soon - not used
  onOpenQueueDashboard: () => void;
}

export function AutomationSettings({
  onOpenBatchGenerator,
  onOpenQueueDashboard,
}: AutomationSettingsProps) {
  const [settings, setSettings] = useState<AutomationSettingsData>({
    allowBuildEntireSite: false,
    allowAutoCreateDailyBlogs: false,
    allowAutoScheduleBlogs: false,
    allowAutoPostBlogs: false,
    dailyBlogFrequency: 1,
    autoPostPlatform: "wordpress",
    autoCreateMode: "queue_for_review",
  });
  const [usage, setUsage] = useState({ used: 0, limit: 20 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    loadUsage();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch("/api/automation/settings");
      const data = await response.json();
      if (data.success && data.settings) {
        setSettings({
          allowBuildEntireSite: data.settings.allowBuildEntireSite || false,
          allowAutoCreateDailyBlogs: data.settings.allowAutoCreateDailyBlogs || false,
          allowAutoScheduleBlogs: data.settings.allowAutoScheduleBlogs || false,
          allowAutoPostBlogs: data.settings.allowAutoPostBlogs || false,
          dailyBlogFrequency: data.settings.dailyBlogFrequency || 1,
          autoPostPlatform: data.settings.autoPostPlatform || "wordpress",
          autoCreateMode: data.settings.autoCreateMode || "queue_for_review",
        });
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsage = async () => {
    try {
      const response = await fetch("/api/usage/check");
      const data = await response.json();
      if (data.success) {
        setUsage({ used: data.blogsGenerated, limit: data.limit });
      }
    } catch (error) {
      console.error("Failed to load usage:", error);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch("/api/automation/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await response.json();
      if (data.success) {
        setSaveMessage("Settings saved!");
        setTimeout(() => setSaveMessage(null), 2000);
      } else {
        setSaveMessage(data.error || "Failed to save");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      setSaveMessage("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = <K extends keyof AutomationSettingsData>(
    key: K,
    value: AutomationSettingsData[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Loading automation settings...</p>
      </div>
    );
  }

  return (
    <div className={styles.automationSettings}>
      {/* Header with Usage Meter */}
      <div className={styles.settingsHeader}>
        <div className={styles.headerLeft}>
          <h2 className={styles.sectionTitle}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m19.07-4.93l-4.24 4.24m-5.66 5.66L5.93 19.07m0-14.14l4.24 4.24m5.66 5.66l4.24 4.24" />
            </svg>
            AI Automation
          </h2>
          <p className={styles.sectionDescription}>
            Configure AI-powered content generation and automation features
          </p>
        </div>
        <UsageMeter size="medium" />
      </div>

      {/* Quick Actions */}
      <div className={styles.quickActions}>
        <button className={styles.actionCard} onClick={onOpenBatchGenerator}>
          <div className={styles.actionIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
          </div>
          <div className={styles.actionContent}>
            <h3>Batch Generate</h3>
            <p>Create up to 5 blogs at once</p>
          </div>
          <svg className={styles.actionArrow} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        <button className={`${styles.actionCard} ${styles.comingSoon}`} disabled>
          <div className={styles.comingSoonBadge}>Coming Soon</div>
          <div className={styles.actionIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
          </div>
          <div className={styles.actionContent}>
            <h3>Build Entire Site</h3>
            <p>AI proposes and generates your site</p>
          </div>
          <svg className={styles.actionArrow} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        <button className={styles.actionCard} onClick={onOpenQueueDashboard}>
          <div className={styles.actionIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </div>
          <div className={styles.actionContent}>
            <h3>Generation Queue</h3>
            <p>Manage pending content</p>
          </div>
          <svg className={styles.actionArrow} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Automation Toggles */}
      <div className={styles.settingsSection}>
        <h3 className={styles.subsectionTitle}>Automation Features</h3>

        <div className={styles.toggleGroup}>
          <div className={`${styles.toggleItem} ${styles.comingSoonToggle}`}>
            <div className={styles.toggleInfo}>
              <label className={styles.toggleLabel}>
                Allow AI to Build Entire Site
                <span className={styles.comingSoonTag}>Coming Soon</span>
              </label>
              <span className={styles.toggleDescription}>
                Let AI research your industry and propose a complete site structure
              </span>
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={false}
                disabled
              />
              <span className={styles.toggleSlider} />
            </label>
          </div>

          <div className={`${styles.toggleItem} ${styles.comingSoonToggle}`}>
            <div className={styles.toggleInfo}>
              <label className={styles.toggleLabel}>
                Auto-Create Daily Blogs
                <span className={styles.comingSoonTag}>Coming Soon</span>
              </label>
              <span className={styles.toggleDescription}>
                Automatically generate blogs based on your knowledge base
              </span>
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={false}
                disabled
              />
              <span className={styles.toggleSlider} />
            </label>
          </div>

          <div className={`${styles.toggleItem} ${styles.comingSoonToggle}`}>
            <div className={styles.toggleInfo}>
              <label className={styles.toggleLabel}>
                Auto-Schedule Blogs
                <span className={styles.comingSoonTag}>Coming Soon</span>
              </label>
              <span className={styles.toggleDescription}>
                Automatically schedule generated content for publishing
              </span>
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={false}
                disabled
              />
              <span className={styles.toggleSlider} />
            </label>
          </div>

          <div className={`${styles.toggleItem} ${styles.comingSoonToggle}`}>
            <div className={styles.toggleInfo}>
              <label className={styles.toggleLabel}>
                Auto-Post Blogs
                <span className={styles.comingSoonTag}>Coming Soon</span>
              </label>
              <span className={styles.toggleDescription}>
                Automatically publish to WordPress or GoHighLevel
              </span>
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={false}
                disabled
              />
              <span className={styles.toggleSlider} />
            </label>
          </div>
        </div>
      </div>

      {/* Configuration Options */}
      <div className={styles.settingsSection}>
        <h3 className={styles.subsectionTitle}>Configuration</h3>

        <div className={styles.configGrid}>
          <div className={styles.configItem}>
            <label className={styles.configLabel}>Daily Blog Frequency</label>
            <select
              className={styles.configSelect}
              value={settings.dailyBlogFrequency}
              onChange={(e) => updateSetting("dailyBlogFrequency", parseInt(e.target.value))}
            >
              <option value={1}>1 blog per day</option>
              <option value={2}>2 blogs per day</option>
              <option value={3}>3 blogs per day</option>
              <option value={4}>4 blogs per day</option>
              <option value={5}>5 blogs per day</option>
            </select>
          </div>

          <div className={styles.configItem}>
            <label className={styles.configLabel}>Auto-Post Platform</label>
            <div className={styles.radioGroup}>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="platform"
                  value="wordpress"
                  checked={settings.autoPostPlatform === "wordpress"}
                  onChange={() => updateSetting("autoPostPlatform", "wordpress")}
                />
                <span className={styles.radioLabel}>WordPress</span>
              </label>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="platform"
                  value="ghl"
                  checked={settings.autoPostPlatform === "ghl"}
                  onChange={() => updateSetting("autoPostPlatform", "ghl")}
                />
                <span className={styles.radioLabel}>GoHighLevel</span>
              </label>
            </div>
          </div>

          <div className={styles.configItem}>
            <label className={styles.configLabel}>Auto-Create Mode</label>
            <div className={styles.radioGroup}>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="createMode"
                  value="queue_for_review"
                  checked={settings.autoCreateMode === "queue_for_review"}
                  onChange={() => updateSetting("autoCreateMode", "queue_for_review")}
                />
                <span className={styles.radioLabel}>Queue for Review</span>
              </label>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="createMode"
                  value="automatic"
                  checked={settings.autoCreateMode === "automatic"}
                  onChange={() => updateSetting("autoCreateMode", "automatic")}
                />
                <span className={styles.radioLabel}>Fully Automatic</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className={styles.settingsFooter}>
        <motion.button
          className={styles.saveButton}
          onClick={saveSettings}
          disabled={isSaving}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isSaving ? (
            <>
              <span className={styles.buttonSpinner} />
              Saving...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Save Settings
            </>
          )}
        </motion.button>
        {saveMessage && (
          <motion.span
            className={styles.saveMessage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {saveMessage}
          </motion.span>
        )}
      </div>
    </div>
  );
}
