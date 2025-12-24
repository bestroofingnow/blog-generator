// components/CommandPalette.tsx
// Full-featured command palette with navigation, AI actions, and keyboard shortcuts
import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { Command } from "cmdk";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { commandPalette, modalOverlay } from "../lib/animations";
import styles from "../styles/CommandPalette.module.css";

// Types
interface CommandItem {
  id: string;
  label: string;
  shortcut?: string[];
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

interface CommandGroup {
  heading: string;
  items: CommandItem[];
}

// Custom event for command palette actions
export const COMMAND_EVENTS = {
  NAVIGATE: "cmd:navigate",
  NEW_BLOG: "cmd:new-blog",
  NEW_SERVICE_PAGE: "cmd:new-service-page",
  GENERATE_INTRO: "cmd:generate-intro",
  OPTIMIZE_SEO: "cmd:optimize-seo",
  RESEARCH_KEYWORDS: "cmd:research-keywords",
  GENERATE_OUTLINE: "cmd:generate-outline",
  EXPORT_CONTENT: "cmd:export-content",
  TOGGLE_THEME: "cmd:toggle-theme",
  SAVE_DRAFT: "cmd:save-draft",
  OPEN_CHAT: "cmd:open-chat",
} as const;

export function dispatchCommandEvent(event: string, detail?: Record<string, unknown>) {
  window.dispatchEvent(new CustomEvent(event, { detail }));
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if user is admin
  const isAdmin = (session?.user as { role?: string })?.role === "admin";

  // Toggle command palette with keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open command palette: Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }

      // Close on Escape
      if (e.key === "Escape" && open) {
        setOpen(false);
      }

      // Global shortcuts when palette is closed
      if (!open) {
        // Cmd+N: New blog
        if ((e.metaKey || e.ctrlKey) && e.key === "n") {
          e.preventDefault();
          dispatchCommandEvent(COMMAND_EVENTS.NEW_BLOG);
        }

        // Cmd+S: Save draft
        if ((e.metaKey || e.ctrlKey) && e.key === "s") {
          e.preventDefault();
          dispatchCommandEvent(COMMAND_EVENTS.SAVE_DRAFT);
        }

        // Cmd+Shift+D: Toggle dark mode
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "d") {
          e.preventDefault();
          setTheme(theme === "dark" ? "light" : "dark");
        }

        // Cmd+Enter: Generate content
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          dispatchCommandEvent(COMMAND_EVENTS.GENERATE_OUTLINE);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, theme, setTheme]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearch("");
    }
  }, [open]);

  const runCommand = useCallback((action: () => void) => {
    setOpen(false);
    action();
  }, []);

  // Command groups
  const commandGroups: CommandGroup[] = [
    {
      heading: "Navigation",
      items: [
        {
          id: "nav-create",
          label: "Create Blog/Page",
          shortcut: ["G", "C"],
          icon: <PenIcon />,
          action: () => dispatchCommandEvent(COMMAND_EVENTS.NAVIGATE, { section: "create" }),
          keywords: ["new", "write", "blog", "page"],
        },
        {
          id: "nav-library",
          label: "Page Library",
          shortcut: ["G", "L"],
          icon: <FolderIcon />,
          action: () => dispatchCommandEvent(COMMAND_EVENTS.NAVIGATE, { section: "library" }),
          keywords: ["drafts", "saved", "content"],
        },
        {
          id: "nav-profile",
          label: "Company Profile",
          shortcut: ["G", "P"],
          icon: <UserIcon />,
          action: () => dispatchCommandEvent(COMMAND_EVENTS.NAVIGATE, { section: "profile" }),
          keywords: ["settings", "company", "business"],
        },
        {
          id: "nav-setup",
          label: "Settings & Integrations",
          shortcut: ["G", "S"],
          icon: <SettingsIcon />,
          action: () => dispatchCommandEvent(COMMAND_EVENTS.NAVIGATE, { section: "setup" }),
          keywords: ["wordpress", "ghl", "integration"],
        },
        {
          id: "nav-research",
          label: "Research Tools",
          shortcut: ["G", "R"],
          icon: <SearchIcon />,
          action: () => dispatchCommandEvent(COMMAND_EVENTS.NAVIGATE, { section: "research" }),
          keywords: ["serp", "keywords", "analysis"],
        },
        {
          id: "nav-knowledge",
          label: "Knowledge Base",
          shortcut: ["G", "K"],
          icon: <BookIcon />,
          action: () => dispatchCommandEvent(COMMAND_EVENTS.NAVIGATE, { section: "knowledge" }),
          keywords: ["facts", "services", "usps"],
        },
      ],
    },
    {
      heading: "AI Actions",
      items: [
        {
          id: "ai-intro",
          label: "Generate Introduction",
          icon: <SparklesIcon />,
          action: () => dispatchCommandEvent(COMMAND_EVENTS.GENERATE_INTRO),
          keywords: ["write", "intro", "opening"],
        },
        {
          id: "ai-seo",
          label: "Optimize for SEO",
          icon: <ChartIcon />,
          action: () => dispatchCommandEvent(COMMAND_EVENTS.OPTIMIZE_SEO),
          keywords: ["analyze", "improve", "keywords"],
        },
        {
          id: "ai-keywords",
          label: "Research Keywords",
          icon: <TargetIcon />,
          action: () => dispatchCommandEvent(COMMAND_EVENTS.RESEARCH_KEYWORDS),
          keywords: ["search", "topics", "suggestions"],
        },
        {
          id: "ai-outline",
          label: "Generate Outline",
          shortcut: ["Ctrl", "Enter"],
          icon: <ListIcon />,
          action: () => dispatchCommandEvent(COMMAND_EVENTS.GENERATE_OUTLINE),
          keywords: ["structure", "sections", "plan"],
        },
      ],
    },
    {
      heading: "Quick Actions",
      items: [
        {
          id: "action-new-blog",
          label: "New Blog Post",
          shortcut: ["Ctrl", "N"],
          icon: <PlusIcon />,
          action: () => dispatchCommandEvent(COMMAND_EVENTS.NEW_BLOG),
          keywords: ["create", "start", "fresh"],
        },
        {
          id: "action-new-service",
          label: "New Service Page",
          icon: <PageIcon />,
          action: () => dispatchCommandEvent(COMMAND_EVENTS.NEW_SERVICE_PAGE),
          keywords: ["create", "service", "landing"],
        },
        {
          id: "action-export",
          label: "Export Content",
          icon: <DownloadIcon />,
          action: () => dispatchCommandEvent(COMMAND_EVENTS.EXPORT_CONTENT),
          keywords: ["download", "html", "copy"],
        },
        {
          id: "action-save",
          label: "Save Draft",
          shortcut: ["Ctrl", "S"],
          icon: <SaveIcon />,
          action: () => dispatchCommandEvent(COMMAND_EVENTS.SAVE_DRAFT),
          keywords: ["store", "keep"],
        },
        {
          id: "action-theme",
          label: `Toggle ${theme === "dark" ? "Light" : "Dark"} Mode`,
          shortcut: ["Ctrl", "Shift", "D"],
          icon: theme === "dark" ? <SunIcon /> : <MoonIcon />,
          action: () => setTheme(theme === "dark" ? "light" : "dark"),
          keywords: ["dark", "light", "theme", "mode"],
        },
        {
          id: "action-chat",
          label: "Open AI Chat",
          shortcut: ["Ctrl", "J"],
          icon: <ChatIcon />,
          action: () => dispatchCommandEvent(COMMAND_EVENTS.OPEN_CHAT),
          keywords: ["assistant", "help", "ai", "conversation"],
        },
      ],
    },
  ];

  // Add admin commands if user is admin
  const allCommandGroups = useMemo(() => {
    if (!isAdmin) return commandGroups;

    return [
      ...commandGroups,
      {
        heading: "Admin",
        items: [
          {
            id: "admin-users",
            label: "Manage Users",
            shortcut: ["G", "U"],
            icon: <UsersIcon />,
            action: () => router.push("/admin/users"),
            keywords: ["users", "admin", "roles", "permissions"],
          },
        ],
      },
    ];
  }, [isAdmin, commandGroups, router]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className={styles.backdrop}
            variants={modalOverlay}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={() => setOpen(false)}
          />

          {/* Command Dialog */}
          <motion.div
            className={styles.dialog}
            variants={commandPalette}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.15 }}
          >
            <Command
              className={styles.command}
              loop
              shouldFilter={true}
            >
              {/* Search input */}
              <div className={styles.inputWrapper}>
                <SearchIcon />
                <Command.Input
                  ref={inputRef}
                  className={styles.input}
                  placeholder="Type a command or search..."
                  value={search}
                  onValueChange={setSearch}
                />
                <kbd className={styles.kbd}>ESC</kbd>
              </div>

              {/* Results */}
              <Command.List className={styles.list}>
                <Command.Empty className={styles.empty}>
                  No results found.
                </Command.Empty>

                {allCommandGroups.map((group) => (
                  <Command.Group
                    key={group.heading}
                    heading={group.heading}
                    className={styles.group}
                  >
                    {group.items.map((item) => (
                      <Command.Item
                        key={item.id}
                        value={`${item.label} ${item.keywords?.join(" ") || ""}`}
                        onSelect={() => runCommand(item.action)}
                        className={styles.item}
                      >
                        <span className={styles.itemIcon}>{item.icon}</span>
                        <span className={styles.itemLabel}>{item.label}</span>
                        {item.shortcut && (
                          <div className={styles.shortcut}>
                            {item.shortcut.map((key, i) => (
                              <kbd key={i} className={styles.kbd}>
                                {key === "Ctrl" ? (navigator.platform.includes("Mac") ? "⌘" : "Ctrl") : key}
                              </kbd>
                            ))}
                          </div>
                        )}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>

              {/* Footer */}
              <div className={styles.footer}>
                <span>
                  <kbd className={styles.kbdSmall}>↑↓</kbd> Navigate
                </span>
                <span>
                  <kbd className={styles.kbdSmall}>↵</kbd> Select
                </span>
                <span>
                  <kbd className={styles.kbdSmall}>ESC</kbd> Close
                </span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Icons
function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="M2 2l7.586 7.586" />
      <circle cx="11" cy="11" r="2" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.813L19.5 10.5l-5.588 1.687L12 18l-1.912-5.813L4.5 10.5l5.588-1.687L12 3z" />
      <path d="M5 3l.5 1.5L7 5l-1.5.5L5 7l-.5-1.5L3 5l1.5-.5L5 3z" />
      <path d="M19 17l.5 1.5L21 19l-1.5.5-.5 1.5-.5-1.5L17 19l1.5-.5.5-1.5z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function PageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
