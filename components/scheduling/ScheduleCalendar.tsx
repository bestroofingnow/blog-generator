// components/scheduling/ScheduleCalendar.tsx
// Weekly calendar component for blog scheduling

import React, { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import CalendarDayCell from "./CalendarDayCell";
import { DragProvider } from "./DragContext";
import UnscheduledBlogsPanel from "./UnscheduledBlogsPanel";
import ScheduleTimeModal from "./ScheduleTimeModal";
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
const DAYS_OF_WEEK_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

// Get the start of the week (Sunday) for a given date
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

// Format date range for header (e.g., "Jan 5 - Jan 11, 2026")
function formatWeekRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const startMonth = MONTHS[weekStart.getMonth()];
  const endMonth = MONTHS[weekEnd.getMonth()];
  const startDay = weekStart.getDate();
  const endDay = weekEnd.getDate();
  const year = weekEnd.getFullYear();

  if (weekStart.getMonth() === weekEnd.getMonth()) {
    return `${startMonth} ${startDay} - ${endDay}, ${year}`;
  } else if (weekStart.getFullYear() !== weekEnd.getFullYear()) {
    return `${startMonth} ${startDay}, ${weekStart.getFullYear()} - ${endMonth} ${endDay}, ${year}`;
  } else {
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  }
}

export default function ScheduleCalendar({
  scheduledBlogs,
  unscheduledBlogs,
  onSchedule,
  onUnschedule,
  onBlogClick,
  isLoading = false,
}: ScheduleCalendarProps) {
  // Track the current week by its start date (Sunday)
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(new Date()));
  const [isUpdating, setIsUpdating] = useState(false);

  // Time picker modal state
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [pendingSchedule, setPendingSchedule] = useState<{
    blogId: string;
    blogTitle: string;
    date: string;
    featuredImageUrl?: string;
  } | null>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const thisWeekStart = useMemo(() => getWeekStart(new Date()), []);

  // Calculate the maximum allowed week (52 weeks from now)
  const maxWeekStart = useMemo(() => {
    const max = new Date(thisWeekStart);
    max.setDate(max.getDate() + 52 * 7); // 52 weeks
    return max;
  }, [thisWeekStart]);

  // Get the 7 days of the current week
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(currentWeekStart);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentWeekStart]);

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

  // Check if we can navigate
  const canGoPrevious = currentWeekStart > thisWeekStart;
  const canGoNext = currentWeekStart < maxWeekStart;

  // Navigation handlers
  const goToPreviousWeek = () => {
    if (!canGoPrevious) return;
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() - 7);
    // Don't go before current week
    if (newWeekStart >= thisWeekStart) {
      setCurrentWeekStart(newWeekStart);
    }
  };

  const goToNextWeek = () => {
    if (!canGoNext) return;
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() + 7);
    // Don't go more than 52 weeks ahead
    if (newWeekStart <= maxWeekStart) {
      setCurrentWeekStart(newWeekStart);
    }
  };

  const goToThisWeek = () => {
    setCurrentWeekStart(getWeekStart(new Date()));
  };

  // Check if current week is this week
  const isThisWeek = currentWeekStart.getTime() === thisWeekStart.getTime();

  // Show time picker modal before scheduling
  const handleShowTimeModal = useCallback((blogId: string, date: string) => {
    const blog = unscheduledBlogs.find(b => b.id === blogId);
    if (blog) {
      setPendingSchedule({
        blogId,
        blogTitle: blog.title,
        date,
        featuredImageUrl: blog.featuredImageUrl,
      });
      setShowTimeModal(true);
    }
  }, [unscheduledBlogs]);

  // Handle confirming schedule with selected time
  const handleConfirmSchedule = useCallback(async (dateTime: Date) => {
    if (!pendingSchedule) return;

    setShowTimeModal(false);
    setIsUpdating(true);
    try {
      await onSchedule(pendingSchedule.blogId, dateTime.toISOString());
    } finally {
      setIsUpdating(false);
      setPendingSchedule(null);
    }
  }, [pendingSchedule, onSchedule]);

  // Close modal without scheduling
  const handleCloseModal = useCallback(() => {
    setShowTimeModal(false);
    setPendingSchedule(null);
  }, []);

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
          onSchedule={handleShowTimeModal}
          isLoading={isLoading}
        />

        {/* Right panel - Weekly Calendar */}
        <div className={styles.calendarContainer}>
          {/* Calendar header */}
          <div className={styles.calendarHeader}>
            <div className={styles.monthNavigation}>
              <button
                className={`${styles.navButton} ${!canGoPrevious ? styles.navButtonDisabled : ""}`}
                onClick={goToPreviousWeek}
                disabled={!canGoPrevious}
                aria-label="Previous week"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              <h2 className={styles.monthTitle}>
                {formatWeekRange(currentWeekStart)}
              </h2>

              <button
                className={`${styles.navButton} ${!canGoNext ? styles.navButtonDisabled : ""}`}
                onClick={goToNextWeek}
                disabled={!canGoNext}
                aria-label="Next week"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            <button
              className={`${styles.todayButton} ${isThisWeek ? styles.todayButtonDisabled : ""}`}
              onClick={goToThisWeek}
              disabled={isThisWeek}
            >
              This Week
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

          {/* Days of week header with dates */}
          <div className={styles.weekHeaderWeekly}>
            {weekDays.map((date, index) => {
              const isToday = date.getTime() === today.getTime();
              return (
                <div
                  key={index}
                  className={`${styles.weekDayWeekly} ${isToday ? styles.weekDayToday : ""}`}
                >
                  <span className={styles.weekDayName}>{DAYS_OF_WEEK[index]}</span>
                  <span className={styles.weekDayDate}>{date.getDate()}</span>
                </div>
              );
            })}
          </div>

          {/* Weekly calendar grid */}
          <div className={styles.weeklyGrid}>
            {weekDays.map((date) => {
              const dateString = date.toISOString().split("T")[0];
              const isToday = date.getTime() === today.getTime();
              const isPast = date < today;
              const blogsForDay = blogsByDate[dateString] || [];

              return (
                <CalendarDayCell
                  key={dateString}
                  date={date}
                  isCurrentMonth={true}
                  isToday={isToday}
                  isPast={isPast}
                  scheduledBlogs={blogsForDay}
                  onBlogClick={onBlogClick}
                  onUnschedule={handleUnschedule}
                  isWeeklyView={true}
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

        {/* Time picker modal */}
        <ScheduleTimeModal
          isOpen={showTimeModal}
          onClose={handleCloseModal}
          onConfirm={handleConfirmSchedule}
          blogTitle={pendingSchedule?.blogTitle || ""}
          selectedDate={pendingSchedule?.date || ""}
          featuredImageUrl={pendingSchedule?.featuredImageUrl}
        />
      </div>
    </DragProvider>
  );
}
