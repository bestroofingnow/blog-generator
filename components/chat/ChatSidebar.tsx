// components/chat/ChatSidebar.tsx
// Main chat sidebar with sliding animation

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "../../styles/Chat.module.css";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import ConversationList from "./ConversationList";
import WelcomeScreen from "./WelcomeScreen";
import { TypingIndicator } from "../StreamingText";

interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  metadata?: {
    toolCalls?: Array<{ id: string; name: string; args: unknown }>;
    toolResults?: Array<{ toolCallId: string; result: unknown }>;
  };
  createdAt?: string;
}

interface Conversation {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatSidebar({ isOpen, onClose }: ChatSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+J / Ctrl+J to toggle
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }

      // Escape to close
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Load conversation when selected
  const loadConversation = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/conversations/${id}`);
      if (!response.ok) throw new Error("Failed to load conversation");

      const data = await response.json();
      setMessages(data.messages || []);
      setConversationId(id);
      setShowHistory(false);
    } catch (error) {
      console.error("Error loading conversation:", error);
    }
  }, []);

  // Start new conversation
  const startNewConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setShowHistory(false);
    setStreamingContent("");
  }, []);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    // Add user message immediately
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setStreamingContent("");

    // Create abort controller
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          conversationId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error("Chat request failed");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      // Read streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let newConversationId = conversationId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.trim()) continue;

          // Handle SSE data lines
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              // Handle conversation ID
              if (data.type === "conversationId") {
                newConversationId = data.id;
                if (!conversationId) {
                  setConversationId(data.id);
                }
              }
            } catch {
              // Not JSON, might be streaming text
            }
          }

          // Handle text delta (Vercel AI SDK format)
          if (line.startsWith("0:")) {
            try {
              const text = JSON.parse(line.slice(2));
              fullContent += text;
              setStreamingContent(fullContent);
            } catch {
              // Ignore parse errors
            }
          }

          // Handle tool calls
          if (line.startsWith("9:")) {
            try {
              const toolData = JSON.parse(line.slice(2));
              console.log("Tool call:", toolData);
            } catch {
              // Ignore
            }
          }

          // Handle tool results
          if (line.startsWith("a:")) {
            try {
              const resultData = JSON.parse(line.slice(2));
              console.log("Tool result:", resultData);
            } catch {
              // Ignore
            }
          }
        }
      }

      // Add assistant message
      if (fullContent) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: fullContent,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }

      setStreamingContent("");
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        console.log("Request aborted");
      } else {
        console.error("Chat error:", error);
        // Add error message
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: "Sorry, something went wrong. Please try again.",
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } finally {
      setIsLoading(false);
      setStreamingContent("");
      abortControllerRef.current = null;
    }
  }, [conversationId, isLoading]);

  // Handle suggestion click
  const handleSuggestion = useCallback((suggestion: string) => {
    sendMessage(suggestion);
  }, [sendMessage]);

  // Animation variants
  const sidebarVariants = {
    hidden: { x: "100%" },
    visible: { x: 0 },
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            className={styles.overlay}
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.div
            className={styles.sidebar}
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div className={styles.header}>
              <div className={styles.headerTitle}>
                <svg className={styles.headerIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                AI Assistant
              </div>
              <div className={styles.headerActions}>
                <button
                  className={styles.iconButton}
                  onClick={() => setShowHistory(!showHistory)}
                  title="Conversation history"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </button>
                <button
                  className={styles.iconButton}
                  onClick={startNewConversation}
                  title="New conversation"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <button
                  className={styles.closeButton}
                  onClick={onClose}
                  title="Close (Esc)"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* History Panel */}
            <AnimatePresence>
              {showHistory && (
                <ConversationList
                  currentId={conversationId}
                  onSelect={loadConversation}
                  onNewConversation={startNewConversation}
                  onClose={() => setShowHistory(false)}
                />
              )}
            </AnimatePresence>

            {/* Messages or Welcome */}
            {messages.length === 0 && !streamingContent ? (
              <WelcomeScreen onSuggestion={handleSuggestion} />
            ) : (
              <div className={styles.messagesContainer}>
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}

                {/* Streaming content */}
                {streamingContent && (
                  <ChatMessage
                    message={{
                      id: "streaming",
                      role: "assistant",
                      content: streamingContent,
                    }}
                    isStreaming
                  />
                )}

                {/* Loading indicator */}
                {isLoading && !streamingContent && (
                  <div className={styles.message}>
                    <div className={`${styles.messageAvatar} ${styles.messageAvatarAssistant}`}>
                      AI
                    </div>
                    <div className={styles.typing}>
                      <TypingIndicator />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Input */}
            <ChatInput
              onSend={sendMessage}
              disabled={isLoading}
              placeholder="Ask me anything..."
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
