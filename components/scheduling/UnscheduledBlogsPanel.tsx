// components/scheduling/UnscheduledBlogsPanel.tsx
// Left panel showing blogs ready to schedule

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BlogCardCompact from "./BlogCardCompact";
import styles from "../../styles/Schedule.module.css";

interface UnscheduledBlog {
  id: string;
  title: string;
  type: string;
  featuredImageUrl?: string;
}

interface UnscheduledBlogsPanelProps {
  blogs: UnscheduledBlog[];
  onSchedule: (blogId: string, date: string) => void;
  isLoading?: boolean;
}

export default function UnscheduledBlogsPanel({
  blogs,
  onSchedule,
  isLoading = false,
}: UnscheduledBlogsPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Filter blogs based on search and type
  const filteredBlogs = useMemo(() => {
    return blogs.filter((blog) => {
      const matchesSearch = blog.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesType =
        typeFilter === "all" || blog.type.toLowerCase() === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [blogs, searchQuery, typeFilter]);

  // Get unique types for filter
  const availableTypes = useMemo(() => {
    const types = new Set(blogs.map((b) => b.type.toLowerCase()));
    return Array.from(types);
  }, [blogs]);

  return (
    <div className={styles.unscheduledPanel}>
      {/* Header */}
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          To Be Scheduled
        </h3>
        <span className={styles.blogCount}>{filteredBlogs.length} blogs</span>
      </div>

      {/* Search */}
      <div className={styles.searchBox}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search blogs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {/* Type filter */}
      <div className={styles.filterButtons}>
        <button
          className={`${styles.filterBtn} ${typeFilter === "all" ? styles.active : ""}`}
          onClick={() => setTypeFilter("all")}
        >
          All
        </button>
        {availableTypes.map((type) => (
          <button
            key={type}
            className={`${styles.filterBtn} ${typeFilter === type ? styles.active : ""}`}
            onClick={() => setTypeFilter(type)}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Blog list */}
      <div className={styles.blogList}>
        {isLoading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Loading blogs...</p>
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className={styles.emptyState}>
            {blogs.length === 0 ? (
              <>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <p>No blogs to schedule</p>
                <span>Create some content first!</span>
              </>
            ) : (
              <>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <p>No matching blogs</p>
                <span>Try adjusting your filters</span>
              </>
            )}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredBlogs.map((blog) => (
              <BlogCardCompact
                key={blog.id}
                id={blog.id}
                title={blog.title}
                type={blog.type}
                featuredImageUrl={blog.featuredImageUrl}
                onSchedule={onSchedule}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Instructions */}
      <div className={styles.instructions}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>Drag blogs onto calendar dates to schedule</span>
      </div>
    </div>
  );
}
