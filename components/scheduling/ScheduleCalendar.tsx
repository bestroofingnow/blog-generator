// components/scheduling/ScheduleCalendar.tsx
// Main calendar component for blog scheduling

import React, { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import CalendarDayCell from "./CalendarDayCell";
import { DragProvider } from "./DragContext";
import UnscheduledBlogsPanel from "./UnscheduledBlogsPanel";
import styles from "../../styles/Schedule.module.css";

interface ScheduledBlog {
  id: string;
  title: string;
  type: string;
  scheduledPublishAt: string | null;
  scheduleStatus: string;
  featuredImageUrl?: string;
}

interface UnscheduledBlog {
  id: string;
  title: string;
  type: string;
  featuredImageUrl?: string;
}

interface ScheduleCalendarProps {
  scheduledBlogs: ScheduledBlog[];
  unscheduledBlogs: UnscheduledBlog[];
  onSchedule: (blogId: string, date: string) => Promise<void>;
  onUnschedule: (blogId: string) => Promise<void>;
  onBlogClick?: (blogId: string) => void;
  isLoading?: boolean;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function ScheduleCalendar({
  scheduledBlogs,
  unscheduledBlogs,
  onSchedule,
  onUnschedule,
  onBlogClick,
  isLoading = false,
}: ScheduleCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isUpdating, setIsUpdating] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Get calendar days for current month view
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);

    // Start from the beginning of the week containing the first day
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    // End at the end of the week containing the last day
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const days: Date[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [currentDate]);

  // Group scheduled blogs by date
  const blogsByDate = useMemo(() => {
    const grouped: Record<string, ScheduledBlog[]> = {};

    scheduledBlogs.forEach((blog) => {
      if (blog.scheduledPublishAt) {
        const dateKey = blog.scheduledPublishAt.split("T")[0];
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(blog);
      }
    });

    return grouped;
  }, [scheduledBlogs]);

  // Navigation handlers
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Handle scheduling
  const handleSchedule = useCallback(async (blogId: string, date: string) => {
    setIsUpdating(true);
    try {
      await onSchedule(blogId, date);
    } finally {
      setIsUpdating(false);
    }
  }, [onSchedule]);

  // Handle unscheduling
  const handleUnschedule = useCallback(async (blogId: string) => {
    setIsUpdating(true);
    try {
      await onUnschedule(blogId);
    } finally {
      setIsUpdating(false);
    }
  }, [onUnschedule]);

  return (
    <DragProvider>
      <div className={styles.scheduleContainer}>
        {/* Left panel - Unscheduled blogs */}
        <UnscheduledBlogsPanel
          blogs={unscheduledBlogs}
          onSchedule={handleSchedule}
          isLoading={isLoading}
        />

        {/* Right panel - Calendar */}
        <div className={styles.calendarContainer}>
          {/* Calendar header */}
          <div className={styles.calendarHeader}>
            <div className={styles.monthNavigation}>
              <button
                className={styles.navButton}
                onClick={goToPreviousMonth}
                aria-label="Previous month"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              <h2 className={styles.monthTitle}>
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>

              <button
                className={styles.navButton}
                onClick={goToNextMonth}
                aria-label="Next month"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            <button className={styles.todayButton} onClick={goToToday}>
              Today
            </button>
          </div>

          {/* Loading overlay */}
          {(isLoading || isUpdating) && (
            <motion.div
              className={styles.loadingOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className={styles.spinner} />
            </motion.div>
          )}

          {/* Days of week header */}
          <div className={styles.weekHeader}>
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className={styles.weekDay}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className={styles.calendarGrid}>
            {calendarDays.map((date) => {
              const dateString = date.toISOString().split("T")[0];
              const isCurrentMonth = date.getMonth() === currentDate.getMonth();
              const isToday = date.getTime() === today.getTime();
              const isPast = date < today;
              const blogsForDay = blogsByDate[dateString] || [];

              return (
                <CalendarDayCell
                  key={dateString}
                  date={date}
                  isCurrentMonth={isCurrentMonth}
                  isToday={isToday}
                  isPast={isPast}
                  scheduledBlogs={blogsForDay}
                  onBlogClick={onBlogClick}
                  onUnschedule={handleUnschedule}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div className={styles.legend}>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ backgroundColor: "#3b82f6" }} />
              Blog
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ backgroundColor: "#22c55e" }} />
              Service
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ backgroundColor: "#f59e0b" }} />
              Location
            </div>
          </div>
        </div>
      </div>
    </DragProvider>
  );
}
