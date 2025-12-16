// pages/index.tsx
import React, { useState, useEffect } from "react";
import styles from "../styles/Home.module.css";

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
}

interface WordPressSettings {
  siteUrl: string;
  username: string;
  appPassword: string;
  isConnected: boolean;
}

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

interface WordPressCategory {
  id: number;
  name: string;
  slug: string;
}

interface PublishSettings {
  action: "none" | "draft" | "publish" | "schedule";
  scheduledDate: string;
  scheduledTime: string;
  categoryId: number | null;
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
    id: number;
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
  });

  const [wordpress, setWordpress] = useState<WordPressSettings>({
    siteUrl: "",
    username: "",
    appPassword: "",
    isConnected: false,
  });

  const [publishSettings, setPublishSettings] = useState<PublishSettings>({
    action: "none",
    scheduledDate: "",
    scheduledTime: "09:00",
    categoryId: null,
  });

  const [categories, setCategories] = useState<WordPressCategory[]>([]);
  const [showWordPressSettings, setShowWordPressSettings] = useState(false);
  const [showSEOSettings, setShowSEOSettings] = useState(false);
  const [showPublishSettings, setShowPublishSettings] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
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

  // Save WordPress settings to localStorage
  const saveWordPressSettings = () => {
    localStorage.setItem("wordpressSettings", JSON.stringify(wordpress));
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

      const data = await response.json();

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
        const response = await fetch("/api/orchestrate-blog", {
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

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to generate blog");
        }

        setState({
          isLoading: false,
          error: null,
          htmlContent: data.htmlContent,
          seoData: data.seoData,
          featuredImageId: data.featuredImageId || null,
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

        const data = await response.json();

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

            {/* Company Info */}
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

            {/* Blog Settings */}
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

            <button
              type="submit"
              disabled={state.isLoading}
              className={styles.submitButton}
            >
              {state.isLoading ? "Generating..." : "Generate Blog"}
            </button>
          </form>

          {/* Progress Indicator */}
          {state.isLoading && (
            <div className={styles.progressSection}>
              <div className={styles.progressSteps}>
                <div className={`${styles.progressStep} ${["research", "outline", "images", "upload", "content", "format", "publishing", "complete"].includes(state.progress.step) ? styles.active : ""}`}>
                  <span className={styles.stepNumber}>1</span>
                  <span>Outline</span>
                  <small>Archie</small>
                </div>
                <div className={`${styles.progressStep} ${["images", "upload", "content", "format", "publishing", "complete"].includes(state.progress.step) ? styles.active : ""}`}>
                  <span className={styles.stepNumber}>2</span>
                  <span>Images</span>
                  <small>Picasso</small>
                </div>
                <div className={`${styles.progressStep} ${["upload", "content", "format", "publishing", "complete"].includes(state.progress.step) ? styles.active : ""}`}>
                  <span className={styles.stepNumber}>3</span>
                  <span>Upload</span>
                  <small>WordPress</small>
                </div>
                <div className={`${styles.progressStep} ${["content", "format", "publishing", "complete"].includes(state.progress.step) ? styles.active : ""}`}>
                  <span className={styles.stepNumber}>4</span>
                  <span>Content</span>
                  <small>Penelope</small>
                </div>
                <div className={`${styles.progressStep} ${["format", "publishing", "complete"].includes(state.progress.step) ? styles.active : ""}`}>
                  <span className={styles.stepNumber}>5</span>
                  <span>Format</span>
                  <small>Felix</small>
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

            {/* WordPress Publish Section */}
            {wordpress.isConnected && (
              <div className={styles.publishSection}>
                <div className={styles.publishHeader}>
                  <h3>Publish to WordPress</h3>
                  {state.featuredImageId && (
                    <span className={styles.featuredImageBadge}>Featured image set</span>
                  )}
                </div>

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
                    <button
                      type="button"
                      onClick={() => setPublishSettings(prev => ({ ...prev, action: "schedule" }))}
                      className={`${styles.publishActionBtn} ${publishSettings.action === "schedule" ? styles.active : ""}`}
                    >
                      Schedule
                    </button>
                  </div>

                  {publishSettings.action === "schedule" && (
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

                  {categories.length > 0 && (
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
                </div>

                {publishSettings.action !== "none" && (
                  <button
                    type="button"
                    onClick={handlePublishToWordPress}
                    disabled={isPublishing || (publishSettings.action === "schedule" && !publishSettings.scheduledDate)}
                    className={styles.publishButton}
                  >
                    {isPublishing
                      ? "Publishing..."
                      : publishSettings.action === "draft"
                      ? "Save Draft to WordPress"
                      : publishSettings.action === "schedule"
                      ? `Schedule for ${publishSettings.scheduledDate || "..."}`
                      : "Publish Now to WordPress"}
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
    </div>
  );
}
