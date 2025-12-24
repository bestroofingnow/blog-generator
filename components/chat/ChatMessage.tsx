// components/chat/ChatMessage.tsx
// Individual chat message display

import { motion } from "framer-motion";
import styles from "../../styles/Chat.module.css";

interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  metadata?: {
    toolCalls?: Array<{ id: string; name: string; args: unknown }>;
    toolResults?: Array<{ toolCallId: string; result: unknown }>;
  };
}

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

// Simple markdown-like parsing for common patterns
function parseContent(content: string): string {
  return content
    // Bold: **text** or __text__
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.*?)__/g, "<strong>$1</strong>")
    // Italic: *text* or _text_
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/_(.*?)_/g, "<em>$1</em>")
    // Inline code: `code`
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Links: [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Line breaks
    .replace(/\n/g, "<br />");
}

export default function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isTool = message.role === "tool";

  // Don't render tool messages directly (they're shown inline)
  if (isTool) return null;

  return (
    <motion.div
      className={`${styles.message} ${isUser ? styles.messageUser : ""}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className={`${styles.messageAvatar} ${
          isUser ? styles.messageAvatarUser : styles.messageAvatarAssistant
        }`}
      >
        {isUser ? "You" : "AI"}
      </div>

      <div
        className={`${styles.messageContent} ${
          isUser ? styles.messageContentUser : styles.messageContentAssistant
        }`}
      >
        <div dangerouslySetInnerHTML={{ __html: parseContent(message.content) }} />

        {/* Tool calls indicator */}
        {message.metadata?.toolCalls && message.metadata.toolCalls.length > 0 && (
          <div className={styles.toolExecution}>
            {message.metadata.toolCalls.map((tool) => (
              <div key={tool.id} className={styles.toolHeader}>
                <svg className={styles.toolIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
                <span className={styles.toolName}>{formatToolName(tool.name)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tool results */}
        {message.metadata?.toolResults && message.metadata.toolResults.length > 0 && (
          <div className={styles.toolExecution}>
            {message.metadata.toolResults.map((result, idx) => (
              <div
                key={idx}
                className={`${styles.toolResult} ${
                  (result.result as { success?: boolean })?.success !== false
                    ? styles.toolSuccess
                    : styles.toolError
                }`}
              >
                {formatToolResult(result.result)}
              </div>
            ))}
          </div>
        )}

        {/* Streaming cursor */}
        {isStreaming && (
          <motion.span
            style={{
              display: "inline-block",
              width: 2,
              height: "1em",
              background: "currentColor",
              marginLeft: 2,
              verticalAlign: "text-bottom",
            }}
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
          />
        )}
      </div>
    </motion.div>
  );
}

function formatToolName(name: string): string {
  // Convert camelCase to Title Case
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatToolResult(result: unknown): string {
  if (typeof result !== "object" || result === null) {
    return String(result);
  }

  const obj = result as Record<string, unknown>;

  // Handle common result patterns
  if (obj.message) return String(obj.message);
  if (obj.success === true) return obj.message ? String(obj.message) : "Completed successfully";
  if (obj.success === false) return obj.message ? String(obj.message) : "Operation failed";

  // For complex results, show a summary
  if (obj.drafts) return `Found ${(obj.drafts as unknown[]).length} drafts`;
  if (obj.outline) return "Outline generated";
  if (obj.profile) return "Profile loaded";

  return JSON.stringify(result, null, 2).slice(0, 200);
}
