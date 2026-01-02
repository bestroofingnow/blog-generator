// pages/index.tsx
import React, { useState, useEffect, lazy, Suspense } from "react";
import { useRouter } from "next/router";
import styles from "../styles/Home.module.css";

// Lazy load heavy components for better initial load performance
const RichTextEditor = lazy(() => import("../components/RichTextEditor"));
const LocationPageBuilder = lazy(() => import("../components/LocationPageBuilder"));
const ImageEditModal = lazy(() => import("../components/ImageEditModal"));
const ScheduleCalendar = lazy(() => import("../components/scheduling/ScheduleCalendar"));

// Automation components
const UsageMeter = lazy(() => import("../components/automation/UsageMeter").then(m => ({ default: m.UsageMeter })));
const AutomationSettings = lazy(() => import("../components/automation/AutomationSettings").then(m => ({ default: m.AutomationSettings })));
const BatchGenerator = lazy(() => import("../components/automation/BatchGenerator").then(m => ({ default: m.BatchGenerator })));
const QueueDashboard = lazy(() => import("../components/automation/QueueDashboard").then(m => ({ default: m.QueueDashboard })));
const SiteBuilderWizard = lazy(() => import("../components/automation/SiteBuilderWizard").then(m => ({ default: m.SiteBuilderWizard })));

// UI Components
import ThemeToggle from "../components/ui/ThemeToggle";
import { TextBubble, ArchDecoration, GradientButton, ProgressRing, Shimmer, ShimmerCard } from "../components/ui";
import { useContentScore } from "../lib/hooks/useContentScore";
import { SEOAnalysisSidebar, SEOSidebarToggle } from "../components/seo/SEOAnalysisSidebar";
import { analyzeContent, type SEOScore } from "../lib/seo-analyzer";

// SEO Tools
const SEOHeatmap = lazy(() => import("../components/seo/SEOHeatmap").then(m => ({ default: m.SEOHeatmap })));

import { INDUSTRIES, getIndustryOptions, getDefaultServices, getDefaultUSPs } from "../lib/industries";
import {
  CompanyProfile,
  PageType,
  getPageTypeOptions,
  PAGE_TYPES,
  SEOPlan,
  PageEntry,
  generateSlug,
  generatePageUrl,
  BRAND_VOICE_OPTIONS,
  WRITING_STYLE_OPTIONS,
  TARGET_AUDIENCE_OPTIONS,
  BrandVoice,
  WritingStyle,
  TargetAudienceType,
} from "../lib/page-types";
import { getRandomContent, getRandomLoadingMessage, ContentType } from "../lib/loading-content";
import { useAuth } from "../lib/auth-context";

type ImageMode = "auto" | "manual" | "enhance";

interface UserImage {
  id: string;
  url: string; // Can be URL or base64 data URI
  caption?: string;
}

// Word count range options for content generation
type WordCountRange = "800-1000" | "1000-1400" | "1400-1800" | "1800-2400" | "2400-3000" | "3000-3800" | "3800-4400" | "4400-5200";

const WORD_COUNT_OPTIONS: { value: WordCountRange; label: string; description: string }[] = [
  { value: "800-1000", label: "800-1,000 words", description: "Quick read, focused content" },
  { value: "1000-1400", label: "1,000-1,400 words", description: "Standard blog post" },
  { value: "1400-1800", label: "1,400-1,800 words", description: "Detailed guide" },
  { value: "1800-2400", label: "1,800-2,400 words", description: "Comprehensive article" },
  { value: "2400-3000", label: "2,400-3,000 words", description: "In-depth coverage" },
  { value: "3000-3800", label: "3,000-3,800 words", description: "Authority piece" },
  { value: "3800-4400", label: "3,800-4,400 words", description: "Pillar content" },
  { value: "4400-5200", label: "4,400-5,200 words", description: "Ultimate guide" },
];

const IMAGE_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6];

interface FormData {
  topic: string;
  location: string;
  blogType: string;
  numberOfSections: number;
  numberOfImages: number;
  wordCountRange: WordCountRange;
  tone: string;
  readingLevel: string;
  useOrchestration: boolean;
  enableQualityReview: boolean;
  companyName: string;
  companyWebsite: string;
  primaryKeyword: string;
  secondaryKeywords: string;
  metaTitle: string;
  metaDescription: string;
  imageMode: ImageMode;
  userImages: UserImage[];
}

interface WordPressSettings {
  siteUrl: string;
  username: string;
  appPassword: string;
  isConnected: boolean;
}

interface GoHighLevelSettings {
  apiToken: string;
  locationId: string;
  blogId: string;
  isConnected: boolean;
}

interface GHLBlog {
  id: string;
  name: string;
}

interface GHLCategory {
  id: string;
  name: string;
  slug: string;
}

type PublishPlatform = "none" | "wordpress" | "gohighlevel";

interface SEOData {
  primaryKeyword: string;
  secondaryKeywords: string[];
  metaTitle: string;
  metaDescription: string;
}

interface ResearchData {
  primaryKeyword: string;
  secondaryKeywords: string[];
  metaTitle: string;
  metaDescription: string;
  competitorInsights: string[];
  contentAngles: string[];
  imageThemes: string[];
}

interface SuggestedContent {
  type: "blog" | "service_page" | "location_page";
  title: string;
  primaryKeyword: string;
  priority: "high" | "medium" | "low";
  reason: string;
}

interface CompanyResearchData {
  keywords?: string[];
  suggestedContent?: SuggestedContent[];
  seoInsights?: {
    missingPages: string[];
    contentGaps: string[];
    localSEOOpportunities: string[];
  };
  researchedAt?: string;
  pagesAnalyzed?: string[];
}

// Perplexity Research types
interface PerplexityResearch {
  keywords?: {
    primary: { keyword: string; volume: string; difficulty: string; intent: string }[];
    longTail: string[];
    questions: string[];
    local: string[];
  };
  competitors?: { name: string; website: string; strategy: string; gaps: string[] }[];
  contentStrategy?: {
    formats: string[];
    uniqueAngles: string[];
    statistics: { stat: string; source: string }[];
    expertSources: string[];
  };
  localSEO?: {
    keywords: string[];
    gbpTips: string[];
    citations: string[];
  };
  technical?: {
    schemaTypes: string[];
    internalLinking: string[];
    featuredSnippetOpportunities: string[];
  };
  actionPlan?: string[];
  rawResponse?: string;
}

interface WordPressCategory {
  id: number;
  name: string;
  slug: string;
}

interface PublishSettings {
  platform: PublishPlatform;
  action: "none" | "draft" | "publish" | "schedule";
  scheduledDate: string;
  scheduledTime: string;
  categoryId: number | string | null; // number for WP, string for GHL
}

interface GenerationState {
  isLoading: boolean;
  error: string | null;
  htmlContent: string | null;
  seoData: SEOData | null;
  featuredImageId: number | null;
  copiedToClipboard: boolean;
  progress: {
    step: "idle" | "research" | "outline" | "images" | "upload" | "content" | "format" | "publishing" | "complete";
    message: string;
  };
  publishedPost: {
    id: number | string;
    link: string;
    status: string;
  } | null;
}

export default function Home() {
  const router = useRouter();
  const { user, signOutUser } = useAuth();

  const [formData, setFormData] = useState<FormData>({
    topic: "",
    location: "",
    blogType: "Neighborhood Guide",
    numberOfSections: 5,
    numberOfImages: 3,
    wordCountRange: "1800-2400",
    tone: "professional yet friendly",
    readingLevel: "8th Grade",
    useOrchestration: true,
    enableQualityReview: false,
    companyName: "",
    companyWebsite: "",
    primaryKeyword: "",
    secondaryKeywords: "",
    metaTitle: "",
    metaDescription: "",
    imageMode: "auto",
    userImages: [],
  });

  const [wordpress, setWordpress] = useState<WordPressSettings>({
    siteUrl: "",
    username: "",
    appPassword: "",
    isConnected: false,
  });

  const [publishSettings, setPublishSettings] = useState<PublishSettings>({
    platform: "none",
    action: "none",
    scheduledDate: "",
    scheduledTime: "09:00",
    categoryId: null,
  });

  const [gohighlevel, setGoHighLevel] = useState<GoHighLevelSettings>({
    apiToken: "",
    locationId: "",
    blogId: "",
    isConnected: false,
  });

  const [ghlBlogs, setGhlBlogs] = useState<GHLBlog[]>([]);
  const [ghlCategories, setGhlCategories] = useState<GHLCategory[]>([]);

  const [categories, setCategories] = useState<WordPressCategory[]>([]);
  const [showWordPressSettings, setShowWordPressSettings] = useState(false);
  const [showGHLSettings, setShowGHLSettings] = useState(false);
  const [showSEOSettings, setShowSEOSettings] = useState(false);
  const [showPublishSettings, setShowPublishSettings] = useState(false);
  const [showCompanyProfile, setShowCompanyProfile] = useState(false);

  // Company Profile for page generation
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({
    name: "",
    website: "",
    phone: "",
    email: "",
    state: "",
    stateAbbr: "",
    headquarters: "",
    cities: [],
    industryType: "",
    services: [],
    usps: [],
    audience: "both",
  });

  const [citiesInput, setCitiesInput] = useState("");
  const [customIndustryName, setCustomIndustryName] = useState("");

  // Page Generation Mode
  const [generationMode, setGenerationMode] = useState<"blog" | "page">("blog");
  const [selectedPageType, setSelectedPageType] = useState<PageType>("blog_post");
  const [pageConfig, setPageConfig] = useState({
    title: "",
    slug: "",
    primaryKeyword: "",
    secondaryKeywords: [] as string[],
    serviceName: "",
    serviceDescription: "",
    city: "",
    topic: "",
    headline: "",
    summary: "",
    customInstructions: "",
  });
  const [isGeneratingPage, setIsGeneratingPage] = useState(false);

  // SEO Planner state
  const [showSEOPlanner, setShowSEOPlanner] = useState(false);
  const [seoPlan, setSeoPlan] = useState<SEOPlan | null>(null);
  const [isGeneratingSEOPlan, setIsGeneratingSEOPlan] = useState(false);
  const [seoPlanTab, setSeoPlanTab] = useState<"pillar" | "blogs" | "keywords" | "calendar" | "recommendations">("pillar");

  // Company Research & Content Hub state
  const [companyResearch, setCompanyResearch] = useState<CompanyResearchData | null>(null);
  const [showContentHub, setShowContentHub] = useState(false);
  const [contentFilter, setContentFilter] = useState<"all" | "blog" | "service_page" | "location_page">("all");

  // Perplexity Research state
  const [perplexityResearch, setPerplexityResearch] = useState<PerplexityResearch | null>(null);
  const [isResearchingPerplexity, setIsResearchingPerplexity] = useState(false);
  const [showResearchModal, setShowResearchModal] = useState(false);

  // Image Edit Modal state
  const [imageEditModal, setImageEditModal] = useState<{
    isOpen: boolean;
    imageUrl: string;
    imageSrc: string;
  }>({
    isOpen: false,
    imageUrl: "",
    imageSrc: "",
  });

  // Knowledge Base state
  interface KnowledgeEntry {
    id: string;
    type: "sitemap" | "url" | "pdf" | "image" | "text";
    source: string;
    title: string;
    content: string;
    extractedData?: {
      services?: string[];
      usps?: string[];
      locations?: string[];
      tone?: string;
      brandElements?: string[];
      keywords?: string[];
      companyInfo?: Record<string, string>;
    };
    scrapedAt: string;
  }

  const [knowledgeBase, setKnowledgeBase] = useState<{
    entries: KnowledgeEntry[];
    sitemapUrl: string;
    urlToAdd: string;
    textToAdd: string;
    textTitle: string;
    isScanning: boolean;
    isScraping: boolean;
    scanProgress: string;
    sitemapPreview: { url: string; lastmod?: string }[];
    selectedUrls: string[];
    aggregatedData: {
      services: string[];
      usps: string[];
      locations: string[];
      keywords: string[];
      tone: string;
    } | null;
  }>({
    entries: [],
    sitemapUrl: "",
    urlToAdd: "",
    textToAdd: "",
    textTitle: "",
    isScanning: false,
    isScraping: false,
    scanProgress: "",
    sitemapPreview: [],
    selectedUrls: [],
    aggregatedData: null,
  });

  // SERP Analysis state - Full featured
  interface SerpOrganicResult {
    title: string;
    link: string;
    domain: string;
    snippet: string;
    position: number;
    sitelinks?: { title: string; link: string }[];
    rating?: { value: number; count: number };
  }
  interface SerpLocalResult {
    title: string;
    address: string;
    rating?: number;
    reviews?: number;
    phone?: string;
    category?: string;
  }
  interface SerpShoppingResult {
    title: string;
    price: string;
    source: string;
    link: string;
    rating?: number;
  }
  interface SerpNewsResult {
    title: string;
    source: string;
    link: string;
    date: string;
    snippet: string;
  }
  interface SerpVideoResult {
    title: string;
    link: string;
    source: string;
    duration?: string;
    views?: string;
  }
  interface SerpAnalysis {
    keyword: string;
    location?: string;
    country: string;
    language: string;
    device: string;
    searchType: string;
    serpData: {
      organic: SerpOrganicResult[];
      featuredSnippet?: {
        type: string;
        title: string;
        content: string;
        source: string;
        link: string;
      };
      knowledgePanel?: {
        title: string;
        type: string;
        description: string;
        source: string;
      };
      localPack: SerpLocalResult[];
      peopleAlsoAsk: { question: string; answer?: string }[];
      relatedSearches: { query: string }[];
      shopping: SerpShoppingResult[];
      news: SerpNewsResult[];
      videos: SerpVideoResult[];
      ads: {
        top: SerpOrganicResult[];
        bottom: SerpOrganicResult[];
      };
    };
    analysis: {
      searchIntent?: {
        primary: string;
        signals: string[];
        recommendation: string;
      };
      difficulty?: {
        score: number;
        level: string;
        factors: string[];
      };
      competitors?: {
        topDomains: { domain: string; position: number; strength: string; weakness: string }[];
        domainAuthorityMix: string;
        contentTypes: string[];
      };
      serpFeatures?: {
        present: string[];
        opportunities: string[];
        featuredSnippetStrategy?: string;
      };
      contentStrategy?: {
        recommendedType: string;
        targetWordCount: string;
        mustIncludeTopics: string[];
        uniqueAngles: string[];
        titleSuggestions: string[];
        metaDescriptionTemplate?: string;
      };
      keywordStrategy?: {
        primaryKeyword: string;
        secondaryKeywords: string[];
        longTailOpportunities: string[];
        localKeywords: string[];
        semanticKeywords: string[];
      };
      technicalSEO?: {
        schemaMarkupRecommended: string[];
        pageSpeedImportance: string;
        mobileOptimization: string;
      };
      quickWins?: string[];
      estimatedTimeToRank?: string;
      riskFactors?: string[];
    };
  }
  const [serpAnalysis, setSerpAnalysis] = useState<SerpAnalysis | null>(null);
  const [isAnalyzingSerp, setIsAnalyzingSerp] = useState(false);
  const [serpKeyword, setSerpKeyword] = useState("");
  const [serpSearchType, setSerpSearchType] = useState<"web" | "images" | "news" | "shopping" | "videos">("web");
  const [serpCountry, setSerpCountry] = useState("us");
  const [serpDevice, setSerpDevice] = useState<"desktop" | "mobile" | "tablet">("desktop");
  const [serpResultsExpanded, setSerpResultsExpanded] = useState<string | null>(null);

  // Page Library state
  const [pageLibrary, setPageLibrary] = useState<PageEntry[]>([]);
  const [showPageLibrary, setShowPageLibrary] = useState(false);

  const [testingConnection, setTestingConnection] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [isResearchingCompany, setIsResearchingCompany] = useState(false);
  const [isResearchingTopics, setIsResearchingTopics] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [researchData, setResearchData] = useState<ResearchData | null>(null);
  const [suggestedTopics, setSuggestedTopics] = useState<{
    topic: string;
    primaryKeyword: string;
    secondaryKeywords: string[];
    metaTitle: string;
    metaDescription: string;
    wordCountRange: WordCountRange;
    location: string;
    blogType: string;
    reason: string;
  }[] | null>(null);

  const [state, setState] = useState<GenerationState>({
    isLoading: false,
    error: null,
    htmlContent: null,
    seoData: null,
    featuredImageId: null,
    copiedToClipboard: false,
    progress: { step: "idle", message: "" },
    publishedPost: null,
  });

  // Rich text editor state
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<string>("");

  // Sidebar navigation state
  type SidebarSection = "create" | "setup" | "profile" | "research" | "library" | "knowledge" | "schedule" | "seo-heatmap" | "automation";
  const [activeSection, setActiveSection] = useState<SidebarSection>("create");
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebarExpanded") === "true";
    }
    return false;
  });

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem("sidebarExpanded", String(sidebarExpanded));
  }, [sidebarExpanded]);

  // Automation modal states
  const [showBatchGenerator, setShowBatchGenerator] = useState(false);
  const [showQueueDashboard, setShowQueueDashboard] = useState(false);
  const [showSiteBuilder, setShowSiteBuilder] = useState(false);

  // Loading entertainment state
  interface EntertainmentState {
    type: ContentType;
    content: string;
    author?: string;
    key: number;
  }
  const [entertainment, setEntertainment] = useState<EntertainmentState>(() => {
    const initial = getRandomContent();
    return { ...initial, key: 0 };
  });
  const [loadingMessage, setLoadingMessage] = useState(getRandomLoadingMessage());

  // Rotate entertainment content every 8 seconds while generating
  useEffect(() => {
    if (state.isLoading || isGeneratingPage) {
      const interval = setInterval(() => {
        const newContent = getRandomContent();
        setEntertainment({ ...newContent, key: Date.now() });
        setLoadingMessage(getRandomLoadingMessage());
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [state.isLoading, isGeneratingPage]);

  // Get new entertainment content manually
  const refreshEntertainment = () => {
    const newContent = getRandomContent();
    setEntertainment({ ...newContent, key: Date.now() });
    setLoadingMessage(getRandomLoadingMessage());
  };

  // Library filter and sort state
  type LibraryFilter = "all" | "blog_post" | "service_page" | "location_page";
  type LibrarySort = "newest" | "oldest" | "title";
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>("all");
  const [librarySort, setLibrarySort] = useState<LibrarySort>("newest");

  // Schedule calendar state
  interface ScheduledBlogData {
    id: string;
    title: string;
    type: string;
    scheduledPublishAt: string | null;
    scheduleStatus: string;
    featuredImageUrl?: string;
  }
  const [scheduledBlogs, setScheduledBlogs] = useState<ScheduledBlogData[]>([]);
  const [unscheduledBlogs, setUnscheduledBlogs] = useState<ScheduledBlogData[]>([]);
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);

  // SEO Analysis sidebar state
  const [showSEOSidebar, setShowSEOSidebar] = useState(false);
  const [seoScore, setSeoScore] = useState<SEOScore | null>(null);

  // Toast notification state
  type ToastType = "success" | "error" | "info";
  interface Toast {
    id: number;
    type: ToastType;
    title: string;
    message: string;
  }
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Add toast helper
  const showToast = (type: ToastType, title: string, message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Settings tab state for Create section
  type SettingsTab = "images";
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("images");

  // Setup Wizard state
  type WizardStep = "welcome" | "researching" | "review";
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>("welcome");
  const [wizardWebsite, setWizardWebsite] = useState("");
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [hasCheckedSetup, setHasCheckedSetup] = useState(false);

  // Load WordPress settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("wordpressSettings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setWordpress(parsed);
      } catch {
        // Invalid saved data
      }
    }
  }, []);

  // Load GoHighLevel settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("gohighlevelSettings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setGoHighLevel(parsed);
      } catch {
        // Invalid saved data
      }
    }
  }, []);

  // Load Company Profile from database when user is authenticated
  useEffect(() => {
    const loadProfileFromDatabase = async () => {
      if (!user?.id) {
        // Not authenticated yet, check localStorage with legacy key (for backwards compat only)
        const wizardDismissed = localStorage.getItem("setupWizardDismissed");
        if (!wizardDismissed) {
          setShowSetupWizard(true);
        }
        setHasCheckedSetup(true);
        return;
      }

      // Clear existing profile data when user changes to prevent stale data
      setCompanyProfile({
        name: "",
        website: "",
        phone: "",
        email: "",
        address: "",
        services: [],
        usps: [],
        cities: [],
        audience: "homeowners",
        industryType: "",
        headquarters: "",
        state: "",
        stateAbbr: "",
      });
      setCitiesInput("");

      try {
        // Load profile from database API
        const response = await fetch("/api/profile");
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.profile?.companyProfile) {
            const profile = data.profile.companyProfile;
            setCompanyProfile(profile);
            // Also set cities input from saved cities
            if (profile.cities?.length > 0) {
              setCitiesInput(profile.cities.join(", "));
            }
            // Sync with form's companyName and companyWebsite
            if (profile.name) {
              setFormData(prev => ({ ...prev, companyName: profile.name, companyWebsite: profile.website || "" }));
            }
            // Cache in user-specific localStorage
            localStorage.setItem(`companyProfile_${user.id}`, JSON.stringify(profile));
            setHasCheckedSetup(true);
            return;
          }
        }
      } catch (error) {
        console.error("Failed to load profile from database:", error);
      }

      // Fallback: check user-specific localStorage cache
      const userSpecificKey = `companyProfile_${user.id}`;
      const saved = localStorage.getItem(userSpecificKey);
      const wizardDismissed = localStorage.getItem(`setupWizardDismissed_${user.id}`);

      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setCompanyProfile(parsed);
          if (parsed.cities?.length > 0) {
            setCitiesInput(parsed.cities.join(", "));
          }
          if (parsed.name) {
            setFormData(prev => ({ ...prev, companyName: parsed.name, companyWebsite: parsed.website || "" }));
          }
        } catch {
          if (!wizardDismissed) {
            setShowSetupWizard(true);
          }
        }
      } else {
        // No profile - show wizard for new users
        if (!wizardDismissed) {
          setShowSetupWizard(true);
        }
      }
      setHasCheckedSetup(true);
    };

    loadProfileFromDatabase();
  }, [user?.id]);

  // Load Page Library from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("pageLibrary");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPageLibrary(parsed);
      } catch {
        // Invalid saved data
      }
    }
  }, []);

  // Load Company Research from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("companyResearch");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCompanyResearch(parsed);
      } catch {
        // Invalid saved data
      }
    }
  }, []);

  // Calculate SEO score when content changes
  useEffect(() => {
    if (state.htmlContent || editedContent) {
      const content = isEditing ? editedContent : (state.htmlContent || "");
      const title = formData.metaTitle || formData.topic;
      const metaDescription = formData.metaDescription || "";
      const primaryKeyword = formData.primaryKeyword || "";
      const secondaryKeywords = formData.secondaryKeywords
        ? formData.secondaryKeywords.split(",").map((k) => k.trim()).filter(Boolean)
        : [];

      if (content && primaryKeyword) {
        const score = analyzeContent({
          title,
          metaDescription,
          content,
          primaryKeyword,
          secondaryKeywords,
        });
        setSeoScore(score);
      }
    }
  }, [
    state.htmlContent,
    editedContent,
    isEditing,
    formData.metaTitle,
    formData.topic,
    formData.metaDescription,
    formData.primaryKeyword,
    formData.secondaryKeywords,
  ]);

  // Handle broken images in preview - add error handlers and fallbacks
  useEffect(() => {
    if (!state.htmlContent || isEditing) return;

    // Wait for DOM to render
    const timer = setTimeout(() => {
      const previewContainer = document.querySelector(`.${styles.clickableImages}`);
      if (!previewContainer) return;

      const images = previewContainer.querySelectorAll('img');
      images.forEach((img) => {
        // Add error handler for broken images
        img.onerror = () => {
          const keyword = state.seoData?.primaryKeyword || formData.topic || 'Image';
          const fallbackUrl = `https://placehold.co/800x400/667eea/ffffff?text=${encodeURIComponent(keyword)}`;
          img.src = fallbackUrl;
          img.alt = `${keyword} - Placeholder`;
          img.style.minHeight = '200px';
        };

        // Check if image is already broken (naturalWidth is 0)
        if (img.complete && img.naturalWidth === 0 && img.src && !img.src.includes('placehold.co')) {
          const keyword = state.seoData?.primaryKeyword || formData.topic || 'Image';
          const fallbackUrl = `https://placehold.co/800x400/667eea/ffffff?text=${encodeURIComponent(keyword)}`;
          img.src = fallbackUrl;
          img.alt = `${keyword} - Placeholder`;
        }
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [state.htmlContent, isEditing, state.seoData?.primaryKeyword, formData.topic]);

  // Perplexity Deep Research
  const runPerplexityResearch = async (researchType: string = "comprehensive") => {
    if (!formData.topic && !formData.primaryKeyword) {
      showToast("error", "Missing Input", "Please enter a topic or primary keyword first.");
      return;
    }

    setIsResearchingPerplexity(true);
    try {
      const response = await fetch("/api/research-perplexity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: formData.topic || formData.primaryKeyword,
          industry: companyProfile.industryType || "general",
          location: formData.location || companyProfile.headquarters,
          companyName: companyProfile.name,
          researchType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPerplexityResearch(data.research);
        setShowResearchModal(true);
        showToast("success", "Research Complete", "Deep research results are ready.");
      } else {
        const error = await response.json();
        showToast("error", "Research Failed", error.message || "Unknown error");
      }
    } catch (error) {
      console.error("Perplexity research error:", error);
      showToast("error", "Research Failed", "Research failed. Please try again.");
    } finally {
      setIsResearchingPerplexity(false);
    }
  };

  // Run SERP Analysis using Bright Data - Full featured
  const runSerpAnalysis = async () => {
    const keyword = serpKeyword || formData.topic || formData.primaryKeyword;
    if (!keyword) {
      showToast("error", "Missing Keyword", "Please enter a keyword to analyze.");
      return;
    }

    setIsAnalyzingSerp(true);
    setSerpResultsExpanded(null);
    try {
      const response = await fetch("/api/serp-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          location: formData.location || companyProfile.headquarters,
          country: serpCountry,
          language: "en",
          device: serpDevice,
          searchType: serpSearchType,
          numResults: 20,
          industry: companyProfile.industryType || "general",
          companyName: companyProfile.name,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSerpAnalysis(data);
        showToast("success", "SERP Analysis Complete", `Analyzed ${data.serpData?.organic?.length || 0} results from Google ${serpSearchType} search.`);
      } else {
        const error = await response.json();
        showToast("error", "Analysis Failed", error.message || "Unknown error");
      }
    } catch (error) {
      console.error("SERP analysis error:", error);
      showToast("error", "Analysis Failed", "SERP analysis failed. Please try again.");
    } finally {
      setIsAnalyzingSerp(false);
    }
  };

  // Save WordPress settings to localStorage
  const saveWordPressSettings = () => {
    localStorage.setItem("wordpressSettings", JSON.stringify(wordpress));
  };

  // Save GoHighLevel settings to localStorage
  const saveGHLSettings = () => {
    localStorage.setItem("gohighlevelSettings", JSON.stringify(gohighlevel));
  };

  // Save Company Profile to database and localStorage
  const saveCompanyProfile = async () => {
    // Update form's company info
    setFormData(prev => ({ ...prev, companyName: companyProfile.name, companyWebsite: companyProfile.website }));

    if (!user?.id) {
      // Not authenticated - only save to localStorage with legacy key
      localStorage.setItem("companyProfile", JSON.stringify(companyProfile));
      return;
    }

    // Save to user-specific localStorage for caching
    localStorage.setItem(`companyProfile_${user.id}`, JSON.stringify(companyProfile));

    // Save to database
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyProfile.name,
          companyProfile: companyProfile,
        }),
      });

      if (!response.ok) {
        console.error("Failed to save profile to database");
      }
    } catch (error) {
      console.error("Error saving profile to database:", error);
    }
  };

  // Handle company profile input changes
  const handleCompanyProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // Handle numeric fields
    const numericFields = ["yearsInBusiness", "projectsCompleted", "preferredWordCount"];
    if (numericFields.includes(name)) {
      setCompanyProfile(prev => ({
        ...prev,
        [name]: value ? parseInt(value, 10) : undefined,
      }));
    } else {
      setCompanyProfile(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Handle industry change - auto-populate services and USPs
  const handleIndustryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const industryKey = e.target.value;
    const services = getDefaultServices(industryKey);
    const usps = getDefaultUSPs(industryKey);

    setCompanyProfile(prev => ({
      ...prev,
      industryType: industryKey,
      services,
      usps,
    }));
  };

  // Handle cities input (comma-separated)
  const handleCitiesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCitiesInput(value);
    const cities = value.split(",").map(c => c.trim()).filter(Boolean);
    setCompanyProfile(prev => ({
      ...prev,
      cities,
      headquarters: cities[0] || prev.headquarters, // First city becomes headquarters
    }));
  };

  // Handle services toggle
  const handleServiceToggle = (service: string) => {
    setCompanyProfile(prev => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service],
    }));
  };

  // Handle USP toggle
  const handleUSPToggle = (usp: string) => {
    setCompanyProfile(prev => ({
      ...prev,
      usps: prev.usps.includes(usp)
        ? prev.usps.filter(u => u !== usp)
        : [...prev.usps, usp],
    }));
  };

  // Get available services/USPs for the selected industry
  const getAvailableServices = (): string[] => {
    if (!companyProfile.industryType || !INDUSTRIES[companyProfile.industryType]) return [];
    const industry = INDUSTRIES[companyProfile.industryType];
    return [
      ...industry.services.core.map(s => s.value),
      ...industry.services.commercial.map(s => s.value),
      ...industry.services.specialty.map(s => s.value),
    ];
  };

  const getAvailableUSPs = (): string[] => {
    if (!companyProfile.industryType || !INDUSTRIES[companyProfile.industryType]) return [];
    return INDUSTRIES[companyProfile.industryType].usps.map(u => u.value);
  };

  // Handle page config changes
  const handlePageConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPageConfig(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle secondary keywords for page config (comma-separated)
  const handlePageSecondaryKeywords = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const keywords = value.split(",").map(k => k.trim()).filter(Boolean);
    setPageConfig(prev => ({
      ...prev,
      secondaryKeywords: keywords,
    }));
  };

  // Generate page using the page stream API
  const handleGeneratePage = async () => {
    if (!companyProfile.name || !companyProfile.industryType) {
      showToast("error", "Profile Required", "Please set up your Company Profile first.");
      return;
    }

    setIsGeneratingPage(true);
    setState(prev => ({
      ...prev,
      progress: { step: "outline", message: "AI is designing your page structure..." },
    }));

    try {
      const response = await fetch("/api/generate-page-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageType: selectedPageType,
          companyProfile,
          pageConfig: {
            ...pageConfig,
            city: pageConfig.city || companyProfile.headquarters,
          },
          imageMode: formData.imageMode,
          userImages: formData.userImages,
          wordpress: wordpress.isConnected ? wordpress : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let buffer = "";
      let finalData: { success?: boolean; htmlContent?: string; seoData?: SEOData; error?: string } = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "progress") {
                setState(prev => ({
                  ...prev,
                  progress: { step: data.step, message: data.message },
                }));
              } else if (data.type === "complete") {
                finalData = data;
              } else if (data.type === "error") {
                throw new Error(data.error);
              }
            } catch {
              // Ignore parse errors for incomplete data
            }
          }
        }
      }

      if (!finalData.success) {
        throw new Error(finalData.error || "Failed to generate page");
      }

      setState(prev => ({
        ...prev,
        htmlContent: finalData.htmlContent || null,
        seoData: finalData.seoData || null,
        progress: { step: "complete", message: "Page generated successfully!" },
      }));
    } catch (error) {
      showToast("error", "Generation Failed", error instanceof Error ? error.message : "Page generation failed.");
      setState(prev => ({
        ...prev,
        progress: { step: "idle", message: "" },
      }));
    }

    setIsGeneratingPage(false);
  };

  // Generate SEO Plan
  const handleGenerateSEOPlan = async () => {
    if (!companyProfile.name || !companyProfile.industryType) {
      showToast("error", "Profile Required", "Please set up your Company Profile first.");
      return;
    }

    if (companyProfile.cities.length === 0) {
      showToast("error", "Service Areas Required", "Please add at least one service area (city) to your Company Profile.");
      return;
    }

    setIsGeneratingSEOPlan(true);

    try {
      const response = await fetch("/api/seo-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyProfile,
          contentDepth: "growth",
          calendarLength: 6,
          postFrequency: 2,
        }),
      });

      const data = await response.json();

      if (data.success && data.plan) {
        setSeoPlan(data.plan);
        setShowSEOPlanner(true);
        showToast("success", "SEO Plan Ready", "Your content strategy is ready to view.");
      } else {
        showToast("error", "Generation Failed", data.error || "Failed to generate SEO plan.");
      }
    } catch (error) {
      showToast("error", "Generation Failed", error instanceof Error ? error.message : "SEO Plan generation failed.");
    }

    setIsGeneratingSEOPlan(false);
  };

  // Export SEO Plan to CSV
  const exportSEOPlanToCSV = () => {
    if (!seoPlan) return;

    let csvContent = "";

    // Pillar Pages
    csvContent += "=== PILLAR PAGES ===\n";
    csvContent += "City,Priority,URL,H1,Meta Title,Meta Description,Primary Keyword,Volume\n";
    seoPlan.pillarPages.forEach(page => {
      csvContent += `"${page.city}","${page.priority}","${page.url}","${page.h1}","${page.metaTitle}","${page.metaDescription}","${page.primaryKeyword}",${page.volume}\n`;
    });

    csvContent += "\n=== BLOG TOPICS ===\n";
    csvContent += "Category,Title,Priority,URL,Word Count\n";
    seoPlan.blogTopics.forEach(topic => {
      csvContent += `"${topic.category}","${topic.title}","${topic.priority}","${topic.url}","${topic.wordCount}"\n`;
    });

    csvContent += "\n=== KEYWORDS ===\n";
    csvContent += "City,Category,Keyword,Volume,Difficulty,Intent,Target Page\n";
    seoPlan.keywords.forEach(kw => {
      csvContent += `"${kw.city}","${kw.category}","${kw.keyword}",${kw.volume},"${kw.difficulty}","${kw.intent}","${kw.targetPage}"\n`;
    });

    csvContent += "\n=== CONTENT CALENDAR ===\n";
    csvContent += "Week,Date,Title,Category,Priority,Status\n";
    seoPlan.calendar.forEach(entry => {
      csvContent += `${entry.week},"${entry.date}","${entry.title}","${entry.category || ""}","${entry.priority}","${entry.status}"\n`;
    });

    csvContent += "\n=== RECOMMENDATIONS ===\n";
    seoPlan.recommendations.forEach((rec, i) => {
      csvContent += `${i + 1}. ${rec}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `seo-plan-${companyProfile.name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.csv`;
    link.click();
  };

  // Page Library functions
  const savePageLibrary = (library: PageEntry[]) => {
    localStorage.setItem("pageLibrary", JSON.stringify(library));
    setPageLibrary(library);
  };

  const addPageToLibrary = (pageData: {
    type: PageType;
    title: string;
    primaryKeyword: string;
    secondaryKeywords: string[];
    metaTitle?: string;
    metaDescription?: string;
    publishedUrl?: string;
  }) => {
    const slug = generateSlug(pageData.title);
    const url = generatePageUrl(pageData.type, slug);

    const newPage: PageEntry = {
      id: `page-${Date.now()}`,
      type: pageData.type,
      title: pageData.title,
      slug,
      url,
      primaryKeyword: pageData.primaryKeyword,
      secondaryKeywords: pageData.secondaryKeywords,
      metaTitle: pageData.metaTitle,
      metaDescription: pageData.metaDescription,
      status: pageData.publishedUrl ? "published" : "draft",
      publishedUrl: pageData.publishedUrl,
      createdAt: new Date().toISOString(),
      linkedFrom: [],
      linksTo: [],
    };

    const updatedLibrary = [...pageLibrary, newPage];
    savePageLibrary(updatedLibrary);
    return newPage;
  };

  const removePageFromLibrary = (pageId: string) => {
    const updatedLibrary = pageLibrary.filter(p => p.id !== pageId);
    savePageLibrary(updatedLibrary);
  };

  const updatePageStatus = (pageId: string, status: PageEntry["status"], publishedUrl?: string) => {
    const updatedLibrary = pageLibrary.map(p =>
      p.id === pageId
        ? { ...p, status, publishedUrl: publishedUrl || p.publishedUrl, updatedAt: new Date().toISOString() }
        : p
    );
    savePageLibrary(updatedLibrary);
  };

  // Schedule calendar functions
  const loadScheduleData = async () => {
    setIsScheduleLoading(true);
    try {
      const response = await fetch("/api/schedule/list");
      const data = await response.json();
      if (data.success && data.data) {
        setScheduledBlogs(data.data.scheduled || []);
        setUnscheduledBlogs(data.data.unscheduled || []);
      }
    } catch (error) {
      console.error("Failed to load schedule data:", error);
    } finally {
      setIsScheduleLoading(false);
    }
  };

  const handleScheduleBlog = async (blogId: string, date: string): Promise<void> => {
    try {
      const response = await fetch("/api/schedule/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blogId,
          scheduledPublishAt: new Date(date).toISOString(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        showToast("success", "Blog Scheduled", `Scheduled for ${new Date(date).toLocaleDateString()}`);
        await loadScheduleData();
      } else {
        showToast("error", "Scheduling Failed", data.error || "Failed to schedule blog");
      }
    } catch (error) {
      console.error("Schedule error:", error);
      showToast("error", "Scheduling Failed", "An error occurred while scheduling");
    }
  };

  const handleUnscheduleBlog = async (blogId: string): Promise<void> => {
    try {
      const response = await fetch("/api/schedule/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blogId,
          scheduledPublishAt: null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        showToast("info", "Blog Unscheduled", "Blog moved back to unscheduled");
        await loadScheduleData();
      } else {
        showToast("error", "Failed", data.error || "Failed to unschedule blog");
      }
    } catch (error) {
      console.error("Unschedule error:", error);
      showToast("error", "Failed", "An error occurred while unscheduling");
    }
  };

  // Load schedule data when section is active
  useEffect(() => {
    if (activeSection === "schedule") {
      loadScheduleData();
    }
  }, [activeSection]);

  // Fetch categories when WordPress is connected
  const fetchCategories = async () => {
    if (!wordpress.isConnected) return;

    try {
      const response = await fetch("/api/wordpress-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getCategories",
          credentials: wordpress,
        }),
      });

      const data = await response.json();
      if (data.success && data.categories) {
        setCategories(data.categories);
      }
    } catch {
      // Silently fail - categories are optional
    }
  };

  useEffect(() => {
    if (wordpress.isConnected) {
      fetchCategories();
    }
  }, [wordpress.isConnected]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : name === "numberOfSections"
        ? parseInt(value, 10)
        : value,
    }));
  };

  const handleWordPressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setWordpress((prev) => ({
      ...prev,
      [name]: value,
      isConnected: false,
    }));
  };

  const handlePublishSettingsChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setPublishSettings((prev) => ({
      ...prev,
      [name]: name === "categoryId" ? (value ? parseInt(value, 10) : null) : value,
    }));
  };

  const testWordPressConnection = async () => {
    setTestingConnection(true);
    try {
      const response = await fetch("/api/wordpress-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          credentials: wordpress,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const updatedWordpress = { ...wordpress, isConnected: true };
        setWordpress(updatedWordpress);
        localStorage.setItem("wordpressSettings", JSON.stringify(updatedWordpress));
        showToast("success", "WordPress Connected", `Connected to ${data.siteName || wordpress.siteUrl}`);
      } else {
        showToast("error", "Connection Failed", data.error);
      }
    } catch {
      showToast("error", "Connection Failed", "Could not connect to WordPress");
    }
    setTestingConnection(false);
  };

  const handleGHLChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setGoHighLevel((prev) => ({
      ...prev,
      [name]: value,
      isConnected: false,
    }));
  };

  const testGHLConnection = async () => {
    setTestingConnection(true);
    try {
      const response = await fetch("/api/gohighlevel-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          credentials: gohighlevel,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const updatedGHL = { ...gohighlevel, isConnected: true };
        setGoHighLevel(updatedGHL);
        setGhlBlogs(data.blogs || []);
        localStorage.setItem("gohighlevelSettings", JSON.stringify(updatedGHL));
        showToast("success", "GoHighLevel Connected", `Found ${data.blogs?.length || 0} blog(s)`);
      } else {
        showToast("error", "Connection Failed", data.error);
      }
    } catch {
      showToast("error", "Connection Failed", "Could not connect to GoHighLevel");
    }
    setTestingConnection(false);
  };

  // Fetch GHL categories when blog is selected
  const fetchGHLCategories = async () => {
    if (!gohighlevel.isConnected || !gohighlevel.blogId) return;

    try {
      const response = await fetch("/api/gohighlevel-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getCategories",
          credentials: gohighlevel,
        }),
      });

      const data = await response.json();
      if (data.success && data.categories) {
        setGhlCategories(data.categories);
      }
    } catch {
      // Silently fail
    }
  };

  useEffect(() => {
    if (gohighlevel.isConnected && gohighlevel.blogId) {
      fetchGHLCategories();
      saveGHLSettings();
    }
  }, [gohighlevel.blogId]);

  const handleResearchKeywords = async () => {
    // Validate required fields
    if (!formData.topic) {
      showToast("error", "Missing Topic", "Please enter a topic before researching keywords.");
      return;
    }
    if (!formData.location) {
      showToast("error", "Missing Location", "Please enter a location for local SEO research.");
      return;
    }

    setIsResearching(true);
    try {
      const response = await fetch("/api/research-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: formData.topic,
          location: formData.location,
          companyName: formData.companyName || companyProfile.name,
          companyWebsite: formData.companyWebsite || companyProfile.website,
          blogType: formData.blogType,
        }),
      });

      // Get response text first to handle non-JSON errors
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        console.error("Research API returned non-JSON response:", responseText.substring(0, 500));
        throw new Error(`Server error: ${responseText.substring(0, 200)}`);
      }

      if (data.success && data.suggestions) {
        setResearchData(data.suggestions);
        // Auto-fill the form fields
        setFormData((prev) => ({
          ...prev,
          primaryKeyword: data.suggestions.primaryKeyword,
          secondaryKeywords: data.suggestions.secondaryKeywords.join(", "),
          metaTitle: data.suggestions.metaTitle,
          metaDescription: data.suggestions.metaDescription,
        }));
        setShowSEOSettings(true);
        showToast("success", "Research Complete", "Keywords and SEO data have been populated.");
      } else {
        showToast("error", "Research Failed", data.error || "Unknown error occurred");
      }
    } catch (error) {
      console.error("Keyword research error:", error);
      showToast("error", "Research Failed", error instanceof Error ? error.message : "Keyword research failed. Please try again.");
    }
    setIsResearching(false);
  };

  // AI Topic Research - suggests topics based on real SERP data and SEO best practices
  const handleAITopicResearch = async () => {
    if (!companyProfile.name && !companyProfile.website) {
      showToast("error", "Company Profile Required", "Please set up your company profile first to get AI topic suggestions.");
      return;
    }

    setIsResearchingTopics(true);
    setSuggestedTopics(null);

    const location = companyProfile.headquarters || formData.location || "United States";

    try {
      // Use the new SEO-focused topic research endpoint
      const response = await fetch("/api/research-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location }),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`Server error: ${responseText.substring(0, 200)}`);
      }

      if (data.success && data.topics && data.topics.length > 0) {
        // Map the API response to the frontend format
        const topics = data.topics.map((topic: {
          topic: string;
          primaryKeyword: string;
          blogType: string;
          wordCount: string;
          location: string;
          reason: string;
          searchIntent?: string;
          estimatedDifficulty?: string;
        }) => ({
          topic: topic.topic,
          primaryKeyword: topic.primaryKeyword,
          secondaryKeywords: [], // Will be filled by keyword research when selected
          metaTitle: `${topic.topic} | ${companyProfile.name}`,
          metaDescription: `Expert guide on ${topic.primaryKeyword} in ${location}. Trusted advice from ${companyProfile.name}.`,
          wordCountRange: topic.wordCount as WordCountRange || "1400-1800" as WordCountRange,
          location: topic.location || location,
          blogType: topic.blogType,
          reason: topic.reason,
          searchIntent: topic.searchIntent,
          difficulty: topic.estimatedDifficulty,
        }));

        setSuggestedTopics(topics);

        // Show SERP insights if available
        if (data.serpInsights?.paaQuestions?.length > 0) {
          showToast("success", "Topics Found!", `${topics.length} SEO-optimized topics based on real search data.`);
        } else {
          showToast("success", "Topics Found!", `${topics.length} topic suggestions generated.`);
        }
      } else {
        showToast("error", "Research Failed", data.error || "Could not generate topic suggestions. Please try again.");
      }
    } catch (error) {
      console.error("Topic research error:", error);
      showToast("error", "Research Failed", error instanceof Error ? error.message : "Topic research failed. Please try again.");
    }
    setIsResearchingTopics(false);
  };

  // Select a suggested topic - fills out entire form
  const handleSelectTopic = (topic: typeof suggestedTopics extends (infer T)[] | null ? T : never) => {
    if (!topic) return;

    // Fill out all form fields with the suggested data
    setFormData(prev => ({
      ...prev,
      topic: topic.topic,
      primaryKeyword: topic.primaryKeyword,
      secondaryKeywords: topic.secondaryKeywords.join(", "),
      metaTitle: topic.metaTitle,
      metaDescription: topic.metaDescription,
      wordCountRange: topic.wordCountRange,
      location: topic.location,
      blogType: topic.blogType,
    }));

    // Also populate the research data for the SEO panel
    setResearchData({
      primaryKeyword: topic.primaryKeyword,
      secondaryKeywords: topic.secondaryKeywords,
      metaTitle: topic.metaTitle,
      metaDescription: topic.metaDescription,
      competitorInsights: [topic.reason],
      contentAngles: [topic.topic],
      imageThemes: [],
    });

    // Show SEO settings panel so user can see all the data
    setShowSEOSettings(true);
    setSuggestedTopics(null);
    showToast("success", "Form Populated!", "All fields have been filled with AI-researched SEO data. Ready to generate!");
  };

  // Deep research company website to auto-fill profile
  const handleResearchCompany = async () => {
    if (!companyProfile.website) {
      showToast("error", "Website Required", "Please enter a website URL first.");
      return;
    }

    setIsResearchingCompany(true);
    try {
      const response = await fetch("/api/research-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: companyProfile.website }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        const research = data.data;

        // Update company profile with researched data
        setCompanyProfile(prev => ({
          ...prev,
          name: research.name || prev.name,
          tagline: research.tagline || prev.tagline,
          phone: research.phone || prev.phone,
          email: research.email || prev.email,
          address: research.address || prev.address,
          state: research.state || prev.state,
          stateAbbr: research.stateAbbr || prev.stateAbbr,
          headquarters: research.headquarters || prev.headquarters,
          cities: research.cities?.length > 0 ? research.cities : prev.cities,
          industryType: research.industryType || prev.industryType,
          customIndustryName: research.customIndustryName || prev.customIndustryName,
          services: research.services?.length > 0 ? research.services : prev.services,
          usps: research.usps?.length > 0 ? research.usps : prev.usps,
          certifications: research.certifications?.length > 0 ? research.certifications : prev.certifications,
          yearsInBusiness: research.yearsInBusiness || prev.yearsInBusiness,
          socialLinks: research.socialLinks || prev.socialLinks,
          audience: research.audience || prev.audience,
          brandVoice: research.brandVoice || prev.brandVoice,
          writingStyle: research.writingStyle || prev.writingStyle,
        }));

        // Update cities input field
        if (research.cities?.length > 0) {
          setCitiesInput(research.cities.join(", "));
        }

        // Update custom industry name state if applicable
        if (research.industryType === "custom" && research.customIndustryName) {
          setCustomIndustryName(research.customIndustryName);
        }

        // Also sync with form data
        if (research.name) {
          setFormData(prev => ({
            ...prev,
            companyName: research.name,
            companyWebsite: companyProfile.website,
          }));
        }

        // Store deep research data for Content Hub
        const researchData: CompanyResearchData = {
          keywords: research.keywords || [],
          suggestedContent: research.suggestedContent || [],
          seoInsights: research.seoInsights,
          researchedAt: research.researchedAt || new Date().toISOString(),
          pagesAnalyzed: research.pagesAnalyzed || data.pagesAnalyzed || [],
        };
        setCompanyResearch(researchData);
        localStorage.setItem("companyResearch", JSON.stringify(researchData));

        const pagesCount = researchData.pagesAnalyzed?.length || 1;
        const suggestedCount = researchData.suggestedContent?.length || 0;
        showToast("success", "Research Complete", `Analyzed ${pagesCount} pages and found ${suggestedCount} content suggestions. Check the Content Hub for recommendations.`);
      } else {
        showToast("error", "Research Failed", data.error || "Unknown error");
      }
    } catch (error) {
      console.error("Company research error:", error);
      showToast("error", "Research Failed", "Failed to research website. Please try again.");
    }
    setIsResearchingCompany(false);
  };

  // Setup Wizard - Research website and auto-fill
  const handleWizardResearch = async () => {
    if (!wizardWebsite) {
      setWizardError("Please enter your website URL");
      return;
    }

    // Validate URL format
    let url = wizardWebsite.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
      setWizardWebsite(url);
    }

    setWizardError(null);
    setWizardStep("researching");

    try {
      const response = await fetch("/api/research-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        const research = data.data;

        // Update company profile with researched data
        setCompanyProfile(prev => ({
          ...prev,
          website: url,
          name: research.name || prev.name,
          tagline: research.tagline || prev.tagline,
          phone: research.phone || prev.phone,
          email: research.email || prev.email,
          address: research.address || prev.address,
          state: research.state || prev.state,
          stateAbbr: research.stateAbbr || prev.stateAbbr,
          headquarters: research.headquarters || prev.headquarters,
          cities: research.cities?.length > 0 ? research.cities : prev.cities,
          industryType: research.industryType || prev.industryType,
          customIndustryName: research.customIndustryName || prev.customIndustryName,
          services: research.services?.length > 0 ? research.services : prev.services,
          usps: research.usps?.length > 0 ? research.usps : prev.usps,
          certifications: research.certifications?.length > 0 ? research.certifications : prev.certifications,
          yearsInBusiness: research.yearsInBusiness || prev.yearsInBusiness,
          socialLinks: research.socialLinks || prev.socialLinks,
          audience: research.audience || prev.audience,
          brandVoice: research.brandVoice || prev.brandVoice,
          writingStyle: research.writingStyle || prev.writingStyle,
          // SEO & Site Identity
          primarySiteKeyword: research.primarySiteKeyword || prev.primarySiteKeyword,
          secondarySiteKeywords: research.secondarySiteKeywords?.length > 0 ? research.secondarySiteKeywords : prev.secondarySiteKeywords,
          siteDescription: research.siteDescription || prev.siteDescription,
          // Business Personality
          businessPersonality: research.businessPersonality || prev.businessPersonality,
          valueProposition: research.valueProposition || prev.valueProposition,
          // Competitors
          competitors: research.competitors?.length > 0 ? research.competitors : prev.competitors,
          competitorWebsites: research.competitorWebsites?.length > 0 ? research.competitorWebsites : prev.competitorWebsites,
        }));

        // Update cities input field
        if (research.cities?.length > 0) {
          setCitiesInput(research.cities.join(", "));
        }

        // Update custom industry name state if applicable
        if (research.industryType === "custom" && research.customIndustryName) {
          setCustomIndustryName(research.customIndustryName);
        }

        // Also sync with form data
        if (research.name) {
          setFormData(prev => ({
            ...prev,
            companyName: research.name,
            companyWebsite: url,
          }));
        }

        // Store deep research data for Content Hub
        const researchData: CompanyResearchData = {
          keywords: research.keywords || [],
          suggestedContent: research.suggestedContent || [],
          seoInsights: research.seoInsights,
          researchedAt: research.researchedAt || new Date().toISOString(),
          pagesAnalyzed: research.pagesAnalyzed || data.pagesAnalyzed || [],
        };
        setCompanyResearch(researchData);
        localStorage.setItem("companyResearch", JSON.stringify(researchData));

        // Move to review step
        setWizardStep("review");
        showToast("success", "Research Complete", `Found info for ${research.name || "your company"}`);
      } else {
        setWizardError(data.error || "Could not analyze website. Please try again.");
        setWizardStep("welcome");
      }
    } catch (error) {
      console.error("Wizard research error:", error);
      setWizardError("Failed to research website. Please check the URL and try again.");
      setWizardStep("welcome");
    }
  };

  // Complete wizard setup
  const handleWizardComplete = () => {
    // Save the company profile
    saveCompanyProfile();
    setShowSetupWizard(false);
    showToast("success", "Setup Complete", "Your company profile has been saved!");
  };

  // Skip wizard
  const handleWizardSkip = () => {
    const key = user?.id ? `setupWizardDismissed_${user.id}` : "setupWizardDismissed";
    localStorage.setItem(key, "true");
    setShowSetupWizard(false);
  };

  const handlePublish = async () => {
    if (!state.htmlContent || !state.seoData) return;

    // Determine which platform to publish to
    if (publishSettings.platform === "wordpress") {
      await handlePublishToWordPress();
    } else if (publishSettings.platform === "gohighlevel") {
      await handlePublishToGHL();
    }
  };

  const handlePublishToWordPress = async () => {
    if (!state.htmlContent || !state.seoData || !wordpress.isConnected) return;

    setIsPublishing(true);
    setState((prev) => ({
      ...prev,
      progress: { step: "publishing", message: "Publishing to WordPress..." },
    }));

    try {
      // Extract title from HTML content
      const titleMatch = state.htmlContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
      const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "") : state.seoData.metaTitle;

      // Build scheduled date if applicable
      let scheduledDate: string | undefined;
      if (publishSettings.action === "schedule" && publishSettings.scheduledDate) {
        scheduledDate = `${publishSettings.scheduledDate}T${publishSettings.scheduledTime}:00`;
      }

      const response = await fetch("/api/wordpress-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createPost",
          credentials: wordpress,
          post: {
            title,
            content: state.htmlContent,
            status: publishSettings.action === "schedule" ? "future" : publishSettings.action,
            scheduledDate,
            categoryId: publishSettings.categoryId,
            featuredMediaId: state.featuredImageId || undefined,
            metaTitle: state.seoData.metaTitle,
            metaDescription: state.seoData.metaDescription,
            excerpt: state.seoData.metaDescription,
          },
        }),
      });

      const data = await response.json();

      if (data.success && data.post) {
        setState((prev) => ({
          ...prev,
          publishedPost: {
            id: data.post.id,
            link: data.post.link,
            status: data.post.status,
          },
          progress: { step: "complete", message: "Published to WordPress!" },
        }));

        // Record to published content history for topic deduplication
        if (data.post.status === "publish" || data.post.status === "future") {
          try {
            await fetch("/api/content/record-publish", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title,
                primaryKeyword: state.seoData?.primaryKeyword,
                secondaryKeywords: state.seoData?.secondaryKeywords,
                blogType: formData.blogType,
                publishedUrl: data.post.link,
                publishedPlatform: "wordpress",
                topic: formData.topic,
                location: formData.location,
              }),
            });
          } catch (recordError) {
            console.error("Failed to record published content:", recordError);
            // Non-critical, don't fail the publish
          }
        }

        const statusMessage = data.post.status === "future"
          ? "Post scheduled successfully!"
          : data.post.status === "draft"
          ? "Draft saved successfully!"
          : "Post published successfully!";
        showToast("success", statusMessage, `View your post: ${data.post.link}`);
      } else {
        showToast("error", "Publish Failed", data.error || "Failed to publish to WordPress.");
      }
    } catch (error) {
      showToast("error", "Publish Failed", "Failed to publish to WordPress.");
    }
    setIsPublishing(false);
  };

  const handlePublishToGHL = async () => {
    if (!state.htmlContent || !state.seoData || !gohighlevel.isConnected || !gohighlevel.blogId) return;

    setIsPublishing(true);
    setState((prev) => ({
      ...prev,
      progress: { step: "publishing", message: "Publishing to GoHighLevel..." },
    }));

    try {
      // Extract title from HTML content
      const titleMatch = state.htmlContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
      const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "") : state.seoData.metaTitle;

      const response = await fetch("/api/gohighlevel-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createPost",
          credentials: gohighlevel,
          post: {
            title,
            content: state.htmlContent,
            metaTitle: state.seoData.metaTitle,
            metaDescription: state.seoData.metaDescription,
            published: publishSettings.action === "publish",
            categoryIds: publishSettings.categoryId ? [publishSettings.categoryId] : [],
            tags: state.seoData.secondaryKeywords.slice(0, 5), // Use secondary keywords as tags
          },
        }),
      });

      const data = await response.json();

      if (data.success && data.post) {
        setState((prev) => ({
          ...prev,
          publishedPost: {
            id: data.post.id,
            link: data.post.url,
            status: data.post.status,
          },
          progress: { step: "complete", message: "Published to GoHighLevel!" },
        }));

        // Record to published content history for topic deduplication
        if (data.post.status !== "draft") {
          try {
            await fetch("/api/content/record-publish", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title,
                primaryKeyword: state.seoData?.primaryKeyword,
                secondaryKeywords: state.seoData?.secondaryKeywords,
                blogType: formData.blogType,
                publishedUrl: data.post.url,
                publishedPlatform: "ghl",
                topic: formData.topic,
                location: formData.location,
              }),
            });
          } catch (recordError) {
            console.error("Failed to record published content:", recordError);
            // Non-critical, don't fail the publish
          }
        }

        const statusMessage = data.post.status === "draft"
          ? "Draft saved successfully!"
          : "Post published successfully!";
        showToast("success", statusMessage, `View your post: ${data.post.url}`);
      } else {
        showToast("error", "Publish Failed", data.error || "Failed to publish to GoHighLevel.");
      }
    } catch (error) {
      showToast("error", "Publish Failed", "Failed to publish to GoHighLevel.");
    }
    setIsPublishing(false);
  };

  const handleGenerateBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({
      isLoading: true,
      error: null,
      htmlContent: null,
      seoData: null,
      featuredImageId: null,
      copiedToClipboard: false,
      progress: { step: "outline", message: "AI is designing your blog structure..." },
      publishedPost: null,
    });
    // Auto-show publish settings when WordPress is connected
    if (wordpress.isConnected) {
      setShowPublishSettings(true);
    }

    try {
      if (formData.useOrchestration) {
        // Use streaming endpoint for real-time progress
        const response = await fetch("/api/orchestrate-blog-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            secondaryKeywords: formData.secondaryKeywords.split(",").map((k) => k.trim()).filter(Boolean),
            imageThemes: researchData?.imageThemes || [],
            wordpress: wordpress.isConnected ? wordpress : undefined,
            enableQualityReview: formData.enableQualityReview,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[Blog Gen] HTTP error:", response.status, errorText);
          throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No response body from server");
        }

        let buffer = "";
        let lastProgress = "";
        let receivedAnyData = false;
        let finalData: { success?: boolean; htmlContent?: string; seoData?: SEOData; featuredImageId?: number; error?: string } = {};

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          receivedAnyData = true;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "progress") {
                  lastProgress = data.message || data.step;
                  setState((prev) => ({
                    ...prev,
                    progress: { step: data.step, message: data.message },
                  }));
                } else if (data.type === "complete") {
                  finalData = data;
                } else if (data.type === "error") {
                  console.error("[Blog Gen] Server error:", data.error);
                  throw new Error(data.error || "Server returned an error");
                }
              } catch (parseError) {
                // Only log if it looks like a real error, not incomplete JSON
                if (parseError instanceof SyntaxError) {
                  console.debug("[Blog Gen] Incomplete SSE chunk, waiting for more data");
                } else {
                  throw parseError;
                }
              }
            }
          }
        }

        if (!finalData.success) {
          const errorDetail = finalData.error
            || (receivedAnyData ? `Stream ended during: ${lastProgress || "processing"}` : "No response from server")
            || "Failed to generate blog";
          console.error("[Blog Gen] Generation failed:", errorDetail);
          throw new Error(errorDetail);
        }

        setState({
          isLoading: false,
          error: null,
          htmlContent: finalData.htmlContent || null,
          seoData: finalData.seoData || null,
          featuredImageId: finalData.featuredImageId || null,
          copiedToClipboard: false,
          progress: { step: "complete", message: "Blog generated successfully!" },
          publishedPost: null,
        });
        showToast("success", "Blog Generated!", "Your content is ready for review and publishing.");

        // Auto-save to Library (localStorage)
        const seoData = finalData.seoData as SEOData | undefined;
        const blogTitle = seoData?.metaTitle || formData.topic;
        const blogPrimaryKeyword = seoData?.primaryKeyword || formData.primaryKeyword;
        const blogSecondaryKeywords = seoData?.secondaryKeywords || formData.secondaryKeywords.split(",").map((k) => k.trim()).filter(Boolean);

        addPageToLibrary({
          type: "blog_post",
          title: blogTitle,
          primaryKeyword: blogPrimaryKeyword,
          secondaryKeywords: blogSecondaryKeywords,
          metaTitle: seoData?.metaTitle || formData.metaTitle,
          metaDescription: seoData?.metaDescription || formData.metaDescription,
        });

        // Also save to database for topic deduplication
        try {
          await fetch("/api/drafts/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: blogTitle,
              type: "blog_post",
              content: finalData.htmlContent,
              seoData: {
                primaryKeyword: blogPrimaryKeyword,
                secondaryKeywords: blogSecondaryKeywords,
                metaTitle: seoData?.metaTitle || formData.metaTitle,
                metaDescription: seoData?.metaDescription || formData.metaDescription,
              },
              status: "draft",
            }),
          });
        } catch (saveError) {
          console.error("Failed to save draft to database:", saveError);
          // Non-critical, don't fail the generation
        }
      } else {
        const response = await fetch("/api/generate-blog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        // Get response text first to handle non-JSON errors
        const responseText = await response.text();
        let data;
        try {
          data = JSON.parse(responseText);
        } catch {
          console.error("API returned non-JSON response:", responseText.substring(0, 500));
          throw new Error(`Server error: ${responseText.substring(0, 200)}`);
        }

        if (!data.success) {
          throw new Error(data.error || "Failed to generate blog");
        }

        setState({
          isLoading: false,
          error: null,
          htmlContent: data.htmlContent,
          seoData: data.seoData,
          featuredImageId: null,
          copiedToClipboard: false,
          progress: { step: "complete", message: "Blog generated successfully!" },
          publishedPost: null,
        });
        showToast("success", "Blog Generated!", "Your content is ready for review and publishing.");

        // Auto-save to Library (localStorage)
        const seoDataNonStreaming = data.seoData as SEOData | undefined;
        const blogTitleNonStreaming = seoDataNonStreaming?.metaTitle || formData.topic;
        const blogPrimaryKeywordNonStreaming = seoDataNonStreaming?.primaryKeyword || formData.primaryKeyword;
        const blogSecondaryKeywordsNonStreaming = seoDataNonStreaming?.secondaryKeywords || formData.secondaryKeywords.split(",").map((k) => k.trim()).filter(Boolean);

        addPageToLibrary({
          type: "blog_post",
          title: blogTitleNonStreaming,
          primaryKeyword: blogPrimaryKeywordNonStreaming,
          secondaryKeywords: blogSecondaryKeywordsNonStreaming,
          metaTitle: seoDataNonStreaming?.metaTitle || formData.metaTitle,
          metaDescription: seoDataNonStreaming?.metaDescription || formData.metaDescription,
        });

        // Also save to database for topic deduplication
        try {
          await fetch("/api/drafts/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: blogTitleNonStreaming,
              type: "blog_post",
              content: data.htmlContent,
              seoData: {
                primaryKeyword: blogPrimaryKeywordNonStreaming,
                secondaryKeywords: blogSecondaryKeywordsNonStreaming,
                metaTitle: seoDataNonStreaming?.metaTitle || formData.metaTitle,
                metaDescription: seoDataNonStreaming?.metaDescription || formData.metaDescription,
              },
              status: "draft",
            }),
          });
        } catch (saveError) {
          console.error("Failed to save draft to database:", saveError);
          // Non-critical, don't fail the generation
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      setState({
        isLoading: false,
        error: errorMessage,
        htmlContent: null,
        seoData: null,
        featuredImageId: null,
        copiedToClipboard: false,
        progress: { step: "idle", message: "" },
        publishedPost: null,
      });
      showToast("error", "Generation Failed", errorMessage);
    }
  };

  const handleCopyToClipboard = () => {
    if (state.htmlContent) {
      navigator.clipboard.writeText(state.htmlContent);
      setState((prev) => ({ ...prev, copiedToClipboard: true }));
      showToast("success", "Copied!", "HTML content copied to clipboard");
      setTimeout(() => {
        setState((prev) => ({ ...prev, copiedToClipboard: false }));
      }, 2000);
    }
  };

  const handleDownloadHTML = () => {
    if (state.htmlContent) {
      const element = document.createElement("a");
      const file = new Blob([state.htmlContent], { type: "text/html" });
      element.href = URL.createObjectURL(file);
      element.download = `blog-${formData.location.replace(/\s+/g, "-")}-${Date.now()}.html`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  // Convert HTML to Markdown-like format
  const htmlToMarkdown = (html: string): string => {
    let md = html;
    // Remove script and style tags
    md = md.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
    md = md.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
    // Headers
    md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n");
    md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n");
    md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n");
    md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1\n\n");
    md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, "##### $1\n\n");
    md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, "###### $1\n\n");
    // Bold and italic
    md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**");
    md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**");
    md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*");
    md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*");
    // Images
    md = md.replace(/<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*?)["'][^>]*>/gi, "![$2]($1)");
    md = md.replace(/<img[^>]*alt=["']([^"']*?)["'][^>]*src=["']([^"']+)["'][^>]*>/gi, "![$1]($2)");
    md = md.replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi, "![]($1)");
    // Links
    md = md.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, "[$2]($1)");
    // Lists
    md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n");
    md = md.replace(/<ul[^>]*>/gi, "\n");
    md = md.replace(/<\/ul>/gi, "\n");
    md = md.replace(/<ol[^>]*>/gi, "\n");
    md = md.replace(/<\/ol>/gi, "\n");
    // Paragraphs and breaks
    md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n");
    md = md.replace(/<br\s*\/?>/gi, "\n");
    md = md.replace(/<hr\s*\/?>/gi, "\n---\n");
    // Blockquotes
    md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, "> $1\n");
    // Remove remaining HTML tags
    md = md.replace(/<[^>]+>/g, "");
    // Decode HTML entities
    md = md.replace(/&nbsp;/g, " ");
    md = md.replace(/&amp;/g, "&");
    md = md.replace(/&lt;/g, "<");
    md = md.replace(/&gt;/g, ">");
    md = md.replace(/&quot;/g, '"');
    md = md.replace(/&#39;/g, "'");
    // Clean up multiple newlines
    md = md.replace(/\n{3,}/g, "\n\n");
    return md.trim();
  };

  const handleDownloadMarkdown = () => {
    if (state.htmlContent) {
      const markdown = htmlToMarkdown(state.htmlContent);
      const element = document.createElement("a");
      const file = new Blob([markdown], { type: "text/markdown" });
      element.href = URL.createObjectURL(file);
      element.download = `blog-${formData.location.replace(/\s+/g, "-")}-${Date.now()}.md`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  const escapeCSV = (str: string): string => {
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const handleDownloadCSV = () => {
    if (state.htmlContent && state.seoData) {
      const headers = [
        "Primary Keyword",
        "Secondary Keywords",
        "Meta Title",
        "Meta Description",
        "HTML Content",
      ];

      const row = [
        escapeCSV(state.seoData.primaryKeyword),
        escapeCSV(state.seoData.secondaryKeywords.join("; ")),
        escapeCSV(state.seoData.metaTitle),
        escapeCSV(state.seoData.metaDescription),
        escapeCSV(state.htmlContent),
      ];

      const csvContent = headers.join(",") + "\n" + row.join(",");

      const element = document.createElement("a");
      const file = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      element.href = URL.createObjectURL(file);
      element.download = `blog-${formData.location.replace(/\s+/g, "-")}-${Date.now()}.csv`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  // Handle image click in preview for editing
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "IMG") {
      const img = target as HTMLImageElement;
      setImageEditModal({
        isOpen: true,
        imageUrl: img.src,
        imageSrc: img.src,
      });
    }
  };

  // Handle saving edited image
  const handleImageSave = (newImageUrl: string) => {
    if (state.htmlContent && imageEditModal.imageSrc) {
      // Replace the old image URL with the new one in the HTML content
      const updatedContent = state.htmlContent.replace(
        new RegExp(imageEditModal.imageSrc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        newImageUrl
      );
      setState((prev) => ({ ...prev, htmlContent: updatedContent }));
      setImageEditModal({ isOpen: false, imageUrl: "", imageSrc: "" });
    }
  };

  // Knowledge Base handlers
  const handleScanSitemap = async () => {
    if (!knowledgeBase.sitemapUrl) return;

    setKnowledgeBase(prev => ({ ...prev, isScanning: true, scanProgress: "Fetching sitemap..." }));

    try {
      const response = await fetch("/api/knowledge-base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "scan-sitemap",
          sitemapUrl: knowledgeBase.sitemapUrl,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setKnowledgeBase(prev => ({
          ...prev,
          sitemapPreview: data.entries,
          selectedUrls: data.entries.slice(0, 10).map((e: { url: string }) => e.url),
          scanProgress: `Found ${data.totalUrls} URLs`,
        }));
      } else {
        setKnowledgeBase(prev => ({ ...prev, scanProgress: data.error || "Scan failed" }));
      }
    } catch (error) {
      setKnowledgeBase(prev => ({ ...prev, scanProgress: "Error scanning sitemap" }));
    } finally {
      setKnowledgeBase(prev => ({ ...prev, isScanning: false }));
    }
  };

  const handleScrapeSelectedUrls = async () => {
    if (knowledgeBase.selectedUrls.length === 0) return;

    setKnowledgeBase(prev => ({ ...prev, isScraping: true, scanProgress: "Scraping pages..." }));

    try {
      const response = await fetch("/api/knowledge-base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "scrape-urls",
          urls: knowledgeBase.selectedUrls,
          maxPages: 20,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setKnowledgeBase(prev => ({
          ...prev,
          entries: [...prev.entries, ...data.entries],
          scanProgress: `Scraped ${data.processedCount} pages`,
          sitemapPreview: [],
          selectedUrls: [],
        }));
      } else {
        setKnowledgeBase(prev => ({ ...prev, scanProgress: data.error || "Scraping failed" }));
      }
    } catch (error) {
      setKnowledgeBase(prev => ({ ...prev, scanProgress: "Error scraping pages" }));
    } finally {
      setKnowledgeBase(prev => ({ ...prev, isScraping: false }));
    }
  };

  const handleAddSingleUrl = async () => {
    if (!knowledgeBase.urlToAdd) return;

    setKnowledgeBase(prev => ({ ...prev, isScraping: true, scanProgress: "Scraping URL..." }));

    try {
      const response = await fetch("/api/knowledge-base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "scrape-single-url",
          url: knowledgeBase.urlToAdd,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setKnowledgeBase(prev => ({
          ...prev,
          entries: [...prev.entries, data.entry],
          urlToAdd: "",
          scanProgress: "URL added successfully",
        }));
      } else {
        setKnowledgeBase(prev => ({ ...prev, scanProgress: data.error || "Failed to add URL" }));
      }
    } catch (error) {
      setKnowledgeBase(prev => ({ ...prev, scanProgress: "Error adding URL" }));
    } finally {
      setKnowledgeBase(prev => ({ ...prev, isScraping: false }));
    }
  };

  const handleAddText = async () => {
    if (!knowledgeBase.textToAdd) return;

    setKnowledgeBase(prev => ({ ...prev, isScraping: true, scanProgress: "Processing text..." }));

    try {
      const response = await fetch("/api/knowledge-base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "process-text",
          text: knowledgeBase.textToAdd,
          title: knowledgeBase.textTitle || "Manual Entry",
        }),
      });

      const data = await response.json();

      if (data.success) {
        setKnowledgeBase(prev => ({
          ...prev,
          entries: [...prev.entries, data.entry],
          textToAdd: "",
          textTitle: "",
          scanProgress: "Text added successfully",
        }));
      } else {
        setKnowledgeBase(prev => ({ ...prev, scanProgress: data.error || "Failed to add text" }));
      }
    } catch (error) {
      setKnowledgeBase(prev => ({ ...prev, scanProgress: "Error adding text" }));
    } finally {
      setKnowledgeBase(prev => ({ ...prev, isScraping: false }));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setKnowledgeBase(prev => ({ ...prev, isScraping: true, scanProgress: "Processing file..." }));

    try {
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const fileContent = reader.result as string;

          // For data URLs, extract the base64 part; for text, use as-is
          const contentToSend = fileContent.startsWith("data:")
            ? fileContent.split(",")[1] || fileContent
            : fileContent;

          const response = await fetch("/api/knowledge-base", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "process-file",
              fileContent: contentToSend,
              fileName: file.name,
              fileType: file.type,
            }),
          });

          const data = await response.json();

          if (data.success) {
            setKnowledgeBase(prev => ({
              ...prev,
              entries: [...prev.entries, data.entry],
              scanProgress: "File processed successfully",
              isScraping: false,
            }));
          } else {
            setKnowledgeBase(prev => ({
              ...prev,
              scanProgress: data.error || "Failed to process file",
              isScraping: false,
            }));
          }
        } catch (fetchError) {
          setKnowledgeBase(prev => ({
            ...prev,
            scanProgress: "Error processing file",
            isScraping: false,
          }));
        }
      };

      reader.onerror = () => {
        setKnowledgeBase(prev => ({
          ...prev,
          scanProgress: "Error reading file",
          isScraping: false,
        }));
      };

      // Read all files as data URL (works for images, PDFs, and text)
      // Text files will be base64 encoded which is fine for the API
      if (file.type.startsWith("text/")) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    } catch (error) {
      setKnowledgeBase(prev => ({ ...prev, scanProgress: "Error processing file", isScraping: false }));
    }

    // Reset input
    e.target.value = "";
  };

  const handleAggregateKnowledge = async () => {
    if (knowledgeBase.entries.length === 0) return;

    setKnowledgeBase(prev => ({ ...prev, isScraping: true, scanProgress: "Aggregating knowledge..." }));

    try {
      const response = await fetch("/api/knowledge-base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "aggregate-knowledge",
          entries: knowledgeBase.entries,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setKnowledgeBase(prev => ({
          ...prev,
          aggregatedData: data.aggregatedKnowledge,
          scanProgress: "Knowledge aggregated successfully",
        }));
      } else {
        setKnowledgeBase(prev => ({ ...prev, scanProgress: data.error || "Failed to aggregate" }));
      }
    } catch (error) {
      setKnowledgeBase(prev => ({ ...prev, scanProgress: "Error aggregating knowledge" }));
    } finally {
      setKnowledgeBase(prev => ({ ...prev, isScraping: false }));
    }
  };

  const handleRemoveKnowledgeEntry = (id: string) => {
    setKnowledgeBase(prev => ({
      ...prev,
      entries: prev.entries.filter(e => e.id !== id),
    }));
  };

  // Get minimum date for scheduling (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <ArchDecoration position="top" variant="gradient" size="lg" className={styles.headerArch} />
        <div className={styles.headerContent}>
          <h1>AI Blog Generator</h1>
          <p>Multi-AI orchestrated blog creation with real images</p>
        </div>
        <div className={styles.headerActions}>
          <ThemeToggle />
          <button
            type="button"
            className={styles.keyboardShortcut}
            onClick={() => {
              const event = new KeyboardEvent("keydown", { key: "k", metaKey: true });
              document.dispatchEvent(event);
            }}
            title="Open Command Palette (⌘K)"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <span>⌘K</span>
          </button>
        </div>
      </header>

      <main className={`${styles.main} ${activeSection === "create" ? styles.withPreview : ""}`} style={{ "--sidebar-width": sidebarExpanded ? "var(--sidebar-width-expanded)" : "var(--sidebar-width-collapsed)" } as React.CSSProperties}>
        {/* Sidebar Navigation */}
        <nav className={`${styles.sidebar} ${sidebarExpanded ? styles.expanded : ""}`}>
          {/* Content Group */}
          <span className={styles.sidebarGroup}>Content</span>
          <button
            type="button"
            className={`${styles.sidebarItem} ${activeSection === "create" ? styles.active : ""}`}
            onClick={() => setActiveSection("create")}
            title="Create Content"
          >
            <span className={styles.sidebarIcon}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </span>
            <span className={styles.sidebarLabel}>Create</span>
            <span className={styles.tooltip}>Create</span>
          </button>

          <button
            type="button"
            className={`${styles.sidebarItem} ${activeSection === "library" ? styles.active : ""}`}
            onClick={() => setActiveSection("library")}
            title="Page Library"
          >
            <span className={styles.sidebarIcon}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </span>
            <span className={styles.sidebarLabel}>Library</span>
            <span className={styles.tooltip}>Library</span>
            {pageLibrary.length > 0 && <span className={styles.sidebarBadge}>{pageLibrary.length}</span>}
          </button>

          <div className={styles.sidebarDivider} />

          {/* Configuration Group */}
          <span className={styles.sidebarGroup}>Config</span>
          <button
            type="button"
            className={`${styles.sidebarItem} ${activeSection === "profile" ? styles.active : ""}`}
            onClick={() => setActiveSection("profile")}
            title="Company Profile"
          >
            <span className={styles.sidebarIcon}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/>
              </svg>
            </span>
            <span className={styles.sidebarLabel}>Profile</span>
            <span className={styles.tooltip}>Profile</span>
            {companyProfile.name && <span className={styles.sidebarBadge} />}
          </button>

          <button
            type="button"
            className={`${styles.sidebarItem} ${activeSection === "setup" ? styles.active : ""}`}
            onClick={() => setActiveSection("setup")}
            title="Integrations"
          >
            <span className={styles.sidebarIcon}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </span>
            <span className={styles.sidebarLabel}>Setup</span>
            <span className={styles.tooltip}>Setup</span>
            {(wordpress.isConnected || gohighlevel.isConnected) && <span className={styles.sidebarBadge} />}
          </button>

          <div className={styles.sidebarDivider} />

          {/* Tools Group */}
          <span className={styles.sidebarGroup}>Tools</span>
          <button
            type="button"
            className={`${styles.sidebarItem} ${activeSection === "research" ? styles.active : ""}`}
            onClick={() => setActiveSection("research")}
            title="Research Tools"
          >
            <span className={styles.sidebarIcon}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </span>
            <span className={styles.sidebarLabel}>Research</span>
            <span className={styles.tooltip}>Research</span>
          </button>

          <button
            type="button"
            className={`${styles.sidebarItem} ${activeSection === "knowledge" ? styles.active : ""}`}
            onClick={() => setActiveSection("knowledge")}
            title="Knowledge Base"
          >
            <span className={styles.sidebarIcon}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </span>
            <span className={styles.sidebarLabel}>Knowledge</span>
            <span className={styles.tooltip}>Knowledge Base</span>
          </button>

          <button
            type="button"
            className={`${styles.sidebarItem} ${activeSection === "schedule" ? styles.active : ""}`}
            onClick={() => setActiveSection("schedule")}
            title="Schedule Calendar"
          >
            <span className={styles.sidebarIcon}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </span>
            <span className={styles.sidebarLabel}>Schedule</span>
            <span className={styles.tooltip}>Schedule Calendar</span>
          </button>

          <button
            type="button"
            className={`${styles.sidebarItem} ${activeSection === "seo-heatmap" ? styles.active : ""}`}
            onClick={() => setActiveSection("seo-heatmap")}
            title="SEO Heatmap"
          >
            <span className={styles.sidebarIcon}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <rect x="7" y="7" width="3" height="9" fill="currentColor" opacity="0.3"/>
                <rect x="12" y="10" width="3" height="6" fill="currentColor" opacity="0.5"/>
                <rect x="17" y="5" width="3" height="11" fill="currentColor" opacity="0.7"/>
              </svg>
            </span>
            <span className={styles.sidebarLabel}>SEO Heatmap</span>
            <span className={styles.tooltip}>SEO Heatmap & Research</span>
          </button>

          <div className={styles.sidebarDivider} />

          {/* Automation Group */}
          <span className={styles.sidebarGroup}>Automation</span>
          <button
            type="button"
            className={`${styles.sidebarItem} ${activeSection === "automation" ? styles.active : ""}`}
            onClick={() => setActiveSection("automation")}
            title="AI Automation"
          >
            <span className={styles.sidebarIcon}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
              </svg>
            </span>
            <span className={styles.sidebarLabel}>AI Automation</span>
            <span className={styles.tooltip}>Batch Generate & Site Builder</span>
          </button>

          {/* User Profile Section */}
          <div className={styles.sidebarDivider} />
          <div className={styles.sidebarUser}>
            <div className={styles.userAvatar}>
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            {sidebarExpanded && (
              <div className={styles.userInfo}>
                <span className={styles.userEmail}>{user?.email}</span>
                <div className={styles.userActions}>
                  <button
                    type="button"
                    className={styles.settingsBtn}
                    onClick={() => router.push("/settings/company")}
                  >
                    Full Settings
                  </button>
                  <button
                    type="button"
                    className={styles.logoutBtn}
                    onClick={() => signOutUser()}
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
            {!sidebarExpanded && (
              <div className={styles.userActionsCollapsed}>
                <button
                  type="button"
                  className={styles.settingsBtnIcon}
                  onClick={() => router.push("/settings/company")}
                  title="Full Settings"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </button>
                <button
                  type="button"
                  className={styles.logoutBtnIcon}
                  onClick={() => signOutUser()}
                  title="Sign Out"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Sidebar Toggle */}
          <div className={styles.sidebarToggle}>
            <button
              type="button"
              className={styles.sidebarToggleBtn}
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              title={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                {sidebarExpanded ? (
                  <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7"/>
                ) : (
                  <path d="M13 5l7 7-7 7M6 5l7 7-7 7"/>
                )}
              </svg>
              {sidebarExpanded && <span>Collapse</span>}
            </button>
          </div>
        </nav>

        <div className={`${styles.formSection} ${activeSection !== "create" ? styles.fullWidth : ""}`}>
          {/* Show the original form when "create" is selected */}
          {activeSection === "create" && (
          <>
          <form onSubmit={handleGenerateBlog} className={styles.form}>
            {/* Hero Area - Quick Start */}
            <div className={styles.heroArea}>
              <h2 className={styles.heroTitle}>Create Content</h2>
              <p className={styles.heroSubtitle}>Generate SEO-optimized blogs and pages in seconds</p>

              {/* Mode Pills */}
              <div className={styles.modePills}>
                <button
                  type="button"
                  onClick={() => setGenerationMode("blog")}
                  className={`${styles.modePill} ${generationMode === "blog" ? styles.active : ""}`}
                >
                  Blog Post
                </button>
                <button
                  type="button"
                  disabled
                  className={`${styles.modePill} ${styles.comingSoonPill}`}
                  title="Coming Soon"
                >
                  Website Page
                  <span className={styles.comingSoonBadge}>Soon</span>
                </button>
              </div>

              {/* AI Topic Research Button */}
              <div className={styles.topicResearchSection}>
                <button
                  type="button"
                  onClick={handleAITopicResearch}
                  disabled={isResearchingTopics || (!companyProfile.name && !companyProfile.website)}
                  className={styles.topicResearchButton}
                >
                  {isResearchingTopics ? (
                    <>
                      <span className={styles.spinner}></span>
                      Researching Topics...
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="M21 21l-4.35-4.35"/>
                        <path d="M11 8v6M8 11h6"/>
                      </svg>
                      AI Topic Research
                    </>
                  )}
                </button>
                <small>Find SEO-optimized blog topics based on your industry</small>
              </div>

              {/* Suggested Topics Dropdown */}
              {suggestedTopics && suggestedTopics.length > 0 && (
                <div className={styles.suggestedTopics}>
                  <div className={styles.suggestedTopicsHeader}>
                    <h4>Suggested Blog Topics</h4>
                    <button
                      type="button"
                      onClick={() => setSuggestedTopics(null)}
                      className={styles.closeSuggestions}
                    >
                      &times;
                    </button>
                  </div>
                  <div className={styles.topicsList}>
                    {suggestedTopics.map((topic, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSelectTopic(topic)}
                        className={styles.topicSuggestion}
                      >
                        <div className={styles.topicTitle}>{topic.topic}</div>
                        <div className={styles.topicMeta}>
                          <span className={styles.topicKeyword}>{topic.primaryKeyword}</span>
                          <span className={styles.topicBlogType}>{topic.blogType}</span>
                          <span className={styles.topicWordCount}>{topic.wordCountRange.replace("-", "–")} words</span>
                        </div>
                        <div className={styles.topicDetails}>
                          <span className={styles.topicLocation}>{topic.location}</span>
                          <span className={styles.topicReason}>{topic.reason}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Hero Fields */}
              <div className={styles.heroFields}>
                <input
                  type="text"
                  name="topic"
                  value={formData.topic}
                  onChange={handleInputChange}
                  placeholder={generationMode === "blog" ? "What topic should we write about?" : "Page title or subject..."}
                  className={styles.heroInput}
                  required
                />
                <div className={styles.heroRow}>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="Location (e.g., Charlotte, NC)"
                    className={styles.heroInput}
                  />
                  <input
                    type="text"
                    name="primaryKeyword"
                    value={formData.primaryKeyword}
                    onChange={handleInputChange}
                    placeholder="Primary keyword"
                    className={styles.heroInput}
                  />
                </div>
                <button
                  type="submit"
                  disabled={state.isLoading || !formData.topic}
                  className={styles.heroButton}
                >
                  {state.isLoading ? (
                    <>
                      <span className={styles.spinner}></span>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14"/>
                      </svg>
                      Generate {generationMode === "blog" ? "Blog" : "Page"}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Content Settings */}
            <div className={styles.tabContent}>
              <div className={styles.tabSection + " " + styles.visible}>
                {/* Word Count Settings */}
                <div className={styles.formCard}>
                  <h4 className={styles.formCardTitle}>Content Length</h4>
                  <div className={styles.formGroup}>
                    <label>Target Word Count</label>
                    <div className={styles.wordCountGrid}>
                      {WORD_COUNT_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, wordCountRange: option.value }))}
                          className={`${styles.wordCountOption} ${formData.wordCountRange === option.value ? styles.active : ""}`}
                        >
                          <span className={styles.wordCountLabel}>{option.label}</span>
                          <span className={styles.wordCountDesc}>{option.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Image Settings */}
                <div className={styles.formCard}>
                  <h4 className={styles.formCardTitle}>Image Settings</h4>

                  {/* Image Count */}
                  <div className={styles.formGroup}>
                    <label>Number of Images</label>
                    <div className={styles.imageCountGrid}>
                      {IMAGE_COUNT_OPTIONS.map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, numberOfImages: count }))}
                          className={`${styles.imageCountBtn} ${formData.numberOfImages === count ? styles.active : ""}`}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                    <small>First image is the hero/featured image</small>
                  </div>

                  {/* Image Mode */}
                  <div className={styles.formGroup}>
                    <label>Image Source</label>
                    <div className={styles.quickSelect}>
                      <div className={styles.buttonGrid}>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, imageMode: "auto" }))}
                          className={`${styles.quickSelectButton} ${formData.imageMode === "auto" ? styles.active : ""}`}
                        >
                          Auto Generate
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, imageMode: "manual" }))}
                          className={`${styles.quickSelectButton} ${formData.imageMode === "manual" ? styles.active : ""}`}
                        >
                          Manual Upload
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, imageMode: "enhance" }))}
                          className={`${styles.quickSelectButton} ${formData.imageMode === "enhance" ? styles.active : ""}`}
                        >
                          Enhance Uploads
                        </button>
                      </div>
                      <small>
                        {formData.imageMode === "auto" && "AI will generate unique images for your content"}
                        {formData.imageMode === "manual" && "Use only your uploaded images"}
                        {formData.imageMode === "enhance" && "AI will enhance your uploaded images"}
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hidden Submit Button (actual submission handled by hero button) */}
            <button type="submit" style={{ display: "none" }} />

            {/* Legacy Settings - WordPress (keeping for backwards compatibility) */}
            <div style={{ display: "none" }}>
            {/* WordPress Settings Toggle */}
            <div className={styles.settingsToggle}>
              <button
                type="button"
                onClick={() => setShowWordPressSettings(!showWordPressSettings)}
                className={styles.settingsButton}
              >
                {showWordPressSettings ? "Hide" : "Show"} WordPress Settings
                {wordpress.isConnected && " (Connected)"}
              </button>
            </div>

            {/* WordPress Settings Panel */}
            {showWordPressSettings && (
              <div className={styles.wordpressSettings}>
                <h3>WordPress Connection</h3>
                <p className={styles.settingsHelp}>
                  Connect to your WordPress site to upload images and publish posts directly.
                </p>

                <div className={styles.formGroup}>
                  <label htmlFor="siteUrl">Site URL</label>
                  <input
                    type="url"
                    id="siteUrl"
                    name="siteUrl"
                    value={wordpress.siteUrl}
                    onChange={handleWordPressChange}
                    placeholder="https://yoursite.com"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="wpUsername">Username</label>
                  <input
                    type="text"
                    id="wpUsername"
                    name="username"
                    value={wordpress.username}
                    onChange={handleWordPressChange}
                    placeholder="admin"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="appPassword">Application Password</label>
                  <input
                    type="password"
                    id="appPassword"
                    name="appPassword"
                    value={wordpress.appPassword}
                    onChange={handleWordPressChange}
                    placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                  />
                  <small>
                    Generate in WordPress Admin → Users → Profile → Application Passwords
                  </small>
                </div>

                <button
                  type="button"
                  onClick={testWordPressConnection}
                  disabled={testingConnection || !wordpress.siteUrl || !wordpress.username || !wordpress.appPassword}
                  className={styles.testButton}
                >
                  {testingConnection ? "Testing..." : wordpress.isConnected ? "Connected" : "Test Connection"}
                </button>
              </div>
            )}

            {/* GoHighLevel Settings Toggle */}
            <div className={styles.settingsToggle}>
              <button
                type="button"
                onClick={() => setShowGHLSettings(!showGHLSettings)}
                className={styles.settingsButton}
              >
                {showGHLSettings ? "Hide" : "Show"} GoHighLevel Settings
                {gohighlevel.isConnected && " (Connected)"}
              </button>
            </div>

            {/* GoHighLevel Settings Panel */}
            {showGHLSettings && (
              <div className={styles.wordpressSettings}>
                <h3>GoHighLevel Connection</h3>
                <p className={styles.settingsHelp}>
                  Connect to your GoHighLevel/KynexPro account to publish blogs directly.
                </p>

                <div className={styles.formGroup}>
                  <label htmlFor="ghlApiToken">API Token</label>
                  <input
                    type="password"
                    id="ghlApiToken"
                    name="apiToken"
                    value={gohighlevel.apiToken}
                    onChange={handleGHLChange}
                    placeholder="Your Private Integration API Token"
                  />
                  <small>
                    Settings → Integrations → Private Integrations (needs blogs/post.write scope)
                  </small>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="ghlLocationId">Location ID</label>
                  <input
                    type="text"
                    id="ghlLocationId"
                    name="locationId"
                    value={gohighlevel.locationId}
                    onChange={handleGHLChange}
                    placeholder="e.g., abc123XYZ..."
                  />
                  <small>
                    Found in Settings → Business Profile → Location ID
                  </small>
                </div>

                <button
                  type="button"
                  onClick={testGHLConnection}
                  disabled={testingConnection || !gohighlevel.apiToken || !gohighlevel.locationId}
                  className={styles.testButton}
                >
                  {testingConnection ? "Testing..." : gohighlevel.isConnected ? "Connected" : "Test Connection"}
                </button>

                {gohighlevel.isConnected && ghlBlogs.length > 0 && (
                  <div className={styles.formGroup} style={{ marginTop: "1rem" }}>
                    <label htmlFor="ghlBlogId">Select Blog</label>
                    <select
                      id="ghlBlogId"
                      name="blogId"
                      value={gohighlevel.blogId}
                      onChange={handleGHLChange}
                    >
                      <option value="">Select a blog...</option>
                      {ghlBlogs.map((blog) => (
                        <option key={blog.id} value={blog.id}>
                          {blog.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
            </div>
            {/* End Legacy Settings */}

            {/* Legacy Company Profile - Now in Profile sidebar section */}
            <div style={{ display: "none" }}>
            {/* Company Profile Toggle */}
            <div className={styles.settingsToggle}>
              <button
                type="button"
                onClick={() => setShowCompanyProfile(!showCompanyProfile)}
                className={styles.settingsButton}
              >
                {showCompanyProfile ? "Hide" : "Show"} Company Profile
                {companyProfile.name && ` (${companyProfile.name})`}
              </button>
            </div>

            {/* Company Profile Panel */}
            {showCompanyProfile && (
              <div className={styles.companyProfileSettings}>
                <h3>Company Profile</h3>
                <p className={styles.settingsHelp}>
                  Set up your company profile to generate personalized, SEO-optimized content for all your pages.
                </p>

                {/* Industry Selection */}
                <div className={styles.formGroup}>
                  <label htmlFor="industryType">Industry Type</label>
                  <select
                    id="industryType"
                    name="industryType"
                    value={companyProfile.industryType}
                    onChange={handleIndustryChange}
                  >
                    <option value="">Select your industry...</option>
                    {getIndustryOptions().map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.icon} {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Industry Name - shown when "custom" is selected */}
                {companyProfile.industryType === "custom" && (
                  <div className={styles.formGroup}>
                    <label htmlFor="customIndustryName">Custom Industry Name</label>
                    <input
                      type="text"
                      id="customIndustryName"
                      value={customIndustryName}
                      onChange={(e) => {
                        setCustomIndustryName(e.target.value);
                        // Update the company profile with custom industry name
                        setCompanyProfile(prev => ({
                          ...prev,
                          customIndustryName: e.target.value,
                        }));
                      }}
                      placeholder="e.g., Auto Detailing, Pet Grooming, etc."
                    />
                    <span className={styles.fieldHint}>
                      Enter your specific industry or trade type
                    </span>
                  </div>
                )}

                {/* Basic Company Info */}
                <div className={styles.formGroup}>
                  <label htmlFor="profileName">Company Name</label>
                  <input
                    type="text"
                    id="profileName"
                    name="name"
                    value={companyProfile.name}
                    onChange={handleCompanyProfileChange}
                    placeholder="e.g., Acme Roofing Co."
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="profileWebsite">Website</label>
                  <div className={styles.inputWithButton}>
                    <input
                      type="url"
                      id="profileWebsite"
                      name="website"
                      value={companyProfile.website}
                      onChange={handleCompanyProfileChange}
                      placeholder="https://yourcompany.com"
                    />
                    <button
                      type="button"
                      onClick={handleResearchCompany}
                      disabled={isResearchingCompany || !companyProfile.website}
                      className={styles.researchButton}
                      title="Auto-fill profile by analyzing your website"
                    >
                      {isResearchingCompany ? "Researching..." : "Research"}
                    </button>
                  </div>
                  <span className={styles.fieldHint}>
                    Click Research to auto-fill your profile from your website
                  </span>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="profilePhone">Phone</label>
                    <input
                      type="tel"
                      id="profilePhone"
                      name="phone"
                      value={companyProfile.phone}
                      onChange={handleCompanyProfileChange}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="profileEmail">Email</label>
                    <input
                      type="email"
                      id="profileEmail"
                      name="email"
                      value={companyProfile.email}
                      onChange={handleCompanyProfileChange}
                      placeholder="info@company.com"
                    />
                  </div>
                </div>

                {/* Location Info */}
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="profileState">State</label>
                    <input
                      type="text"
                      id="profileState"
                      name="state"
                      value={companyProfile.state}
                      onChange={handleCompanyProfileChange}
                      placeholder="North Carolina"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="profileStateAbbr">State Abbr</label>
                    <input
                      type="text"
                      id="profileStateAbbr"
                      name="stateAbbr"
                      value={companyProfile.stateAbbr}
                      onChange={handleCompanyProfileChange}
                      placeholder="NC"
                      maxLength={2}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="citiesInput">Service Areas (Cities)</label>
                  <input
                    type="text"
                    id="citiesInput"
                    value={citiesInput}
                    onChange={handleCitiesChange}
                    placeholder="Charlotte, Huntersville, Concord, Matthews..."
                  />
                  <small>Comma-separated list. First city becomes your headquarters.</small>
                </div>

                {/* Target Audience */}
                <div className={styles.formGroup}>
                  <label htmlFor="profileAudience">Target Market</label>
                  <select
                    id="profileAudience"
                    name="audience"
                    value={companyProfile.audience}
                    onChange={handleCompanyProfileChange}
                  >
                    <option value="homeowners">Homeowners (Residential)</option>
                    <option value="commercial">Commercial / Business</option>
                    <option value="both">Both Residential & Commercial</option>
                    <option value="property">Property Management</option>
                  </select>
                </div>

                {/* Enhanced Target Audience */}
                <div className={styles.formGroup}>
                  <label htmlFor="profileTargetAudience">Detailed Target Audience</label>
                  <select
                    id="profileTargetAudience"
                    name="targetAudience"
                    value={companyProfile.targetAudience || ""}
                    onChange={handleCompanyProfileChange}
                  >
                    <option value="">Select detailed audience...</option>
                    {TARGET_AUDIENCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} - {opt.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Target Audience - shown when "custom" is selected */}
                {companyProfile.targetAudience === "custom" && (
                  <div className={styles.formGroup}>
                    <label htmlFor="customTargetAudience">Custom Target Audience</label>
                    <input
                      type="text"
                      id="customTargetAudience"
                      name="customTargetAudience"
                      value={companyProfile.customTargetAudience || ""}
                      onChange={handleCompanyProfileChange}
                      placeholder="e.g., New parents, Senior citizens, First-time homebuyers"
                    />
                    <span className={styles.fieldHint}>
                      Describe your specific target audience
                    </span>
                  </div>
                )}

                {/* Brand Voice & Writing Style */}
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="profileBrandVoice">Brand Voice</label>
                    <select
                      id="profileBrandVoice"
                      name="brandVoice"
                      value={companyProfile.brandVoice || ""}
                      onChange={handleCompanyProfileChange}
                    >
                      <option value="">Select brand voice...</option>
                      {BRAND_VOICE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label} - {opt.description}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="profileWritingStyle">Writing Style</label>
                    <select
                      id="profileWritingStyle"
                      name="writingStyle"
                      value={companyProfile.writingStyle || ""}
                      onChange={handleCompanyProfileChange}
                    >
                      <option value="">Select writing style...</option>
                      {WRITING_STYLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label} - {opt.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Custom Brand Voice & Writing Style inputs */}
                {(companyProfile.brandVoice === "custom" || companyProfile.writingStyle === "custom") && (
                  <div className={styles.formRow}>
                    {companyProfile.brandVoice === "custom" && (
                      <div className={styles.formGroup}>
                        <label htmlFor="customBrandVoice">Custom Brand Voice</label>
                        <input
                          type="text"
                          id="customBrandVoice"
                          name="customBrandVoice"
                          value={companyProfile.customBrandVoice || ""}
                          onChange={handleCompanyProfileChange}
                          placeholder="e.g., Empathetic and caring, Bold and energetic"
                        />
                        <span className={styles.fieldHint}>
                          Describe how your brand should sound
                        </span>
                      </div>
                    )}
                    {companyProfile.writingStyle === "custom" && (
                      <div className={styles.formGroup}>
                        <label htmlFor="customWritingStyle">Custom Writing Style</label>
                        <input
                          type="text"
                          id="customWritingStyle"
                          name="customWritingStyle"
                          value={companyProfile.customWritingStyle || ""}
                          onChange={handleCompanyProfileChange}
                          placeholder="e.g., Technical with examples, Q&A format"
                        />
                        <span className={styles.fieldHint}>
                          Describe your preferred writing approach
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Credibility Fields */}
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="profileYearsInBusiness">Years in Business</label>
                    <input
                      type="number"
                      id="profileYearsInBusiness"
                      name="yearsInBusiness"
                      value={companyProfile.yearsInBusiness || ""}
                      onChange={handleCompanyProfileChange}
                      placeholder="e.g., 15"
                      min="1"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="profileProjectsCompleted">Projects Completed</label>
                    <input
                      type="number"
                      id="profileProjectsCompleted"
                      name="projectsCompleted"
                      value={companyProfile.projectsCompleted || ""}
                      onChange={handleCompanyProfileChange}
                      placeholder="e.g., 5000"
                      min="1"
                    />
                  </div>
                </div>

                {/* Content Preferences */}
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="profileWordCount">Preferred Blog Word Count</label>
                    <select
                      id="profileWordCount"
                      name="preferredWordCount"
                      value={companyProfile.preferredWordCount || ""}
                      onChange={handleCompanyProfileChange}
                    >
                      <option value="">Default (2000-2500)</option>
                      <option value="1500">Short (1500 words)</option>
                      <option value="2000">Medium (2000 words)</option>
                      <option value="2500">Long (2500 words)</option>
                      <option value="3000">Extended (3000 words)</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Content Features</label>
                    <div className={styles.checkboxRow}>
                      <label className={styles.checkboxItem}>
                        <input
                          type="checkbox"
                          checked={companyProfile.includeCTAs !== false}
                          onChange={(e) => setCompanyProfile(prev => ({
                            ...prev,
                            includeCTAs: e.target.checked
                          }))}
                        />
                        <span>Include CTAs</span>
                      </label>
                      <label className={styles.checkboxItem}>
                        <input
                          type="checkbox"
                          checked={companyProfile.includeStats !== false}
                          onChange={(e) => setCompanyProfile(prev => ({
                            ...prev,
                            includeStats: e.target.checked
                          }))}
                        />
                        <span>Include Statistics</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Services Selection */}
                {companyProfile.industryType && (
                  <div className={styles.formGroup}>
                    <label>Services Offered</label>
                    <div className={styles.checkboxGrid}>
                      {getAvailableServices().map((service) => (
                        <label key={service} className={styles.checkboxItem}>
                          <input
                            type="checkbox"
                            checked={companyProfile.services.includes(service)}
                            onChange={() => handleServiceToggle(service)}
                          />
                          <span>{service}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* USPs Selection */}
                {companyProfile.industryType && (
                  <div className={styles.formGroup}>
                    <label>Unique Selling Points (USPs)</label>
                    <div className={styles.checkboxGrid}>
                      {getAvailableUSPs().map((usp) => (
                        <label key={usp} className={styles.checkboxItem}>
                          <input
                            type="checkbox"
                            checked={companyProfile.usps.includes(usp)}
                            onChange={() => handleUSPToggle(usp)}
                          />
                          <span>{usp}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className={styles.profileButtons}>
                  <button
                    type="button"
                    onClick={saveCompanyProfile}
                    className={styles.testButton}
                  >
                    Save Profile
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateSEOPlan}
                    disabled={isGeneratingSEOPlan || !companyProfile.name || !companyProfile.industryType || companyProfile.cities.length === 0}
                    className={styles.seoPlanButton}
                  >
                    {isGeneratingSEOPlan ? "Generating..." : "Generate SEO Plan"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowContentHub(true)}
                    disabled={!companyResearch?.suggestedContent?.length}
                    className={styles.contentHubButton}
                  >
                    Content Hub
                    {companyResearch?.suggestedContent?.length ? (
                      <span className={styles.hubBadge}>{companyResearch.suggestedContent.length}</span>
                    ) : null}
                  </button>
                </div>

                {companyProfile.name && companyProfile.industryType && (
                  <div className={styles.profileSummary}>
                    <strong>{companyProfile.name}</strong> ({INDUSTRIES[companyProfile.industryType]?.name || companyProfile.industryType})
                    <br />
                    <span>{companyProfile.services.length} services | {companyProfile.usps.length} USPs | {companyProfile.cities.length} service areas</span>
                  </div>
                )}

                {/* Perplexity Deep Research */}
                <div className={styles.perplexitySection}>
                  <h4>Deep SEO Research</h4>
                  <p>AI-powered comprehensive market research</p>
                  <div className={styles.researchTypeGrid}>
                    {[
                      { type: "keyword", label: "Keyword Research", icon: "🔑" },
                      { type: "competitor", label: "Competitor Analysis", icon: "🎯" },
                      { type: "content", label: "Content Strategy", icon: "📝" },
                      { type: "local", label: "Local SEO", icon: "📍" },
                      { type: "comprehensive", label: "Full Research", icon: "🔬" },
                    ].map((research) => (
                      <button
                        key={research.type}
                        type="button"
                        onClick={() => runPerplexityResearch(research.type)}
                        disabled={isResearchingPerplexity || !companyProfile.name}
                        className={styles.researchTypeBtn}
                      >
                        <span className={styles.researchIcon}>{research.icon}</span>
                        <span>{research.label}</span>
                      </button>
                    ))}
                  </div>
                  {isResearchingPerplexity && (
                    <div className={styles.researchProgress}>
                      <div className={styles.spinner}></div>
                      <span>Researching... This may take a minute.</span>
                    </div>
                  )}
                  {perplexityResearch && (
                    <button
                      type="button"
                      onClick={() => setShowResearchModal(true)}
                      className={styles.viewResearchBtn}
                    >
                      View Research Results
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Company Info (Quick Access) */}
            {!showCompanyProfile && (
              <>
                <div className={styles.formGroup}>
                  <label htmlFor="companyName">Company Name (Optional)</label>
                  <input
                    type="text"
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    placeholder="e.g., Charlotte Landscape Lighting Co."
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="companyWebsite">Company Website (Optional)</label>
                  <input
                    type="url"
                    id="companyWebsite"
                    name="companyWebsite"
                    value={formData.companyWebsite}
                    onChange={handleInputChange}
                    placeholder="https://yourcompany.com"
                  />
                </div>
              </>
            )}
            </div>
            {/* End Legacy Company Profile */}

            {/* Page Type Selector (Page Mode) */}
            {generationMode === "page" && (
              <div className={styles.pageTypeSection}>
                <label>Select Page Type</label>
                <div className={styles.pageTypeGrid}>
                  {getPageTypeOptions().map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSelectedPageType(opt.value)}
                      className={`${styles.pageTypeCard} ${selectedPageType === opt.value ? styles.selected : ""}`}
                    >
                      <span className={styles.pageTypeIcon}>{opt.icon}</span>
                      <span className={styles.pageTypeLabel}>{opt.label}</span>
                    </button>
                  ))}
                </div>

                {/* Page-specific form fields */}
                <div className={styles.pageConfigForm}>
                  <div className={styles.formGroup}>
                    <label htmlFor="pageTitle">Page Title</label>
                    <input
                      type="text"
                      id="pageTitle"
                      name="title"
                      value={pageConfig.title}
                      onChange={handlePageConfigChange}
                      placeholder={`e.g., ${PAGE_TYPES[selectedPageType]?.label || "Page"} for ${companyProfile.headquarters || "Your City"}`}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="pagePrimaryKeyword">Primary Keyword</label>
                    <input
                      type="text"
                      id="pagePrimaryKeyword"
                      name="primaryKeyword"
                      value={pageConfig.primaryKeyword}
                      onChange={handlePageConfigChange}
                      placeholder="e.g., roofing charlotte nc"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="pageSecondaryKeywords">Secondary Keywords</label>
                    <textarea
                      id="pageSecondaryKeywords"
                      value={pageConfig.secondaryKeywords.join(", ")}
                      onChange={handlePageSecondaryKeywords}
                      placeholder="roof repair, roof replacement, storm damage..."
                      rows={2}
                    />
                  </div>

                  {/* Service Page Fields */}
                  {selectedPageType === "service_page" && (
                    <>
                      <div className={styles.formGroup}>
                        <label htmlFor="serviceName">Service Name</label>
                        <select
                          id="serviceName"
                          name="serviceName"
                          value={pageConfig.serviceName}
                          onChange={handlePageConfigChange}
                        >
                          <option value="">Select a service...</option>
                          {companyProfile.services.map((service) => (
                            <option key={service} value={service}>
                              {service}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="serviceDescription">Service Description (Optional)</label>
                        <textarea
                          id="serviceDescription"
                          name="serviceDescription"
                          value={pageConfig.serviceDescription}
                          onChange={handlePageConfigChange}
                          placeholder="Brief description of this service..."
                          rows={2}
                        />
                      </div>
                    </>
                  )}

                  {/* Location Page Fields */}
                  {selectedPageType === "location_page" && (
                    <div className={styles.formGroup}>
                      <label htmlFor="pageCity">City/Location</label>
                      <select
                        id="pageCity"
                        name="city"
                        value={pageConfig.city}
                        onChange={handlePageConfigChange}
                      >
                        <option value="">Select a city...</option>
                        {companyProfile.cities.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Blog Post / News Article Fields */}
                  {(selectedPageType === "blog_post" || selectedPageType === "news_article") && (
                    <>
                      <div className={styles.formGroup}>
                        <label htmlFor="pageTopic">Topic</label>
                        <input
                          type="text"
                          id="pageTopic"
                          name="topic"
                          value={pageConfig.topic}
                          onChange={handlePageConfigChange}
                          placeholder="e.g., Storm Damage Prevention, Seasonal Maintenance..."
                        />
                      </div>
                      {selectedPageType === "news_article" && (
                        <>
                          <div className={styles.formGroup}>
                            <label htmlFor="pageHeadline">Headline</label>
                            <input
                              type="text"
                              id="pageHeadline"
                              name="headline"
                              value={pageConfig.headline}
                              onChange={handlePageConfigChange}
                              placeholder="News headline..."
                            />
                          </div>
                          <div className={styles.formGroup}>
                            <label htmlFor="pageSummary">Summary</label>
                            <textarea
                              id="pageSummary"
                              name="summary"
                              value={pageConfig.summary}
                              onChange={handlePageConfigChange}
                              placeholder="Brief summary of the news..."
                              rows={2}
                            />
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {/* Custom Page Instructions */}
                  {selectedPageType === "custom" && (
                    <div className={styles.formGroup}>
                      <label htmlFor="customInstructions">Custom Instructions</label>
                      <textarea
                        id="customInstructions"
                        name="customInstructions"
                        value={pageConfig.customInstructions}
                        onChange={handlePageConfigChange}
                        placeholder="Describe what you want on this page..."
                        rows={4}
                      />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleGeneratePage}
                  disabled={isGeneratingPage}
                  className={styles.submitButton}
                >
                  {isGeneratingPage ? "Generating Page..." : `Generate ${PAGE_TYPES[selectedPageType]?.label || "Page"}`}
                </button>
              </div>
            )}

            {/* Blog Settings (Blog Mode) */}
            {generationMode === "blog" && (
              <div className={styles.blogSettingsSection}>
            <div className={styles.formGroup}>
              <label htmlFor="topic">Blog Topic</label>
              <input
                type="text"
                id="topic"
                name="topic"
                value={formData.topic}
                onChange={handleInputChange}
                placeholder="e.g., Landscape Lighting, Roof Replacement, Outdoor Design"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="location">Location</label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="e.g., Charlotte, NC"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="blogType">Blog Type</label>
              <select
                id="blogType"
                name="blogType"
                value={formData.blogType}
                onChange={handleInputChange}
                required
              >
                <option>Neighborhood Guide</option>
                <option>How-To Guide</option>
                <option>Trend Report</option>
                <option>Property Showcase</option>
                <option>Expert Tips</option>
                <option>Season-Specific Guide</option>
                <option>Before and After</option>
                <option>Product Comparison</option>
              </select>
            </div>

            {/* Research Button */}
            <div className={styles.researchSection}>
              <button
                type="button"
                onClick={handleResearchKeywords}
                disabled={isResearching || !formData.topic || !formData.location}
                className={styles.researchButton}
              >
                {isResearching ? "Researching..." : "Research Keywords & SEO"}
              </button>
              <small>AI analyzes competitors and suggests optimal keywords</small>
            </div>

            {/* SEO Settings Toggle */}
            <div className={styles.settingsToggle}>
              <button
                type="button"
                onClick={() => setShowSEOSettings(!showSEOSettings)}
                className={styles.settingsButton}
              >
                {showSEOSettings ? "Hide" : "Show"} SEO & Keyword Settings
                {formData.primaryKeyword && " (Configured)"}
              </button>
            </div>

            {/* SEO Settings Panel */}
            {showSEOSettings && (
              <div className={styles.seoSettings}>
                <h3>SEO & Keywords</h3>

                {researchData && (
                  <div className={styles.researchInsights}>
                    <h4>AI Research Insights:</h4>
                    <div className={styles.insightsList}>
                      <div>
                        <strong>Competitor Insights:</strong>
                        <ul>
                          {researchData.competitorInsights.map((insight, i) => (
                            <li key={i}>{insight}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <strong>Content Angles:</strong>
                        <ul>
                          {researchData.contentAngles.map((angle, i) => (
                            <li key={i}>{angle}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label htmlFor="primaryKeyword">Primary Keyword</label>
                  <input
                    type="text"
                    id="primaryKeyword"
                    name="primaryKeyword"
                    value={formData.primaryKeyword}
                    onChange={handleInputChange}
                    placeholder="e.g., landscape lighting charlotte nc"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="secondaryKeywords">Secondary Keywords (comma separated)</label>
                  <textarea
                    id="secondaryKeywords"
                    name="secondaryKeywords"
                    value={formData.secondaryKeywords}
                    onChange={handleInputChange}
                    placeholder="e.g., outdoor lighting, pathway lights, garden illumination"
                    rows={2}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="metaTitle">Meta Title</label>
                  <input
                    type="text"
                    id="metaTitle"
                    name="metaTitle"
                    value={formData.metaTitle}
                    onChange={handleInputChange}
                    placeholder="SEO-optimized page title (under 60 characters)"
                    maxLength={60}
                  />
                  <small>{formData.metaTitle.length}/60 characters</small>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="metaDescription">Meta Description</label>
                  <textarea
                    id="metaDescription"
                    name="metaDescription"
                    value={formData.metaDescription}
                    onChange={handleInputChange}
                    placeholder="Compelling description for search results (under 160 characters)"
                    maxLength={160}
                    rows={2}
                  />
                  <small>{formData.metaDescription.length}/160 characters</small>
                </div>
              </div>
            )}

            <div className={styles.formGroup}>
              <label htmlFor="numberOfSections">Number of Sections</label>
              <select
                id="numberOfSections"
                name="numberOfSections"
                value={formData.numberOfSections}
                onChange={handleInputChange}
              >
                <option value="3">3 Sections</option>
                <option value="4">4 Sections</option>
                <option value="5">5 Sections</option>
                <option value="6">6 Sections</option>
                <option value="7">7 Sections</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="tone">Tone</label>
              <select
                id="tone"
                name="tone"
                value={formData.tone}
                onChange={handleInputChange}
              >
                <option>professional yet friendly</option>
                <option>casual and conversational</option>
                <option>luxury and premium</option>
                <option>educational and informative</option>
                <option>inspirational and lifestyle</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="readingLevel">Reading Level</label>
              <select
                id="readingLevel"
                name="readingLevel"
                value={formData.readingLevel}
                onChange={handleInputChange}
              >
                <option value="5th Grade">5th Grade (Age 10-11)</option>
                <option value="6th Grade">6th Grade (Age 11-12)</option>
                <option value="7th Grade">7th Grade (Age 12-13)</option>
                <option value="8th Grade">8th Grade (Age 13-14)</option>
                <option value="High School">High School (Age 14-18)</option>
                <option value="College">College (Undergraduate)</option>
                <option value="Graduate">Graduate / Professional</option>
              </select>
              <small className={styles.hint}>
                Lower reading levels use simpler words and shorter sentences. Higher levels allow more complex vocabulary.
              </small>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="useOrchestration"
                  checked={formData.useOrchestration}
                  onChange={handleInputChange}
                />
                <span>Use Advanced AI Mode</span>
              </label>
              <small className={styles.hint}>
                {formData.useOrchestration
                  ? "AI generates outlines, images, content, and formatting"
                  : "Basic mode (faster, no image generation)"}
              </small>
            </div>

            {formData.useOrchestration && (
              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="enableQualityReview"
                    checked={formData.enableQualityReview}
                    onChange={handleInputChange}
                  />
                  <span>Enable Image Quality Review</span>
                </label>
                <small className={styles.hint}>
                  AI reviews images and remakes any that don't meet quality standards (slower but better results)
                </small>
              </div>
            )}

            {/* Image Mode Selection */}
            {formData.useOrchestration && (
              <div className={styles.formGroup}>
                <label>Image Source</label>
                <div className={styles.publishActionButtons}>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, imageMode: "auto", userImages: [] }))}
                    className={`${styles.publishActionBtn} ${formData.imageMode === "auto" ? styles.active : ""}`}
                  >
                    AI Generated
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, imageMode: "manual" }))}
                    className={`${styles.publishActionBtn} ${formData.imageMode === "manual" ? styles.active : ""}`}
                  >
                    My Images
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, imageMode: "enhance" }))}
                    className={`${styles.publishActionBtn} ${formData.imageMode === "enhance" ? styles.active : ""}`}
                  >
                    AI Enhanced
                  </button>
                </div>
                <small className={styles.hint}>
                  {formData.imageMode === "auto" && "AI will generate unique images for your blog"}
                  {formData.imageMode === "manual" && "Use your own images - add URLs or upload files"}
                  {formData.imageMode === "enhance" && "Upload images and AI will enhance/edit them for your blog"}
                </small>
              </div>
            )}

            {/* User Image Upload */}
            {formData.useOrchestration && (formData.imageMode === "manual" || formData.imageMode === "enhance") && (
              <div className={styles.formGroup}>
                <label>Your Images</label>
                <div className={styles.imageUploadSection}>
                  {/* URL Input */}
                  <div className={styles.imageUrlInput}>
                    <input
                      type="text"
                      placeholder="Paste image URL and press Enter"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const input = e.target as HTMLInputElement;
                          const url = input.value.trim();
                          if (url) {
                            setFormData(prev => ({
                              ...prev,
                              userImages: [...prev.userImages, { id: Date.now().toString(), url }]
                            }));
                            input.value = "";
                          }
                        }
                      }}
                    />
                    <span style={{ margin: "0 0.5rem", color: "var(--text-muted, #666)" }}>or</span>
                    <label className={styles.fileUploadLabel}>
                      Upload File
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const files = e.target.files;
                          if (files) {
                            Array.from(files).forEach(file => {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const base64 = event.target?.result as string;
                                setFormData(prev => ({
                                  ...prev,
                                  userImages: [...prev.userImages, { id: Date.now().toString() + Math.random(), url: base64 }]
                                }));
                              };
                              reader.readAsDataURL(file);
                            });
                          }
                        }}
                      />
                    </label>
                  </div>

                  {/* Image Preview Grid */}
                  {formData.userImages.length > 0 && (
                    <div className={styles.imagePreviewGrid}>
                      {formData.userImages.map((img, index) => (
                        <div key={img.id} className={styles.imagePreviewItem}>
                          <img src={img.url} alt={`User image ${index + 1}`} />
                          <button
                            type="button"
                            className={styles.removeImageBtn}
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              userImages: prev.userImages.filter(i => i.id !== img.id)
                            }))}
                          >
                            ×
                          </button>
                          <span className={styles.imageIndex}>{index === 0 ? "Hero" : `#${index}`}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <small className={styles.hint}>
                    First image will be the hero/featured image. Add {formData.numberOfSections} images for best results.
                    {formData.imageMode === "enhance" && " AI will enhance colors, lighting, and composition."}
                  </small>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={state.isLoading}
              className={styles.submitButton}
            >
              {state.isLoading ? "Generating..." : "Generate Blog"}
            </button>
              </div>
            )}
          </form>

          {/* Progress Indicator */}
          {(state.isLoading || isGeneratingPage) && (
            <div className={styles.progressSection}>
              <div className={styles.progressSteps}>
                <div className={`${styles.progressStep} ${["research", "outline", "images", "content", "format", "upload", "publishing", "complete"].includes(state.progress.step) ? styles.active : ""}`}>
                  <span className={styles.stepNumber}>1</span>
                  <span>Outline</span>
                  <small>Structure</small>
                </div>
                <div className={`${styles.progressStep} ${["images", "content", "format", "upload", "publishing", "complete"].includes(state.progress.step) ? styles.active : ""}`}>
                  <span className={styles.stepNumber}>2</span>
                  <span>Images</span>
                  <small>Generation</small>
                </div>
                <div className={`${styles.progressStep} ${["content", "format", "upload", "publishing", "complete"].includes(state.progress.step) ? styles.active : ""}`}>
                  <span className={styles.stepNumber}>3</span>
                  <span>Content</span>
                  <small>Writing</small>
                </div>
                <div className={`${styles.progressStep} ${["format", "upload", "publishing", "complete"].includes(state.progress.step) ? styles.active : ""}`}>
                  <span className={styles.stepNumber}>4</span>
                  <span>Format</span>
                  <small>Polish</small>
                </div>
                <div className={`${styles.progressStep} ${["upload", "publishing", "complete"].includes(state.progress.step) ? styles.active : ""}`}>
                  <span className={styles.stepNumber}>5</span>
                  <span>Upload</span>
                  <small>Publish</small>
                </div>
              </div>
              <p className={styles.progressMessage}>{state.progress.message}</p>

              {/* Loading Entertainment Section */}
              <div className={styles.loadingEntertainment}>
                <div className={styles.loadingProgress}>
                  <ProgressRing
                    progress={
                      state.progress.step === "research" ? 10 :
                      state.progress.step === "outline" ? 25 :
                      state.progress.step === "images" ? 45 :
                      state.progress.step === "content" ? 65 :
                      state.progress.step === "format" ? 80 :
                      state.progress.step === "upload" ? 90 :
                      state.progress.step === "publishing" ? 95 :
                      state.progress.step === "complete" ? 100 : 5
                    }
                    size={80}
                    strokeWidth={6}
                    showValue
                  />
                </div>

                <button
                  type="button"
                  className={styles.newContentBtn}
                  onClick={refreshEntertainment}
                  title="Show another"
                >
                  Next
                </button>

                <TextBubble
                  variant={entertainment.type === "joke" ? "info" : entertainment.type === "quote" ? "primary" : "success"}
                  position="center"
                  delay={0.2}
                  className={styles.entertainmentBubble}
                >
                  <div className={styles.entertainmentContent} key={entertainment.key}>
                    <div className={styles.entertainmentTypeIcon}>
                      {entertainment.type === "joke" && "😄"}
                      {entertainment.type === "quote" && "💡"}
                      {entertainment.type === "fact" && "🧠"}
                    </div>

                    <div className={styles.entertainmentTypeLabel}>
                      {entertainment.type === "joke" && "While you wait..."}
                      {entertainment.type === "quote" && "Inspiration"}
                      {entertainment.type === "fact" && "Did you know?"}
                    </div>

                    <p className={`${styles.entertainmentText} ${styles[entertainment.type]}`}>
                      {entertainment.content}
                    </p>

                    {entertainment.author && (
                      <p className={styles.entertainmentAuthor}>{entertainment.author}</p>
                    )}
                  </div>
                </TextBubble>

                <div className={styles.loadingDots}>
                  <span className={styles.loadingDot}></span>
                  <span className={styles.loadingDot}></span>
                  <span className={styles.loadingDot}></span>
                </div>
              </div>
            </div>
          )}
          </>
          )}
          {/* End of Create section */}

          {/* Setup Section - Integrations */}
          {activeSection === "setup" && (
            <div className={styles.sectionContent}>
              <h2 className={styles.sectionTitle}>Integrations</h2>
              <p className={styles.sectionDescription}>
                Configure your publishing platforms to directly publish generated content.
              </p>

              <div className={styles.formCard}>
                <h4 className={styles.formCardTitle}>
                  WordPress
                  {wordpress.isConnected && <span className={styles.connectedBadge}>Connected</span>}
                </h4>
                <div className={styles.formGroup}>
                  <label htmlFor="setupSiteUrl">Site URL</label>
                  <input
                    type="url"
                    id="setupSiteUrl"
                    name="siteUrl"
                    value={wordpress.siteUrl}
                    onChange={handleWordPressChange}
                    placeholder="https://yoursite.com"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="setupWpUsername">Username</label>
                  <input
                    type="text"
                    id="setupWpUsername"
                    name="username"
                    value={wordpress.username}
                    onChange={handleWordPressChange}
                    placeholder="admin"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="setupAppPassword">Application Password</label>
                  <input
                    type="password"
                    id="setupAppPassword"
                    name="appPassword"
                    value={wordpress.appPassword}
                    onChange={handleWordPressChange}
                    placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                  />
                  <small>Generate in WordPress Admin → Users → Profile → Application Passwords</small>
                </div>
                <button
                  type="button"
                  onClick={testWordPressConnection}
                  disabled={testingConnection || !wordpress.siteUrl || !wordpress.username || !wordpress.appPassword}
                  className={styles.testButton}
                >
                  {testingConnection ? "Testing..." : wordpress.isConnected ? "Connected" : "Test Connection"}
                </button>
              </div>

              <div className={styles.formCard}>
                <h4 className={styles.formCardTitle}>
                  GoHighLevel
                  {gohighlevel.isConnected && <span className={styles.connectedBadge}>Connected</span>}
                </h4>
                <div className={styles.formGroup}>
                  <label htmlFor="setupGhlApiToken">API Token</label>
                  <input
                    type="password"
                    id="setupGhlApiToken"
                    name="apiToken"
                    value={gohighlevel.apiToken}
                    onChange={handleGHLChange}
                    placeholder="Your Private Integration API Token"
                  />
                  <small>Settings → Integrations → Private Integrations</small>
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="setupGhlLocationId">Location ID</label>
                  <input
                    type="text"
                    id="setupGhlLocationId"
                    name="locationId"
                    value={gohighlevel.locationId}
                    onChange={handleGHLChange}
                    placeholder="e.g., abc123XYZ..."
                  />
                </div>
                <button
                  type="button"
                  onClick={testGHLConnection}
                  disabled={testingConnection || !gohighlevel.apiToken || !gohighlevel.locationId}
                  className={styles.testButton}
                >
                  {testingConnection ? "Testing..." : gohighlevel.isConnected ? "Connected" : "Test Connection"}
                </button>
                {gohighlevel.isConnected && ghlBlogs.length > 0 && (
                  <div className={styles.formGroup} style={{ marginTop: "1rem" }}>
                    <label htmlFor="setupGhlBlogId">Select Blog</label>
                    <select
                      id="setupGhlBlogId"
                      name="blogId"
                      value={gohighlevel.blogId}
                      onChange={handleGHLChange}
                    >
                      <option value="">Select a blog...</option>
                      {ghlBlogs.map((blog) => (
                        <option key={blog.id} value={blog.id}>{blog.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Profile Section */}
          {activeSection === "profile" && (
            <div className={styles.sectionContent}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>Company Profile</h2>
                <button
                  type="button"
                  onClick={() => router.push("/settings/company")}
                  className={styles.secondaryButton}
                  style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem" }}
                >
                  Full Settings
                </button>
              </div>
              <p className={styles.sectionDescription}>
                Your company information is used to generate relevant, branded content.
              </p>

              <div className={styles.formCard}>
                <h4 className={styles.formCardTitle}>Business Information</h4>
                <div className={styles.formCardGrid}>
                  <div className={styles.formGroup}>
                    <label htmlFor="profileCompanyName">Company Name</label>
                    <input
                      type="text"
                      id="profileCompanyName"
                      value={companyProfile.name}
                      onChange={(e) => setCompanyProfile(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Your Company Name"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="profileWebsite">Website</label>
                    <input
                      type="url"
                      id="profileWebsite"
                      value={companyProfile.website}
                      onChange={(e) => setCompanyProfile(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://yourcompany.com"
                    />
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="profileIndustry">Industry</label>
                  <select
                    id="profileIndustry"
                    value={companyProfile.industryType}
                    onChange={(e) => {
                      const industry = e.target.value;
                      setCompanyProfile(prev => ({
                        ...prev,
                        industryType: industry,
                        services: industry && industry !== "other" ? getDefaultServices(industry) : prev.services,
                        usps: industry && industry !== "other" ? getDefaultUSPs(industry) : prev.usps,
                      }));
                    }}
                  >
                    <option value="">Select Industry...</option>
                    {getIndustryOptions().map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                {companyProfile.industryType === "custom" && (
                  <div className={styles.formGroup}>
                    <label htmlFor="profileCustomIndustry">Your Industry</label>
                    <input
                      type="text"
                      id="profileCustomIndustry"
                      value={companyProfile.customIndustryName || ""}
                      onChange={(e) => setCompanyProfile(prev => ({ ...prev, customIndustryName: e.target.value }))}
                      placeholder="Enter your industry (e.g., Pool Services, Tree Care)"
                    />
                  </div>
                )}
              </div>

              <div className={styles.formCard}>
                <h4 className={styles.formCardTitle}>Location</h4>
                <div className={styles.formCardGrid}>
                  <div className={styles.formGroup}>
                    <label htmlFor="profileHeadquarters">Headquarters</label>
                    <input
                      type="text"
                      id="profileHeadquarters"
                      value={companyProfile.headquarters}
                      onChange={(e) => setCompanyProfile(prev => ({ ...prev, headquarters: e.target.value }))}
                      placeholder="e.g., Charlotte, NC"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="profileState">State</label>
                    <input
                      type="text"
                      id="profileState"
                      value={companyProfile.state}
                      onChange={(e) => setCompanyProfile(prev => ({ ...prev, state: e.target.value }))}
                      placeholder="e.g., North Carolina"
                    />
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="profileCities">Service Areas (Cities)</label>
                  <textarea
                    id="profileCities"
                    value={citiesInput}
                    onChange={(e) => {
                      setCitiesInput(e.target.value);
                      const cities = e.target.value.split(",").map(c => c.trim()).filter(Boolean);
                      setCompanyProfile(prev => ({ ...prev, cities }));
                    }}
                    placeholder="Charlotte, Concord, Huntersville, Matthews..."
                    rows={2}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  await saveCompanyProfile();
                  showToast("success", "Profile Saved", "Your company profile has been saved.");
                }}
                className={styles.testButton}
                style={{ width: "100%" }}
              >
                Save Profile
              </button>
            </div>
          )}

          {/* Research Section */}
          {activeSection === "research" && (
            <div className={styles.sectionContent}>
              <h2 className={styles.sectionTitle}>Research Tools</h2>
              <p className={styles.sectionDescription}>
                Use AI-powered research to find keywords and content strategies.
              </p>

              <div className={styles.formCard}>
                <h4 className={styles.formCardTitle}>AI Deep Research</h4>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted, #666)", marginBottom: "1rem" }}>
                  Enter a topic in the Create section first, then use these tools to research.
                </p>
                <div className={styles.researchButtons}>
                  <button
                    type="button"
                    onClick={() => runPerplexityResearch("keyword")}
                    disabled={isResearchingPerplexity || (!formData.topic && !formData.primaryKeyword)}
                    className={styles.researchTypeBtn}
                  >
                    Keywords
                  </button>
                  <button
                    type="button"
                    onClick={() => runPerplexityResearch("competitor")}
                    disabled={isResearchingPerplexity || (!formData.topic && !formData.primaryKeyword)}
                    className={styles.researchTypeBtn}
                  >
                    Competitors
                  </button>
                  <button
                    type="button"
                    onClick={() => runPerplexityResearch("content")}
                    disabled={isResearchingPerplexity || (!formData.topic && !formData.primaryKeyword)}
                    className={styles.researchTypeBtn}
                  >
                    Content Ideas
                  </button>
                  <button
                    type="button"
                    onClick={() => runPerplexityResearch("local")}
                    disabled={isResearchingPerplexity || (!formData.topic && !formData.primaryKeyword)}
                    className={styles.researchTypeBtn}
                  >
                    Local SEO
                  </button>
                  <button
                    type="button"
                    onClick={() => runPerplexityResearch("comprehensive")}
                    disabled={isResearchingPerplexity || (!formData.topic && !formData.primaryKeyword)}
                    className={`${styles.researchTypeBtn} ${styles.primary}`}
                  >
                    Full Analysis
                  </button>
                </div>
                {isResearchingPerplexity && (
                  <p style={{ marginTop: "1rem", color: "#667eea" }}>AI is researching...</p>
                )}
              </div>

              {perplexityResearch && (
                <div className={styles.formCard}>
                  <h4 className={styles.formCardTitle}>Research Results Available</h4>
                  <button
                    type="button"
                    onClick={() => setShowResearchModal(true)}
                    className={styles.testButton}
                    style={{ width: "100%" }}
                  >
                    View Full Research Report
                  </button>
                </div>
              )}

              {/* SERP Analysis Section - Full Featured */}
              <div className={styles.formCard}>
                <h4 className={styles.formCardTitle}>
                  SERP Analysis
                  <span style={{ fontSize: "0.7rem", color: "#667eea", marginLeft: "0.5rem" }}>Bright Data</span>
                </h4>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted, #666)", marginBottom: "1rem" }}>
                  Analyze real Google search results with AI-powered competitive insights.
                </p>

                {/* Keyword Input */}
                <div className={styles.formGroup}>
                  <label htmlFor="serpKeyword">Keyword to Analyze</label>
                  <input
                    type="text"
                    id="serpKeyword"
                    value={serpKeyword}
                    onChange={(e) => setSerpKeyword(e.target.value)}
                    placeholder={formData.topic || formData.primaryKeyword || "Enter a keyword..."}
                  />
                </div>

                {/* Search Options */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                  {/* Search Type */}
                  <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: "0.75rem" }}>Search Type</label>
                    <select
                      value={serpSearchType}
                      onChange={(e) => setSerpSearchType(e.target.value as "web" | "images" | "news" | "shopping" | "videos")}
                      style={{ fontSize: "0.85rem", padding: "0.5rem" }}
                    >
                      <option value="web">Web</option>
                      <option value="news">News</option>
                      <option value="images">Images</option>
                      <option value="shopping">Shopping</option>
                      <option value="videos">Videos</option>
                    </select>
                  </div>

                  {/* Country */}
                  <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: "0.75rem" }}>Country</label>
                    <select
                      value={serpCountry}
                      onChange={(e) => setSerpCountry(e.target.value)}
                      style={{ fontSize: "0.85rem", padding: "0.5rem" }}
                    >
                      <option value="us">United States</option>
                      <option value="gb">United Kingdom</option>
                      <option value="ca">Canada</option>
                      <option value="au">Australia</option>
                      <option value="de">Germany</option>
                      <option value="fr">France</option>
                      <option value="es">Spain</option>
                      <option value="it">Italy</option>
                      <option value="nl">Netherlands</option>
                      <option value="br">Brazil</option>
                      <option value="mx">Mexico</option>
                      <option value="in">India</option>
                      <option value="jp">Japan</option>
                    </select>
                  </div>

                  {/* Device */}
                  <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: "0.75rem" }}>Device</label>
                    <select
                      value={serpDevice}
                      onChange={(e) => setSerpDevice(e.target.value as "desktop" | "mobile" | "tablet")}
                      style={{ fontSize: "0.85rem", padding: "0.5rem" }}
                    >
                      <option value="desktop">Desktop</option>
                      <option value="mobile">Mobile</option>
                      <option value="tablet">Tablet</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={runSerpAnalysis}
                  disabled={isAnalyzingSerp}
                  className={`${styles.testButton} ${styles.primary}`}
                  style={{ width: "100%" }}
                >
                  {isAnalyzingSerp ? "Analyzing Google Results..." : `Analyze ${serpSearchType.charAt(0).toUpperCase() + serpSearchType.slice(1)} SERP`}
                </button>
              </div>

              {/* SERP Analysis Results - Full Featured */}
              {serpAnalysis && (
                <div className={styles.formCard}>
                  <h4 className={styles.formCardTitle}>
                    SERP Analysis: {serpAnalysis.keyword}
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted, #888)", marginLeft: "0.5rem" }}>
                      {serpAnalysis.searchType} | {serpAnalysis.country.toUpperCase()} | {serpAnalysis.device}
                    </span>
                  </h4>

                  {/* Difficulty Score */}
                  {serpAnalysis.analysis?.difficulty && (
                    <div style={{ marginBottom: "1rem", padding: "1rem", background: "#f8f9ff", borderRadius: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <span style={{ fontWeight: "600" }}>Ranking Difficulty</span>
                        <span style={{
                          padding: "0.25rem 0.75rem",
                          borderRadius: "20px",
                          fontSize: "0.8rem",
                          fontWeight: "600",
                          background: serpAnalysis.analysis.difficulty.score < 30 ? "#d1fae5" : serpAnalysis.analysis.difficulty.score < 60 ? "#fef3c7" : "#fee2e2",
                          color: serpAnalysis.analysis.difficulty.score < 30 ? "#059669" : serpAnalysis.analysis.difficulty.score < 60 ? "#d97706" : "#dc2626",
                        }}>
                          {serpAnalysis.analysis.difficulty.level} ({serpAnalysis.analysis.difficulty.score}/100)
                        </span>
                      </div>
                      <div style={{ height: "8px", background: "var(--border-light, #e5e7eb)", borderRadius: "4px", overflow: "hidden" }}>
                        <div style={{
                          width: `${serpAnalysis.analysis.difficulty.score}%`,
                          height: "100%",
                          background: serpAnalysis.analysis.difficulty.score < 30 ? "#10b981" : serpAnalysis.analysis.difficulty.score < 60 ? "#f59e0b" : "#ef4444",
                          borderRadius: "4px",
                        }} />
                      </div>
                      {serpAnalysis.analysis.difficulty.factors?.length > 0 && (
                        <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--text-muted, #666)" }}>
                          <strong>Factors:</strong> {serpAnalysis.analysis.difficulty.factors.slice(0, 3).join(" • ")}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Search Intent */}
                  {serpAnalysis.analysis?.searchIntent && (
                    <div style={{ marginBottom: "1rem", padding: "1rem", background: "#fef3c7", borderRadius: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                        <strong>Search Intent:</strong>
                        <span style={{
                          textTransform: "capitalize",
                          padding: "0.2rem 0.5rem",
                          background: "#fff",
                          borderRadius: "4px",
                          fontWeight: "600",
                          color: "#92400e"
                        }}>
                          {serpAnalysis.analysis.searchIntent.primary}
                        </span>
                      </div>
                      {serpAnalysis.analysis.searchIntent.recommendation && (
                        <p style={{ fontSize: "0.85rem", margin: 0, color: "#78350f" }}>
                          {serpAnalysis.analysis.searchIntent.recommendation}
                        </p>
                      )}
                    </div>
                  )}

                  {/* SERP Features Present */}
                  {serpAnalysis.analysis?.serpFeatures?.present && serpAnalysis.analysis.serpFeatures.present.length > 0 && (
                    <div style={{ marginBottom: "1rem" }}>
                      <strong>SERP Features Found:</strong>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
                        {serpAnalysis.analysis.serpFeatures.present.map((feature, i) => (
                          <span key={i} style={{
                            padding: "0.25rem 0.5rem",
                            background: "#dbeafe",
                            borderRadius: "4px",
                            fontSize: "0.8rem",
                            color: "#1e40af",
                          }}>{feature}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Featured Snippet */}
                  {serpAnalysis.serpData?.featuredSnippet && (
                    <div style={{ marginBottom: "1rem", padding: "1rem", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                      <strong style={{ color: "#16a34a" }}>Featured Snippet ({serpAnalysis.serpData.featuredSnippet.type}):</strong>
                      <p style={{ margin: "0.5rem 0", fontSize: "0.9rem" }}>{serpAnalysis.serpData.featuredSnippet.content.substring(0, 200)}...</p>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted, #666)" }}>Source: {serpAnalysis.serpData.featuredSnippet.source}</div>
                    </div>
                  )}

                  {/* Knowledge Panel */}
                  {serpAnalysis.serpData?.knowledgePanel && (
                    <div style={{ marginBottom: "1rem", padding: "1rem", background: "#f5f3ff", borderRadius: "8px", border: "1px solid #ddd6fe" }}>
                      <strong style={{ color: "#6d28d9" }}>Knowledge Panel: {serpAnalysis.serpData.knowledgePanel.title}</strong>
                      <p style={{ margin: "0.5rem 0", fontSize: "0.85rem" }}>{serpAnalysis.serpData.knowledgePanel.description?.substring(0, 200)}</p>
                    </div>
                  )}

                  {/* Organic Results - Expandable */}
                  {serpAnalysis.serpData?.organic && serpAnalysis.serpData.organic.length > 0 && (
                    <div style={{ marginBottom: "1rem" }}>
                      <button
                        type="button"
                        onClick={() => setSerpResultsExpanded(serpResultsExpanded === "organic" ? null : "organic")}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          fontWeight: "600",
                          padding: 0,
                        }}
                      >
                        <span style={{ transform: serpResultsExpanded === "organic" ? "rotate(90deg)" : "rotate(0)", transition: "transform 0.2s" }}>▶</span>
                        Top {serpAnalysis.serpData.organic.length} Organic Results
                      </button>
                      {serpResultsExpanded === "organic" && (
                        <div style={{ marginTop: "0.5rem", maxHeight: "300px", overflowY: "auto" }}>
                          {serpAnalysis.serpData.organic.slice(0, 10).map((result, i) => (
                            <div key={i} style={{ padding: "0.75rem", background: i % 2 === 0 ? "#f9fafb" : "#fff", borderRadius: "4px", marginBottom: "0.25rem" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <span style={{ fontWeight: "bold", color: "#667eea", minWidth: "24px" }}>#{result.position}</span>
                                <a href={result.link} target="_blank" rel="noopener noreferrer" style={{ color: "#1e40af", fontWeight: "500", fontSize: "0.9rem" }}>
                                  {result.title}
                                </a>
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "#16a34a", marginTop: "0.25rem" }}>{result.domain}</div>
                              <div style={{ fontSize: "0.8rem", color: "var(--text-muted, #666)", marginTop: "0.25rem" }}>{result.snippet?.substring(0, 150)}...</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Local Pack */}
                  {serpAnalysis.serpData?.localPack && serpAnalysis.serpData.localPack.length > 0 && (
                    <div style={{ marginBottom: "1rem" }}>
                      <button
                        type="button"
                        onClick={() => setSerpResultsExpanded(serpResultsExpanded === "local" ? null : "local")}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          fontWeight: "600",
                          padding: 0,
                        }}
                      >
                        <span style={{ transform: serpResultsExpanded === "local" ? "rotate(90deg)" : "rotate(0)", transition: "transform 0.2s" }}>▶</span>
                        Local Pack ({serpAnalysis.serpData.localPack.length} businesses)
                      </button>
                      {serpResultsExpanded === "local" && (
                        <div style={{ marginTop: "0.5rem" }}>
                          {serpAnalysis.serpData.localPack.map((local, i) => (
                            <div key={i} style={{ padding: "0.5rem", background: "#f9fafb", borderRadius: "4px", marginBottom: "0.25rem" }}>
                              <div style={{ fontWeight: "500" }}>{local.title}</div>
                              <div style={{ fontSize: "0.8rem", color: "var(--text-muted, #666)" }}>{local.address}</div>
                              {local.rating && <div style={{ fontSize: "0.8rem" }}>⭐ {local.rating} ({local.reviews} reviews)</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ads */}
                  {serpAnalysis.serpData?.ads?.top && serpAnalysis.serpData.ads.top.length > 0 && (
                    <div style={{ marginBottom: "1rem", padding: "0.75rem", background: "#fef2f2", borderRadius: "8px", border: "1px solid #fecaca" }}>
                      <strong style={{ color: "#dc2626", fontSize: "0.85rem" }}>
                        {serpAnalysis.serpData.ads.top.length} Paid Ads Detected
                      </strong>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
                        {serpAnalysis.serpData.ads.top.slice(0, 5).map((ad, i) => (
                          <span key={i} style={{ padding: "0.2rem 0.5rem", background: "#fff", borderRadius: "4px", fontSize: "0.75rem" }}>
                            {ad.domain}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* People Also Ask */}
                  {serpAnalysis.serpData?.peopleAlsoAsk && serpAnalysis.serpData.peopleAlsoAsk.length > 0 && (
                    <div style={{ marginBottom: "1rem" }}>
                      <strong>People Also Ask ({serpAnalysis.serpData.peopleAlsoAsk.length}):</strong>
                      <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", fontSize: "0.9rem" }}>
                        {serpAnalysis.serpData.peopleAlsoAsk.slice(0, 6).map((q, i) => (
                          <li key={i} style={{ marginBottom: "0.25rem" }}>{q.question}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Content Strategy */}
                  {serpAnalysis.analysis?.contentStrategy && (
                    <div style={{ marginBottom: "1rem", padding: "1rem", background: "#eff6ff", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
                      <strong style={{ color: "#1e40af" }}>Content Strategy</strong>
                      <div style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
                        <div><strong>Type:</strong> {serpAnalysis.analysis.contentStrategy.recommendedType}</div>
                        <div><strong>Word Count:</strong> {serpAnalysis.analysis.contentStrategy.targetWordCount}</div>
                        {serpAnalysis.analysis.contentStrategy.mustIncludeTopics?.length > 0 && (
                          <div style={{ marginTop: "0.5rem" }}>
                            <strong>Must Include:</strong>
                            <ul style={{ margin: "0.25rem 0 0", paddingLeft: "1.25rem" }}>
                              {serpAnalysis.analysis.contentStrategy.mustIncludeTopics.slice(0, 5).map((topic, i) => (
                                <li key={i}>{topic}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Title Recommendations */}
                  {serpAnalysis.analysis?.contentStrategy?.titleSuggestions && serpAnalysis.analysis.contentStrategy.titleSuggestions.length > 0 && (
                    <div style={{ marginBottom: "1rem" }}>
                      <strong>Recommended Titles:</strong>
                      <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", fontSize: "0.9rem" }}>
                        {serpAnalysis.analysis.contentStrategy.titleSuggestions.slice(0, 5).map((title, i) => (
                          <li key={i} style={{ marginBottom: "0.25rem" }}>{title}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Quick Wins */}
                  {serpAnalysis.analysis?.quickWins && serpAnalysis.analysis.quickWins.length > 0 && (
                    <div style={{ marginBottom: "1rem", padding: "1rem", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                      <strong style={{ color: "#16a34a" }}>Quick Wins:</strong>
                      <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", fontSize: "0.9rem" }}>
                        {serpAnalysis.analysis.quickWins.slice(0, 5).map((win, i) => (
                          <li key={i} style={{ marginBottom: "0.25rem" }}>{win}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Keyword Strategy */}
                  {serpAnalysis.analysis?.keywordStrategy && (
                    <div style={{ marginBottom: "1rem" }}>
                      {serpAnalysis.analysis.keywordStrategy.secondaryKeywords?.length > 0 && (
                        <div style={{ marginBottom: "0.75rem" }}>
                          <strong>Secondary Keywords:</strong>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
                            {serpAnalysis.analysis.keywordStrategy.secondaryKeywords.slice(0, 10).map((kw, i) => (
                              <span key={i} style={{
                                padding: "0.25rem 0.5rem",
                                background: "#e0e7ff",
                                borderRadius: "4px",
                                fontSize: "0.8rem",
                                color: "#4338ca",
                              }}>{kw}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {serpAnalysis.analysis.keywordStrategy.longTailOpportunities?.length > 0 && (
                        <div>
                          <strong>Long-tail Opportunities:</strong>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
                            {serpAnalysis.analysis.keywordStrategy.longTailOpportunities.slice(0, 8).map((kw, i) => (
                              <span key={i} style={{
                                padding: "0.25rem 0.5rem",
                                background: "#dcfce7",
                                borderRadius: "4px",
                                fontSize: "0.8rem",
                                color: "#166534",
                              }}>{kw}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Related Searches */}
                  {serpAnalysis.serpData?.relatedSearches && serpAnalysis.serpData.relatedSearches.length > 0 && (
                    <div style={{ marginBottom: "1rem" }}>
                      <strong>Related Searches:</strong>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
                        {serpAnalysis.serpData.relatedSearches.slice(0, 10).map((search, i) => (
                          <span key={i} style={{
                            padding: "0.25rem 0.5rem",
                            background: "#fef3c7",
                            borderRadius: "4px",
                            fontSize: "0.8rem",
                            color: "#92400e",
                            cursor: "pointer",
                          }}
                          onClick={() => {
                            setSerpKeyword(search.query);
                          }}
                          title="Click to analyze this keyword"
                          >{search.query}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Risk Factors & Timeline */}
                  {(serpAnalysis.analysis?.riskFactors?.length || serpAnalysis.analysis?.estimatedTimeToRank) && (
                    <div style={{ marginTop: "1rem", padding: "1rem", background: "#f9fafb", borderRadius: "8px" }}>
                      {serpAnalysis.analysis.estimatedTimeToRank && (
                        <div style={{ marginBottom: "0.5rem" }}>
                          <strong>Estimated Time to Rank:</strong> {serpAnalysis.analysis.estimatedTimeToRank}
                        </div>
                      )}
                      {serpAnalysis.analysis.riskFactors && serpAnalysis.analysis.riskFactors.length > 0 && (
                        <div>
                          <strong>Risk Factors:</strong>
                          <ul style={{ margin: "0.25rem 0 0", paddingLeft: "1.25rem", fontSize: "0.85rem", color: "var(--text-muted, #666)" }}>
                            {serpAnalysis.analysis.riskFactors.slice(0, 3).map((risk, i) => (
                              <li key={i}>{risk}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Technical SEO */}
                  {serpAnalysis.analysis?.technicalSEO && (
                    <div style={{ marginTop: "1rem", fontSize: "0.85rem", color: "var(--text-muted, #666)" }}>
                      <strong>Technical Notes:</strong>
                      <div style={{ marginTop: "0.25rem" }}>
                        Mobile: {serpAnalysis.analysis.technicalSEO.mobileOptimization} |
                        Speed: {serpAnalysis.analysis.technicalSEO.pageSpeedImportance}
                        {serpAnalysis.analysis.technicalSEO.schemaMarkupRecommended?.length > 0 && (
                          <span> | Schema: {serpAnalysis.analysis.technicalSEO.schemaMarkupRecommended.slice(0, 2).join(", ")}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Library Section */}
          {activeSection === "library" && (
            <div className={styles.sectionContent}>
              <div className={styles.libraryHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Page Library</h2>
                  <p className={styles.sectionDescription}>
                    {pageLibrary.length} saved pages and content
                  </p>
                </div>
              </div>

              {/* Filter and Sort Controls */}
              <div className={styles.libraryControls}>
                <div className={styles.libraryFilters}>
                  <button
                    type="button"
                    onClick={() => setLibraryFilter("all")}
                    className={`${styles.filterBtn} ${libraryFilter === "all" ? styles.active : ""}`}
                  >
                    All ({pageLibrary.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLibraryFilter("blog_post")}
                    className={`${styles.filterBtn} ${libraryFilter === "blog_post" ? styles.active : ""}`}
                  >
                    Blogs ({pageLibrary.filter(p => p.type === "blog_post").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLibraryFilter("service_page")}
                    className={`${styles.filterBtn} ${libraryFilter === "service_page" ? styles.active : ""}`}
                  >
                    Services ({pageLibrary.filter(p => p.type === "service_page").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLibraryFilter("location_page")}
                    className={`${styles.filterBtn} ${libraryFilter === "location_page" ? styles.active : ""}`}
                  >
                    Locations ({pageLibrary.filter(p => p.type === "location_page").length})
                  </button>
                </div>
                <div className={styles.librarySort}>
                  <label>Sort by:</label>
                  <select
                    value={librarySort}
                    onChange={(e) => setLibrarySort(e.target.value as LibrarySort)}
                    className={styles.sortSelect}
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="title">Title A-Z</option>
                  </select>
                </div>
              </div>

              {pageLibrary.length === 0 ? (
                <div className={styles.libraryEmpty}>
                  <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                  <h3>No pages yet</h3>
                  <p>Generated pages will appear here. Start creating content!</p>
                  <button
                    type="button"
                    onClick={() => setActiveSection("create")}
                    className={styles.primaryBtn}
                  >
                    Create Content
                  </button>
                </div>
              ) : (
                <div className={styles.libraryGrid}>
                  {pageLibrary
                    .filter(page => libraryFilter === "all" || page.type === libraryFilter)
                    .sort((a, b) => {
                      if (librarySort === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                      if (librarySort === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                      return a.title.localeCompare(b.title);
                    })
                    .map((page) => (
                    <div key={page.id} className={styles.libraryCard}>
                      <div className={styles.libraryCardHeader}>
                        <span className={`${styles.libraryTypeBadge} ${styles[page.type.replace("_", "")]}`}>
                          {page.type === "blog_post" ? "Blog" : page.type === "service_page" ? "Service" : page.type === "location_page" ? "Location" : page.type.replace("_", " ")}
                        </span>
                        <span className={`${styles.libraryStatusBadge} ${styles[page.status]}`}>
                          {page.status}
                        </span>
                      </div>
                      <h4 className={styles.libraryCardTitle}>{page.title}</h4>
                      <p className={styles.libraryCardKeyword}>{page.primaryKeyword}</p>
                      <div className={styles.libraryCardMeta}>
                        <span>{new Date(page.createdAt).toLocaleDateString()}</span>
                        {page.publishedUrl && (
                          <a href={page.publishedUrl} target="_blank" rel="noreferrer" className={styles.viewLink}>
                            View Live
                          </a>
                        )}
                      </div>
                      <div className={styles.libraryCardActions}>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm("Delete this page?")) {
                              const updated = pageLibrary.filter(p => p.id !== page.id);
                              setPageLibrary(updated);
                              localStorage.setItem("pageLibrary", JSON.stringify(updated));
                              showToast("success", "Page Deleted", "The page has been removed from your library.");
                            }
                          }}
                          className={styles.deleteBtn}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Knowledge Base Section */}
          {activeSection === "knowledge" && (
            <div className={styles.sectionContent}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Knowledge Base</h2>
                  <p className={styles.sectionDescription}>
                    The core knowledge hub for AI content generation - add your website, documents, and brand info
                  </p>
                </div>
                {knowledgeBase.entries.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAggregateKnowledge}
                    disabled={knowledgeBase.isScraping}
                    className={styles.primaryBtn}
                  >
                    {knowledgeBase.isScraping ? "Processing..." : "Aggregate All Knowledge"}
                  </button>
                )}
              </div>

              {/* Progress/Status Message */}
              {knowledgeBase.scanProgress && (
                <div className={styles.knowledgeStatus}>
                  {knowledgeBase.scanProgress}
                </div>
              )}

              <div className={styles.knowledgeSection}>
                {/* Sitemap Scanner */}
                <div className={styles.knowledgeCard}>
                  <h3>Scan Website Sitemap</h3>
                  <p>Enter your sitemap URL to scan and extract knowledge from all pages. The AI will analyze each page for services, USPs, tone, and brand elements.</p>
                  <div className={styles.knowledgeInputGroup}>
                    <input
                      type="url"
                      value={knowledgeBase.sitemapUrl}
                      onChange={(e) => setKnowledgeBase(prev => ({ ...prev, sitemapUrl: e.target.value }))}
                      placeholder="https://example.com/sitemap.xml"
                      className={styles.knowledgeInput}
                    />
                    <button
                      type="button"
                      onClick={handleScanSitemap}
                      disabled={knowledgeBase.isScanning || !knowledgeBase.sitemapUrl}
                      className={styles.knowledgeBtn}
                    >
                      {knowledgeBase.isScanning ? "Scanning..." : "Scan Sitemap"}
                    </button>
                  </div>

                  {/* Sitemap Preview */}
                  {knowledgeBase.sitemapPreview.length > 0 && (
                    <div className={styles.sitemapPreview}>
                      <div className={styles.sitemapHeader}>
                        <span>Found {knowledgeBase.sitemapPreview.length} URLs</span>
                        <button
                          type="button"
                          onClick={() => setKnowledgeBase(prev => ({
                            ...prev,
                            selectedUrls: prev.sitemapPreview.map(e => e.url),
                          }))}
                          className={styles.selectAllBtn}
                        >
                          Select All
                        </button>
                      </div>
                      <div className={styles.sitemapList}>
                        {knowledgeBase.sitemapPreview.slice(0, 20).map((entry, i) => (
                          <label key={i} className={styles.sitemapItem}>
                            <input
                              type="checkbox"
                              checked={knowledgeBase.selectedUrls.includes(entry.url)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setKnowledgeBase(prev => ({ ...prev, selectedUrls: [...prev.selectedUrls, entry.url] }));
                                } else {
                                  setKnowledgeBase(prev => ({ ...prev, selectedUrls: prev.selectedUrls.filter(u => u !== entry.url) }));
                                }
                              }}
                            />
                            <span className={styles.sitemapUrl}>{entry.url}</span>
                          </label>
                        ))}
                      </div>
                      {knowledgeBase.selectedUrls.length > 0 && (
                        <button
                          type="button"
                          onClick={handleScrapeSelectedUrls}
                          disabled={knowledgeBase.isScraping}
                          className={styles.primaryBtn}
                        >
                          {knowledgeBase.isScraping ? "Scraping..." : `Scrape ${knowledgeBase.selectedUrls.length} Pages`}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Single URL Scraper */}
                <div className={styles.knowledgeCard}>
                  <h3>Add Single URL</h3>
                  <p>Scrape a specific webpage to extract knowledge. Great for competitor pages, industry resources, or reference content.</p>
                  <div className={styles.knowledgeInputGroup}>
                    <input
                      type="url"
                      value={knowledgeBase.urlToAdd}
                      onChange={(e) => setKnowledgeBase(prev => ({ ...prev, urlToAdd: e.target.value }))}
                      placeholder="https://example.com/page"
                      className={styles.knowledgeInput}
                    />
                    <button
                      type="button"
                      onClick={handleAddSingleUrl}
                      disabled={knowledgeBase.isScraping || !knowledgeBase.urlToAdd}
                      className={styles.knowledgeBtn}
                    >
                      {knowledgeBase.isScraping ? "Adding..." : "Add URL"}
                    </button>
                  </div>
                </div>

                {/* File Upload */}
                <div className={styles.knowledgeCard}>
                  <h3>Upload Files</h3>
                  <p>Upload PDFs, images, or documents containing company information, brochures, or brand guidelines.</p>
                  <label className={styles.fileUploadLabel}>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx"
                      onChange={handleFileUpload}
                      style={{ display: "none" }}
                    />
                    <span className={styles.fileUploadBtn}>
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      Choose File
                    </span>
                  </label>
                </div>

                {/* Plain Text Input */}
                <div className={styles.knowledgeCard}>
                  <h3>Add Text Knowledge</h3>
                  <p>Paste company descriptions, about us content, testimonials, or any text the AI should know about.</p>
                  <input
                    type="text"
                    value={knowledgeBase.textTitle}
                    onChange={(e) => setKnowledgeBase(prev => ({ ...prev, textTitle: e.target.value }))}
                    placeholder="Entry title (e.g., About Us, Company History)"
                    className={styles.knowledgeInput}
                    style={{ marginBottom: "0.5rem" }}
                  />
                  <textarea
                    value={knowledgeBase.textToAdd}
                    onChange={(e) => setKnowledgeBase(prev => ({ ...prev, textToAdd: e.target.value }))}
                    placeholder="Paste your company information, brand guidelines, testimonials, or any relevant text..."
                    className={styles.knowledgeTextarea}
                    rows={4}
                  />
                  <button
                    type="button"
                    onClick={handleAddText}
                    disabled={knowledgeBase.isScraping || !knowledgeBase.textToAdd}
                    className={styles.knowledgeBtn}
                    style={{ marginTop: "0.5rem" }}
                  >
                    {knowledgeBase.isScraping ? "Processing..." : "Add Text"}
                  </button>
                </div>

                {/* Knowledge Entries List */}
                {knowledgeBase.entries.length > 0 && (
                  <div className={styles.knowledgeCard}>
                    <h3>Knowledge Sources ({knowledgeBase.entries.length})</h3>
                    <div className={styles.knowledgeEntries}>
                      {knowledgeBase.entries.map((entry) => (
                        <div key={entry.id} className={styles.knowledgeEntry}>
                          <div className={styles.entryHeader}>
                            <span className={styles.entryType}>{entry.type}</span>
                            <span className={styles.entryTitle}>{entry.title}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveKnowledgeEntry(entry.id)}
                              className={styles.entryRemove}
                            >
                              &times;
                            </button>
                          </div>
                          <div className={styles.entrySource}>{entry.source}</div>
                          {entry.extractedData && (
                            <div className={styles.entryExtracted}>
                              {entry.extractedData.services && entry.extractedData.services.length > 0 && (
                                <span>Services: {entry.extractedData.services.length}</span>
                              )}
                              {entry.extractedData.keywords && entry.extractedData.keywords.length > 0 && (
                                <span>Keywords: {entry.extractedData.keywords.length}</span>
                              )}
                              {entry.extractedData.tone && (
                                <span>Tone: Detected</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Aggregated Knowledge */}
                {knowledgeBase.aggregatedData && (
                  <div className={styles.knowledgeCard} style={{ background: "linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)" }}>
                    <h3>Aggregated Knowledge</h3>
                    <p>Combined insights from all sources ({knowledgeBase.entries.length} sources analyzed)</p>

                    {knowledgeBase.aggregatedData.tone && (
                      <div className={styles.aggregatedSection}>
                        <strong>Brand Tone:</strong>
                        <p>{knowledgeBase.aggregatedData.tone}</p>
                      </div>
                    )}

                    {knowledgeBase.aggregatedData.services.length > 0 && (
                      <div className={styles.aggregatedSection}>
                        <strong>Services ({knowledgeBase.aggregatedData.services.length}):</strong>
                        <div className={styles.aggregatedTags}>
                          {knowledgeBase.aggregatedData.services.map((s, i) => (
                            <span key={i} className={styles.aggregatedTag}>{s}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {knowledgeBase.aggregatedData.usps.length > 0 && (
                      <div className={styles.aggregatedSection}>
                        <strong>USPs ({knowledgeBase.aggregatedData.usps.length}):</strong>
                        <ul className={styles.knowledgeList}>
                          {knowledgeBase.aggregatedData.usps.map((u, i) => (
                            <li key={i}>{u}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {knowledgeBase.aggregatedData.locations.length > 0 && (
                      <div className={styles.aggregatedSection}>
                        <strong>Locations ({knowledgeBase.aggregatedData.locations.length}):</strong>
                        <div className={styles.aggregatedTags}>
                          {knowledgeBase.aggregatedData.locations.map((l, i) => (
                            <span key={i} className={styles.aggregatedTag}>{l}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {knowledgeBase.aggregatedData.keywords.length > 0 && (
                      <div className={styles.aggregatedSection}>
                        <strong>Keywords ({knowledgeBase.aggregatedData.keywords.length}):</strong>
                        <div className={styles.aggregatedTags}>
                          {knowledgeBase.aggregatedData.keywords.slice(0, 20).map((k, i) => (
                            <span key={i} className={styles.aggregatedTag}>{k}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Original Company Profile Cards */}
                <div className={styles.knowledgeCard}>
                  <h3>Company Profile</h3>
                  <p>Data from your company profile setup.</p>
                  {companyProfile.name ? (
                    <div className={styles.knowledgeItems}>
                      <div className={styles.knowledgeItem}>
                        <strong>Company Name:</strong> {companyProfile.name}
                      </div>
                      {companyProfile.website && (
                        <div className={styles.knowledgeItem}>
                          <strong>Website:</strong> {companyProfile.website}
                        </div>
                      )}
                      {companyProfile.headquarters && (
                        <div className={styles.knowledgeItem}>
                          <strong>Location:</strong> {companyProfile.headquarters}, {companyProfile.state}
                        </div>
                      )}
                      {companyProfile.services.length > 0 && (
                        <div className={styles.knowledgeItem}>
                          <strong>Services:</strong> {companyProfile.services.length} defined
                        </div>
                      )}
                      {companyProfile.usps.length > 0 && (
                        <div className={styles.knowledgeItem}>
                          <strong>USPs:</strong> {companyProfile.usps.length} defined
                        </div>
                      )}
                      {companyProfile.cities.length > 0 && (
                        <div className={styles.knowledgeItem}>
                          <strong>Service Areas:</strong> {companyProfile.cities.length} cities
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className={styles.knowledgeEmpty}>
                      <a onClick={() => router.push("/settings/company")} style={{ cursor: "pointer", color: "var(--primary-color)" }}>
                        Set up your company profile first
                      </a>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Schedule Calendar Section */}
          {activeSection === "schedule" && (
            <div className={styles.sectionContent}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Schedule Calendar</h2>
                  <p className={styles.sectionDescription}>
                    Drag and drop blogs onto calendar dates to schedule publishing
                  </p>
                </div>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={loadScheduleData}
                  disabled={isScheduleLoading}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 4 23 10 17 10"/>
                    <polyline points="1 20 1 14 7 14"/>
                    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                  </svg>
                  Refresh
                </button>
              </div>

              <Suspense fallback={
                <div className={styles.loadingSpinner}>
                  <div className={styles.spinner} />
                  <p>Loading calendar...</p>
                </div>
              }>
                <ScheduleCalendar
                  scheduledBlogs={scheduledBlogs}
                  unscheduledBlogs={unscheduledBlogs}
                  onSchedule={handleScheduleBlog}
                  onUnschedule={handleUnscheduleBlog}
                  isLoading={isScheduleLoading}
                />
              </Suspense>
            </div>
          )}

          {/* SEO Heatmap Section */}
          {activeSection === "seo-heatmap" && (
            <div className={styles.sectionContent}>
              <Suspense fallback={
                <div className={styles.loadingSpinner}>
                  <div className={styles.spinner} />
                  <p>Loading SEO Heatmap...</p>
                </div>
              }>
                <SEOHeatmap />
              </Suspense>
            </div>
          )}

          {/* AI Automation Section */}
          {activeSection === "automation" && (
            <div className={styles.sectionContent}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>AI Automation</h2>
                  <p className={styles.sectionDescription}>
                    Batch generate content, manage the queue, and configure AI automation settings
                  </p>
                </div>
              </div>

              <div className={styles.automationLayout}>
                {/* Usage Meter Sidebar */}
                <div className={styles.automationSidebar}>
                  <Suspense fallback={
                    <div className={styles.loadingSpinner}>
                      <div className={styles.spinner} />
                    </div>
                  }>
                    <UsageMeter />
                  </Suspense>

                  {/* Quick Actions */}
                  <div className={styles.quickActionsCard}>
                    <h3 className={styles.quickActionsTitle}>Quick Actions</h3>
                    <div className={styles.quickActionsList}>
                      <button
                        type="button"
                        className={styles.quickActionBtn}
                        onClick={() => setShowBatchGenerator(true)}
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="7" height="7" rx="1"/>
                          <rect x="14" y="3" width="7" height="7" rx="1"/>
                          <rect x="3" y="14" width="7" height="7" rx="1"/>
                          <rect x="14" y="14" width="7" height="7" rx="1"/>
                        </svg>
                        Batch Generate
                      </button>
                      <button
                        type="button"
                        className={styles.quickActionBtn}
                        onClick={() => setShowQueueDashboard(true)}
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="8" y1="6" x2="21" y2="6"/>
                          <line x1="8" y1="12" x2="21" y2="12"/>
                          <line x1="8" y1="18" x2="21" y2="18"/>
                          <line x1="3" y1="6" x2="3.01" y2="6"/>
                          <line x1="3" y1="12" x2="3.01" y2="12"/>
                          <line x1="3" y1="18" x2="3.01" y2="18"/>
                        </svg>
                        View Queue
                      </button>
                    </div>
                  </div>
                </div>

                {/* Settings Panel */}
                <div className={styles.automationMain}>
                  <Suspense fallback={
                    <div className={styles.loadingSpinner}>
                      <div className={styles.spinner} />
                      <p>Loading settings...</p>
                    </div>
                  }>
                    <AutomationSettings
                      onOpenBatchGenerator={() => setShowBatchGenerator(true)}
                      onOpenSiteBuilder={() => setShowSiteBuilder(true)}
                      onOpenQueueDashboard={() => setShowQueueDashboard(true)}
                    />
                  </Suspense>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Batch Generator Modal */}
        <Suspense fallback={null}>
          <BatchGenerator
            isOpen={showBatchGenerator}
            onClose={() => setShowBatchGenerator(false)}
            onSuccess={() => {
              setShowBatchGenerator(false);
              setShowQueueDashboard(true);
            }}
          />
        </Suspense>

        {/* Queue Dashboard Modal */}
        <Suspense fallback={null}>
          <QueueDashboard
            isOpen={showQueueDashboard}
            onClose={() => setShowQueueDashboard(false)}
            onViewDraft={(draftId) => {
              setShowQueueDashboard(false);
              // Navigate to library section to view draft
              setActiveSection("library");
            }}
          />
        </Suspense>

        {/* Site Builder Wizard Modal */}
        <Suspense fallback={null}>
          <SiteBuilderWizard
            isOpen={showSiteBuilder}
            onClose={() => setShowSiteBuilder(false)}
            onSuccess={() => {
              setShowSiteBuilder(false);
              // Optionally navigate to queue to see generated pages
              setShowQueueDashboard(true);
            }}
          />
        </Suspense>

        {state.error && (
          <div className={styles.errorContainer}>
            <p className={styles.error}>{state.error}</p>
          </div>
        )}

        {state.htmlContent && (
          <div className={styles.outputSection}>
            <div className={styles.outputHeader}>
              <h2>Generated Blog Post</h2>
              <div className={styles.buttonGroup}>
                <button onClick={handleCopyToClipboard} className={styles.actionButton}>
                  {state.copiedToClipboard ? "Copied!" : "Copy HTML"}
                </button>
                <button onClick={handleDownloadHTML} className={styles.actionButton}>
                  Download HTML
                </button>
                <button onClick={handleDownloadMarkdown} className={`${styles.actionButton} ${styles.primaryAction}`}>
                  Download MD
                </button>
              </div>
            </div>

            {/* Publish Section - Shows when either platform is connected */}
            {(wordpress.isConnected || (gohighlevel.isConnected && gohighlevel.blogId)) && (
              <div className={styles.publishSection}>
                <div className={styles.publishHeader}>
                  <h3>Publish Blog</h3>
                  {state.featuredImageId && publishSettings.platform === "wordpress" && (
                    <span className={styles.featuredImageBadge}>Featured image set</span>
                  )}
                </div>

                {/* Platform Selector */}
                <div className={styles.formGroup}>
                  <label>Publish To:</label>
                  <div className={styles.publishActionButtons}>
                    {wordpress.isConnected && (
                      <button
                        type="button"
                        onClick={() => setPublishSettings(prev => ({ ...prev, platform: "wordpress", categoryId: null }))}
                        className={`${styles.publishActionBtn} ${publishSettings.platform === "wordpress" ? styles.active : ""}`}
                      >
                        WordPress
                      </button>
                    )}
                    {gohighlevel.isConnected && gohighlevel.blogId && (
                      <button
                        type="button"
                        onClick={() => setPublishSettings(prev => ({ ...prev, platform: "gohighlevel", categoryId: null }))}
                        className={`${styles.publishActionBtn} ${publishSettings.platform === "gohighlevel" ? styles.active : ""}`}
                      >
                        GoHighLevel
                      </button>
                    )}
                  </div>
                </div>

                {publishSettings.platform !== "none" && (
                  <div className={styles.publishOptions}>
                    <div className={styles.publishActionButtons}>
                      <button
                        type="button"
                        onClick={() => setPublishSettings(prev => ({ ...prev, action: "draft" }))}
                        className={`${styles.publishActionBtn} ${publishSettings.action === "draft" ? styles.active : ""}`}
                      >
                        Save Draft
                      </button>
                      <button
                        type="button"
                        onClick={() => setPublishSettings(prev => ({ ...prev, action: "publish" }))}
                        className={`${styles.publishActionBtn} ${publishSettings.action === "publish" ? styles.active : ""}`}
                      >
                        Publish Now
                      </button>
                      {publishSettings.platform === "wordpress" && (
                        <button
                          type="button"
                          onClick={() => setPublishSettings(prev => ({ ...prev, action: "schedule" }))}
                          className={`${styles.publishActionBtn} ${publishSettings.action === "schedule" ? styles.active : ""}`}
                        >
                          Schedule
                        </button>
                      )}
                    </div>

                    {publishSettings.action === "schedule" && publishSettings.platform === "wordpress" && (
                      <div className={styles.scheduleInputs}>
                        <div className={styles.formGroup}>
                          <label htmlFor="scheduledDate">Date</label>
                          <input
                            type="date"
                            id="scheduledDate"
                            name="scheduledDate"
                            value={publishSettings.scheduledDate}
                            onChange={handlePublishSettingsChange}
                            min={getMinDate()}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label htmlFor="scheduledTime">Time</label>
                          <input
                            type="time"
                            id="scheduledTime"
                            name="scheduledTime"
                            value={publishSettings.scheduledTime}
                            onChange={handlePublishSettingsChange}
                          />
                        </div>
                      </div>
                    )}

                    {/* WordPress Categories */}
                    {publishSettings.platform === "wordpress" && categories.length > 0 && (
                      <div className={styles.formGroup}>
                        <label htmlFor="categoryId">Category</label>
                        <select
                          id="categoryId"
                          name="categoryId"
                          value={publishSettings.categoryId || ""}
                          onChange={handlePublishSettingsChange}
                        >
                          <option value="">No category</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* GoHighLevel Categories */}
                    {publishSettings.platform === "gohighlevel" && ghlCategories.length > 0 && (
                      <div className={styles.formGroup}>
                        <label htmlFor="ghlCategoryId">Category</label>
                        <select
                          id="ghlCategoryId"
                          name="categoryId"
                          value={publishSettings.categoryId || ""}
                          onChange={(e) => setPublishSettings(prev => ({ ...prev, categoryId: e.target.value || null }))}
                        >
                          <option value="">No category</option>
                          {ghlCategories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {publishSettings.platform !== "none" && publishSettings.action !== "none" && (
                  <button
                    type="button"
                    onClick={handlePublish}
                    disabled={isPublishing || (publishSettings.action === "schedule" && !publishSettings.scheduledDate)}
                    className={styles.publishButton}
                  >
                    {isPublishing
                      ? "Publishing..."
                      : publishSettings.action === "draft"
                      ? `Save Draft to ${publishSettings.platform === "wordpress" ? "WordPress" : "GoHighLevel"}`
                      : publishSettings.action === "schedule"
                      ? `Schedule for ${publishSettings.scheduledDate || "..."}`
                      : `Publish Now to ${publishSettings.platform === "wordpress" ? "WordPress" : "GoHighLevel"}`}
                  </button>
                )}

                {state.publishedPost && (
                  <div className={styles.publishedInfo}>
                    <p>
                      {state.publishedPost.status === "future" ? "Scheduled" : state.publishedPost.status === "draft" ? "Draft saved" : "Published"}!{" "}
                      <a href={state.publishedPost.link} target="_blank" rel="noopener noreferrer">
                        View Post
                      </a>
                    </p>
                  </div>
                )}
              </div>
            )}

            {state.seoData && (
              <div className={styles.seoSection}>
                <div className={styles.seoHeader}>
                  <h3>SEO Data</h3>
                  <button
                    type="button"
                    onClick={() => setShowSEOSidebar(true)}
                    className={styles.seoAnalyzeBtn}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Full Analysis
                  </button>
                </div>

                {/* SERP Preview */}
                <div className={styles.serpPreview}>
                  <div className={styles.serpLabel}>Google Search Preview</div>
                  <div className={styles.serpResult}>
                    <div className={styles.serpUrl}>
                      {formData.location ? `yoursite.com › ${formData.location.toLowerCase().replace(/\s+/g, '-')}` : 'yoursite.com › blog'}
                    </div>
                    <div className={styles.serpTitle}>{state.seoData.metaTitle || 'Page Title'}</div>
                    <div className={styles.serpDescription}>{state.seoData.metaDescription || 'Meta description will appear here...'}</div>
                  </div>
                  <div className={styles.serpStats}>
                    <span className={state.seoData.metaTitle.length <= 60 ? styles.serpGood : styles.serpWarning}>
                      Title: {state.seoData.metaTitle.length}/60
                    </span>
                    <span className={state.seoData.metaDescription.length <= 160 ? styles.serpGood : styles.serpWarning}>
                      Description: {state.seoData.metaDescription.length}/160
                    </span>
                  </div>
                </div>

                {/* Editable SEO Fields */}
                <div className={styles.seoGrid}>
                  <div className={styles.seoItem}>
                    <label>Primary Keyword</label>
                    <input
                      type="text"
                      value={state.seoData.primaryKeyword}
                      onChange={(e) => setState(prev => ({
                        ...prev,
                        seoData: prev.seoData ? { ...prev.seoData, primaryKeyword: e.target.value } : null
                      }))}
                      className={styles.seoInput}
                      placeholder="Enter primary keyword"
                    />
                  </div>
                  <div className={styles.seoItem}>
                    <label>Secondary Keywords</label>
                    <input
                      type="text"
                      value={state.seoData.secondaryKeywords.join(", ")}
                      onChange={(e) => setState(prev => ({
                        ...prev,
                        seoData: prev.seoData ? { ...prev.seoData, secondaryKeywords: e.target.value.split(",").map(k => k.trim()).filter(Boolean) } : null
                      }))}
                      className={styles.seoInput}
                      placeholder="keyword1, keyword2, keyword3"
                    />
                  </div>
                  <div className={styles.seoItem}>
                    <label>
                      Meta Title
                      <span className={`${styles.charCount} ${state.seoData.metaTitle.length > 60 ? styles.charWarning : ''}`}>
                        {state.seoData.metaTitle.length}/60
                      </span>
                    </label>
                    <input
                      type="text"
                      value={state.seoData.metaTitle}
                      onChange={(e) => setState(prev => ({
                        ...prev,
                        seoData: prev.seoData ? { ...prev.seoData, metaTitle: e.target.value } : null
                      }))}
                      className={`${styles.seoInput} ${state.seoData.metaTitle.length > 60 ? styles.inputWarning : ''}`}
                      placeholder="Enter meta title"
                    />
                  </div>
                  <div className={styles.seoItem}>
                    <label>
                      Meta Description
                      <span className={`${styles.charCount} ${state.seoData.metaDescription.length > 160 ? styles.charWarning : ''}`}>
                        {state.seoData.metaDescription.length}/160
                      </span>
                    </label>
                    <textarea
                      value={state.seoData.metaDescription}
                      onChange={(e) => setState(prev => ({
                        ...prev,
                        seoData: prev.seoData ? { ...prev.seoData, metaDescription: e.target.value } : null
                      }))}
                      className={`${styles.seoTextarea} ${state.seoData.metaDescription.length > 160 ? styles.inputWarning : ''}`}
                      placeholder="Enter meta description"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Content Preview/Editor Section */}
            <div className={styles.contentSection}>
              <div className={styles.contentHeader}>
                <h3>{isEditing ? "Edit Content" : "Content Preview"}</h3>
                <div className={styles.contentActions}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isEditing) {
                        setEditedContent(state.htmlContent || "");
                      }
                      setIsEditing(!isEditing);
                    }}
                    className={`${styles.editToggleBtn} ${isEditing ? styles.active : ""}`}
                  >
                    {isEditing ? "Exit Editor" : "Edit Content"}
                  </button>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        setState((prev) => ({ ...prev, htmlContent: editedContent }));
                        setIsEditing(false);
                      }}
                      className={styles.saveEditBtn}
                    >
                      Save Changes
                    </button>
                  )}
                  {/* SEO Analysis Toggle */}
                  <SEOSidebarToggle
                    score={seoScore?.overall}
                    onClick={() => setShowSEOSidebar(true)}
                  />
                </div>
              </div>

              {isEditing ? (
                <Suspense fallback={<div className={styles.editorLoading}>Loading editor...</div>}>
                  <RichTextEditor
                    content={editedContent}
                    onChange={setEditedContent}
                    onSave={() => {
                      setState((prev) => ({ ...prev, htmlContent: editedContent }));
                      setIsEditing(false);
                    }}
                  />
                </Suspense>
              ) : (
                <div className={styles.htmlPreview}>
                  <div className={styles.imageClickHint}>
                    <span>Click any image to edit with AI</span>
                  </div>
                  <div
                    className={styles.clickableImages}
                    onClick={handleImageClick}
                    dangerouslySetInnerHTML={{ __html: state.htmlContent }}
                  />
                </div>
              )}
            </div>

            <details className={styles.codeDetails}>
              <summary>View Raw HTML</summary>
              <pre className={styles.codeBlock}>
                <code>{isEditing ? editedContent : state.htmlContent}</code>
              </pre>
            </details>
          </div>
        )}

        {!state.htmlContent && !state.error && !state.isLoading && (
          <div className={styles.placeholderSection}>
            <p>Fill in the form above and click "Generate Blog"</p>
            <div className={styles.featuresList}>
              <h3>How It Works:</h3>
              <ul>
                <li><strong>🔍 Research</strong> - Deep SEO research and competitor analysis</li>
                <li><strong>📐 Structure</strong> - AI designs structured, SEO-optimized outlines</li>
                <li><strong>📸 Images</strong> - Creates stunning, context-aware images for each section</li>
                <li><strong>👁️ Quality Review</strong> - Dual quality review ensures high standards</li>
                <li><strong>🖼️ Enhancement</strong> - Remakes images that don't meet quality standards</li>
                <li><strong>✍️ Writing</strong> - AI crafts polished, engaging blog content</li>
                <li><strong>🔧 Formatting</strong> - Clean HTML code ready for WordPress</li>
                <li><strong>📤 Publishing</strong> - Publish, schedule, or save drafts directly</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p>Powered by Advanced AI Technology</p>
      </footer>

      {/* SEO Planner Modal */}
      {showSEOPlanner && seoPlan && (
        <div className={styles.modalOverlay} onClick={() => setShowSEOPlanner(false)}>
          <div className={styles.seoPlannerModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>SEO Content Plan for {seoPlan.companyProfile.name}</h2>
              <div className={styles.modalActions}>
                <button onClick={exportSEOPlanToCSV} className={styles.exportButton}>
                  Export CSV
                </button>
                <button onClick={() => setShowSEOPlanner(false)} className={styles.closeButton}>
                  ×
                </button>
              </div>
            </div>

            <div className={styles.seoPlanTabs}>
              <button
                className={`${styles.seoPlanTab} ${seoPlanTab === "pillar" ? styles.active : ""}`}
                onClick={() => setSeoPlanTab("pillar")}
              >
                Pillar Pages ({seoPlan.pillarPages.length})
              </button>
              <button
                className={`${styles.seoPlanTab} ${seoPlanTab === "blogs" ? styles.active : ""}`}
                onClick={() => setSeoPlanTab("blogs")}
              >
                Blog Topics ({seoPlan.blogTopics.length})
              </button>
              <button
                className={`${styles.seoPlanTab} ${seoPlanTab === "keywords" ? styles.active : ""}`}
                onClick={() => setSeoPlanTab("keywords")}
              >
                Keywords ({seoPlan.keywords.length})
              </button>
              <button
                className={`${styles.seoPlanTab} ${seoPlanTab === "calendar" ? styles.active : ""}`}
                onClick={() => setSeoPlanTab("calendar")}
              >
                Calendar ({seoPlan.calendar.length})
              </button>
              <button
                className={`${styles.seoPlanTab} ${seoPlanTab === "recommendations" ? styles.active : ""}`}
                onClick={() => setSeoPlanTab("recommendations")}
              >
                Recommendations
              </button>
            </div>

            <div className={styles.seoPlanContent}>
              {/* Pillar Pages Tab */}
              {seoPlanTab === "pillar" && (
                <div className={styles.pillarPagesGrid}>
                  {seoPlan.pillarPages.map((page, i) => (
                    <div key={i} className={`${styles.pillarCard} ${styles[`priority${page.priority}`]}`}>
                      <div className={styles.pillarHeader}>
                        <span className={styles.pillarCity}>{page.city}</span>
                        <span className={styles.pillarPriority}>{page.priority}</span>
                      </div>
                      <div className={styles.pillarMeta}>
                        <strong>URL:</strong> {page.url}
                      </div>
                      <div className={styles.pillarMeta}>
                        <strong>H1:</strong> {page.h1}
                      </div>
                      <div className={styles.pillarMeta}>
                        <strong>Keyword:</strong> {page.primaryKeyword}
                      </div>
                      <div className={styles.pillarMeta}>
                        <strong>Est. Volume:</strong> {page.volume}/mo
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Blog Topics Tab */}
              {seoPlanTab === "blogs" && (
                <div className={styles.blogTopicsTable}>
                  <table>
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Title</th>
                        <th>Priority</th>
                        <th>Words</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seoPlan.blogTopics.map((topic, i) => (
                        <tr key={i} className={styles[`priority${topic.priority}`]}>
                          <td>{topic.category}</td>
                          <td>{topic.title}</td>
                          <td>{topic.priority}</td>
                          <td>{topic.wordCount}</td>
                          <td>
                            <button
                              className={styles.generateTopicBtn}
                              onClick={() => {
                                setPageConfig(prev => ({
                                  ...prev,
                                  topic: topic.title,
                                  title: topic.title,
                                }));
                                setGenerationMode("page");
                                setSelectedPageType("blog_post");
                                setShowSEOPlanner(false);
                              }}
                            >
                              Generate
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Keywords Tab */}
              {seoPlanTab === "keywords" && (
                <div className={styles.keywordsTable}>
                  <table>
                    <thead>
                      <tr>
                        <th>Keyword</th>
                        <th>City</th>
                        <th>Category</th>
                        <th>Volume</th>
                        <th>Difficulty</th>
                        <th>Intent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seoPlan.keywords.slice(0, 50).map((kw, i) => (
                        <tr key={i}>
                          <td>{kw.keyword}</td>
                          <td>{kw.city}</td>
                          <td>{kw.category}</td>
                          <td>{kw.volume}</td>
                          <td>{kw.difficulty}</td>
                          <td>{kw.intent}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {seoPlan.keywords.length > 50 && (
                    <p className={styles.tableNote}>Showing 50 of {seoPlan.keywords.length} keywords. Export CSV for full list.</p>
                  )}
                </div>
              )}

              {/* Calendar Tab */}
              {seoPlanTab === "calendar" && (
                <div className={styles.calendarTable}>
                  <table>
                    <thead>
                      <tr>
                        <th>Week</th>
                        <th>Date</th>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Priority</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seoPlan.calendar.map((entry, i) => (
                        <tr key={i} className={styles[`priority${entry.priority}`]}>
                          <td>{entry.week}</td>
                          <td>{entry.date}</td>
                          <td>{entry.title}</td>
                          <td>{entry.category || "-"}</td>
                          <td>{entry.priority}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Recommendations Tab */}
              {seoPlanTab === "recommendations" && (
                <div className={styles.recommendationsList}>
                  {seoPlan.recommendations.map((rec, i) => (
                    <div key={i} className={styles.recommendationItem}>
                      <span className={styles.recNumber}>{i + 1}</span>
                      <p>{rec}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Page Library Modal */}
      {showPageLibrary && (
        <div className={styles.modalOverlay} onClick={() => setShowPageLibrary(false)}>
          <div className={styles.pageLibraryModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Page Library ({pageLibrary.length} pages)</h2>
              <div className={styles.modalActions}>
                <button onClick={() => setShowPageLibrary(false)} className={styles.closeButton}>
                  ×
                </button>
              </div>
            </div>

            <div className={styles.pageLibraryContent}>
              {pageLibrary.length === 0 ? (
                <div className={styles.emptyLibrary}>
                  <p>No pages in your library yet.</p>
                  <p>Generate pages and save them to build your internal linking structure.</p>
                </div>
              ) : (
                <div className={styles.pageLibraryList}>
                  {pageLibrary.map((page) => (
                    <div key={page.id} className={styles.pageLibraryItem}>
                      <div className={styles.pageLibraryHeader}>
                        <span className={styles.pageTypeIcon}>{PAGE_TYPES[page.type]?.icon || "📄"}</span>
                        <div className={styles.pageLibraryInfo}>
                          <h4>{page.title}</h4>
                          <span className={styles.pageUrl}>{page.url}</span>
                        </div>
                        <span className={`${styles.pageStatus} ${styles[`status${page.status}`]}`}>
                          {page.status}
                        </span>
                      </div>
                      <div className={styles.pageLibraryMeta}>
                        <span><strong>Keyword:</strong> {page.primaryKeyword}</span>
                        <span><strong>Type:</strong> {PAGE_TYPES[page.type]?.label || page.type}</span>
                        <span><strong>Created:</strong> {new Date(page.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className={styles.pageLibraryActions}>
                        {page.publishedUrl && (
                          <a href={page.publishedUrl} target="_blank" rel="noopener noreferrer" className={styles.viewPageBtn}>
                            View Published
                          </a>
                        )}
                        <button
                          onClick={() => {
                            setPageConfig(prev => ({
                              ...prev,
                              title: page.title,
                              primaryKeyword: page.primaryKeyword,
                              secondaryKeywords: page.secondaryKeywords,
                            }));
                            setSelectedPageType(page.type);
                            setGenerationMode("page");
                            setShowPageLibrary(false);
                          }}
                          className={styles.regenerateBtn}
                        >
                          Regenerate
                        </button>
                        <button
                          onClick={() => removePageFromLibrary(page.id)}
                          className={styles.deletePageBtn}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.pageLibraryFooter}>
              <p className={styles.libraryHelp}>
                Tip: Use the Page Library to maintain internal linking consistency across your website.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content Hub Modal */}
      {showContentHub && (
        <div className={styles.modalOverlay} onClick={() => setShowContentHub(false)}>
          <div className={styles.contentHubModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Content Hub - Suggested Content</h2>
              <div className={styles.modalActions}>
                <button onClick={() => setShowContentHub(false)} className={styles.closeButton}>
                  ×
                </button>
              </div>
            </div>

            <div className={styles.contentHubContent}>
              {!companyResearch || !companyResearch.suggestedContent?.length ? (
                <div className={styles.emptyContentHub}>
                  <div className={styles.emptyIcon}>🔍</div>
                  <p><strong>No research data available</strong></p>
                  <p>Use the Research button in the Company Profile section to analyze your website and get content suggestions.</p>
                </div>
              ) : (
                <>
                  {/* Research Summary */}
                  <div className={styles.researchSummary}>
                    <div className={styles.summaryCard}>
                      <h4>Pages Analyzed</h4>
                      <div className={styles.summaryValue}>{companyResearch.pagesAnalyzed?.length || 0}</div>
                    </div>
                    <div className={styles.summaryCard}>
                      <h4>Keywords Found</h4>
                      <div className={styles.summaryValue}>{companyResearch.keywords?.length || 0}</div>
                    </div>
                    <div className={styles.summaryCard}>
                      <h4>Content Ideas</h4>
                      <div className={styles.summaryValue}>{companyResearch.suggestedContent?.length || 0}</div>
                    </div>
                    <div className={styles.summaryCard}>
                      <h4>Last Updated</h4>
                      <div className={styles.summaryValue}>
                        {companyResearch.researchedAt
                          ? new Date(companyResearch.researchedAt).toLocaleDateString()
                          : "N/A"}
                      </div>
                      <div className={styles.summarySubtext}>
                        {companyResearch.researchedAt
                          ? (() => {
                              const days = Math.floor(
                                (Date.now() - new Date(companyResearch.researchedAt).getTime()) / (1000 * 60 * 60 * 24)
                              );
                              return days > 30 ? "Consider refreshing" : `${days} days ago`;
                            })()
                          : ""}
                      </div>
                    </div>
                  </div>

                  {/* SEO Insights */}
                  {companyResearch.seoInsights && (
                    <div className={styles.seoInsightsSection}>
                      <h3>SEO Insights</h3>
                      <div className={styles.insightsGrid}>
                        {companyResearch.seoInsights.missingPages?.length > 0 && (
                          <div className={styles.insightCard}>
                            <h4>Missing Pages</h4>
                            <ul>
                              {companyResearch.seoInsights.missingPages.slice(0, 5).map((page, i) => (
                                <li key={i}>{page}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {companyResearch.seoInsights.contentGaps?.length > 0 && (
                          <div className={styles.insightCard}>
                            <h4>Content Gaps</h4>
                            <ul>
                              {companyResearch.seoInsights.contentGaps.slice(0, 5).map((gap, i) => (
                                <li key={i}>{gap}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {companyResearch.seoInsights.localSEOOpportunities?.length > 0 && (
                          <div className={styles.insightCard}>
                            <h4>Local SEO Opportunities</h4>
                            <ul>
                              {companyResearch.seoInsights.localSEOOpportunities.slice(0, 5).map((opp, i) => (
                                <li key={i}>{opp}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Suggested Content */}
                  <div className={styles.suggestedContentSection}>
                    <h3>Suggested Content ({companyResearch.suggestedContent?.length || 0})</h3>

                    {/* Filter Buttons */}
                    <div className={styles.contentFilterRow}>
                      <button
                        className={`${styles.filterBtn} ${contentFilter === "all" ? styles.active : ""}`}
                        onClick={() => setContentFilter("all")}
                      >
                        All
                      </button>
                      <button
                        className={`${styles.filterBtn} ${contentFilter === "blog" ? styles.active : ""}`}
                        onClick={() => setContentFilter("blog")}
                      >
                        Blogs
                      </button>
                      <button
                        className={`${styles.filterBtn} ${contentFilter === "service_page" ? styles.active : ""}`}
                        onClick={() => setContentFilter("service_page")}
                      >
                        Service Pages
                      </button>
                      <button
                        className={`${styles.filterBtn} ${contentFilter === "location_page" ? styles.active : ""}`}
                        onClick={() => setContentFilter("location_page")}
                      >
                        Location Pages
                      </button>
                    </div>

                    {/* Content List */}
                    <div className={styles.suggestedContentList}>
                      {companyResearch.suggestedContent
                        ?.filter((item) => contentFilter === "all" || item.type === contentFilter)
                        .map((item, index) => (
                          <div
                            key={index}
                            className={`${styles.suggestedContentItem} ${styles[`priority${item.priority}`]}`}
                          >
                            <div className={`${styles.contentTypeIcon} ${styles[item.type]}`}>
                              {item.type === "blog" ? "📝" : item.type === "service_page" ? "🔧" : "📍"}
                            </div>
                            <div className={styles.contentInfo}>
                              <h4>{item.title}</h4>
                              <div className={styles.contentKeyword}>Keyword: {item.primaryKeyword}</div>
                              <div className={styles.contentReason}>{item.reason}</div>
                            </div>
                            <span className={`${styles.contentPriority} ${styles[item.priority]}`}>
                              {item.priority}
                            </span>
                            <button
                              className={styles.generateContentBtn}
                              onClick={() => {
                                // Set up form for generation
                                if (item.type === "blog") {
                                  setGenerationMode("blog");
                                  setFormData((prev) => ({
                                    ...prev,
                                    topic: item.title,
                                    primaryKeyword: item.primaryKeyword,
                                    secondaryKeywords: "",
                                  }));
                                } else {
                                  setGenerationMode("page");
                                  setSelectedPageType(item.type as PageType);
                                  setPageConfig((prev) => ({
                                    ...prev,
                                    title: item.title,
                                    primaryKeyword: item.primaryKeyword,
                                    secondaryKeywords: [],
                                  }));
                                }
                                setShowContentHub(false);
                              }}
                            >
                              Generate
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Perplexity Research Results Modal */}
      {showResearchModal && perplexityResearch && (
        <div className={styles.modalOverlay} onClick={() => setShowResearchModal(false)}>
          <div className={styles.researchModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Deep SEO Research Results</h2>
              <button onClick={() => setShowResearchModal(false)} className={styles.closeButton}>
                ×
              </button>
            </div>

            <div className={styles.researchModalContent}>
              {/* Raw response fallback */}
              {perplexityResearch.rawResponse && !perplexityResearch.keywords && (
                <div className={styles.rawResearchResponse}>
                  <pre>{perplexityResearch.rawResponse}</pre>
                </div>
              )}

              {/* Keywords Section */}
              {perplexityResearch.keywords && (
                <div className={styles.researchSection}>
                  <h3>Keyword Research</h3>

                  {perplexityResearch.keywords.primary?.length > 0 && (
                    <div className={styles.keywordGroup}>
                      <h4>Primary Keywords</h4>
                      <div className={styles.keywordTable}>
                        <div className={styles.keywordTableHeader}>
                          <span>Keyword</span>
                          <span>Volume</span>
                          <span>Difficulty</span>
                          <span>Intent</span>
                        </div>
                        {perplexityResearch.keywords.primary.map((kw, idx) => (
                          <div key={idx} className={styles.keywordTableRow}>
                            <span>{kw.keyword}</span>
                            <span>{kw.volume}</span>
                            <span>{kw.difficulty}</span>
                            <span>{kw.intent}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {perplexityResearch.keywords.longTail?.length > 0 && (
                    <div className={styles.keywordGroup}>
                      <h4>Long-Tail Keywords</h4>
                      <div className={styles.tagList}>
                        {perplexityResearch.keywords.longTail.map((kw, idx) => (
                          <span key={idx} className={styles.tag}>{kw}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {perplexityResearch.keywords.questions?.length > 0 && (
                    <div className={styles.keywordGroup}>
                      <h4>People Also Ask</h4>
                      <ul className={styles.questionList}>
                        {perplexityResearch.keywords.questions.map((q, idx) => (
                          <li key={idx}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {perplexityResearch.keywords.local?.length > 0 && (
                    <div className={styles.keywordGroup}>
                      <h4>Local Keywords</h4>
                      <div className={styles.tagList}>
                        {perplexityResearch.keywords.local.map((kw, idx) => (
                          <span key={idx} className={styles.tag}>{kw}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Competitors Section */}
              {perplexityResearch.competitors && perplexityResearch.competitors.length > 0 && (
                <div className={styles.researchSection}>
                  <h3>Competitor Analysis</h3>
                  <div className={styles.competitorList}>
                    {perplexityResearch.competitors.map((comp, idx) => (
                      <div key={idx} className={styles.competitorCard}>
                        <h4>{comp.name}</h4>
                        <a href={comp.website} target="_blank" rel="noopener noreferrer">{comp.website}</a>
                        <p><strong>Strategy:</strong> {comp.strategy}</p>
                        {comp.gaps?.length > 0 && (
                          <div>
                            <strong>Gaps:</strong>
                            <ul>
                              {comp.gaps.map((gap, gIdx) => (
                                <li key={gIdx}>{gap}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Strategy Section */}
              {perplexityResearch.contentStrategy && (
                <div className={styles.researchSection}>
                  <h3>Content Strategy</h3>

                  {perplexityResearch.contentStrategy.formats?.length > 0 && (
                    <div className={styles.strategyGroup}>
                      <h4>Recommended Formats</h4>
                      <div className={styles.tagList}>
                        {perplexityResearch.contentStrategy.formats.map((fmt, idx) => (
                          <span key={idx} className={styles.tag}>{fmt}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {perplexityResearch.contentStrategy.uniqueAngles?.length > 0 && (
                    <div className={styles.strategyGroup}>
                      <h4>Unique Angles</h4>
                      <ul>
                        {perplexityResearch.contentStrategy.uniqueAngles.map((angle, idx) => (
                          <li key={idx}>{angle}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {perplexityResearch.contentStrategy.statistics?.length > 0 && (
                    <div className={styles.strategyGroup}>
                      <h4>Key Statistics</h4>
                      <ul>
                        {perplexityResearch.contentStrategy.statistics.map((stat, idx) => (
                          <li key={idx}>{stat.stat} <em>({stat.source})</em></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Local SEO Section */}
              {perplexityResearch.localSEO && (
                <div className={styles.researchSection}>
                  <h3>Local SEO Opportunities</h3>

                  {perplexityResearch.localSEO.keywords?.length > 0 && (
                    <div className={styles.localGroup}>
                      <h4>Local Keywords</h4>
                      <div className={styles.tagList}>
                        {perplexityResearch.localSEO.keywords.map((kw, idx) => (
                          <span key={idx} className={styles.tag}>{kw}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {perplexityResearch.localSEO.gbpTips?.length > 0 && (
                    <div className={styles.localGroup}>
                      <h4>Google Business Profile Tips</h4>
                      <ul>
                        {perplexityResearch.localSEO.gbpTips.map((tip, idx) => (
                          <li key={idx}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {perplexityResearch.localSEO.citations?.length > 0 && (
                    <div className={styles.localGroup}>
                      <h4>Citation Opportunities</h4>
                      <ul>
                        {perplexityResearch.localSEO.citations.map((citation, idx) => (
                          <li key={idx}>{citation}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Technical SEO Section */}
              {perplexityResearch.technical && (
                <div className={styles.researchSection}>
                  <h3>Technical Recommendations</h3>

                  {perplexityResearch.technical.schemaTypes?.length > 0 && (
                    <div className={styles.technicalGroup}>
                      <h4>Schema Markup</h4>
                      <div className={styles.tagList}>
                        {perplexityResearch.technical.schemaTypes.map((schema, idx) => (
                          <span key={idx} className={styles.tag}>{schema}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {perplexityResearch.technical.internalLinking?.length > 0 && (
                    <div className={styles.technicalGroup}>
                      <h4>Internal Linking Strategy</h4>
                      <ul>
                        {perplexityResearch.technical.internalLinking.map((link, idx) => (
                          <li key={idx}>{link}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {perplexityResearch.technical.featuredSnippetOpportunities?.length > 0 && (
                    <div className={styles.technicalGroup}>
                      <h4>Featured Snippet Opportunities</h4>
                      <ul>
                        {perplexityResearch.technical.featuredSnippetOpportunities.map((opp, idx) => (
                          <li key={idx}>{opp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Action Plan */}
              {perplexityResearch.actionPlan && perplexityResearch.actionPlan.length > 0 && (
                <div className={styles.researchSection}>
                  <h3>Action Plan</h3>
                  <ol className={styles.actionPlan}>
                    {perplexityResearch.actionPlan.map((action, idx) => (
                      <li key={idx}>{action}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Setup Wizard */}
      {showSetupWizard && hasCheckedSetup && (
        <div className={styles.wizardOverlay}>
          <div className={styles.wizardModal}>
            <div className={styles.wizardHeader}>
              <div className={styles.wizardLogo}>
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#667eea" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h2 className={styles.wizardTitle}>
                {wizardStep === "welcome" && "Welcome to Blog Generator"}
                {wizardStep === "researching" && "Analyzing Your Website"}
                {wizardStep === "review" && "Review Your Profile"}
              </h2>
              <p className={styles.wizardSubtitle}>
                {wizardStep === "welcome" && "Let's set up your company profile to generate personalized content"}
                {wizardStep === "researching" && "Our AI is extracting information from your website"}
                {wizardStep === "review" && "Confirm or edit the information we found"}
              </p>
            </div>

            <div className={styles.wizardBody}>
              {/* Step 1: Welcome - Enter Website */}
              {wizardStep === "welcome" && (
                <div className={styles.wizardStep}>
                  <h3 className={styles.wizardStepTitle}>Enter Your Website</h3>
                  <p className={styles.wizardStepDescription}>
                    We&apos;ll analyze your website to auto-fill your company profile, including services, location, and contact information.
                  </p>

                  {wizardError && (
                    <div className={styles.wizardError}>{wizardError}</div>
                  )}

                  <input
                    type="url"
                    value={wizardWebsite}
                    onChange={(e) => setWizardWebsite(e.target.value)}
                    placeholder="https://yourcompany.com"
                    className={styles.wizardInput}
                    onKeyDown={(e) => e.key === "Enter" && handleWizardResearch()}
                  />

                  <div className={styles.wizardActions}>
                    <button
                      type="button"
                      onClick={handleWizardResearch}
                      disabled={!wizardWebsite.trim()}
                      className={`${styles.wizardBtn} ${styles.wizardBtnPrimary}`}
                    >
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                      </svg>
                      Analyze Website
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleWizardSkip}
                    className={styles.wizardSkip}
                  >
                    Skip for now, I&apos;ll set up manually
                  </button>
                </div>
              )}

              {/* Step 2: Researching */}
              {wizardStep === "researching" && (
                <div className={styles.wizardLoading}>
                  <div className={styles.wizardSpinner}></div>
                  <p className={styles.wizardLoadingText}>Analyzing {wizardWebsite}</p>
                  <p className={styles.wizardLoadingSubtext}>This may take 15-30 seconds...</p>
                </div>
              )}

              {/* Step 3: Review */}
              {wizardStep === "review" && (
                <div className={styles.wizardStep}>
                  <div className={styles.wizardReviewGrid}>
                    <div className={styles.wizardReviewFull}>
                      <div className={styles.wizardReviewLabel}>Company Name</div>
                      <div className={styles.wizardReviewValue}>
                        <input
                          type="text"
                          value={companyProfile.name}
                          onChange={(e) => setCompanyProfile(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter company name"
                        />
                      </div>
                    </div>

                    <div className={styles.wizardReviewSection}>
                      <div className={styles.wizardReviewLabel}>Industry</div>
                      <div className={styles.wizardReviewValue}>
                        <select
                          value={companyProfile.industryType}
                          onChange={(e) => setCompanyProfile(prev => ({ ...prev, industryType: e.target.value }))}
                        >
                          <option value="">Select industry...</option>
                          {getIndustryOptions().map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className={styles.wizardReviewSection}>
                      <div className={styles.wizardReviewLabel}>Location</div>
                      <div className={styles.wizardReviewValue}>
                        <input
                          type="text"
                          value={companyProfile.headquarters}
                          onChange={(e) => setCompanyProfile(prev => ({ ...prev, headquarters: e.target.value }))}
                          placeholder="City, State"
                        />
                      </div>
                    </div>

                    <div className={styles.wizardReviewSection}>
                      <div className={styles.wizardReviewLabel}>Phone</div>
                      <div className={styles.wizardReviewValue}>
                        <input
                          type="tel"
                          value={companyProfile.phone}
                          onChange={(e) => setCompanyProfile(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>

                    <div className={styles.wizardReviewSection}>
                      <div className={styles.wizardReviewLabel}>Email</div>
                      <div className={styles.wizardReviewValue}>
                        <input
                          type="email"
                          value={companyProfile.email}
                          onChange={(e) => setCompanyProfile(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="info@company.com"
                        />
                      </div>
                    </div>
                  </div>

                  <div className={styles.wizardDivider}></div>

                  <div className={styles.wizardReviewSection}>
                    <div className={styles.wizardReviewLabel}>Services (comma-separated)</div>
                    <div className={styles.wizardReviewValue}>
                      <input
                        type="text"
                        value={companyProfile.services?.join(", ") || ""}
                        onChange={(e) => setCompanyProfile(prev => ({
                          ...prev,
                          services: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                        }))}
                        placeholder="Service 1, Service 2, Service 3"
                      />
                    </div>
                  </div>

                  <div className={styles.wizardActions}>
                    <button
                      type="button"
                      onClick={() => setWizardStep("welcome")}
                      className={`${styles.wizardBtn} ${styles.wizardBtnSecondary}`}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleWizardComplete}
                      className={`${styles.wizardBtn} ${styles.wizardBtnPrimary}`}
                    >
                      Save & Continue
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Edit Modal */}
      <Suspense fallback={null}>
        <ImageEditModal
          isOpen={imageEditModal.isOpen}
          imageUrl={imageEditModal.imageUrl}
          imageSrc={imageEditModal.imageSrc}
          onClose={() => setImageEditModal({ isOpen: false, imageUrl: "", imageSrc: "" })}
          onSave={handleImageSave}
        />
      </Suspense>

      {/* SEO Analysis Sidebar */}
      <SEOAnalysisSidebar
        content={isEditing ? editedContent : (state.htmlContent || "")}
        title={formData.metaTitle || formData.topic}
        metaDescription={formData.metaDescription}
        primaryKeyword={formData.primaryKeyword}
        secondaryKeywords={formData.secondaryKeywords ? formData.secondaryKeywords.split(",").map((k) => k.trim()).filter(Boolean) : []}
        url={pageConfig.slug ? `/${pageConfig.slug}` : undefined}
        siteName={companyProfile.name || "Your Site"}
        isOpen={showSEOSidebar}
        onClose={() => setShowSEOSidebar(false)}
      />

      {/* Toast Notifications */}
      <div className={styles.toastContainer}>
        {toasts.map((toast) => (
          <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
            <span className={styles.toastIcon}>
              {toast.type === "success" && "✓"}
              {toast.type === "error" && "✕"}
              {toast.type === "info" && "ℹ"}
            </span>
            <div className={styles.toastContent}>
              <strong className={styles.toastTitle}>{toast.title}</strong>
              <p className={styles.toastMessage}>{toast.message}</p>
            </div>
            <button
              type="button"
              className={styles.toastClose}
              onClick={() => removeToast(toast.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
