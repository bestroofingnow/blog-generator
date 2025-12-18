// lib/hooks/useKeyboardShortcuts.ts
// Global keyboard shortcut hook for the application
import { useEffect, useCallback } from "react";
import { COMMAND_EVENTS, dispatchCommandEvent } from "../../components/CommandPalette";

export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description?: string;
  preventDefault?: boolean;
}

// Default shortcuts configuration
const DEFAULT_SHORTCUTS: ShortcutConfig[] = [
  // Navigation shortcuts (using G prefix like Vim/GitHub)
  // These are handled in the command palette
];

export function useKeyboardShortcuts(
  customShortcuts: ShortcutConfig[] = [],
  enabled = true
) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Skip if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Allow Ctrl+S for save even in inputs
        if (!(e.ctrlKey || e.metaKey) || e.key !== "s") {
          return;
        }
      }

      const allShortcuts = [...DEFAULT_SHORTCUTS, ...customShortcuts];

      for (const shortcut of allShortcuts) {
        const ctrlOrMeta = shortcut.ctrl || shortcut.meta;
        const hasCtrlOrMeta = e.ctrlKey || e.metaKey;

        const matches =
          e.key.toLowerCase() === shortcut.key.toLowerCase() &&
          (ctrlOrMeta ? hasCtrlOrMeta : !hasCtrlOrMeta) &&
          (shortcut.shift ? e.shiftKey : !e.shiftKey) &&
          (shortcut.alt ? e.altKey : !e.altKey);

        if (matches) {
          if (shortcut.preventDefault !== false) {
            e.preventDefault();
          }
          shortcut.action();
          return;
        }
      }
    },
    [enabled, customShortcuts]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

// Hook specifically for command palette event listening
export function useCommandListener(
  handlers: Partial<Record<keyof typeof COMMAND_EVENTS, (detail?: unknown) => void>>
) {
  useEffect(() => {
    const eventHandlers: Array<[string, (e: Event) => void]> = [];

    Object.entries(handlers).forEach(([eventKey, handler]) => {
      const eventName = COMMAND_EVENTS[eventKey as keyof typeof COMMAND_EVENTS];
      if (eventName && handler) {
        const wrappedHandler = (e: Event) => {
          handler((e as CustomEvent).detail);
        };
        eventHandlers.push([eventName, wrappedHandler]);
        window.addEventListener(eventName, wrappedHandler);
      }
    });

    return () => {
      eventHandlers.forEach(([eventName, handler]) => {
        window.removeEventListener(eventName, handler);
      });
    };
  }, [handlers]);
}

// Navigation helper for command palette
export function useNavigationCommands(
  setActiveSection: (section: string) => void
) {
  useCommandListener({
    NAVIGATE: (detail) => {
      const { section } = detail as { section: string };
      if (section) {
        setActiveSection(section);
      }
    },
  });
}

// Export command events for convenience
export { COMMAND_EVENTS, dispatchCommandEvent };
