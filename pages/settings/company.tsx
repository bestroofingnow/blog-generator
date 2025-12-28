// pages/settings/company.tsx
// Company profile settings page

import React, { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import { useSession } from "next-auth/react";
import styles from "../../styles/CompanySettings.module.css";
import { useOnboardingTrigger } from "../../components/onboarding/OnboardingTrigger";
import { useCompanyResearch } from "../../lib/hooks/useCompanyResearch";
import type { CompanyProfile, SocialLinks, AdditionalLink, LinkCategory } from "../../lib/page-types";
import { calculateProfileCompleteness, getIncompleteFields } from "../../lib/profile-utils";

// Options
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
  { value: "custom", label: "Other" },
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

const LINK_CATEGORIES = [
  { value: "directory", label: "Directory" },
  { value: "manufacturer", label: "Manufacturer" },
  { value: "networking", label: "Networking" },
  { value: "association", label: "Association" },
  { value: "review_platform", label: "Review" },
  { value: "custom", label: "Other" },
];

export default function CompanySettingsPage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<Partial<CompanyProfile>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["basic", "branding"]));

  // Onboarding wizard hook
  const { openWizard, WizardModal } = useOnboardingTrigger();

  // Research hook
  const { research, isResearching } = useCompanyResearch();

  // Get user ID for dependency tracking
  const userId = (session?.user as { id?: string })?.id;

  // Load profile on mount and when user changes
  useEffect(() => {
    if (userId) {
      setIsLoading(true);
      setProfile({}); // Clear profile when user changes
      loadProfile();
    }
  }, [userId]);

  const loadProfile = async () => {
    try {
      const response = await fetch("/api/profile");
      if (response.ok) {
        const data = await response.json();
        if (data.profile?.companyProfile) {
          setProfile(data.profile.companyProfile);
        }
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-save with debounce
  const saveProfile = useCallback(async (updatedProfile: Partial<CompanyProfile>) => {
    setSaveStatus("saving");

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyProfileFields: updatedProfile }),
      });

      if (response.ok) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        console.error("Failed to save profile:", response.status);
        setSaveStatus("idle");
      }
    } catch (error) {
      console.error("Failed to save profile:", error);
      setSaveStatus("idle");
    }
  }, []);

  const updateField = useCallback(
    (field: keyof CompanyProfile, value: unknown) => {
      const updated = { ...profile, [field]: value };
      setProfile(updated);
      saveProfile(updated);
    },
    [profile, saveProfile]
  );

  const updateSocialLink = useCallback(
    (platform: keyof SocialLinks, value: string) => {
      const updated = {
        ...profile,
        socialLinks: {
          ...profile.socialLinks,
          [platform]: value,
        },
      };
      setProfile(updated);
      saveProfile(updated);
    },
    [profile, saveProfile]
  );

  const toggleSection = (section: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleReResearch = async () => {
    if (!profile.website) return;

    const result = await research(profile.website);
    if (result) {
      const merged = { ...profile, ...result.profile };
      setProfile(merged);
      saveProfile(merged);
    }
  };

  // Calculate completeness
  const completeness = calculateProfileCompleteness(profile as CompanyProfile);
  const incompleteFields = getIncompleteFields(profile as CompanyProfile);
  const highPriorityMissing = incompleteFields.filter((f) => f.priority === "high");

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Company Settings | Blog Generator</title>
      </Head>

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>Company Settings</h1>
            <p className={styles.subtitle}>
              Manage your company profile and online presence
            </p>
          </div>
          <div className={styles.headerActions}>
            {saveStatus === "saving" && (
              <span className={`${styles.saveIndicator} ${styles.saving}`}>
                Saving...
              </span>
            )}
            {saveStatus === "saved" && (
              <span className={`${styles.saveIndicator} ${styles.saved}`}>
                Saved
              </span>
            )}
            <button className={`${styles.button} ${styles.buttonOutline}`} onClick={openWizard}>
              Run Setup Wizard
            </button>
          </div>
        </div>

        {/* Completeness Banner */}
        {completeness < 100 && (
          <div className={styles.completenessBanner}>
            <div className={styles.completenessProgress}>
              <svg className={styles.completenessCircle} viewBox="0 0 36 36">
                <circle
                  className={styles.completenessBackground}
                  cx="18"
                  cy="18"
                  r="15"
                />
                <circle
                  className={styles.completenessFill}
                  cx="18"
                  cy="18"
                  r="15"
                  strokeDasharray={`${completeness}, 100`}
                />
              </svg>
              <span className={styles.completenessText}>{completeness}%</span>
            </div>
            <div className={styles.completenessInfo}>
              <div className={styles.completenessTitle}>
                Profile {completeness}% Complete
              </div>
              <div className={styles.completenessMessage}>
                {completeness < 50
                  ? "Complete your profile to generate better content"
                  : "Almost there! Just a few more details"}
              </div>
              {highPriorityMissing.length > 0 && (
                <div className={styles.completenessMissing}>
                  {highPriorityMissing.slice(0, 3).map((field) => (
                    <span key={field.field} className={styles.missingField}>
                      Missing: {field.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Basic Information */}
        <Section
          id="basic"
          icon="🏢"
          title="Basic Information"
          subtitle="Company name, contact, and location"
          isOpen={openSections.has("basic")}
          onToggle={() => toggleSection("basic")}
        >
          <div className={styles.formGrid}>
            <InputField
              label="Company Name"
              value={profile.name || ""}
              onChange={(v) => updateField("name", v)}
              placeholder="Your Company Name"
            />
            <InputField
              label="Tagline"
              value={profile.tagline || ""}
              onChange={(v) => updateField("tagline", v)}
              placeholder="Your company's slogan"
            />
            <InputField
              label="Phone"
              value={profile.phone || ""}
              onChange={(v) => updateField("phone", v)}
              placeholder="(555) 123-4567"
              type="tel"
            />
            <InputField
              label="Email"
              value={profile.email || ""}
              onChange={(v) => updateField("email", v)}
              placeholder="contact@company.com"
              type="email"
            />
            <InputField
              label="Website"
              value={profile.website || ""}
              onChange={(v) => updateField("website", v)}
              placeholder="https://yourcompany.com"
              type="url"
            />
            <SelectField
              label="Industry"
              value={profile.industryType || ""}
              onChange={(v) => updateField("industryType", v)}
              options={INDUSTRY_OPTIONS}
            />
            {profile.industryType === "custom" && (
              <InputField
                label="Your Industry"
                value={profile.customIndustryName || ""}
                onChange={(v) => updateField("customIndustryName", v)}
                placeholder="Enter your industry (e.g., Pool Services, Tree Care)"
              />
            )}
            <SelectField
              label="State"
              value={profile.stateAbbr || ""}
              onChange={(v) => {
                updateField("stateAbbr", v);
                const stateName = US_STATES.find((s) => s.value === v)?.label || "";
                updateField("state", stateName);
              }}
              options={US_STATES}
            />
            <InputField
              label="City"
              value={profile.headquarters || ""}
              onChange={(v) => updateField("headquarters", v)}
              placeholder="Main city"
            />
            <div className={styles.formGridFull}>
              <InputField
                label="Address"
                value={profile.address || ""}
                onChange={(v) => updateField("address", v)}
                placeholder="Full business address"
              />
            </div>
          </div>
        </Section>

        {/* Services */}
        <Section
          id="services"
          icon="🔧"
          title="Services & USPs"
          subtitle="What you offer and what makes you different"
          isOpen={openSections.has("services")}
          onToggle={() => toggleSection("services")}
        >
          <div className={styles.formGrid}>
            <div className={styles.formGridFull}>
              <TagsField
                label="Services Offered"
                tags={profile.services || []}
                onChange={(tags) => updateField("services", tags)}
                placeholder="Add a service..."
              />
            </div>
            <div className={styles.formGridFull}>
              <TagsField
                label="Unique Selling Points"
                tags={profile.usps || []}
                onChange={(tags) => updateField("usps", tags)}
                placeholder="What makes you different?"
              />
            </div>
            <div className={styles.formGridFull}>
              <TagsField
                label="Certifications & Awards"
                tags={profile.certifications || []}
                onChange={(tags) => updateField("certifications", tags)}
                placeholder="Add certifications..."
              />
            </div>
            <div className={styles.formGridFull}>
              <TagsField
                label="Service Areas"
                tags={profile.cities || []}
                onChange={(tags) => updateField("cities", tags)}
                placeholder="Add cities you serve..."
              />
            </div>
          </div>
        </Section>

        {/* SEO & Site Identity */}
        <Section
          id="seo"
          icon="🎯"
          title="SEO & Site Identity"
          subtitle="Primary keywords and site focus for all content"
          isOpen={openSections.has("seo")}
          onToggle={() => toggleSection("seo")}
        >
          <div className={styles.formGrid}>
            <div className={styles.formGridFull}>
              <InputField
                label="Primary Site Keyword"
                value={profile.primarySiteKeyword || ""}
                onChange={(v) => updateField("primarySiteKeyword", v)}
                placeholder="Main keyword for your entire site (e.g., 'horse farm realty', 'landscape lighting')"
              />
              <p className={styles.fieldHelp}>
                This is the #1 keyword you want to rank for. All research and content will be tailored around this.
              </p>
            </div>
            <div className={styles.formGridFull}>
              <TagsField
                label="Secondary Site Keywords"
                tags={profile.secondarySiteKeywords || []}
                onChange={(tags) => updateField("secondarySiteKeywords", tags)}
                placeholder="Add supporting keywords..."
              />
            </div>
            <div className={styles.formGridFull}>
              <TextAreaField
                label="Site Description"
                value={profile.siteDescription || ""}
                onChange={(v) => updateField("siteDescription", v)}
                placeholder="Brief description of what your business/website is about..."
                rows={3}
              />
            </div>
          </div>
        </Section>

        {/* Brand & Personality */}
        <Section
          id="branding"
          icon="✨"
          title="Brand & Personality"
          subtitle="How your business communicates and presents itself"
          isOpen={openSections.has("branding")}
          onToggle={() => toggleSection("branding")}
        >
          <div className={styles.formGrid}>
            <SelectField
              label="Brand Voice"
              value={profile.brandVoice || ""}
              onChange={(v) => updateField("brandVoice", v)}
              options={[
                { value: "professional", label: "Professional" },
                { value: "friendly", label: "Friendly" },
                { value: "authoritative", label: "Authoritative" },
                { value: "educational", label: "Educational" },
                { value: "innovative", label: "Innovative" },
                { value: "local", label: "Local/Community" },
                { value: "luxury", label: "Premium/Luxury" },
                { value: "value", label: "Value-Focused" },
                { value: "custom", label: "Custom" },
              ]}
            />
            <SelectField
              label="Writing Style"
              value={profile.writingStyle || ""}
              onChange={(v) => updateField("writingStyle", v)}
              options={[
                { value: "conversational", label: "Conversational" },
                { value: "formal", label: "Formal" },
                { value: "storytelling", label: "Storytelling" },
                { value: "data-driven", label: "Data-Driven" },
                { value: "actionable", label: "Actionable" },
                { value: "persuasive", label: "Persuasive" },
                { value: "custom", label: "Custom" },
              ]}
            />
            <div className={styles.formGridFull}>
              <InputField
                label="Business Personality"
                value={profile.businessPersonality || ""}
                onChange={(v) => updateField("businessPersonality", v)}
                placeholder="How you want to be perceived (e.g., 'friendly neighborhood expert', 'premium luxury service')"
              />
            </div>
            <div className={styles.formGridFull}>
              <TextAreaField
                label="Value Proposition"
                value={profile.valueProposition || ""}
                onChange={(v) => updateField("valueProposition", v)}
                placeholder="What makes your business unique? Why should customers choose you?"
                rows={2}
              />
            </div>
            <div className={styles.formGridFull}>
              <TextAreaField
                label="Mission Statement"
                value={profile.missionStatement || ""}
                onChange={(v) => updateField("missionStatement", v)}
                placeholder="Your company's mission or purpose..."
                rows={2}
              />
            </div>
            <div className={styles.formGridFull}>
              <TextAreaField
                label="Brand Story"
                value={profile.brandStory || ""}
                onChange={(v) => updateField("brandStory", v)}
                placeholder="Brief background story about your company (used in content)..."
                rows={3}
              />
            </div>
          </div>
        </Section>

        {/* Competitors */}
        <Section
          id="competitors"
          icon="🏁"
          title="Competitors"
          subtitle="Track competitors for research and content strategy"
          isOpen={openSections.has("competitors")}
          onToggle={() => toggleSection("competitors")}
        >
          <div className={styles.formGrid}>
            <div className={styles.formGridFull}>
              <TagsField
                label="Competitor Names"
                tags={profile.competitors || []}
                onChange={(tags) => updateField("competitors", tags)}
                placeholder="Add competitor business names..."
              />
            </div>
            <div className={styles.formGridFull}>
              <TagsField
                label="Competitor Websites"
                tags={profile.competitorWebsites || []}
                onChange={(tags) => updateField("competitorWebsites", tags)}
                placeholder="Add competitor website URLs (e.g., competitor.com)..."
              />
              <p className={styles.fieldHelp}>
                We&apos;ll research these competitors to find content gaps and opportunities for your blog.
              </p>
            </div>
          </div>
        </Section>

        {/* Social Media */}
        <Section
          id="social"
          icon="📱"
          title="Social Media"
          subtitle="Connect your social profiles"
          isOpen={openSections.has("social")}
          onToggle={() => toggleSection("social")}
        >
          <div className={styles.formGrid}>
            {[
              { key: "facebook", label: "Facebook" },
              { key: "instagram", label: "Instagram" },
              { key: "linkedin", label: "LinkedIn" },
              { key: "twitter", label: "X (Twitter)" },
              { key: "youtube", label: "YouTube" },
              { key: "googleBusiness", label: "Google Business" },
              { key: "yelp", label: "Yelp" },
              { key: "nextdoor", label: "Nextdoor" },
            ].map(({ key, label }) => (
              <InputField
                key={key}
                label={label}
                value={profile.socialLinks?.[key as keyof SocialLinks] || ""}
                onChange={(v) => updateSocialLink(key as keyof SocialLinks, v)}
                placeholder={`https://${key.toLowerCase()}.com/...`}
                type="url"
              />
            ))}
          </div>
        </Section>

        {/* Additional Links */}
        <Section
          id="links"
          icon="🔗"
          title="Additional Links"
          subtitle="Directories, manufacturers, networking groups"
          isOpen={openSections.has("links")}
          onToggle={() => toggleSection("links")}
        >
          <LinksSection
            links={profile.additionalLinks || []}
            onChange={(links) => updateField("additionalLinks", links)}
          />
        </Section>

        {/* AI Research */}
        {profile.website && (
          <div className={styles.researchSection}>
            <div className={styles.researchInfo}>
              Last researched:{" "}
              {profile.lastResearchedAt
                ? new Date(profile.lastResearchedAt).toLocaleDateString()
                : "Never"}
            </div>
            <button
              className={styles.researchButton}
              onClick={handleReResearch}
              disabled={isResearching}
            >
              {isResearching ? "Researching..." : "Re-Research Company"}
            </button>
          </div>
        )}
      </div>

      {WizardModal}
    </>
  );
}

// Section Component
function Section({
  id,
  icon,
  title,
  subtitle,
  isOpen,
  onToggle,
  children,
}: {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={onToggle}>
        <div className={styles.sectionLeft}>
          <div className={styles.sectionIcon}>{icon}</div>
          <div>
            <div className={styles.sectionTitle}>{title}</div>
            <div className={styles.sectionSubtitle}>{subtitle}</div>
          </div>
        </div>
        <span className={`${styles.sectionToggle} ${isOpen ? styles.open : ""}`}>
          ▼
        </span>
      </div>
      {isOpen && <div className={styles.sectionContent}>{children}</div>}
    </div>
  );
}

// Input Field Component
function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className={styles.inputGroup}>
      <label className={styles.label}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={styles.input}
      />
    </div>
  );
}

// TextArea Field Component
function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className={styles.inputGroup}>
      <label className={styles.label}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={styles.textarea}
        rows={rows}
      />
    </div>
  );
}

// Select Field Component
function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className={styles.inputGroup}>
      <label className={styles.label}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${styles.input} ${styles.select}`}
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Tags Field Component
function TagsField({
  label,
  tags,
  onChange,
  placeholder,
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      if (!tags.includes(inputValue.trim())) {
        onChange([...tags, inputValue.trim()]);
        setInputValue("");
      }
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className={styles.inputGroup}>
      <label className={styles.label}>{label}</label>
      <div className={styles.tagsContainer}>
        {tags.map((tag, i) => (
          <span key={i} className={styles.tag}>
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((_, idx) => idx !== i))}
              className={styles.tagRemove}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : "Add more..."}
          className={styles.tagInput}
        />
      </div>
    </div>
  );
}

// Links Section Component
function LinksSection({
  links,
  onChange,
}: {
  links: AdditionalLink[];
  onChange: (links: AdditionalLink[]) => void;
}) {
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newCategory, setNewCategory] = useState<LinkCategory>("directory");

  const addLink = () => {
    if (!newName || !newUrl) return;

    const newLink: AdditionalLink = {
      id: `manual-${Date.now()}`,
      name: newName,
      url: newUrl.startsWith("http") ? newUrl : `https://${newUrl}`,
      category: newCategory,
      isVerified: true,
      isAiSuggested: false,
      addedAt: new Date().toISOString(),
    };

    onChange([...links, newLink]);
    setNewName("");
    setNewUrl("");
  };

  const removeLink = (id: string) => {
    onChange(links.filter((l) => l.id !== id));
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

  return (
    <>
      {links.length > 0 && (
        <div className={styles.linksList}>
          {links.map((link) => (
            <div key={link.id} className={styles.linkItem}>
              <div className={styles.linkIcon}>{getCategoryIcon(link.category)}</div>
              <div className={styles.linkInfo}>
                <div className={styles.linkName}>{link.name}</div>
                <div className={styles.linkUrl}>{link.url}</div>
              </div>
              <span className={styles.linkCategory}>{link.category}</span>
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

      <div className={styles.addLinkForm}>
        <div className={styles.addLinkInputs}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Link name"
            className={`${styles.input} ${styles.addLinkInput}`}
          />
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://..."
            className={`${styles.input} ${styles.addLinkInput}`}
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as LinkCategory)}
            className={`${styles.input} ${styles.select} ${styles.addLinkSelect}`}
          >
            {LINK_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
        <button
          className={styles.addLinkButton}
          onClick={addLink}
          disabled={!newName || !newUrl}
        >
          Add Link
        </button>
      </div>
    </>
  );
}
