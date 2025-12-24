// components/chat/ChatInput.tsx
// Chat input with auto-resize textarea

import { useState, useRef, useCallback, useEffect, KeyboardEvent } from "react";
import styles from "../../styles/Chat.module.css";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (value.trim() && !disabled) {
      onSend(value.trim());
      setValue("");
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  }, [value, disabled, onSend]);

  // Handle keyboard
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter to send (without shift)
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className={styles.inputContainer}>
      <div className={styles.inputWrapper}>
        <textarea
          ref={textareaRef}
          className={styles.input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Type a message..."}
          disabled={disabled}
          rows={1}
        />
        <button
          className={styles.sendButton}
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          title="Send message"
        >
          <svg
            className={styles.sendIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
