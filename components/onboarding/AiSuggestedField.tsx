// components/onboarding/AiSuggestedField.tsx
// Reusable input field with AI suggestion indicator

import React from "react";
import styles from "../../styles/Onboarding.module.css";

interface AiSuggestedFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  isAiSuggested?: boolean;
  confidence?: number; // 0-100
  isVerified?: boolean;
  onVerify?: (verified: boolean) => void;
  type?: "text" | "email" | "tel" | "url" | "textarea";
  disabled?: boolean;
  className?: string;
  helpText?: string;
}

export default function AiSuggestedField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  isAiSuggested = false,
  confidence,
  isVerified,
  onVerify,
  type = "text",
  disabled = false,
  className = "",
  helpText,
}: AiSuggestedFieldProps) {
  const getConfidenceLevel = (): "high" | "medium" | "low" => {
    if (!confidence) return "low";
    if (confidence >= 80) return "high";
    if (confidence >= 50) return "medium";
    return "low";
  };

  const InputComponent = type === "textarea" ? "textarea" : "input";

  return (
    <div className={`${styles.inputGroup} ${className}`}>
      <label className={styles.label}>
        {label}
        {required && <span className={styles.required}>*</span>}
        {isAiSuggested && (
          <span className={styles.aiSuggestedBadge}>
            <span className={styles.aiIcon}>✨</span>
            AI
          </span>
        )}
      </label>

      <InputComponent
        type={type !== "textarea" ? type : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`${styles.input} ${type === "textarea" ? styles.textarea : ""} ${
          isAiSuggested ? styles.aiSuggested : ""
        }`}
      />

      {isAiSuggested && confidence !== undefined && (
        <div className={styles.confidenceWrapper}>
          <div className={styles.confidenceBar}>
            <div
              className={`${styles.confidenceFill} ${styles[getConfidenceLevel()]}`}
              style={{ width: `${confidence}%` }}
            />
          </div>
          <span className={styles.confidenceText}>{confidence}%</span>
        </div>
      )}

      {isAiSuggested && onVerify && (
        <label className={styles.verifyWrapper}>
          <input
            type="checkbox"
            checked={isVerified || false}
            onChange={(e) => onVerify(e.target.checked)}
            className={styles.verifyCheckbox}
          />
          I verify this information is correct
        </label>
      )}

      {helpText && (
        <p className={styles.helpText} style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.25rem" }}>
          {helpText}
        </p>
      )}
    </div>
  );
}

// Tags variant for arrays (services, USPs, etc.)
interface AiSuggestedTagsProps {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  isAiSuggested?: boolean;
  aiTags?: string[]; // Tags that were AI-suggested
  maxTags?: number;
}

export function AiSuggestedTags({
  label,
  tags,
  onChange,
  placeholder = "Type and press Enter to add...",
  isAiSuggested = false,
  aiTags = [],
  maxTags = 20,
}: AiSuggestedTagsProps) {
  const [inputValue, setInputValue] = React.useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      if (tags.length < maxTags && !tags.includes(inputValue.trim())) {
        onChange([...tags, inputValue.trim()]);
        setInputValue("");
      }
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className={styles.inputGroup}>
      <label className={styles.label}>
        {label}
        {isAiSuggested && (
          <span className={styles.aiSuggestedBadge}>
            <span className={styles.aiIcon}>✨</span>
            AI
          </span>
        )}
      </label>

      <div className={styles.tagsContainer}>
        {tags.map((tag, index) => (
          <span
            key={index}
            className={`${styles.tag} ${aiTags.includes(tag) ? styles.aiTag : ""}`}
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className={styles.tagRemove}
            >
              ×
            </button>
          </span>
        ))}
        {tags.length < maxTags && (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? placeholder : "Add more..."}
            className={styles.tagInput}
          />
        )}
      </div>
    </div>
  );
}

// Select variant
interface AiSuggestedSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  isAiSuggested?: boolean;
  disabled?: boolean;
}

export function AiSuggestedSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Select...",
  required = false,
  isAiSuggested = false,
  disabled = false,
}: AiSuggestedSelectProps) {
  return (
    <div className={styles.inputGroup}>
      <label className={styles.label}>
        {label}
        {required && <span className={styles.required}>*</span>}
        {isAiSuggested && (
          <span className={styles.aiSuggestedBadge}>
            <span className={styles.aiIcon}>✨</span>
            AI
          </span>
        )}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`${styles.input} ${styles.select} ${
          isAiSuggested ? styles.aiSuggested : ""
        }`}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
