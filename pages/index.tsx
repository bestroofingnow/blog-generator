// pages/index.tsx
import React, { useState, useEffect } from "react";
import styles from "../styles/Home.module.css";
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

type ImageMode = "auto" | "manual" | "enhance";

interface UserImage {
  id: string;
  url: string; // Can be URL or base64 data URI
  caption?: string;
}

interface FormData {
  topic: string;
  location: string;
  blogType: string;
  numberOfSections: number;
  tone: string;
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

// Google Search Console types
interface GoogleSearchConsoleSettings {
  accessToken: string;
  refreshToken: string;
  email: string;
  connectedAt: string;
  selectedSite: string;
}

interface GSCKeyword {
  keyword: string;
  clicks: number;
  impressions: number;
  ctr: string;
  position: string;
}

interface GSCSite {
  url: string;
  displayName: string;
  permissionLevel: string;
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
  const [formData, setFormData] = useState<FormData>({
    topic: "",
    location: "",
    blogType: "Neighborhood Guide",
    numberOfSections: 5,
    tone: "professional yet friendly",
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

  // Google Search Console state
  const [gscSettings, setGscSettings] = useState<GoogleSearchConsoleSettings | null>(null);
  const [gscSites, setGscSites] = useState<GSCSite[]>([]);
  const [gscKeywords, setGscKeywords] = useState<GSCKeyword[]>([]);
  const [isLoadingGSC, setIsLoadingGSC] = useState(false);

  // Perplexity Research state
  const [perplexityResearch, setPerplexityResearch] = useState<PerplexityResearch | null>(null);
  const [isResearchingPerplexity, setIsResearchingPerplexity] = useState(false);
  const [showResearchModal, setShowResearchModal] = useState(false);

  // Page Library state
  const [pageLibrary, setPageLibrary] = useState<PageEntry[]>([]);
  const [showPageLibrary, setShowPageLibrary] = useState(false);

  const [testingConnection, setTestingConnection] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [isResearchingCompany, setIsResearchingCompany] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [researchData, setResearchData] = useState<ResearchData | null>(null);

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

  // Load Company Profile from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("companyProfile");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCompanyProfile(parsed);
        // Also set cities input from saved cities
        if (parsed.cities?.length > 0) {
          setCitiesInput(parsed.cities.join(", "));
        }
        // Sync with form's companyName and companyWebsite
        if (parsed.name) {
          setFormData(prev => ({ ...prev, companyName: parsed.name, companyWebsite: parsed.website || "" }));
        }
      } catch {
        // Invalid saved data
      }
    }
  }, []);

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

  // Load Google Search Console settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("gscSettings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setGscSettings(parsed);
      } catch {
        // Invalid saved data
      }
    }
  }, []);

  // Handle GSC OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const gscConnected = urlParams.get("gsc_connected");
    const gscData = urlParams.get("gsc_data");
    const gscError = urlParams.get("gsc_error");

    if (gscError) {
      console.error("GSC connection error:", gscError);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (gscConnected === "true" && gscData) {
      try {
        const decoded = JSON.parse(atob(gscData));
        const settings: GoogleSearchConsoleSettings = {
          accessToken: decoded.access_token,
          refreshToken: decoded.refresh_token || "",
          email: decoded.email || "",
          connectedAt: decoded.connected_at || new Date().toISOString(),
          selectedSite: "",
        };
        setGscSettings(settings);
        localStorage.setItem("gscSettings", JSON.stringify(settings));

        // Fetch available sites
        fetchGSCSites(settings.accessToken);

        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {
        console.error("Failed to parse GSC data:", e);
      }
    }
  }, []);

  // Fetch GSC sites
  const fetchGSCSites = async (accessToken: string) => {
    setIsLoadingGSC(true);
    try {
      const response = await fetch("/api/search-console-sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken }),
      });

      if (response.ok) {
        const data = await response.json();
        setGscSites(data.sites || []);
      }
    } catch (error) {
      console.error("Failed to fetch GSC sites:", error);
    } finally {
      setIsLoadingGSC(false);
    }
  };

  // Fetch GSC keywords for selected site
  const fetchGSCKeywords = async () => {
    if (!gscSettings?.accessToken || !gscSettings?.selectedSite) return;

    setIsLoadingGSC(true);
    try {
      const response = await fetch("/api/search-console", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: gscSettings.accessToken,
          refreshToken: gscSettings.refreshToken,
          siteUrl: gscSettings.selectedSite,
          rowLimit: 50,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGscKeywords(data.keywords || []);

        // Update access token if refreshed
        if (data.newAccessToken) {
          const updatedSettings = { ...gscSettings, accessToken: data.newAccessToken };
          setGscSettings(updatedSettings);
          localStorage.setItem("gscSettings", JSON.stringify(updatedSettings));
        }
      }
    } catch (error) {
      console.error("Failed to fetch GSC keywords:", error);
    } finally {
      setIsLoadingGSC(false);
    }
  };

  // Disconnect GSC
  const disconnectGSC = () => {
    setGscSettings(null);
    setGscSites([]);
    setGscKeywords([]);
    localStorage.removeItem("gscSettings");
  };

  // Perplexity Deep Research
  const runPerplexityResearch = async (researchType: string = "comprehensive") => {
    if (!formData.topic && !formData.primaryKeyword) {
      alert("Please enter a topic or primary keyword first");
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
      } else {
        const error = await response.json();
        alert(`Research failed: ${error.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Perplexity research error:", error);
      alert("Research failed. Please try again.");
    } finally {
      setIsResearchingPerplexity(false);
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

  // Save Company Profile to localStorage
  const saveCompanyProfile = () => {
    localStorage.setItem("companyProfile", JSON.stringify(companyProfile));
    // Also update form's company info
    setFormData(prev => ({ ...prev, companyName: companyProfile.name, companyWebsite: companyProfile.website }));
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
      alert("Please set up your Company Profile first (click 'Show Company Profile')");
      return;
    }

    setIsGeneratingPage(true);
    setState(prev => ({
      ...prev,
      progress: { step: "outline", message: "Archie is designing your page structure..." },
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
      alert(`Page generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
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
      alert("Please set up your Company Profile first");
      return;
    }

    if (companyProfile.cities.length === 0) {
      alert("Please add at least one service area (city) to your Company Profile");
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
      } else {
        alert(`Failed to generate SEO plan: ${data.error}`);
      }
    } catch (error) {
      alert(`SEO Plan generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
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
        setWordpress((prev) => ({ ...prev, isConnected: true }));
        saveWordPressSettings();
        alert(`Connected successfully to ${data.siteName || wordpress.siteUrl}`);
      } else {
        alert(`Connection failed: ${data.error}`);
      }
    } catch {
      alert("Connection test failed");
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
        setGoHighLevel((prev) => ({ ...prev, isConnected: true }));
        setGhlBlogs(data.blogs || []);
        saveGHLSettings();
        alert(`Connected successfully! Found ${data.blogs?.length || 0} blog(s)`);
      } else {
        alert(`Connection failed: ${data.error}`);
      }
    } catch {
      alert("Connection test failed");
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
    setIsResearching(true);
    try {
      const response = await fetch("/api/research-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: formData.topic,
          location: formData.location,
          companyName: formData.companyName,
          companyWebsite: formData.companyWebsite,
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
      } else {
        alert(`Research failed: ${data.error}`);
      }
    } catch (error) {
      alert("Keyword research failed");
    }
    setIsResearching(false);
  };

  // Deep research company website to auto-fill profile
  const handleResearchCompany = async () => {
    if (!companyProfile.website) {
      alert("Please enter a website URL first");
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
        alert(`Successfully researched ${research.name || "company"}! Analyzed ${pagesCount} pages and found ${suggestedCount} content suggestions. Check the Content Hub for recommendations.`);
      } else {
        alert(`Research failed: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Company research error:", error);
      alert("Failed to research website. Please try again.");
    }
    setIsResearchingCompany(false);
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

        const statusMessage = data.post.status === "future"
          ? "Post scheduled successfully!"
          : data.post.status === "draft"
          ? "Draft saved successfully!"
          : "Post published successfully!";
        alert(`${statusMessage}\n\nView: ${data.post.link}`);
      } else {
        alert(`Failed to publish: ${data.error}`);
      }
    } catch (error) {
      alert("Failed to publish to WordPress");
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

        const statusMessage = data.post.status === "draft"
          ? "Draft saved successfully!"
          : "Post published successfully!";
        alert(`${statusMessage}\n\nView: ${data.post.url}`);
      } else {
        alert(`Failed to publish: ${data.error}`);
      }
    } catch (error) {
      alert("Failed to publish to GoHighLevel");
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
      progress: { step: "outline", message: "Archie is designing your blog structure..." },
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
          throw new Error(`HTTP error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No response body");
        }

        let buffer = "";
        let finalData: { success?: boolean; htmlContent?: string; seoData?: SEOData; featuredImageId?: number; error?: string } = {};

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
                  setState((prev) => ({
                    ...prev,
                    progress: { step: data.step, message: data.message },
                  }));
                } else if (data.type === "complete") {
                  finalData = data;
                } else if (data.type === "error") {
                  throw new Error(data.error);
                }
              } catch (parseError) {
                // Ignore parse errors for incomplete data
              }
            }
          }
        }

        if (!finalData.success) {
          throw new Error(finalData.error || "Failed to generate blog");
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
      }
    } catch (error) {
      setState({
        isLoading: false,
        error: error instanceof Error ? error.message : "An unknown error occurred",
        htmlContent: null,
        seoData: null,
        featuredImageId: null,
        copiedToClipboard: false,
        progress: { step: "idle", message: "" },
        publishedPost: null,
      });
    }
  };

  const handleCopyToClipboard = () => {
    if (state.htmlContent) {
      navigator.clipboard.writeText(state.htmlContent);
      setState((prev) => ({ ...prev, copiedToClipboard: true }));
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

  // Get minimum date for scheduling (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>AI Blog Generator</h1>
        <p>Multi-AI orchestrated blog creation with real images</p>
      </header>

      <main className={styles.main}>
        <div className={styles.formSection}>
          <form onSubmit={handleGenerateBlog} className={styles.form}>
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

                {/* Google Search Console Integration */}
                <div className={styles.gscSection}>
                  <h4>Google Search Console</h4>
                  {!gscSettings?.accessToken ? (
                    <div className={styles.gscNotConnected}>
                      <p>Connect to view your real keyword performance data</p>
                      <button
                        type="button"
                        onClick={() => window.location.href = "/api/auth/google"}
                        className={styles.gscConnectBtn}
                      >
                        <span className={styles.googleIcon}>G</span>
                        Connect Google Search Console
                      </button>
                    </div>
                  ) : (
                    <div className={styles.gscConnected}>
                      <div className={styles.gscHeader}>
                        <span className={styles.gscEmail}>{gscSettings.email}</span>
                        <button
                          type="button"
                          onClick={disconnectGSC}
                          className={styles.gscDisconnectBtn}
                        >
                          Disconnect
                        </button>
                      </div>

                      {gscSites.length > 0 && (
                        <div className={styles.gscSiteSelect}>
                          <label>Select Site:</label>
                          <select
                            value={gscSettings.selectedSite || ""}
                            onChange={(e) => {
                              const updatedSettings = { ...gscSettings, selectedSite: e.target.value };
                              setGscSettings(updatedSettings);
                              localStorage.setItem("gscSettings", JSON.stringify(updatedSettings));
                              if (e.target.value) {
                                fetchGSCKeywords();
                              }
                            }}
                          >
                            <option value="">Choose a site...</option>
                            {gscSites.map((site) => (
                              <option key={site.url} value={site.url}>
                                {site.displayName}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {gscSettings.selectedSite && (
                        <button
                          type="button"
                          onClick={fetchGSCKeywords}
                          disabled={isLoadingGSC}
                          className={styles.gscRefreshBtn}
                        >
                          {isLoadingGSC ? "Loading..." : "Refresh Keywords"}
                        </button>
                      )}

                      {gscKeywords.length > 0 && (
                        <div className={styles.gscKeywordsList}>
                          <h5>Top Keywords (Last 28 days)</h5>
                          <div className={styles.gscKeywordsTable}>
                            <div className={styles.gscKeywordsHeader}>
                              <span>Keyword</span>
                              <span>Clicks</span>
                              <span>Impressions</span>
                              <span>CTR</span>
                              <span>Position</span>
                            </div>
                            {gscKeywords.slice(0, 10).map((kw, idx) => (
                              <div key={idx} className={styles.gscKeywordRow}>
                                <span className={styles.gscKeywordText}>{kw.keyword}</span>
                                <span>{kw.clicks}</span>
                                <span>{kw.impressions}</span>
                                <span>{kw.ctr}</span>
                                <span>{kw.position}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Perplexity Deep Research */}
                <div className={styles.perplexitySection}>
                  <h4>Deep SEO Research</h4>
                  <p>Powered by Perplexity AI for comprehensive market research</p>
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

            {/* Generation Mode Toggle */}
            <div className={styles.modeToggleRow}>
              <div className={styles.modeToggle}>
                <button
                  type="button"
                  onClick={() => setGenerationMode("blog")}
                  className={`${styles.modeBtn} ${generationMode === "blog" ? styles.active : ""}`}
                >
                  Blog Post
                </button>
                <button
                  type="button"
                  onClick={() => setGenerationMode("page")}
                  className={`${styles.modeBtn} ${generationMode === "page" ? styles.active : ""}`}
                >
                  Website Page
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowPageLibrary(true)}
                className={styles.libraryButton}
                title="View Page Library"
              >
                <span className={styles.libraryIcon}>📚</span>
                {pageLibrary.length > 0 && <span className={styles.libraryCount}>{pageLibrary.length}</span>}
              </button>
            </div>

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
              <>
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
                {isResearching ? "Sherlock is investigating..." : "Research Keywords & SEO"}
              </button>
              <small>Sherlock analyzes competitors and suggests optimal keywords</small>
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
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="useOrchestration"
                  checked={formData.useOrchestration}
                  onChange={handleInputChange}
                />
                <span>Use AI Orchestration (Multi-AI via Vercel AI Gateway)</span>
              </label>
              <small className={styles.hint}>
                {formData.useOrchestration
                  ? "Archie (outlines) + Picasso (images) + Penelope (content) + Felix (formatting)"
                  : "Single AI mode (faster, no image generation)"}
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
                  Felix and Penelope review images, Mona remakes any that don't meet quality standards (slower but better results)
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
                  {formData.imageMode === "auto" && "Picasso will generate unique images for your blog"}
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
                    <span style={{ margin: "0 0.5rem", color: "#666" }}>or</span>
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
              </>
            )}
          </form>

          {/* Progress Indicator */}
          {(state.isLoading || isGeneratingPage) && (
            <div className={styles.progressSection}>
              <div className={styles.progressSteps}>
                <div className={`${styles.progressStep} ${["research", "outline", "images", "content", "format", "upload", "publishing", "complete"].includes(state.progress.step) ? styles.active : ""}`}>
                  <span className={styles.stepNumber}>1</span>
                  <span>Outline</span>
                  <small>Archie</small>
                </div>
                <div className={`${styles.progressStep} ${["images", "content", "format", "upload", "publishing", "complete"].includes(state.progress.step) ? styles.active : ""}`}>
                  <span className={styles.stepNumber}>2</span>
                  <span>Images</span>
                  <small>Picasso</small>
                </div>
                <div className={`${styles.progressStep} ${["content", "format", "upload", "publishing", "complete"].includes(state.progress.step) ? styles.active : ""}`}>
                  <span className={styles.stepNumber}>3</span>
                  <span>Content</span>
                  <small>Penelope</small>
                </div>
                <div className={`${styles.progressStep} ${["format", "upload", "publishing", "complete"].includes(state.progress.step) ? styles.active : ""}`}>
                  <span className={styles.stepNumber}>4</span>
                  <span>Format</span>
                  <small>Felix</small>
                </div>
                <div className={`${styles.progressStep} ${["upload", "publishing", "complete"].includes(state.progress.step) ? styles.active : ""}`}>
                  <span className={styles.stepNumber}>5</span>
                  <span>Upload</span>
                  <small>WordPress</small>
                </div>
              </div>
              <p className={styles.progressMessage}>{state.progress.message}</p>
            </div>
          )}
        </div>

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
                  HTML
                </button>
                <button
                  onClick={handleDownloadCSV}
                  className={`${styles.actionButton} ${styles.primaryAction}`}
                >
                  Download CSV
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
                <h3>SEO Data</h3>
                <div className={styles.seoGrid}>
                  <div className={styles.seoItem}>
                    <label>Primary Keyword:</label>
                    <span>{state.seoData.primaryKeyword}</span>
                  </div>
                  <div className={styles.seoItem}>
                    <label>Secondary Keywords:</label>
                    <span>{state.seoData.secondaryKeywords.join(", ")}</span>
                  </div>
                  <div className={styles.seoItem}>
                    <label>Meta Title:</label>
                    <span>{state.seoData.metaTitle}</span>
                  </div>
                  <div className={styles.seoItem}>
                    <label>Meta Description:</label>
                    <span>{state.seoData.metaDescription}</span>
                  </div>
                </div>
              </div>
            )}

            <div className={styles.htmlPreview}>
              <div dangerouslySetInnerHTML={{ __html: state.htmlContent }} />
            </div>

            <details className={styles.codeDetails}>
              <summary>View Raw HTML</summary>
              <pre className={styles.codeBlock}>
                <code>{state.htmlContent}</code>
              </pre>
            </details>
          </div>
        )}

        {!state.htmlContent && !state.error && !state.isLoading && (
          <div className={styles.placeholderSection}>
            <p>Fill in the form above and click "Generate Blog"</p>
            <div className={styles.featuresList}>
              <h3>Meet Your AI Content Team:</h3>
              <ul>
                <li><strong>🔍 Sherlock</strong> - Deep SEO research and competitor analysis</li>
                <li><strong>📐 Archie</strong> - The Architect designs structured, SEO-optimized outlines</li>
                <li><strong>🎨 Picasso</strong> - Creates stunning, context-aware images for each section</li>
                <li><strong>👁️ Felix + Penelope</strong> - Dual quality review for images</li>
                <li><strong>🖼️ Mona</strong> - Remakes images that don't meet quality standards</li>
                <li><strong>✍️ Penelope</strong> - The Writer crafts polished, engaging blog content</li>
                <li><strong>🔧 Felix</strong> - The Fixer formats clean HTML code for WordPress</li>
                <li><strong>📤 WordPress</strong> - Publish, schedule, or save drafts directly</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p>Powered by Vercel AI Gateway | Archie + Picasso + Penelope + Felix + Mona + Sherlock</p>
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
    </div>
  );
}
