// pages/keywords.tsx
// Keyword Research Dashboard - Similar to Semrush functionality

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Head from "next/head";
import { motion, AnimatePresence } from "framer-motion";
import styles from "../styles/Keywords.module.css";

interface KeywordSuggestion {
  keyword: string;
  searchVolume: number;
  difficulty: number;
  cpc: number;
  trend: "up" | "down" | "stable";
  intent: "informational" | "commercial" | "transactional" | "navigational";
}

interface RelatedKeyword {
  keyword: string;
  relevance: number;
}

interface KeywordAnalysis {
  primaryKeyword: string;
  suggestions: KeywordSuggestion[];
  relatedKeywords: RelatedKeyword[];
  questions: string[];
  longTail: string[];
}

export default function KeywordsDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [keyword, setKeyword] = useState("");
  const [isResearching, setIsResearching] = useState(false);
  const [analysis, setAnalysis] = useState<KeywordAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<
    "suggestions" | "related" | "questions" | "longtail"
  >("suggestions");
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  if (status === "loading") {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Loading...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  const handleResearch = async () => {
    if (!keyword.trim()) return;

    setIsResearching(true);
    setError(null);

    try {
      const response = await fetch("/api/keyword-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to research keyword");
      }

      const data = await response.json();
      if (data.success) {
        setAnalysis(data.analysis);
      } else {
        setError(data.error || "Failed to analyze keyword");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsResearching(false);
    }
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 30) return "#22c55e";
    if (difficulty <= 60) return "#eab308";
    return "#ef4444";
  };

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty <= 30) return "Easy";
    if (difficulty <= 60) return "Medium";
    return "Hard";
  };

  const getIntentIcon = (intent: KeywordSuggestion["intent"]) => {
    switch (intent) {
      case "informational":
        return "📚";
      case "commercial":
        return "🔍";
      case "transactional":
        return "🛒";
      case "navigational":
        return "🧭";
    }
  };

  return (
    <>
      <Head>
        <title>Keyword Research | Blog Generator</title>
      </Head>

      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <button
              className={styles.backButton}
              onClick={() => router.push("/")}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            <h1 className={styles.title}>
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Keyword Research
            </h1>
            <p className={styles.subtitle}>
              Discover high-value keywords for your content strategy
            </p>
          </div>
        </header>

        {/* Search Section */}
        <section className={styles.searchSection}>
          <div className={styles.searchBox}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Enter a seed keyword (e.g., 'solar panel installation')"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleResearch()}
              className={styles.searchInput}
            />
            <button
              className={styles.searchButton}
              onClick={handleResearch}
              disabled={isResearching || !keyword.trim()}
            >
              {isResearching ? (
                <>
                  <span className={styles.buttonSpinner} />
                  Researching...
                </>
              ) : (
                "Research"
              )}
            </button>
          </div>

          {error && (
            <div className={styles.errorMessage}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}
        </section>

        {/* Results Section */}
        <AnimatePresence mode="wait">
          {analysis && (
            <motion.section
              className={styles.resultsSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Results Header */}
              <div className={styles.resultsHeader}>
                <h2 className={styles.resultsTitle}>
                  Results for "{analysis.primaryKeyword}"
                </h2>
                <div className={styles.resultsTabs}>
                  <button
                    className={`${styles.tabButton} ${activeTab === "suggestions" ? styles.active : ""}`}
                    onClick={() => setActiveTab("suggestions")}
                  >
                    Suggestions ({analysis.suggestions.length})
                  </button>
                  <button
                    className={`${styles.tabButton} ${activeTab === "related" ? styles.active : ""}`}
                    onClick={() => setActiveTab("related")}
                  >
                    Related ({analysis.relatedKeywords.length})
                  </button>
                  <button
                    className={`${styles.tabButton} ${activeTab === "questions" ? styles.active : ""}`}
                    onClick={() => setActiveTab("questions")}
                  >
                    Questions ({analysis.questions.length})
                  </button>
                  <button
                    className={`${styles.tabButton} ${activeTab === "longtail" ? styles.active : ""}`}
                    onClick={() => setActiveTab("longtail")}
                  >
                    Long-tail ({analysis.longTail.length})
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className={styles.tabContent}>
                {activeTab === "suggestions" && (
                  <div className={styles.suggestionsTable}>
                    <div className={styles.tableHeader}>
                      <span>Keyword</span>
                      <span>Volume</span>
                      <span>Difficulty</span>
                      <span>CPC</span>
                      <span>Intent</span>
                      <span>Trend</span>
                    </div>
                    {analysis.suggestions.map((suggestion, index) => (
                      <motion.div
                        key={index}
                        className={styles.tableRow}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <span className={styles.keywordCell}>
                          {suggestion.keyword}
                          <button
                            className={styles.copyButton}
                            onClick={() =>
                              navigator.clipboard.writeText(suggestion.keyword)
                            }
                            title="Copy keyword"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <rect
                                x="9"
                                y="9"
                                width="13"
                                height="13"
                                rx="2"
                              />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          </button>
                        </span>
                        <span className={styles.volumeCell}>
                          {suggestion.searchVolume.toLocaleString()}
                        </span>
                        <span className={styles.difficultyCell}>
                          <span
                            className={styles.difficultyBadge}
                            style={{
                              backgroundColor: `${getDifficultyColor(suggestion.difficulty)}20`,
                              color: getDifficultyColor(suggestion.difficulty),
                            }}
                          >
                            {suggestion.difficulty}{" "}
                            {getDifficultyLabel(suggestion.difficulty)}
                          </span>
                        </span>
                        <span className={styles.cpcCell}>
                          ${suggestion.cpc.toFixed(2)}
                        </span>
                        <span className={styles.intentCell}>
                          <span
                            className={styles.intentBadge}
                            title={suggestion.intent}
                          >
                            {getIntentIcon(suggestion.intent)}{" "}
                            {suggestion.intent}
                          </span>
                        </span>
                        <span className={styles.trendCell}>
                          {suggestion.trend === "up" && (
                            <span className={styles.trendUp}>↑</span>
                          )}
                          {suggestion.trend === "down" && (
                            <span className={styles.trendDown}>↓</span>
                          )}
                          {suggestion.trend === "stable" && (
                            <span className={styles.trendStable}>→</span>
                          )}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}

                {activeTab === "related" && (
                  <div className={styles.relatedGrid}>
                    {analysis.relatedKeywords.map((related, index) => (
                      <motion.div
                        key={index}
                        className={styles.relatedCard}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <span className={styles.relatedKeyword}>
                          {related.keyword}
                        </span>
                        <div className={styles.relevanceBar}>
                          <div
                            className={styles.relevanceFill}
                            style={{ width: `${related.relevance}%` }}
                          />
                        </div>
                        <span className={styles.relevanceLabel}>
                          {related.relevance}% relevant
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}

                {activeTab === "questions" && (
                  <div className={styles.questionsList}>
                    {analysis.questions.map((question, index) => (
                      <motion.div
                        key={index}
                        className={styles.questionCard}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <span className={styles.questionIcon}>❓</span>
                        <span className={styles.questionText}>{question}</span>
                        <button
                          className={styles.useQuestionButton}
                          onClick={() => setKeyword(question)}
                        >
                          Use as keyword
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}

                {activeTab === "longtail" && (
                  <div className={styles.longTailList}>
                    {analysis.longTail.map((kw, index) => (
                      <motion.div
                        key={index}
                        className={styles.longTailItem}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <span className={styles.longTailKeyword}>{kw}</span>
                        <span className={styles.longTailWordCount}>
                          {kw.split(" ").length} words
                        </span>
                        <button
                          className={styles.copyButton}
                          onClick={() => navigator.clipboard.writeText(kw)}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <rect x="9" y="9" width="13" height="13" rx="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!analysis && !isResearching && (
          <div className={styles.emptyState}>
            <svg
              width="80"
              height="80"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
            <h3>Start Your Keyword Research</h3>
            <p>
              Enter a seed keyword above to discover related keywords, search
              volumes, difficulty scores, and content opportunities.
            </p>
            <div className={styles.suggestChips}>
              <span>Popular searches:</span>
              <button onClick={() => setKeyword("roof repair")}>
                roof repair
              </button>
              <button onClick={() => setKeyword("hvac installation")}>
                hvac installation
              </button>
              <button onClick={() => setKeyword("solar panels")}>
                solar panels
              </button>
              <button onClick={() => setKeyword("kitchen remodel")}>
                kitchen remodel
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isResearching && (
          <div className={styles.loadingState}>
            <div className={styles.loadingAnimation}>
              <div className={styles.loadingDot} />
              <div className={styles.loadingDot} />
              <div className={styles.loadingDot} />
            </div>
            <p>Analyzing keyword data...</p>
            <span>This may take a few moments</span>
          </div>
        )}
      </div>
    </>
  );
}
