// components/scheduling/ScheduleTimeModal.tsx
// Modal for selecting publish time when scheduling a blog

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "../../styles/Schedule.module.css";

interface ScheduleTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (dateTime: Date) => void;
  blogTitle: string;
  selectedDate: string; // YYYY-MM-DD
  featuredImageUrl?: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function ScheduleTimeModal({
  isOpen,
  onClose,
  onConfirm,
  blogTitle,
  selectedDate,
  featuredImageUrl,
}: ScheduleTimeModalProps) {
  const [selectedTime, setSelectedTime] = useState("09:00");

  // Reset time when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTime("09:00");
    }
  }, [isOpen]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + "T00:00:00");
    return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const handleConfirm = () => {
    const [hours, minutes] = selectedTime.split(":").map(Number);
    const dateTime = new Date(selectedDate + "T00:00:00");
    dateTime.setHours(hours, minutes, 0, 0);
    onConfirm(dateTime);
  };

  // Quick time presets
  const timePresets = [
    { label: "6:00 AM", value: "06:00" },
    { label: "9:00 AM", value: "09:00" },
    { label: "12:00 PM", value: "12:00" },
    { label: "3:00 PM", value: "15:00" },
    { label: "6:00 PM", value: "18:00" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className={styles.modalBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className={styles.scheduleModal}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Schedule Blog</h3>
              <button className={styles.modalClose} onClick={onClose}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className={styles.modalContent}>
              {/* Blog preview */}
              <div className={styles.blogPreview}>
                {featuredImageUrl ? (
                  <img
                    src={featuredImageUrl}
                    alt=""
                    className={styles.previewImage}
                  />
                ) : (
                  <div className={styles.previewPlaceholder}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  </div>
                )}
                <h4 className={styles.previewTitle}>{blogTitle}</h4>
              </div>

              {/* Date display */}
              <div className={styles.dateDisplay}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>{formatDate(selectedDate)}</span>
              </div>

              {/* Time selector */}
              <div className={styles.timeSelector}>
                <label className={styles.timeLabel}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Publish Time
                </label>

                {/* Time presets */}
                <div className={styles.timePresets}>
                  {timePresets.map((preset) => (
                    <button
                      key={preset.value}
                      className={`${styles.timePreset} ${selectedTime === preset.value ? styles.activePreset : ""}`}
                      onClick={() => setSelectedTime(preset.value)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Custom time input */}
                <div className={styles.customTime}>
                  <span>Or select custom time:</span>
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className={styles.timeInput}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={onClose}>
                Cancel
              </button>
              <button className={styles.confirmBtn} onClick={handleConfirm}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Schedule
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
