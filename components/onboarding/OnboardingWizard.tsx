// components/onboarding/OnboardingWizard.tsx
// AI-powered company profile setup wizard

import React, { useState, useCallback, useEffect } from "react";
import styles from "../../styles/Onboarding.module.css";
import AiSuggestedField, { AiSuggestedTags, AiSuggestedSelect } from "./AiSuggestedField";
import { useCompanyResearch, type ResearchResult, type ResearchProgress } from "../../lib/hooks/useCompanyResearch";
import type { CompanyProfile, SocialLinks, AdditionalLink, LinkCategory, LINK_CATEGORY_OPTIONS } from "../../lib/page-types";

// Industry options
const INDUSTRY_OPTIONS = [
  { value: "roofing", label: "Roofing" },
  { value: "hvac", label: "HVAC" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "landscaping", label: "Landscaping" },
  { value: "painting", label: "Painting" },
  { value: "general_contractor", label: "General Contractor" },
  { value: "cleaning", label: "Cleaning Services" },
  { value: "pest_control", label: "Pest Control" },
  { value: "solar", label: "Solar" },
  { value: "windows_doors", label: "Windows & Doors" },
  { value: "flooring", label: "Flooring" },
  { value: "kitchen_bath", label: "Kitchen & Bath" },
  { value: "custom", label: "Other (Custom)" },
];

const AUDIENCE_OPTIONS = [
  { value: "homeowners", label: "Homeowners (Residential)" },
  { value: "commercial", label: "Commercial Businesses" },
  { value: "both", label: "Both Residential & Commercial" },
  { value: "property", label: "Property Managers" },
];

const US_STATES = [
  { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" }, { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" }, { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" }, { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" }, { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" }, { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" }, { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" }, { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" }, { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" }, { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" }, { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" }, { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" }, { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" }, { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" }, { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" }, { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" }, { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" }, { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" }, { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" }, { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" }, { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" }, { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" }, { value: "WY", label: "Wyoming" },
];

interface OnboardingWizardProps {
  onComplete: (profile: Partial<CompanyProfile>) => void;
  onClose: () => void;
  initialProfile?: Partial<CompanyProfile>;
}

type Step = "welcome" | "research" | "basic" | "services" | "social" | "links" | "complete";

const STEPS: Step[] = ["welcome", "research", "basic", "services", "social", "links", "complete"];

const STEP_TITLES: Record<Step, { title: string; subtitle: string }> = {
  welcome: { title: "Welcome!", subtitle: "Let's set up your company profile" },
  research: { title: "AI Research", subtitle: "Analyzing your website..." },
  basic: { title: "Basic Information", subtitle: "Review your company details" },
  services: { title: "Services & USPs", subtitle: "What you offer and why you're different" },
  social: { title: "Social Media", subtitle: "Connect your online presence" },
  links: { title: "Additional Links", subtitle: "Directories, manufacturers & more" },
  complete: { title: "All Done!", subtitle: "Your profile is ready" },
};

export default function OnboardingWizard({
  onComplete,
  onClose,
  initialProfile,
}: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>("welcome");
  const [websiteUrl, setWebsiteUrl] = useState(initialProfile?.website || "");
  const [profile, setProfile] = useState<Partial<CompanyProfile>>(initialProfile || {});
  const [confidence, setConfidence] = useState<Record<string, number>>({});
  const [additionalLinks, setAdditionalLinks] = useState<AdditionalLink[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { research, isResearching, progress, result, error: researchError, phases } = useCompanyResearch();

  // Update profile from research result
  useEffect(() => {
    if (result) {
      setProfile((prev) => ({ ...prev, ...result.profile }));
      setConfidence(result.confidence);
      setAdditionalLinks(result.additionalLinks || []);
    }
  }, [result]);

  // Handle research error
  useEffect(() => {
    if (researchError) {
      setError(researchError);
      setCurrentStep("basic"); // Allow manual entry
    }
  }, [researchError]);

  const handleResearch = async () => {
    if (!websiteUrl) {
      setError("Please enter your website URL");
      return;
    }

    // Validate URL format
    let url = websiteUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
      setWebsiteUrl(url);
    }

    setError(null);
    setCurrentStep("research");

    const researchResult = await research(url);

    if (researchResult) {
      setProfile((prev) => ({ ...prev, website: url }));
      setCurrentStep("basic");
    }
  };

  const updateProfile = useCallback((field: keyof CompanyProfile, value: unknown) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateSocialLink = useCallback((platform: keyof SocialLinks, value: string) => {
    setProfile((prev) => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value,
      },
    }));
  }, []);

  const handleNext = () => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex > 0) {
      // Skip research step when going back
      const prevStep = STEPS[currentIndex - 1] === "research" ? "welcome" : STEPS[currentIndex - 1];
      setCurrentStep(prevStep);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleComplete = async () => {
    // Merge additional links into profile
    const finalProfile: Partial<CompanyProfile> = {
      ...profile,
      additionalLinks,
      onboardingCompletedAt: new Date().toISOString(),
    };

    onComplete(finalProfile);
  };

  const stepIndex = STEPS.indexOf(currentStep);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <span className={styles.stepLabel}>
              {currentStep !== "welcome" && currentStep !== "complete"
                ? `Step ${stepIndex} of ${STEPS.length - 2}`
                : ""}
            </span>
            <button className={styles.closeButton} onClick={onClose}>
              ×
            </button>
          </div>
          <h2 className={styles.headerTitle}>{STEP_TITLES[currentStep].title}</h2>
          <p className={styles.headerSubtitle}>{STEP_TITLES[currentStep].subtitle}</p>

          {/* Progress Dots */}
          {currentStep !== "welcome" && currentStep !== "complete" && (
            <div className={styles.progressDots}>
              {STEPS.slice(1, -1).map((step, index) => (
                <div
                  key={step}
                  className={`${styles.dot} ${
                    STEPS.indexOf(currentStep) > index + 1 ? styles.completed : ""
                  } ${currentStep === step ? styles.active : ""}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className={styles.content}>
          {error && <div className={styles.errorMessage}>{error}</div>}

          {currentStep === "welcome" && (
            <WelcomeStep
              websiteUrl={websiteUrl}
              setWebsiteUrl={setWebsiteUrl}
              onResearch={handleResearch}
            />
          )}

          {currentStep === "research" && (
            <ResearchStep progress={progress} phases={phases} />
          )}

          {currentStep === "basic" && (
            <BasicInfoStep
              profile={profile}
              confidence={confidence}
              updateProfile={updateProfile}
            />
          )}

          {currentStep === "services" && (
            <ServicesStep
              profile={profile}
              confidence={confidence}
              updateProfile={updateProfile}
            />
          )}

          {currentStep === "social" && (
            <SocialStep
              profile={profile}
              confidence={confidence}
              updateSocialLink={updateSocialLink}
            />
          )}

          {currentStep === "links" && (
            <AdditionalLinksStep
              links={additionalLinks}
              setLinks={setAdditionalLinks}
            />
          )}

          {currentStep === "complete" && (
            <CompleteStep profile={profile} additionalLinks={additionalLinks} />
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            {currentStep !== "welcome" && currentStep !== "research" && currentStep !== "complete" && (
              <button className={styles.backButton} onClick={handleBack}>
                Back
              </button>
            )}
            {(currentStep === "social" || currentStep === "links") && (
              <button className={styles.skipButton} onClick={handleSkip}>
                Skip this step
              </button>
            )}
          </div>

          {currentStep === "welcome" && (
            <button className={styles.nextButton} onClick={handleResearch}>
              Start Setup
            </button>
          )}

          {currentStep !== "welcome" && currentStep !== "research" && currentStep !== "complete" && (
            <button className={styles.nextButton} onClick={handleNext}>
              Continue
            </button>
          )}

          {currentStep === "complete" && (
            <button className={styles.nextButton} onClick={handleComplete}>
              Finish Setup
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Step Components

function WelcomeStep({
  websiteUrl,
  setWebsiteUrl,
  onResearch,
}: {
  websiteUrl: string;
  setWebsiteUrl: (url: string) => void;
  onResearch: () => void;
}) {
  return (
    <div className={styles.welcomeContent}>
      <div className={styles.welcomeIcon}>🚀</div>
      <h3 className={styles.welcomeTitle}>Let AI Set Up Your Profile</h3>
      <p className={styles.welcomeDescription}>
        Enter your website URL and our AI will automatically research your company,
        extracting key information to pre-fill your profile.
      </p>

      <div className={styles.featureList}>
        <div className={styles.featureItem}>
          <div className={styles.featureIcon}>🔍</div>
          <div className={styles.featureText}>
            <strong>Smart Research</strong>
            AI analyzes your website to extract company info
          </div>
        </div>
        <div className={styles.featureItem}>
          <div className={styles.featureIcon}>📱</div>
          <div className={styles.featureText}>
            <strong>Find Social Profiles</strong>
            Automatically discovers your social media links
          </div>
        </div>
        <div className={styles.featureItem}>
          <div className={styles.featureIcon}>✅</div>
          <div className={styles.featureText}>
            <strong>You Verify</strong>
            Review and edit all AI-suggested information
          </div>
        </div>
      </div>

      <div className={styles.urlInputWrapper}>
        <input
          type="url"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          placeholder="https://yourcompany.com"
          className={`${styles.input} ${styles.urlInput}`}
          onKeyDown={(e) => e.key === "Enter" && onResearch()}
        />
      </div>
    </div>
  );
}

function ResearchStep({ progress, phases }: {
  progress: ResearchProgress;
  phases: { phase: string; label: string; aiTeam: string }[];
}) {
  return (
    <div className={styles.researchLoading}>
      <div className={styles.spinner} />
      <h3 className={styles.researchTitle}>AI Research in Progress</h3>
      <p className={styles.researchSubtitle}>
        Analyzing your company information across the web
      </p>

      <div className={styles.researchProgress}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${progress.percentage}%` }}
          />
        </div>

        <div className={styles.progressSteps}>
          {phases.slice(0, -1).map((phaseInfo, index) => (
            <div
              key={phaseInfo.phase}
              className={`${styles.progressStep} ${
                index < progress.phase ? styles.completed : ""
              } ${index === progress.phase ? styles.active : ""}`}
            >
              <span className={styles.stepIcon}>
                {index < progress.phase ? "✓" : index === progress.phase ? "●" : "○"}
              </span>
              <span className={styles.stepLabel}>{phaseInfo.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.aiTeamInfo}>
        <div className={styles.aiTeamMember}>
          <span className={styles.memberIcon}>🎯</span>
          <span className={styles.memberName}>Strategy</span>
          <span className={styles.memberRole}>Planning research approach</span>
        </div>
        <div className={styles.aiTeamMember}>
          <span className={styles.memberIcon}>🔍</span>
          <span className={styles.memberName}>Research</span>
          <span className={styles.memberRole}>Gathering company data</span>
        </div>
        <div className={styles.aiTeamMember}>
          <span className={styles.memberIcon}>📊</span>
          <span className={styles.memberName}>Analysis</span>
          <span className={styles.memberRole}>Processing insights</span>
        </div>
      </div>
    </div>
  );
}

function BasicInfoStep({
  profile,
  confidence,
  updateProfile,
}: {
  profile: Partial<CompanyProfile>;
  confidence: Record<string, number>;
  updateProfile: (field: keyof CompanyProfile, value: unknown) => void;
}) {
  return (
    <div className={styles.form}>
      <div className={styles.formGrid}>
        <AiSuggestedField
          label="Company Name"
          value={profile.name || ""}
          onChange={(v) => updateProfile("name", v)}
          placeholder="Your Company Name"
          required
          isAiSuggested={!!confidence.name}
          confidence={confidence.name}
          className={styles.formGridFull}
        />

        <AiSuggestedField
          label="Tagline"
          value={profile.tagline || ""}
          onChange={(v) => updateProfile("tagline", v)}
          placeholder="Your company's tagline or slogan"
          isAiSuggested={!!confidence.tagline}
          confidence={confidence.tagline}
          className={styles.formGridFull}
        />

        <AiSuggestedField
          label="Phone"
          value={profile.phone || ""}
          onChange={(v) => updateProfile("phone", v)}
          placeholder="(555) 123-4567"
          type="tel"
          required
          isAiSuggested={!!confidence.phone}
          confidence={confidence.phone}
        />

        <AiSuggestedField
          label="Email"
          value={profile.email || ""}
          onChange={(v) => updateProfile("email", v)}
          placeholder="contact@company.com"
          type="email"
          required
          isAiSuggested={!!confidence.email}
          confidence={confidence.email}
        />

        <AiSuggestedSelect
          label="State"
          value={profile.stateAbbr || ""}
          onChange={(v) => {
            updateProfile("stateAbbr", v);
            const stateName = US_STATES.find((s) => s.value === v)?.label || "";
            updateProfile("state", stateName);
          }}
          options={US_STATES}
          placeholder="Select state..."
          required
          isAiSuggested={!!confidence.state}
        />

        <AiSuggestedField
          label="City/Headquarters"
          value={profile.headquarters || ""}
          onChange={(v) => updateProfile("headquarters", v)}
          placeholder="Main city"
          required
          isAiSuggested={!!confidence.headquarters}
          confidence={confidence.headquarters}
        />

        <AiSuggestedSelect
          label="Industry"
          value={profile.industryType || ""}
          onChange={(v) => updateProfile("industryType", v)}
          options={INDUSTRY_OPTIONS}
          placeholder="Select industry..."
          required
          isAiSuggested={!!confidence.industryType}
        />

        <AiSuggestedSelect
          label="Target Audience"
          value={profile.audience || ""}
          onChange={(v) => updateProfile("audience", v as CompanyProfile["audience"])}
          options={AUDIENCE_OPTIONS}
          placeholder="Select audience..."
          isAiSuggested={!!confidence.audience}
        />
      </div>

      <AiSuggestedField
        label="Address"
        value={profile.address || ""}
        onChange={(v) => updateProfile("address", v)}
        placeholder="Full business address"
        isAiSuggested={!!confidence.address}
        confidence={confidence.address}
      />
    </div>
  );
}

function ServicesStep({
  profile,
  confidence,
  updateProfile,
}: {
  profile: Partial<CompanyProfile>;
  confidence: Record<string, number>;
  updateProfile: (field: keyof CompanyProfile, value: unknown) => void;
}) {
  const aiServices = profile.services?.filter(() => !!confidence.services) || [];
  const aiUsps = profile.usps?.filter(() => !!confidence.usps) || [];

  return (
    <div className={styles.form}>
      <AiSuggestedTags
        label="Services Offered"
        tags={profile.services || []}
        onChange={(tags) => updateProfile("services", tags)}
        placeholder="Add a service (press Enter)..."
        isAiSuggested={!!confidence.services}
        aiTags={aiServices}
      />

      <AiSuggestedTags
        label="Unique Selling Points (USPs)"
        tags={profile.usps || []}
        onChange={(tags) => updateProfile("usps", tags)}
        placeholder="What makes you different? (press Enter)..."
        isAiSuggested={!!confidence.usps}
        aiTags={aiUsps}
      />

      <AiSuggestedTags
        label="Certifications & Awards"
        tags={profile.certifications || []}
        onChange={(tags) => updateProfile("certifications", tags)}
        placeholder="GAF Master Elite, BBB A+, etc..."
        isAiSuggested={!!confidence.certifications}
        aiTags={[]}
      />

      <AiSuggestedTags
        label="Service Areas (Cities)"
        tags={profile.cities || []}
        onChange={(tags) => updateProfile("cities", tags)}
        placeholder="Add cities you serve (press Enter)..."
        isAiSuggested={!!confidence.cities}
        aiTags={profile.cities || []}
      />
    </div>
  );
}

function SocialStep({
  profile,
  confidence,
  updateSocialLink,
}: {
  profile: Partial<CompanyProfile>;
  confidence: Record<string, number>;
  updateSocialLink: (platform: keyof SocialLinks, value: string) => void;
}) {
  const socialLinks = profile.socialLinks || {};
  const hasSocialConfidence = !!confidence.socialLinks;

  const platforms: { key: keyof SocialLinks; label: string; placeholder: string }[] = [
    { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourpage" },
    { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourpage" },
    { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/..." },
    { key: "twitter", label: "X (Twitter)", placeholder: "https://twitter.com/yourhandle" },
    { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourchannel" },
    { key: "googleBusiness", label: "Google Business Profile", placeholder: "https://g.page/..." },
    { key: "yelp", label: "Yelp", placeholder: "https://yelp.com/biz/..." },
    { key: "nextdoor", label: "Nextdoor", placeholder: "https://nextdoor.com/pages/..." },
  ];

  return (
    <div className={styles.form}>
      <div className={styles.formGrid}>
        {platforms.map(({ key, label, placeholder }) => (
          <AiSuggestedField
            key={key}
            label={label}
            value={socialLinks[key] || ""}
            onChange={(v) => updateSocialLink(key, v)}
            placeholder={placeholder}
            type="url"
            isAiSuggested={hasSocialConfidence && !!socialLinks[key]}
            confidence={socialLinks[key] ? 85 : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function AdditionalLinksStep({
  links,
  setLinks,
}: {
  links: AdditionalLink[];
  setLinks: (links: AdditionalLink[]) => void;
}) {
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkName, setNewLinkName] = useState("");
  const [newLinkCategory, setNewLinkCategory] = useState<LinkCategory>("directory");

  const addLink = () => {
    if (!newLinkUrl || !newLinkName) return;

    const newLink: AdditionalLink = {
      id: `manual-${Date.now()}`,
      name: newLinkName,
      url: newLinkUrl.startsWith("http") ? newLinkUrl : `https://${newLinkUrl}`,
      category: newLinkCategory,
      isVerified: true,
      isAiSuggested: false,
      addedAt: new Date().toISOString(),
    };

    setLinks([...links, newLink]);
    setNewLinkUrl("");
    setNewLinkName("");
  };

  const removeLink = (id: string) => {
    setLinks(links.filter((l) => l.id !== id));
  };

  const getCategoryIcon = (category: LinkCategory) => {
    const icons: Record<LinkCategory, string> = {
      manufacturer: "🏭",
      networking: "🤝",
      directory: "📋",
      association: "🏛️",
      review_platform: "⭐",
      custom: "🔗",
    };
    return icons[category] || "🔗";
  };

  const categoryOptions = [
    { value: "directory", label: "Directory (BBB, Angi, etc.)" },
    { value: "manufacturer", label: "Manufacturer Partnership" },
    { value: "networking", label: "Networking Group" },
    { value: "association", label: "Trade Association" },
    { value: "review_platform", label: "Review Platform" },
    { value: "custom", label: "Other" },
  ];

  return (
    <div className={styles.form}>
      <p style={{ color: "var(--text-secondary, #64748b)", marginBottom: "1rem" }}>
        Add links to your business directory listings, manufacturer certifications,
        networking groups, and other business profiles.
      </p>

      {/* Existing Links */}
      {links.length > 0 && (
        <div className={styles.linksSection}>
          {links.map((link) => (
            <div
              key={link.id}
              className={`${styles.linkItem} ${link.isAiSuggested ? styles.aiSuggested : ""}`}
            >
              <div className={styles.linkIcon}>
                {getCategoryIcon(link.category)}
              </div>
              <div className={styles.linkInfo}>
                <div className={styles.linkName}>
                  {link.name}
                  {link.isAiSuggested && (
                    <span className={styles.aiSuggestedBadge} style={{ marginLeft: "0.5rem" }}>
                      AI
                    </span>
                  )}
                </div>
                <div className={styles.linkUrl}>{link.url}</div>
              </div>
              <div className={styles.linkActions}>
                <button
                  className={`${styles.linkActionButton} ${styles.delete}`}
                  onClick={() => removeLink(link.id)}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Link */}
      <div className={styles.sectionHeader}>
        <span className={styles.sectionIcon}>➕</span>
        <span className={styles.sectionTitle}>Add a Link</span>
      </div>

      <div className={styles.formGrid}>
        <AiSuggestedField
          label="Link Name"
          value={newLinkName}
          onChange={setNewLinkName}
          placeholder="e.g., GAF Certified, BBB Profile"
        />

        <AiSuggestedSelect
          label="Category"
          value={newLinkCategory}
          onChange={(v) => setNewLinkCategory(v as LinkCategory)}
          options={categoryOptions}
        />
      </div>

      <div className={styles.urlInputWrapper} style={{ maxWidth: "100%" }}>
        <input
          type="url"
          value={newLinkUrl}
          onChange={(e) => setNewLinkUrl(e.target.value)}
          placeholder="https://..."
          className={`${styles.input} ${styles.urlInput}`}
          style={{ flex: 1 }}
        />
        <button
          className={styles.researchButton}
          onClick={addLink}
          disabled={!newLinkUrl || !newLinkName}
        >
          Add Link
        </button>
      </div>
    </div>
  );
}

function CompleteStep({
  profile,
  additionalLinks,
}: {
  profile: Partial<CompanyProfile>;
  additionalLinks: AdditionalLink[];
}) {
  const serviceCount = profile.services?.length || 0;
  const socialCount = profile.socialLinks
    ? Object.values(profile.socialLinks).filter(Boolean).length
    : 0;
  const hasInsights = profile.seoInsights || profile.competitorAnalysis || profile.aiTeamNotes;

  return (
    <div className={styles.completionContent}>
      <div className={styles.completionIcon}>✓</div>
      <h3 className={styles.completionTitle}>Profile Setup Complete!</h3>
      <p className={styles.completionDescription}>
        Your company profile has been set up successfully. You can always edit
        these details in Settings.
      </p>

      <div className={styles.completionStats}>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{serviceCount}</div>
          <div className={styles.statLabel}>Services</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{socialCount}</div>
          <div className={styles.statLabel}>Social Links</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{additionalLinks.length}</div>
          <div className={styles.statLabel}>Directory Links</div>
        </div>
      </div>

      {/* AI Research Insights */}
      {hasInsights && (
        <div className={styles.insightsPanel}>
          <div className={styles.insightsPanelHeader}>
            <span>🤖</span>
            <span className={styles.insightsPanelTitle}>AI Research Insights</span>
          </div>

          <div className={styles.insightsGrid}>
            {/* SEO Keywords */}
            {profile.seoInsights?.primaryKeywords && profile.seoInsights.primaryKeywords.length > 0 && (
              <div className={styles.insightCard}>
                <div className={styles.insightCardTitle}>Recommended Keywords</div>
                <div className={styles.insightTags}>
                  {profile.seoInsights.primaryKeywords.slice(0, 5).map((keyword, i) => (
                    <span key={i} className={`${styles.insightTag} ${styles.keyword}`}>
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Competitors */}
            {profile.competitorAnalysis?.competitors && profile.competitorAnalysis.competitors.length > 0 && (
              <div className={styles.insightCard}>
                <div className={styles.insightCardTitle}>Competitors Found</div>
                <div className={styles.insightTags}>
                  {profile.competitorAnalysis.competitors.slice(0, 4).map((comp, i) => (
                    <span key={i} className={`${styles.insightTag} ${styles.competitor}`}>
                      {comp}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Local SEO Score */}
            {profile.seoInsights?.localSEOScore !== undefined && (
              <div className={styles.insightCard}>
                <div className={styles.insightCardTitle}>Local SEO Score</div>
                <div className={styles.insightScore}>
                  <span className={styles.scoreValue}>{profile.seoInsights.localSEOScore}</span>
                  <span className={styles.scoreLabel}>/ 100</span>
                </div>
              </div>
            )}

            {/* USP Strength */}
            {profile.conversionInsights?.uspStrength !== undefined && (
              <div className={styles.insightCard}>
                <div className={styles.insightCardTitle}>USP Strength</div>
                <div className={styles.insightScore}>
                  <span className={styles.scoreValue}>{profile.conversionInsights.uspStrength}</span>
                  <span className={styles.scoreLabel}>/ 100</span>
                </div>
              </div>
            )}
          </div>

          {/* AI Notes */}
          {profile.aiTeamNotes && (profile.aiTeamNotes.maverick || profile.aiTeamNotes.kimi) && (
            <div className={styles.aiNotes}>
              <div className={styles.aiNotesHeader}>
                <span>💡</span>
                <span>AI Recommendations</span>
              </div>
              <div className={styles.aiNotesContent}>
                {profile.aiTeamNotes.maverick && (
                  <p><strong>Strategic Insights:</strong> {profile.aiTeamNotes.maverick}</p>
                )}
                {profile.aiTeamNotes.kimi && (
                  <p style={{ marginTop: '0.5rem' }}><strong>Analysis:</strong> {profile.aiTeamNotes.kimi}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
