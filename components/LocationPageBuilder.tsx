// components/LocationPageBuilder.tsx
// Streamlined UI for generating AI-powered location pages with SEO best practices
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fadeInUp, staggerContainer, staggerItem, buttonPress } from "../lib/animations";
import styles from "../styles/LocationPageBuilder.module.css";

interface LocationPageBuilderProps {
  services?: string[];
  defaultService?: string;
  companyProfile?: {
    name?: string;
    industryType?: string;
    services?: string[];
    cities?: string[];
    state?: string;
  };
  onGenerate?: (pages: GeneratedPage[]) => void;
}

interface GeneratedPage {
  slug: string;
  title: string;
  html: string;
  metaTitle: string;
  metaDescription: string;
  featuredImage?: string;
  images?: string[];
}

interface GenerationProgress {
  current: number;
  total: number;
  currentCity: string;
  status: "generating" | "images" | "complete";
}

export default function LocationPageBuilder({
  services = [],
  defaultService = "",
  companyProfile,
  onGenerate,
}: LocationPageBuilderProps) {
  const [cities, setCities] = useState("");
  const [service, setService] = useState(defaultService);
  const [customService, setCustomService] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPages, setGeneratedPages] = useState<GeneratedPage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previewPage, setPreviewPage] = useState<GeneratedPage | null>(null);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);

  // Pre-populate from company profile
  useEffect(() => {
    if (companyProfile?.services?.length && !service) {
      setService(companyProfile.services[0]);
    }
  }, [companyProfile, service]);

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
    setGeneratedPages([]);
    setProgress({
      current: 0,
      total: parsedCities.length,
      currentCity: parsedCities[0],
      status: "generating",
    });

    try {
      const response = await fetch("/api/generate-location-page-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cities: parsedCities,
          service: selectedService,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate pages");
      }

      // Handle Server-Sent Events streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      const pages: GeneratedPage[] = [];
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.trim() || !line.startsWith("data: ")) continue;

            try {
              const jsonStr = line.slice(6); // Remove "data: " prefix
              const data = JSON.parse(jsonStr);

              if (data.type === "progress") {
                setProgress({
                  current: data.current,
                  total: data.total,
                  currentCity: data.currentCity,
                  status: data.status,
                });
              } else if (data.type === "page_complete") {
                // Page content will be in the final response
                setProgress({
                  current: data.current,
                  total: data.total,
                  currentCity: data.page?.city || "",
                  status: "complete",
                });
              } else if (data.type === "complete") {
                // Final response with all pages
                if (data.pages && Array.isArray(data.pages)) {
                  const formattedPages = data.pages.map((p: {
                    city: string;
                    slug: string;
                    title: string;
                    metaTitle: string;
                    metaDescription: string;
                    content: string;
                    images?: Array<{ base64: string }>;
                    schemaMarkup?: Record<string, unknown>;
                  }) => ({
                    slug: p.slug,
                    title: p.title,
                    metaTitle: p.metaTitle,
                    metaDescription: p.metaDescription,
                    html: buildFullHtml(p),
                    featuredImage: p.images?.[0]?.base64,
                    images: p.images?.map((img) => img.base64),
                  }));
                  pages.push(...formattedPages);
                  setGeneratedPages([...pages]);
                }
              } else if (data.type === "error") {
                setError(data.error || "An error occurred");
              } else if (data.type === "page_error") {
                console.error(`Page generation error for ${data.city}:`, data.error);
              }
            } catch {
              // Skip non-JSON lines
            }
          }
        }
      }

      setProgress(null);
      onGenerate?.(pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsGenerating(false);
      setProgress(null);
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
    generatedPages.forEach((page, index) => {
      setTimeout(() => handleDownload(page), index * 100);
    });
  };

  const handleCopyHtml = async (page: GeneratedPage) => {
    await navigator.clipboard.writeText(page.html);
  };

  const availableServices = services.length > 0
    ? services
    : companyProfile?.services || [];

  // Build complete HTML from API response
  function buildFullHtml(page: {
    title: string;
    metaTitle: string;
    metaDescription: string;
    content: string;
    images?: Array<{ base64: string; index?: number }>;
    schemaMarkup?: Record<string, unknown>;
  }): string {
    let html = page.content;

    // Replace image placeholders with actual images
    if (page.images) {
      page.images.forEach((img, idx) => {
        const placeholder = `[IMAGE:${idx}]`;
        const imgTag = `<img src="${img.base64}" alt="${page.title} - image ${idx + 1}" class="location-page-image" loading="lazy" />`;
        html = html.replace(new RegExp(placeholder.replace(/[[\]]/g, "\\$&"), "g"), imgTag);
      });
    }

    // Remove any remaining placeholders
    html = html.replace(/\[IMAGE:\d+\]/g, "");

    // Build full HTML document
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.metaTitle}</title>
  <meta name="description" content="${page.metaDescription}">
  ${page.schemaMarkup ? `<script type="application/ld+json">${JSON.stringify(page.schemaMarkup, null, 2)}</script>` : ""}
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 60px 20px; text-align: center; }
    .hero h1 { font-size: 2.5rem; margin-bottom: 16px; }
    .hero-tagline { font-size: 1.25rem; opacity: 0.9; margin-bottom: 24px; }
    .hero-cta { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
    .btn { display: inline-block; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; transition: transform 0.2s; }
    .btn-primary { background: white; color: #667eea; }
    .btn-secondary { background: transparent; border: 2px solid white; color: white; }
    .btn:hover { transform: translateY(-2px); }
    .trust-badges { margin-top: 24px; font-size: 0.9rem; }
    article, section { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    h2 { font-size: 1.75rem; margin-bottom: 20px; color: #1a1a1a; }
    h3 { font-size: 1.25rem; margin: 24px 0 12px; color: #333; }
    p { margin-bottom: 16px; }
    ul, ol { margin: 16px 0 16px 24px; }
    li { margin-bottom: 8px; }
    .location-page-image { max-width: 100%; height: auto; border-radius: 12px; margin: 24px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .faq-section { background: #f8f9fa; padding: 40px 20px; }
    .faq-item { background: white; border-radius: 8px; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    .faq-question { font-weight: 600; font-size: 1.1rem; margin-bottom: 8px; }
    .cta-section { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 60px 20px; }
    .cta-section h2 { color: white; }
    .cta-buttons { margin-top: 24px; display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
    .btn-lg { padding: 18px 36px; font-size: 1.1rem; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; }
    .areas-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin: 20px 0; }
    .areas-grid a { padding: 12px 16px; background: #f8f9fa; border-radius: 8px; text-decoration: none; color: #667eea; transition: background 0.2s; }
    .areas-grid a:hover { background: #e9ecef; }
    @media (max-width: 768px) {
      .hero h1 { font-size: 1.75rem; }
      h2 { font-size: 1.5rem; }
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
  }

  return (
    <div className={styles.container}>
      <motion.div
        className={styles.builder}
        variants={fadeInUp}
        initial="initial"
        animate="animate"
      >
        <div className={styles.header}>
          <h2 className={styles.title}>
            <LocationIcon /> Location Page Builder
          </h2>
          <p className={styles.subtitle}>
            Generate AI-powered, SEO-optimized location pages with professional images.
            Each page follows conversion best practices with ~2,500-3,500 words.
          </p>
        </div>

        {/* What's Included */}
        <div className={styles.featuresBox}>
          <h4>Each page automatically includes:</h4>
          <div className={styles.featuresList}>
            <span className={styles.feature}><CheckIcon /> Hero with CTAs</span>
            <span className={styles.feature}><CheckIcon /> Service overview</span>
            <span className={styles.feature}><CheckIcon /> Why choose us</span>
            <span className={styles.feature}><CheckIcon /> 5-step process</span>
            <span className={styles.feature}><CheckIcon /> Pricing section</span>
            <span className={styles.feature}><CheckIcon /> FAQ with schema</span>
            <span className={styles.feature}><CheckIcon /> Testimonials</span>
            <span className={styles.feature}><CheckIcon /> Areas served</span>
            <span className={styles.feature}><CheckIcon /> 3 service images</span>
            <span className={styles.feature}><CheckIcon /> Contact form</span>
          </div>
        </div>

        {/* Service selection */}
        <div className={styles.field}>
          <label className={styles.label}>
            Service Type
            <span className={styles.required}>*</span>
          </label>
          <select
            className={styles.select}
            value={service}
            onChange={(e) => setService(e.target.value)}
          >
            <option value="">Select a service...</option>
            {availableServices.map((s) => (
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

        {/* City input */}
        <div className={styles.field}>
          <label className={styles.label}>
            Cities to Generate
            <span className={styles.required}>*</span>
            <span className={styles.hint}>
              Enter city names separated by commas or new lines
            </span>
          </label>
          <textarea
            className={styles.textarea}
            value={cities}
            onChange={(e) => setCities(e.target.value)}
            placeholder={companyProfile?.cities?.slice(0, 5).join("\n") || "Dallas\nFort Worth\nArlington\nPlano\nIrving"}
            rows={5}
          />
          <div className={styles.cityCount}>
            <span className={styles.count}>
              {parsedCities.length} {parsedCities.length === 1 ? "city" : "cities"} detected
            </span>
            {parsedCities.length > 0 && (
              <span className={styles.estimate}>
                ~{Math.round(parsedCities.length * 2.5)} min generation time
              </span>
            )}
          </div>
        </div>

        {error && <div className={styles.error}><ErrorIcon /> {error}</div>}

        {/* Progress indicator */}
        {progress && (
          <div className={styles.progressSection}>
            <div className={styles.progressHeader}>
              <span className={styles.progressText}>
                {progress.status === "generating" && `Generating content for ${progress.currentCity}...`}
                {progress.status === "images" && `Creating images for ${progress.currentCity}...`}
                {progress.status === "complete" && `Completed ${progress.currentCity}`}
              </span>
              <span className={styles.progressCount}>
                {progress.current} of {progress.total}
              </span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Generate button */}
        <motion.button
          className={styles.generateButton}
          onClick={handleGenerate}
          disabled={isGenerating || parsedCities.length === 0 || !service}
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
                  {page.featuredImage && (
                    <div className={styles.pageThumb}>
                      <img src={page.featuredImage} alt={page.title} />
                    </div>
                  )}
                  <div className={styles.pageInfo}>
                    <h4 className={styles.pageTitle}>{page.title}</h4>
                    <code className={styles.pageSlug}>/{page.slug}/</code>
                    <p className={styles.pageMeta}>{page.metaDescription}</p>
                    {page.images && page.images.length > 0 && (
                      <span className={styles.imageCount}>
                        <ImageIcon /> {page.images.length} images
                      </span>
                    )}
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

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}
