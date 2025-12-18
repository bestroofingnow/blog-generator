// components/scheduling/BlogCardCompact.tsx
// Compact draggable blog card for scheduling calendar

import React, { useRef } from "react";
import { motion } from "framer-motion";
import { useDrag } from "./DragContext";
import styles from "../../styles/Schedule.module.css";

interface BlogCardCompactProps {
  id: string;
  title: string;
  type: string;
  featuredImageUrl?: string;
  onSchedule?: (blogId: string, date: string) => void;
}

export default function BlogCardCompact({
  id,
  title,
  type,
  featuredImageUrl,
  onSchedule,
}: BlogCardCompactProps) {
  const { setDraggedBlog, hoveredDate } = useDrag();
  const cardRef = useRef<HTMLDivElement>(null);

  const getTypeColor = (pageType: string) => {
    switch (pageType.toLowerCase()) {
      case "blog":
        return "#3b82f6"; // Blue
      case "service":
        return "#22c55e"; // Green
      case "location":
        return "#f59e0b"; // Amber
      default:
        return "#6b7280"; // Gray
    }
  };

  const getTypeLabel = (pageType: string) => {
    switch (pageType.toLowerCase()) {
      case "blog":
        return "Blog";
      case "service":
        return "Service";
      case "location":
        return "Location";
      default:
        return pageType;
    }
  };

  return (
    <motion.div
      ref={cardRef}
      className={styles.blogCardCompact}
      drag
      dragSnapToOrigin
      dragElastic={0.1}
      onDragStart={() => {
        setDraggedBlog({ id, title, type });
      }}
      onDragEnd={(_, info) => {
        // Find the element under the pointer
        const target = document.elementFromPoint(info.point.x, info.point.y);
        const dateCell = target?.closest("[data-date]") as HTMLElement | null;

        if (dateCell && dateCell.dataset.date && onSchedule) {
          onSchedule(id, dateCell.dataset.date);
        }

        setDraggedBlog(null);
      }}
      whileDrag={{
        scale: 1.05,
        zIndex: 1000,
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
        cursor: "grabbing",
      }}
      whileHover={{
        scale: 1.02,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
      }}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      {/* Drag handle indicator */}
      <div className={styles.dragHandle}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="5" r="2" />
          <circle cx="12" cy="5" r="2" />
          <circle cx="19" cy="5" r="2" />
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
          <circle cx="5" cy="19" r="2" />
          <circle cx="12" cy="19" r="2" />
          <circle cx="19" cy="19" r="2" />
        </svg>
      </div>

      {/* Featured image thumbnail */}
      <div className={styles.cardThumbnail}>
        {featuredImageUrl ? (
          <img src={featuredImageUrl} alt="" />
        ) : (
          <div className={styles.placeholderThumb}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}
      </div>

      {/* Card content */}
      <div className={styles.cardContent}>
        <span
          className={styles.typeBadge}
          style={{ backgroundColor: getTypeColor(type) }}
        >
          {getTypeLabel(type)}
        </span>
        <h4 className={styles.cardTitle}>{title}</h4>
      </div>
    </motion.div>
  );
}
