// components/scheduling/CalendarDayCell.tsx
// Calendar day cell that acts as a drop zone for scheduling blogs

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDrag } from "./DragContext";
import styles from "../../styles/Schedule.module.css";

interface ScheduledBlog {
  id: string;
  title: string;
  type: string;
  featuredImageUrl?: string;
}

interface CalendarDayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  scheduledBlogs: ScheduledBlog[];
  onBlogClick?: (blogId: string) => void;
  onUnschedule?: (blogId: string) => void;
  isWeeklyView?: boolean;
}

export default function CalendarDayCell({
  date,
  isCurrentMonth,
  isToday,
  isPast,
  scheduledBlogs,
  onBlogClick,
  onUnschedule,
  isWeeklyView = false,
}: CalendarDayCellProps) {
  const { isDragging, setHoveredDate, hoveredDate } = useDrag();
  const [isHovered, setIsHovered] = useState(false);

  const dateString = date.toISOString().split("T")[0];
  const isDropTarget = isDragging && isHovered && !isPast;
  const isHoveredDate = hoveredDate === dateString;

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "blog":
        return "#3b82f6";
      case "service":
        return "#22c55e";
      case "location":
        return "#f59e0b";
      default:
        return "#6b7280";
    }
  };

  // Show more blogs in weekly view since cells use wrapping squares
  const maxVisibleBlogs = isWeeklyView ? 20 : 3;

  return (
    <div
      className={`${styles.dayCell} ${isWeeklyView ? styles.dayCellWeekly : ""} ${!isCurrentMonth ? styles.otherMonth : ""} ${
        isToday ? styles.today : ""
      } ${isPast ? styles.pastDay : ""} ${isDropTarget || isHoveredDate ? styles.dropTarget : ""}`}
      data-date={dateString}
      onPointerEnter={() => {
        setIsHovered(true);
        if (isDragging && !isPast) {
          setHoveredDate(dateString);
        }
      }}
      onPointerLeave={() => {
        setIsHovered(false);
        setHoveredDate(null);
      }}
    >
      {/* Date number - only show in monthly view */}
      {!isWeeklyView && (
        <div className={styles.dateNumber}>
          {isToday ? (
            <span className={styles.todayBadge}>{date.getDate()}</span>
          ) : (
            date.getDate()
          )}
        </div>
      )}

      {/* Scheduled blogs */}
      <div className={`${styles.scheduledBlogs} ${isWeeklyView ? styles.scheduledBlogsWeekly : ""}`}>
        <AnimatePresence>
          {scheduledBlogs.slice(0, maxVisibleBlogs).map((blog) => (
            <motion.div
              key={blog.id}
              className={styles.scheduledBlogChip}
              style={{ "--chip-color": getTypeColor(blog.type) } as React.CSSProperties}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={(e) => {
                e.stopPropagation();
                onBlogClick?.(blog.id);
              }}
              whileHover={{ scale: 1.05 }}
            >
              {blog.featuredImageUrl ? (
                <img
                  src={blog.featuredImageUrl}
                  alt=""
                  className={styles.chipThumbnail}
                />
              ) : (
                <div className={styles.chipPlaceholder}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                </div>
              )}
              <span className={styles.chipTitle}>{blog.title}</span>
              {onUnschedule && (
                <button
                  className={styles.unscheduleBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnschedule(blog.id);
                  }}
                  title="Unschedule"
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {scheduledBlogs.length > maxVisibleBlogs && (
          <div className={styles.moreIndicator}>
            +{scheduledBlogs.length - maxVisibleBlogs} more
          </div>
        )}
      </div>

      {/* Drop indicator */}
      {(isDropTarget || isHoveredDate) && !isPast && (
        <motion.div
          className={styles.dropIndicator}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Drop here</span>
        </motion.div>
      )}
    </div>
  );
}
