// components/settings/SecurityQuestions.tsx
// Component for setting up security questions for password reset

import React, { useState, useEffect } from "react";
import styles from "../../styles/Settings.module.css";

// Security question options
const SECURITY_QUESTION_OPTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the name of your elementary school?",
  "What was your childhood nickname?",
  "What is the name of your favorite childhood friend?",
  "What street did you grow up on?",
  "What was the make of your first car?",
  "What is your oldest sibling's middle name?",
  "In what city did your parents meet?",
];

interface SecurityQuestionsProps {
  onSave?: () => void;
}

export default function SecurityQuestions({ onSave }: SecurityQuestionsProps) {
  const [hasQuestions, setHasQuestions] = useState<boolean | null>(null);
  const [currentQuestions, setCurrentQuestions] = useState<string[]>([]);
  const [question1, setQuestion1] = useState("");
  const [answer1, setAnswer1] = useState("");
  const [question2, setQuestion2] = useState("");
  const [answer2, setAnswer2] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Check if user has security questions set up
  useEffect(() => {
    const checkQuestions = async () => {
      try {
        const response = await fetch("/api/auth/security-questions");
        const data = await response.json();

        if (data.success) {
          setHasQuestions(data.hasSecurityQuestions);
          if (data.questions) {
            setCurrentQuestions(data.questions);
            setQuestion1(data.questions[0] || "");
            setQuestion2(data.questions[1] || "");
          }
        }
      } catch (err) {
        console.error("Error checking security questions:", err);
      } finally {
        setIsLoading(false);
      }
    };

    checkQuestions();
  }, []);

  const handleSave = async () => {
    setError("");
    setSuccess("");

    // Validation
    if (!question1 || !question2) {
      setError("Please select both security questions");
      return;
    }

    if (question1 === question2) {
      setError("Please select two different questions");
      return;
    }

    if (!answer1.trim() || !answer2.trim()) {
      setError("Please provide answers to both questions");
      return;
    }

    if (answer1.trim().length < 2 || answer2.trim().length < 2) {
      setError("Answers must be at least 2 characters");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/auth/security-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question1,
          answer1,
          question2,
          answer2,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess("Security questions saved successfully!");
        setHasQuestions(true);
        setCurrentQuestions([question1, question2]);
        setAnswer1("");
        setAnswer2("");
        onSave?.();
      } else {
        setError(data.error || "Failed to save security questions");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Security Questions</h3>
        <p className={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionIcon}>🔐</div>
        <div>
          <h3 className={styles.sectionTitle}>Security Questions</h3>
          <p className={styles.sectionDescription}>
            Set up security questions to reset your password if you forget it.
          </p>
        </div>
      </div>

      {hasQuestions && (
        <div className={styles.statusBadge}>
          <span className={styles.statusIcon}>✓</span>
          Security questions are set up
        </div>
      )}

      {!hasQuestions && (
        <div className={styles.warningBadge}>
          <span className={styles.warningIcon}>⚠️</span>
          No security questions set. You won't be able to reset your password.
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <div className={styles.formGroup}>
        <label className={styles.label}>Security Question 1</label>
        <select
          className={styles.select}
          value={question1}
          onChange={(e) => setQuestion1(e.target.value)}
        >
          <option value="">Select a question...</option>
          {SECURITY_QUESTION_OPTIONS.map((q) => (
            <option key={q} value={q} disabled={q === question2}>
              {q}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Answer 1</label>
        <input
          type="text"
          className={styles.input}
          value={answer1}
          onChange={(e) => setAnswer1(e.target.value)}
          placeholder="Your answer (case-insensitive)"
          autoComplete="off"
        />
        <p className={styles.hint}>Answers are not case-sensitive</p>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Security Question 2</label>
        <select
          className={styles.select}
          value={question2}
          onChange={(e) => setQuestion2(e.target.value)}
        >
          <option value="">Select a question...</option>
          {SECURITY_QUESTION_OPTIONS.map((q) => (
            <option key={q} value={q} disabled={q === question1}>
              {q}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Answer 2</label>
        <input
          type="text"
          className={styles.input}
          value={answer2}
          onChange={(e) => setAnswer2(e.target.value)}
          placeholder="Your answer (case-insensitive)"
          autoComplete="off"
        />
      </div>

      <button
        className={styles.saveButton}
        onClick={handleSave}
        disabled={isSaving}
      >
        {isSaving ? "Saving..." : hasQuestions ? "Update Security Questions" : "Save Security Questions"}
      </button>
    </div>
  );
}
