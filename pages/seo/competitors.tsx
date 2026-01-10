// pages/seo/competitors.tsx
// Competitor Intelligence Hub page - Analyze competitors' content, social, and reviews

import React, { Suspense } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../lib/auth-context";
import dynamic from "next/dynamic";
import styles from "../../styles/SEOTools.module.css";

// Lazy load the Competitor Intel Hub component
const CompetitorIntelHub = dynamic(
  () => import("../../components/seo/CompetitorIntelHub").then((mod) => mod.CompetitorIntelHub),
  {
    loading: () => (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>Loading Competitor Intelligence...</span>
      </div>
    ),
    ssr: false,
  }
);

export default function CompetitorsPage() {
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
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Competitor Intelligence
          </h1>
          <p className={styles.subtitle}>Track and analyze competitors&apos; content, social presence, and customer reviews</p>
        </div>
      </header>

      <div className={styles.fullContent}>
        <Suspense fallback={
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>Loading Competitor Intelligence Hub...</span>
          </div>
        }>
          <CompetitorIntelHub />
        </Suspense>
      </div>
    </div>
  );
}
