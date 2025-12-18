// pages/settings.tsx
// User settings page

import React, { useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../lib/auth-context";
import SecurityQuestions from "../components/settings/SecurityQuestions";
import styles from "../styles/Settings.module.css";

type SettingsTab = "account" | "security" | "integrations";

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading, signOutUser } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("security");

  // Redirect to login if not authenticated
  if (!isLoading && !user) {
    router.push("/login");
    return null;
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => router.push("/")}>
          ← Back
        </button>
        <h1 className={styles.title}>Settings</h1>
      </div>

      <div className={styles.content}>
        <div className={styles.sidebar}>
          <nav className={styles.nav}>
            <button
              className={`${styles.navItem} ${activeTab === "account" ? styles.active : ""}`}
              onClick={() => setActiveTab("account")}
            >
              <span className={styles.navIcon}>👤</span>
              Account
            </button>
            <button
              className={`${styles.navItem} ${activeTab === "security" ? styles.active : ""}`}
              onClick={() => setActiveTab("security")}
            >
              <span className={styles.navIcon}>🔐</span>
              Security
            </button>
            <button
              className={`${styles.navItem} ${activeTab === "integrations" ? styles.active : ""}`}
              onClick={() => setActiveTab("integrations")}
            >
              <span className={styles.navIcon}>🔗</span>
              Integrations
            </button>
          </nav>

          <button className={styles.signOutButton} onClick={signOutUser}>
            Sign Out
          </button>
        </div>

        <div className={styles.main}>
          {activeTab === "account" && (
            <div className={styles.tabContent}>
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionIcon}>👤</div>
                  <div>
                    <h3 className={styles.sectionTitle}>Account Information</h3>
                    <p className={styles.sectionDescription}>
                      Your basic account details
                    </p>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Email</label>
                  <input
                    type="email"
                    className={styles.input}
                    value={user?.email || ""}
                    disabled
                  />
                  <p className={styles.hint}>Email cannot be changed</p>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Name</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={user?.name || ""}
                    disabled
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className={styles.tabContent}>
              <SecurityQuestions />
            </div>
          )}

          {activeTab === "integrations" && (
            <div className={styles.tabContent}>
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionIcon}>🔗</div>
                  <div>
                    <h3 className={styles.sectionTitle}>Integrations</h3>
                    <p className={styles.sectionDescription}>
                      Connect external services
                    </p>
                  </div>
                </div>

                <p className={styles.comingSoon}>
                  Integration settings are managed on the main dashboard.
                </p>
                <button
                  className={styles.linkButton}
                  onClick={() => router.push("/")}
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
