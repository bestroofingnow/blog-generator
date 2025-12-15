// pages/index.tsx
import React, { useState } from "react";
import styles from "../styles/Home.module.css";

interface FormData {
  topic: string;
  location: string;
  blogType: string;
  numberOfSections: number;
  tone: string;
  aiProvider: "claude" | "gemini" | "both";
}

interface GenerationState {
  isLoading: boolean;
  error: string | null;
  htmlContent: string | null;
  copiedToClipboard: boolean;
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
    aiProvider: "claude",
  });

  const [state, setState] = useState<GenerationState>({
    isLoading: false,
    error: null,
    htmlContent: null,
    copiedToClipboard: false,
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "numberOfSections" ? parseInt(value, 10) : value,
    }));
  };

  const handleGenerateBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({
      isLoading: true,
      error: null,
      htmlContent: null,
      copiedToClipboard: false,
    });

    try {
      const endpoint =
        formData.aiProvider === "claude"
          ? "/api/generate-blog"
          : "/api/generate-with-gemini";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error || "Failed to generate blog"
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      setState({
        isLoading: false,
        error: null,
        htmlContent: data.htmlContent || data.content,
        copiedToClipboard: false,
      });
    } catch (error) {
      setState({
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "An unknown error occurred",
        htmlContent: null,
        copiedToClipboard: false,
      });
    }
  };

  const handleCopyToClipboard = () => {
    if (state.htmlContent) {
      navigator.clipboard.writeText(state.htmlContent);
      setState((prev) => ({
        ...prev,
        copiedToClipboard: true,
      }));
      setTimeout(() => {
        setState((prev) => ({
          ...prev,
          copiedToClipboard: false,
        }));
      }, 2000);
    }
  };

  const handleDownloadHTML = () => {
    if (state.htmlContent) {
      const element = document.createElement("a");
      const file = new Blob([state.htmlContent], {
        type: "text/html",
      });
      element.href = URL.createObjectURL(file);
      element.download =
        `blog-${formData.location.replace(/\s+/g, "-")}-${Date.now()}.html`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>📝 AI Blog Generator</h1>
        <p>Create stunning landscape lighting blogs in seconds</p>
      </header>

      <main className={styles.main}>
        <div className={styles.formSection}>
          <form onSubmit={handleGenerateBlog} className={styles.form}>
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
                        setFormData((prev) => ({
                          ...prev,
                          location: neighborhood,
                        }))
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
              <label htmlFor="aiProvider">AI Provider</label>
              <select
                id="aiProvider"
                name="aiProvider"
                value={formData.aiProvider}
                onChange={handleInputChange}
              >
                <option value="claude">Claude (Recommended)</option>
                <option value="gemini">Google Gemini</option>
                <option value="both">Both (Claude + Gemini)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={state.isLoading}
              className={styles.submitButton}
            >
              {state.isLoading ? "Generating..." : "Generate Blog"}
            </button>
          </form>
        </div>

        {state.error && (
          <div className={styles.errorContainer}>
            <p className={styles.error}>❌ {state.error}</p>
          </div>
        )}

        {state.htmlContent && (
          <div className={styles.outputSection}>
            <div className={styles.outputHeader}>
              <h2>Generated Blog Post</h2>
              <div className={styles.buttonGroup}>
                <button
                  onClick={handleCopyToClipboard}
                  className={styles.actionButton}
                >
                  {state.copiedToClipboard ? "✓ Copied!" : "📋 Copy HTML"}
                </button>
                <button
                  onClick={handleDownloadHTML}
                  className={styles.actionButton}
                >
                  💾 Download HTML
                </button>
              </div>
            </div>

            <div className={styles.htmlPreview}>
              <div
                dangerouslySetInnerHTML={{
                  __html: state.htmlContent,
                }}
              />
            </div>

            <details className={styles.codeDetails}>
              <summary>View Raw HTML</summary>
              <pre className={styles.codeBlock}>
                <code>{state.htmlContent}</code>
              </pre>
            </details>
          </div>
        )}

        {!state.htmlContent && !state.error && (
          <div className={styles.placeholderSection}>
            <p>👆 Fill in the form above and click "Generate Blog"</p>
            <div className={styles.featuresList}>
              <h3>Features:</h3>
              <ul>
                <li>✨ AI-powered content generation</li>
                <li>📍 Location-specific details</li>
                <li>🎯 Conversion-focused copy</li>
                <li>📱 Mobile-responsive HTML</li>
                <li>🖼️ Image placeholder integration</li>
                <li>⚡ Ready to publish instantly</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p>
          Powered by Claude API & Google Gemini | Generate 1000s of blogs per month
        </p>
      </footer>
    </div>
  );
}
