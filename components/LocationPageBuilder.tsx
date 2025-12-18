// components/LocationPageBuilder.tsx
// UI for batch location page generation following Relentless Digital pattern
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fadeInUp, staggerContainer, staggerItem, buttonPress } from "../lib/animations";
import styles from "../styles/LocationPageBuilder.module.css";

interface LocationPageBuilderProps {
  services?: string[];
  defaultService?: string;
  onGenerate?: (pages: GeneratedPage[]) => void;
}

interface GeneratedPage {
  slug: string;
  title: string;
  html: string;
  metaTitle: string;
  metaDescription: string;
}

export default function LocationPageBuilder({
  services = [],
  defaultService = "",
  onGenerate,
}: LocationPageBuilderProps) {
  const [cities, setCities] = useState("");
  const [service, setService] = useState(defaultService);
  const [customService, setCustomService] = useState("");
  const [includeDirections, setIncludeDirections] = useState(true);
  const [includeFAQ, setIncludeFAQ] = useState(true);
  const [includeTestimonials, setIncludeTestimonials] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPages, setGeneratedPages] = useState<GeneratedPage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previewPage, setPreviewPage] = useState<GeneratedPage | null>(null);

  const parsedCities = cities
    .split(/[,\n]/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  const handleGenerate = async () => {
    if (parsedCities.length === 0) {
      setError("Please enter at least one city");
      return;
    }

    const selectedService = service === "custom" ? customService : service;
    if (!selectedService) {
      setError("Please select or enter a service type");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-location-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cities: parsedCities,
          service: selectedService,
          includeDirections,
          includeFAQ,
          includeTestimonials,
          outputFormat: "both",
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to generate pages");
      }

      const pages: GeneratedPage[] = data.templates.map(
        (template: {
          slug: string;
          title: string;
          metaTitle: string;
          metaDescription: string;
        }) => ({
          slug: template.slug,
          title: template.title,
          html: data.html[template.slug],
          metaTitle: template.metaTitle,
          metaDescription: template.metaDescription,
        })
      );

      setGeneratedPages(pages);
      onGenerate?.(pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (page: GeneratedPage) => {
    const blob = new Blob([page.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${page.slug}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    generatedPages.forEach((page) => {
      setTimeout(() => handleDownload(page), 100);
    });
  };

  const handleCopyHtml = async (page: GeneratedPage) => {
    await navigator.clipboard.writeText(page.html);
  };

  return (
    <div className={styles.container}>
      <motion.div
        className={styles.builder}
        variants={fadeInUp}
        initial="initial"
        animate="animate"
      >
        <h2 className={styles.title}>
          <LocationIcon /> Location Page Builder
        </h2>
        <p className={styles.subtitle}>
          Generate SEO-optimized location pages for multiple cities at once.
          Based on the Relentless Digital formula for trades contractors.
        </p>

        {/* City input */}
        <div className={styles.field}>
          <label className={styles.label}>
            Cities to Generate
            <span className={styles.hint}>
              Enter city names separated by commas or new lines
            </span>
          </label>
          <textarea
            className={styles.textarea}
            value={cities}
            onChange={(e) => setCities(e.target.value)}
            placeholder="Dallas&#10;Fort Worth&#10;Arlington&#10;Plano&#10;Irving"
            rows={5}
          />
          <span className={styles.count}>
            {parsedCities.length} {parsedCities.length === 1 ? "city" : "cities"} detected
          </span>
        </div>

        {/* Service selection */}
        <div className={styles.field}>
          <label className={styles.label}>Service Type</label>
          <select
            className={styles.select}
            value={service}
            onChange={(e) => setService(e.target.value)}
          >
            <option value="">Select a service...</option>
            {services.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            <option value="custom">Custom service...</option>
          </select>
          {service === "custom" && (
            <input
              type="text"
              className={styles.input}
              value={customService}
              onChange={(e) => setCustomService(e.target.value)}
              placeholder="Enter service type (e.g., HVAC Repair)"
            />
          )}
        </div>

        {/* Options */}
        <div className={styles.options}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={includeFAQ}
              onChange={(e) => setIncludeFAQ(e.target.checked)}
            />
            <span>Include FAQ Section (Featured Snippets)</span>
          </label>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={includeDirections}
              onChange={(e) => setIncludeDirections(e.target.checked)}
            />
            <span>Include Driving Directions (+500 words)</span>
          </label>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={includeTestimonials}
              onChange={(e) => setIncludeTestimonials(e.target.checked)}
            />
            <span>Include Testimonials Section</span>
          </label>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {/* Generate button */}
        <motion.button
          className={styles.generateButton}
          onClick={handleGenerate}
          disabled={isGenerating || parsedCities.length === 0}
          {...buttonPress}
        >
          {isGenerating ? (
            <>
              <Spinner /> Generating {parsedCities.length} Pages...
            </>
          ) : (
            <>
              <GenerateIcon /> Generate Location Pages
            </>
          )}
        </motion.button>
      </motion.div>

      {/* Generated pages */}
      <AnimatePresence>
        {generatedPages.length > 0 && (
          <motion.div
            className={styles.results}
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <div className={styles.resultsHeader}>
              <h3>Generated Pages ({generatedPages.length})</h3>
              <button
                className={styles.downloadAllButton}
                onClick={handleDownloadAll}
              >
                <DownloadIcon /> Download All
              </button>
            </div>

            <div className={styles.pagesList}>
              {generatedPages.map((page) => (
                <motion.div
                  key={page.slug}
                  className={styles.pageCard}
                  variants={staggerItem}
                >
                  <div className={styles.pageInfo}>
                    <h4 className={styles.pageTitle}>{page.title}</h4>
                    <code className={styles.pageSlug}>/{page.slug}/</code>
                    <p className={styles.pageMeta}>{page.metaDescription}</p>
                  </div>
                  <div className={styles.pageActions}>
                    <button
                      className={styles.actionButton}
                      onClick={() => setPreviewPage(page)}
                      title="Preview"
                    >
                      <EyeIcon />
                    </button>
                    <button
                      className={styles.actionButton}
                      onClick={() => handleCopyHtml(page)}
                      title="Copy HTML"
                    >
                      <CopyIcon />
                    </button>
                    <button
                      className={styles.actionButton}
                      onClick={() => handleDownload(page)}
                      title="Download"
                    >
                      <DownloadIcon />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview modal */}
      <AnimatePresence>
        {previewPage && (
          <motion.div
            className={styles.previewOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewPage(null)}
          >
            <motion.div
              className={styles.previewModal}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.previewHeader}>
                <h3>{previewPage.title}</h3>
                <button
                  className={styles.closeButton}
                  onClick={() => setPreviewPage(null)}
                >
                  <CloseIcon />
                </button>
              </div>
              <iframe
                className={styles.previewFrame}
                srcDoc={previewPage.html}
                title={previewPage.title}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Icons
function LocationIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function GenerateIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.813L19.5 10.5l-5.588 1.687L12 18l-1.912-5.813L4.5 10.5l5.588-1.687L12 3z" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className={styles.spinner} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
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

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
