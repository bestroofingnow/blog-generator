// lib/enhanced-prompts.ts
// Enhanced SEO-optimized content generation prompts

import { CompanyProfile, PageType, BrandVoice, WritingStyle } from "./page-types";

export interface EnhancedPromptParams {
  companyProfile: CompanyProfile;
  pageType: PageType;
  topic: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  wordCount: number;
  location?: string;
  customInstructions?: string;
}

// Calculate keyword density requirements
export function calculateKeywordRequirements(wordCount: number): {
  minMentions: number;
  maxMentions: number;
  minDensity: string;
  maxDensity: string;
} {
  const minMentions = Math.ceil(wordCount / 112);
  const maxMentions = Math.floor((wordCount / 122) * 2);
  const minDensity = ((minMentions / wordCount) * 100).toFixed(2);
  const maxDensity = ((maxMentions / wordCount) * 100).toFixed(2);

  return { minMentions, maxMentions, minDensity, maxDensity };
}

// Get brand voice description
export function getBrandVoiceDescription(voice: BrandVoice | undefined): string {
  const voiceDescriptions: Record<BrandVoice, string> = {
    professional: "Formal, authoritative, and industry expert. Use precise language and demonstrate deep expertise.",
    friendly: "Warm, approachable, and conversational. Write like you're talking to a neighbor who needs help.",
    authoritative: "Expert and confident thought leader. Assert positions based on experience and data.",
    educational: "Informative and helpful teacher-like tone. Explain complex concepts in accessible ways.",
    innovative: "Forward-thinking and cutting-edge. Showcase new technologies and modern solutions.",
    local: "Community-focused and neighborhood-oriented. Emphasize local knowledge and relationships.",
    luxury: "Premium, exclusive, and sophisticated. Appeal to discerning clients who value quality.",
    value: "Budget-conscious and practical. Focus on ROI, savings, and smart investments.",
  };

  return voice ? voiceDescriptions[voice] : voiceDescriptions.professional;
}

// Get writing style description
export function getWritingStyleDescription(style: WritingStyle | undefined): string {
  const styleDescriptions: Record<WritingStyle, string> = {
    conversational: "Natural flow, easy to read, and engaging. Use contractions and direct address (you/your).",
    formal: "Business-like structure and professional language. Avoid colloquialisms.",
    storytelling: "Narrative-driven with emotional hooks. Use anecdotes, case studies, and relatable scenarios.",
    "data-driven": "Facts, statistics, and research-based. Include specific numbers, percentages, and citations.",
    actionable: "Step-by-step and practical. Include clear instructions, checklists, and how-to guidance.",
    persuasive: "Benefit-oriented and compelling. Focus on transformation and outcomes.",
  };

  return style ? styleDescriptions[style] : styleDescriptions.conversational;
}

// Helper to get effective industry display name
function getIndustryDisplayName(companyProfile: CompanyProfile): string {
  if (companyProfile.industryType === "custom" && companyProfile.customIndustryName) {
    return companyProfile.customIndustryName;
  }
  return companyProfile.industryType;
}

// Generate the master blog post prompt
export function generateEnhancedBlogPrompt(params: EnhancedPromptParams): string {
  const {
    companyProfile,
    topic,
    primaryKeyword,
    secondaryKeywords,
    wordCount,
    location,
    customInstructions,
  } = params;

  const keywordReqs = calculateKeywordRequirements(wordCount);
  const brandVoiceDesc = getBrandVoiceDescription(companyProfile.brandVoice);
  const writingStyleDesc = getWritingStyleDescription(companyProfile.writingStyle);
  const targetLocation = location || companyProfile.headquarters;
  const industryName = getIndustryDisplayName(companyProfile);
  const socialLinksStr = companyProfile.socialLinks
    ? Object.entries(companyProfile.socialLinks)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")
    : "N/A";

  return `# TASK
Create an exceptional, SEO-optimized blog post that ranks #1 on Google, drives organic traffic, generates qualified leads, and positions ${companyProfile.name} as the definitive authority in ${industryName}. This content must achieve award-winning quality while seamlessly integrating conversion elements.

# ROLE
You are an elite SEO copywriting specialist and content strategist with 15+ years of experience creating viral, conversion-focused content. You combine the analytical precision of an SEO technical expert with the creative genius of an award-winning journalist.

# CONTEXT
Company: ${companyProfile.name}
Industry: ${industryName}
Target Location: ${targetLocation}, ${companyProfile.stateAbbr}
Target Audience: ${companyProfile.targetAudienceDescription || companyProfile.audience}
Content Length: ${wordCount} words (EXACT - this is critical for SEO)
Website: ${companyProfile.website || "N/A"}
Social Presence: ${socialLinksStr}
Company USPs: ${companyProfile.usps.join(", ")}
Services: ${companyProfile.services.slice(0, 8).join(", ")}
${companyProfile.certifications?.length ? `Certifications: ${companyProfile.certifications.join(", ")}` : ""}
${companyProfile.yearsInBusiness ? `Years in Business: ${companyProfile.yearsInBusiness}` : ""}
${companyProfile.projectsCompleted ? `Projects Completed: ${companyProfile.projectsCompleted}+` : ""}

# TOPIC
${topic}

# SEO REQUIREMENTS (CRITICAL)

## Primary Keyword: "${primaryKeyword}"
- MINIMUM mentions: ${keywordReqs.minMentions} times (1 per 112 words)
- MAXIMUM mentions: ${keywordReqs.maxMentions} times (no more than 2 per 122 words)
- Target density: ${keywordReqs.minDensity}% - ${keywordReqs.maxDensity}%
- Must appear in: H1 title, first paragraph, at least 2 H2 headers, conclusion, and meta description

## Secondary Keywords (integrate naturally throughout):
${secondaryKeywords.map((kw, i) => `${i + 1}. "${kw}"`).join("\n")}

## Technical SEO Elements Required:
- Title Tag: 55-60 characters with primary keyword near the front
- Meta Description: 155-160 characters with primary keyword and compelling CTA
- H1: One unique H1 with primary keyword
- H2s: 5-8 section headers, at least 3 containing keywords
- H3s: Use for subsections where appropriate
- Internal Linking: Suggest 3-5 places to link to other service/location pages
- External Authority: Reference 2-3 credible industry sources or statistics

# CONTENT STRUCTURE TEMPLATE

## 1. MAGNETIC HEADLINE (H1)
Create a headline that:
- Includes primary keyword naturally
- Has emotional trigger (fear, curiosity, urgency, or aspiration)
- Promises clear benefit
- Is under 60 characters

## 2. HOOK INTRODUCTION (150-200 words)
Pattern to follow:
"If you're in [location] and dealing with [pain point], you're not alone. [Statistic or fact about the problem]. But what if there was a proven solution that [benefit]? In this comprehensive guide, we'll reveal..."
- Agitate the problem
- Preview the solution
- Establish authority
- Include primary keyword in first 100 words

## 3. TABLE OF CONTENTS
Create a clickable outline of all H2 sections

## 4. MAIN CONTENT SECTIONS (H2s with supporting H3s)
Each section should be 200-300 words with subheading. Include:

### Section 1: Problem Definition & Impact
- What is the problem?
- Why does it matter in ${targetLocation}?
- What are the costs of inaction?

### Section 2: Industry-Specific Challenges
- Local factors in ${companyProfile.state}
- Seasonal considerations
- Common mistakes homeowners/businesses make

### Section 3: Comprehensive Solution Framework
- How ${companyProfile.name} approaches this
- Step-by-step process
- What sets the approach apart

### Section 4: Implementation Strategies
- DIY vs Professional considerations
- What to expect during the process
- Timeline and investment factors

### Section 5: Case Study/Success Story
- Real scenario (can be anonymized)
- Before/after transformation
- Measurable results

### Section 6: Future Trends & Prevention
- Emerging solutions in ${industryName}
- Preventative measures
- Long-term maintenance tips

## 5. KEY TAKEAWAYS
- Bulleted summary (5-7 points)
- Each point should be actionable
- Reinforce primary keyword and main benefits

## 6. FAQ SECTION (Schema-ready)
Include 5-6 common questions formatted as:
Q: [Question with keyword variation]
A: [Concise, helpful answer 50-75 words]

## 7. COMPELLING CONCLUSION
- Reinforce value proposition
- Include primary CTA
- Create urgency without being pushy
- Mention ${companyProfile.name}'s key differentiators

# TONE & VOICE

## Brand Voice: ${companyProfile.brandVoice || "professional"}
${brandVoiceDesc}

## Writing Style: ${companyProfile.writingStyle || "conversational"}
${writingStyleDesc}

## Audience Considerations:
- ${companyProfile.audience === "homeowners" ? "Homeowners who value their property investment" : ""}
- ${companyProfile.audience === "commercial" ? "Business owners focused on ROI and minimal disruption" : ""}
- ${companyProfile.audience === "both" ? "Both residential homeowners and commercial property managers" : ""}
- Decision-makers who need comprehensive, trustworthy information
- People comparing multiple providers in ${targetLocation}

# HUMAN-LIKE WRITING AUTHENTICITY
To ensure the content reads naturally and passes AI detection:
- Include 3-5 subtle grammar variations that feel natural (occasional split infinitives, sentences ending with prepositions)
- Vary sentence length dramatically (some 5-word sentences, some 25+ words)
- Use contractions naturally (you're, we've, it's)
- Include 1-2 rhetorical questions per section
- Add transitional phrases that feel conversational
- Occasionally start sentences with "And" or "But"

# CONVERSION ELEMENTS TO INTEGRATE

## Calls-to-Action (include 3-4 strategically placed):
1. Above the fold: Soft CTA (learn more, get guide)
2. Mid-content: Direct CTA (schedule consultation, get quote)
3. Post-case study: Social proof CTA (see more results)
4. Conclusion: Strong CTA (contact today, call now)

## Trust Signals to Include:
${companyProfile.usps.slice(0, 4).map((usp) => `- ${usp}`).join("\n")}
${companyProfile.certifications?.length ? `- ${companyProfile.certifications.join(", ")}` : ""}
${companyProfile.yearsInBusiness ? `- ${companyProfile.yearsInBusiness}+ years serving ${companyProfile.state}` : ""}

## Lead Magnet Suggestions (mention 1-2):
- Free inspection/consultation
- Cost calculator or estimate
- Seasonal maintenance checklist
- Buyer's guide PDF

# THINGS TO AVOID (CRITICAL)

## Content Problems:
- Generic advice available everywhere
- Keyword stuffing or unnatural phrasing
- Promotional content disguised as education
- Outdated statistics or irrelevant examples
- Jargon without explanation
- Shallow coverage of complex topics
- Clickbait that doesn't deliver value

## Technical Errors:
- Missing or poorly optimized title/meta
- No internal linking opportunities noted
- Images without alt text suggestions
- Thin content under ${Math.round(wordCount * 0.9)} words

## Writing Mistakes:
- Subject-verb disagreement
- Incorrect tense usage
- Misspellings of industry terms
- Errors in headlines, CTAs, or company name

${customInstructions ? `# CUSTOM INSTRUCTIONS\n${customInstructions}` : ""}

# OUTPUT FORMAT

Return the blog post in clean HTML format suitable for WordPress with:
- Proper heading hierarchy (h1, h2, h3)
- Paragraph tags for body text
- Unordered/ordered lists where appropriate
- [IMAGE:0], [IMAGE:1], [IMAGE:2] placeholders for images (with suggested alt text in comments)
- [INTERNAL_LINK:page-type] placeholders for internal links
- Schema-ready FAQ section
- Meta title and description at the top in HTML comments

Example start:
\`\`\`html
<!-- META TITLE: Your 55-60 char title here -->
<!-- META DESCRIPTION: Your 155-160 char description here -->
<!-- PRIMARY KEYWORD: ${primaryKeyword} -->
<!-- WORD COUNT TARGET: ${wordCount} -->

<article>
<h1>Your Magnetic Headline Here</h1>
...
</article>
\`\`\`

Now generate the complete blog post following all requirements above. The content must be EXACTLY ${wordCount} words (excluding HTML tags).`;
}

// Generate outline prompt for enhanced blog
export function generateEnhancedOutlinePrompt(params: EnhancedPromptParams): string {
  const {
    companyProfile,
    topic,
    primaryKeyword,
    secondaryKeywords,
    wordCount,
    location,
  } = params;

  const targetLocation = location || companyProfile.headquarters;
  const keywordReqs = calculateKeywordRequirements(wordCount);
  const industryName = getIndustryDisplayName(companyProfile);

  return `You are an elite SEO content strategist. Create a detailed outline for an SEO-optimized blog post.

# CONTEXT
Company: ${companyProfile.name}
Industry: ${industryName}
Location: ${targetLocation}, ${companyProfile.stateAbbr}
Topic: ${topic}
Primary Keyword: "${primaryKeyword}"
Secondary Keywords: ${secondaryKeywords.join(", ")}
Target Word Count: ${wordCount} words
Brand Voice: ${companyProfile.brandVoice || "professional"}
Writing Style: ${companyProfile.writingStyle || "conversational"}

# KEYWORD REQUIREMENTS
- Primary keyword must appear ${keywordReqs.minMentions}-${keywordReqs.maxMentions} times
- Include in H1, intro, 2+ H2s, conclusion

# OUTPUT JSON FORMAT
Return a JSON object with this exact structure:
{
  "metaTitle": "55-60 char title with keyword",
  "metaDescription": "155-160 char description with keyword and CTA",
  "h1": "Magnetic headline with keyword",
  "introduction": {
    "hook": "Opening hook sentence",
    "problem": "Problem agitation",
    "solution": "Solution preview",
    "authority": "Establish expertise"
  },
  "sections": [
    {
      "id": "section-1",
      "type": "problem",
      "h2": "H2 title",
      "keyPoints": ["point 1", "point 2", "point 3"],
      "wordCount": 250,
      "includeImage": true,
      "imagePrompt": "Description for AI image generation"
    }
  ],
  "faqQuestions": [
    {
      "question": "FAQ question with keyword variation",
      "answerSummary": "Brief answer summary"
    }
  ],
  "keyTakeaways": ["takeaway 1", "takeaway 2"],
  "internalLinkSuggestions": ["service page", "location page", "related blog"],
  "ctaPlacements": [
    {
      "location": "after-intro",
      "type": "soft",
      "text": "CTA text suggestion"
    }
  ]
}

Generate the outline now:`;
}

// Generate image prompts based on content section
export function generateImagePrompt(
  section: string,
  companyProfile: CompanyProfile,
  primaryKeyword: string,
  index: number
): string {
  const industryVisuals: Record<string, string[]> = {
    roofing: ["roof installation", "shingle work", "aerial roof view", "professional roofer"],
    hvac: ["HVAC unit", "technician servicing", "thermostat", "air quality"],
    plumbing: ["modern bathroom", "plumber working", "pipes", "water efficiency"],
    electrical: ["electrical panel", "lighting installation", "electrician", "smart home"],
    landscaping: ["beautiful lawn", "garden design", "landscaper working", "outdoor living"],
    painting: ["fresh paint", "painter working", "color consultation", "interior design"],
    cleaning: ["sparkling clean", "professional cleaner", "before after", "commercial space"],
    pest_control: ["pest-free home", "technician spraying", "prevention", "inspection"],
    flooring: ["hardwood floor", "tile installation", "flooring expert", "interior"],
    windows: ["new windows", "window installation", "energy efficient", "natural light"],
    solar: ["solar panels", "roof installation", "green energy", "technician"],
    moving: ["moving truck", "professional movers", "packing", "new home"],
    home_security: ["security system", "smart lock", "monitoring", "safe home"],
    garage_doors: ["garage door", "installation", "opener", "curb appeal"],
    fencing: ["fence installation", "privacy fence", "property line", "craftsman"],
    concrete: ["concrete work", "driveway", "patio", "professional finish"],
  };

  const industryName = getIndustryDisplayName(companyProfile);
  const visuals = industryVisuals[companyProfile.industryType] || ["professional service", "quality work"];
  const visual = visuals[index % visuals.length];

  return `Professional, high-quality photograph showing ${visual} related to ${primaryKeyword}.
Scene: ${section} in ${companyProfile.headquarters}, ${companyProfile.stateAbbr}.
Style: Clean, modern, trustworthy. Natural lighting, no text overlays.
Business context: ${industryName} services.
Must look authentic and professional, suitable for a top-tier business website.`;
}

// CTA templates by type and position
export const CTA_TEMPLATES = {
  soft: [
    "Download our free {industry} guide",
    "Get your complimentary consultation",
    "See how we can help",
    "Learn more about our process",
  ],
  direct: [
    "Schedule your free estimate today",
    "Call {phone} for immediate service",
    "Get your quote in 24 hours",
    "Book your appointment now",
  ],
  social_proof: [
    "See what our {city} customers say",
    "Join {count}+ satisfied customers",
    "Read our 5-star reviews",
    "View our recent projects",
  ],
  urgency: [
    "Limited availability - schedule now",
    "Don't wait until it's too late",
    "Spring special - {discount}% off",
    "Book this week for priority service",
  ],
};

// Generate CTA text
export function generateCTAText(
  type: keyof typeof CTA_TEMPLATES,
  companyProfile: CompanyProfile
): string {
  const templates = CTA_TEMPLATES[type];
  const template = templates[Math.floor(Math.random() * templates.length)];
  const industryName = getIndustryDisplayName(companyProfile);

  return template
    .replace("{industry}", industryName)
    .replace("{phone}", companyProfile.phone)
    .replace("{city}", companyProfile.headquarters)
    .replace("{count}", String(companyProfile.projectsCompleted || 500))
    .replace("{discount}", "15");
}

// Export all utilities
export type { EnhancedPromptParams as PromptParams };
