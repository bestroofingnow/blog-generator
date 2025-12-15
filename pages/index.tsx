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

interface GenerationState {
  isLoading: boolean;
  error: string | null;
  htmlContent: string | null;
  seoData: SEOData | null;
  copiedToClipboard: boolean;
  progress: {
    step: "idle" | "outline" | "images" | "upload" | "content" | "complete";
    message: string;
  };
}

export default function Home() {
  const charlotteNeighborhoods = [
    "Myers Park, Charlotte, NC",
    "Providence Plantation, Charlotte, NC",
    "Freedom Park Area, Charlotte, NC",
    "Beverly Woods, Charlotte, NC",
    "Sedgefield, Charlotte, NC",
    "Steele Creek, Charlotte, NC",
    "Lake Wylie, NC",
    "Mooresville, NC",
    "Huntersville, NC",
  ];

  const [formData, setFormData] = useState<FormData>({
    topic: "Landscape Lighting",
    location: "Charlotte, NC",
    blogType: "Neighborhood Guide",
    numberOfSections: 5,
    tone: "professional yet friendly",
    useOrchestration: true,
  });

  const [wordpress, setWordpress] = useState<WordPressSettings>({
    siteUrl: "",
    username: "",
    appPassword: "",
    isConnected: false,
  });

  const [showWordPressSettings, setShowWordPressSettings] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  const [state, setState] = useState<GenerationState>({
    isLoading: false,
    error: null,
    htmlContent: null,
    seoData: null,
    copiedToClipboard: false,
    progress: { step: "idle", message: "" },
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

  const handleGenerateBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({
      isLoading: true,
      error: null,
      htmlContent: null,
      seoData: null,
      copiedToClipboard: false,
      progress: { step: "outline", message: "Creating outline with Llama 4 Maverick..." },
    });

    try {
      if (formData.useOrchestration) {
        const response = await fetch("/api/orchestrate-blog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            wordpress: wordpress.isConnected ? wordpress : undefined,
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
          copiedToClipboard: false,
          progress: { step: "complete", message: "Blog generated successfully!" },
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
          copiedToClipboard: false,
          progress: { step: "complete", message: "Blog generated successfully!" },
        });
      }
    } catch (error) {
      setState({
        isLoading: false,
        error: error instanceof Error ? error.message : "An unknown error occurred",
        htmlContent: null,
        seoData: null,
        copiedToClipboard: false,
        progress: { step: "idle", message: "" },
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
                  Connect to your WordPress site to automatically upload generated images.
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
                    Generate in WordPress Admin - Users - Profile - Application Passwords
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

            {/* Blog Settings */}
            <div className={styles.formGroup}>
              <label htmlFor="topic">Blog Topic</label>
              <input
                type="text"
                id="topic"
                name="topic"
                value={formData.topic}
                onChange={handleInputChange}
                placeholder="e.g., Landscape Lighting, Outdoor Design"
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
              <div className={styles.quickSelect}>
                <small>Quick select Charlotte areas:</small>
                <div className={styles.buttonGrid}>
                  {charlotteNeighborhoods.map((neighborhood) => (
                    <button
                      key={neighborhood}
                      type="button"
                      className={`${styles.quickSelectButton} ${
                        formData.location === neighborhood ? styles.active : ""
                      }`}
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, location: neighborhood }))
                      }
                    >
                      {neighborhood.split(",")[0]}
                    </button>
                  ))}
                </div>
              </div>
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
              </select>
            </div>

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
                <span>Use AI Orchestration (Llama + Gemini + Claude)</span>
              </label>
              <small className={styles.hint}>
                {formData.useOrchestration
                  ? "Llama creates outline, Gemini generates images, Claude writes content"
                  : "Claude-only mode (faster, no image generation)"}
              </small>
            </div>

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
                <div className={`${styles.progressStep} ${["outline", "images", "upload", "content", "complete"].includes(state.progress.step) ? styles.active : ""}`}>
                  <span className={styles.stepNumber}>1</span>
                  <span>Outline</span>
                </div>
                <div className={`${styles.progressStep} ${["images", "upload", "content", "complete"].includes(state.progress.step) ? styles.active : ""}`}>
                  <span className={styles.stepNumber}>2</span>
                  <span>Images</span>
                </div>
                <div className={`${styles.progressStep} ${["upload", "content", "complete"].includes(state.progress.step) ? styles.active : ""}`}>
                  <span className={styles.stepNumber}>3</span>
                  <span>Upload</span>
                </div>
                <div className={`${styles.progressStep} ${["content", "complete"].includes(state.progress.step) ? styles.active : ""}`}>
                  <span className={styles.stepNumber}>4</span>
                  <span>Content</span>
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
              <h3>New Multi-AI Features:</h3>
              <ul>
                <li>Llama 4 Maverick creates structured outlines</li>
                <li>Gemini generates unique images for each section</li>
                <li>WordPress integration for image storage</li>
                <li>Claude writes polished final content</li>
                <li>Complete SEO metadata included</li>
                <li>One-click CSV export</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p>Powered by Llama 4 Maverick, Gemini, and Claude | Multi-AI Orchestration</p>
      </footer>
    </div>
  );
}
