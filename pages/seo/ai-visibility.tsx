// pages/seo/ai-visibility.tsx
// AI Visibility Tracker page - Track brand visibility across AI platforms

import React, { Suspense } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../lib/auth-context";
import dynamic from "next/dynamic";
import styles from "../../styles/SEOTools.module.css";

// Lazy load the AI Visibility Tracker component
const AIVisibilityTracker = dynamic(
  () => import("../../components/seo/AIVisibilityTracker").then((mod) => mod.AIVisibilityTracker),
  {
    loading: () => (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>Loading AI Visibility Tracker...</span>
      </div>
    ),
    ssr: false,
  }
);

export default function AIVisibilityPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // Redirect to login if not authenticated
  if (!isLoading && !user) {
    router.push("/login");
    return null;
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={() => router.push("/")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
            AI Search Visibility
          </h1>
          <p className={styles.subtitle}>Track how AI platforms like ChatGPT, Perplexity, and Claude mention your brand</p>
        </div>
      </header>

      <div className={styles.fullContent}>
        <Suspense fallback={
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>Loading AI Visibility Tracker...</span>
          </div>
        }>
          <AIVisibilityTracker />
        </Suspense>
      </div>
    </div>
  );
}
