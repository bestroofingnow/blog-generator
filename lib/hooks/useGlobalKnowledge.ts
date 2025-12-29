// lib/hooks/useGlobalKnowledge.ts
// Global hook for accessing user's knowledge base throughout the app

import { useState, useEffect, useCallback, createContext, useContext } from "react";

export interface KnowledgeEntry {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  isAiGenerated: boolean;
  isVerified: boolean;
  priority: number;
  usageCount: number;
  source?: string;
  confidence?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AggregatedKnowledge {
  services: string[];
  usps: string[];
  facts: string[];
  locations: string[];
  certifications: string[];
  team: string[];
  faqs: { question: string; answer: string }[];
  testimonials: string[];
  custom: string[];
  totalEntries: number;
}

interface KnowledgeContextType {
  entries: KnowledgeEntry[];
  aggregated: AggregatedKnowledge | null;
  isLoading: boolean;
  error: string | null;
  lastSaved: Date | null;
  isSaving: boolean;
  refresh: () => Promise<void>;
  addEntry: (entry: Omit<KnowledgeEntry, "id" | "createdAt" | "updatedAt" | "usageCount">) => Promise<boolean>;
  updateEntry: (id: string, updates: Partial<KnowledgeEntry>) => Promise<boolean>;
  deleteEntry: (id: string) => Promise<boolean>;
  parseDocument: (content: string, title?: string, source?: string) => Promise<{
    success: boolean;
    profileFieldsUpdated?: string[];
    entriesCreated?: number;
  }>;
  syncToProfile: () => Promise<{ success: boolean; updatedFields?: string[] }>;
  getEntriesByCategory: (category: string) => KnowledgeEntry[];
  searchEntries: (query: string) => KnowledgeEntry[];
}

const KnowledgeContext = createContext<KnowledgeContextType | null>(null);

export function useGlobalKnowledge(): KnowledgeContextType {
  const context = useContext(KnowledgeContext);

  // If not in a provider, create standalone functionality
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [aggregated, setAggregated] = useState<AggregatedKnowledge | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/knowledge-base?action=list");
      const data = await response.json();
      if (data.success) {
        setEntries(data.entries || []);
        // Aggregate knowledge
        const agg: AggregatedKnowledge = {
          services: [],
          usps: [],
          facts: [],
          locations: [],
          certifications: [],
          team: [],
          faqs: [],
          testimonials: [],
          custom: [],
          totalEntries: data.entries?.length || 0,
        };
        for (const entry of (data.entries || []) as KnowledgeEntry[]) {
          switch (entry.category) {
            case "services":
              agg.services.push(entry.content);
              break;
            case "usps":
              agg.usps.push(entry.content);
              break;
            case "facts":
              agg.facts.push(entry.content);
              break;
            case "locations":
              agg.locations.push(entry.title);
              break;
            case "certifications":
              agg.certifications.push(entry.title);
              break;
            case "team":
              agg.team.push(entry.content);
              break;
            case "faqs":
              agg.faqs.push({ question: entry.title, answer: entry.content });
              break;
            case "testimonials":
              agg.testimonials.push(entry.content);
              break;
            default:
              agg.custom.push(entry.content);
          }
        }
        setAggregated(agg);
      } else {
        setError(data.error || "Failed to load knowledge");
      }
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addEntry = useCallback(async (
    entry: Omit<KnowledgeEntry, "id" | "createdAt" | "updatedAt" | "usageCount">
  ): Promise<boolean> => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/knowledge-base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      const data = await response.json();
      if (data.success) {
        setLastSaved(new Date());
        await refresh();
        return true;
      }
      setError(data.error || "Failed to add entry");
      return false;
    } catch {
      setError("Failed to add entry");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [refresh]);

  const updateEntry = useCallback(async (
    id: string,
    updates: Partial<KnowledgeEntry>
  ): Promise<boolean> => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/knowledge-base", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await response.json();
      if (data.success) {
        setLastSaved(new Date());
        await refresh();
        return true;
      }
      setError(data.error || "Failed to update entry");
      return false;
    } catch {
      setError("Failed to update entry");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [refresh]);

  const deleteEntry = useCallback(async (id: string): Promise<boolean> => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/knowledge-base?id=${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.success) {
        await refresh();
        return true;
      }
      setError(data.error || "Failed to delete entry");
      return false;
    } catch {
      setError("Failed to delete entry");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [refresh]);

  const parseDocument = useCallback(async (
    content: string,
    title?: string,
    source?: string
  ): Promise<{ success: boolean; profileFieldsUpdated?: string[]; entriesCreated?: number }> => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/knowledge-base/parse-and-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, title, source }),
      });
      const data = await response.json();
      if (data.success) {
        setLastSaved(new Date());
        await refresh();
        return {
          success: true,
          profileFieldsUpdated: data.profileFieldsUpdated,
          entriesCreated: data.entriesCreated,
        };
      }
      setError(data.error || "Failed to parse document");
      return { success: false };
    } catch {
      setError("Failed to parse document");
      return { success: false };
    } finally {
      setIsSaving(false);
    }
  }, [refresh]);

  const syncToProfile = useCallback(async (): Promise<{
    success: boolean;
    updatedFields?: string[];
  }> => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/knowledge-base/sync-to-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply" }),
      });
      const data = await response.json();
      if (data.success) {
        setLastSaved(new Date());
        return {
          success: true,
          updatedFields: data.updatedFields,
        };
      }
      return { success: false };
    } catch {
      return { success: false };
    } finally {
      setIsSaving(false);
    }
  }, []);

  const getEntriesByCategory = useCallback((category: string): KnowledgeEntry[] => {
    return entries.filter((e) => e.category === category);
  }, [entries]);

  const searchEntries = useCallback((query: string): KnowledgeEntry[] => {
    const lower = query.toLowerCase();
    return entries.filter(
      (e) =>
        e.title.toLowerCase().includes(lower) ||
        e.content.toLowerCase().includes(lower) ||
        e.tags.some((t) => t.toLowerCase().includes(lower))
    );
  }, [entries]);

  // Auto-load on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Return context value if available, otherwise use standalone state
  if (context) {
    return context;
  }

  return {
    entries,
    aggregated,
    isLoading,
    error,
    lastSaved,
    isSaving,
    refresh,
    addEntry,
    updateEntry,
    deleteEntry,
    parseDocument,
    syncToProfile,
    getEntriesByCategory,
    searchEntries,
  };
}

// Provider component for app-wide state sharing
export { KnowledgeContext };

export default useGlobalKnowledge;
