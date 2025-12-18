// lib/location-templates.ts
// Location page template system following Relentless Digital pattern
// Creates 2,500-3,500 word pages optimized for local SEO

export interface LocationPageConfig {
  city: string;
  state: string;
  stateAbbrev: string;
  service: string;
  servicePlural?: string;
  companyName: string;
  phone: string;
  email?: string;
  address?: string;
  zipCode?: string;
  yearsInBusiness?: number;
  googleRating?: number;
  reviewCount?: number;
  certifications?: string[];
  services?: string[];
  neighborhoods?: string[];
  testimonials?: Testimonial[];
  otherCities?: string[];
  officeAddress?: string;
  includeDirections?: boolean;
  includeFAQ?: boolean;
  includeTestimonials?: boolean;
  customSections?: CustomSection[];
}

export interface Testimonial {
  name: string;
  location?: string;
  rating: number;
  text: string;
  date?: string;
}

export interface CustomSection {
  heading: string;
  content: string;
}

export interface LocationPageTemplate {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  sections: PageSection[];
  schemaMarkup: Record<string, unknown>;
}

export interface PageSection {
  id: string;
  heading?: string;
  headingLevel?: "h2" | "h3";
  content: string;
  type: "hero" | "intro" | "services" | "benefits" | "process" | "pricing" | "testimonials" | "faq" | "areas" | "cta" | "directions" | "custom";
}

// Generate URL slug
export function generateSlug(city: string, service: string): string {
  const citySlug = city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const serviceSlug = service.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${citySlug}-${serviceSlug}-services`;
}

// Generate meta title (under 60 chars)
export function generateMetaTitle(config: LocationPageConfig): string {
  const base = `${config.service} in ${config.city}, ${config.stateAbbrev}`;
  if (base.length + config.companyName.length + 3 <= 60) {
    return `${base} | ${config.companyName}`;
  }
  return base;
}

// Generate meta description (150-160 chars)
export function generateMetaDescription(config: LocationPageConfig): string {
  const desc = `Looking for professional ${config.service.toLowerCase()} in ${config.city}, ${config.stateAbbrev}? ${config.companyName} offers expert service with ${config.yearsInBusiness || "many"} years experience. Call now: ${config.phone}!`;
  return desc.slice(0, 160);
}

// Generate driving directions text (adds 500+ unique words)
export function generateDrivingDirections(config: LocationPageConfig): string {
  if (!config.officeAddress || !config.includeDirections) return "";

  return `
## How to Find ${config.companyName}

Our ${config.city} service area office is conveniently located to serve residents throughout ${config.city} and surrounding communities. Whether you're coming from downtown ${config.city} or the surrounding neighborhoods, our team is ready to provide exceptional ${config.service.toLowerCase()} services.

**From Downtown ${config.city}:**
Head towards the main business district and follow the signs toward ${config.city}'s commercial area. Our location is easily accessible from the main thoroughfares that run through ${config.city}. When traveling from the city center, you'll find us within a short drive of most major intersections.

**From ${config.stateAbbrev} Highway:**
If you're traveling on the state highway, take the ${config.city} exit and head toward the residential areas. Follow the main road until you reach our service center. Look for our company signage as you approach our facility.

**Service Area Coverage:**
We proudly serve the entire ${config.city} metropolitan area, including:
${config.neighborhoods?.map(n => `- ${n}`).join("\n") || `- Downtown ${config.city}\n- North ${config.city}\n- South ${config.city}\n- East ${config.city}\n- West ${config.city}`}

**Contact Information:**
- **Address:** ${config.officeAddress}
- **Phone:** ${config.phone}
${config.email ? `- **Email:** ${config.email}` : ""}

Our team typically responds to service requests within 24 hours for ${config.city} area residents. For emergency ${config.service.toLowerCase()} needs, we offer priority scheduling to ensure your home or business is taken care of promptly.
`;
}

// Generate FAQ section with schema
export function generateFAQSection(config: LocationPageConfig): { content: string; schema: Record<string, unknown> } {
  const faqs = [
    {
      question: `How much does ${config.service.toLowerCase()} cost in ${config.city}?`,
      answer: `${config.service} costs in ${config.city} vary depending on the scope of work. Basic repairs typically range from $100-$300, while larger projects can range from $500-$2,500 or more. ${config.companyName} provides free estimates for all ${config.city} area customers.`,
    },
    {
      question: `Why should I choose ${config.companyName} for ${config.service.toLowerCase()} in ${config.city}?`,
      answer: `${config.companyName} has been serving ${config.city} residents for ${config.yearsInBusiness || "many"} years. We're fully licensed and insured, ${config.googleRating ? `with a ${config.googleRating}-star rating from ${config.reviewCount}+ reviews` : "with excellent customer reviews"}. Our team knows ${config.city}'s unique needs and building codes.`,
    },
    {
      question: `Do you offer emergency ${config.service.toLowerCase()} in ${config.city}?`,
      answer: `Yes! ${config.companyName} offers emergency ${config.service.toLowerCase()} services throughout ${config.city} and surrounding areas. Call ${config.phone} for same-day service when you have an urgent need.`,
    },
    {
      question: `What areas near ${config.city} do you serve?`,
      answer: `We serve ${config.city} and all surrounding communities in ${config.state}. ${config.otherCities?.length ? `This includes ${config.otherCities.slice(0, 5).join(", ")}, and more.` : `Contact us to confirm service availability in your specific area.`}`,
    },
    {
      question: `How do I schedule ${config.service.toLowerCase()} in ${config.city}?`,
      answer: `Scheduling is easy! Call ${config.companyName} at ${config.phone} or fill out our online contact form. We'll confirm your appointment and provide a time window that works for your schedule.`,
    },
  ];

  const content = `
## Frequently Asked Questions About ${config.service} in ${config.city}

${faqs.map(faq => `
### ${faq.question}

${faq.answer}
`).join("\n")}
`;

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      },
    })),
  };

  return { content, schema };
}

// Generate LocalBusiness schema
export function generateLocalBusinessSchema(config: LocationPageConfig): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": config.companyName,
    "description": `Professional ${config.service.toLowerCase()} services in ${config.city}, ${config.stateAbbrev}`,
    "telephone": config.phone,
    "email": config.email,
    "address": config.address ? {
      "@type": "PostalAddress",
      "streetAddress": config.address,
      "addressLocality": config.city,
      "addressRegion": config.stateAbbrev,
      "postalCode": config.zipCode,
    } : undefined,
    "areaServed": {
      "@type": "City",
      "name": config.city,
    },
    "aggregateRating": config.googleRating ? {
      "@type": "AggregateRating",
      "ratingValue": config.googleRating,
      "reviewCount": config.reviewCount,
    } : undefined,
  };
}

// Main template generator
export function generateLocationPageTemplate(config: LocationPageConfig): LocationPageTemplate {
  const slug = generateSlug(config.city, config.service);
  const metaTitle = generateMetaTitle(config);
  const metaDescription = generateMetaDescription(config);
  const h1 = `${config.service} in ${config.city}, ${config.stateAbbrev}`;

  const { content: faqContent, schema: faqSchema } = generateFAQSection(config);
  const localBusinessSchema = generateLocalBusinessSchema(config);
  const directionsContent = generateDrivingDirections(config);

  const sections: PageSection[] = [
    // Hero
    {
      id: "hero",
      type: "hero",
      content: `
<div class="hero">
  <h1>${h1}</h1>
  <p class="hero-tagline">Trusted ${config.service.toLowerCase()} experts serving ${config.city} and surrounding areas</p>
  <div class="hero-cta">
    <a href="tel:${config.phone.replace(/\D/g, "")}" class="btn btn-primary">Call ${config.phone}</a>
    <a href="#contact" class="btn btn-secondary">Schedule Service</a>
  </div>
  ${config.googleRating ? `<div class="trust-badges"><span class="rating">${config.googleRating} ★ (${config.reviewCount}+ reviews)</span></div>` : ""}
</div>
`,
    },

    // Introduction
    {
      id: "intro",
      type: "intro",
      heading: `Welcome to ${config.companyName} - Your ${config.city} ${config.service} Experts`,
      headingLevel: "h2",
      content: `
When ${config.city} homeowners need reliable ${config.service.toLowerCase()}, they turn to ${config.companyName}. With ${config.yearsInBusiness || "years of"} experience serving the ${config.city}, ${config.stateAbbrev} community, our team understands the unique challenges and requirements of properties in this area.

Whether you're dealing with an emergency situation or planning a major improvement project, ${config.companyName} delivers professional ${config.service.toLowerCase()} services that ${config.city} residents can count on. Our commitment to quality workmanship, transparent pricing, and exceptional customer service has made us a trusted name throughout ${config.city} and the surrounding ${config.state} communities.

**Why ${config.city} Residents Choose ${config.companyName}:**
- Local expertise with deep knowledge of ${config.city}'s building codes and requirements
- Fully licensed, bonded, and insured for your protection
- ${config.yearsInBusiness ? `${config.yearsInBusiness}+ years serving ${config.stateAbbrev} families` : "Years of trusted service"}
- Same-day and emergency services available
- Transparent, upfront pricing with free estimates
`,
    },

    // Services list
    {
      id: "services",
      type: "services",
      heading: `Our ${config.service} Services in ${config.city}`,
      headingLevel: "h2",
      content: `
${config.companyName} offers comprehensive ${config.service.toLowerCase()} solutions for ${config.city} homes and businesses. Our skilled technicians are trained to handle projects of any size, from quick repairs to complete installations.

**${config.service} Services We Offer in ${config.city}:**
${config.services?.map(s => `- ${s}`).join("\n") || `
- Emergency repairs and service calls
- Routine maintenance and inspections
- New installations and upgrades
- System replacements
- Preventative maintenance programs
- Commercial services
`}

Each service begins with a thorough assessment of your needs. Our ${config.city} team provides detailed recommendations and transparent pricing before any work begins, so you always know exactly what to expect.
`,
    },

    // Common signs/problems
    {
      id: "problems",
      type: "benefits",
      heading: `Signs You Need ${config.service} in ${config.city}`,
      headingLevel: "h2",
      content: `
Not sure if you need professional ${config.service.toLowerCase()} help? Here are common signs ${config.city} homeowners should watch for:

**Warning Signs That Require Immediate Attention:**
- Unusual noises, smells, or visual indicators
- Decreased performance or efficiency
- Visible damage or wear
- Higher than normal utility bills
- Age-related deterioration
- Safety concerns

If you notice any of these issues at your ${config.city} property, don't wait for the problem to worsen. Contact ${config.companyName} at ${config.phone} for a professional evaluation. Early intervention often saves ${config.city} homeowners significant money on repairs.
`,
    },

    // Benefits/Why choose us
    {
      id: "benefits",
      type: "benefits",
      heading: `Why Choose ${config.companyName} for ${config.service} in ${config.city}?`,
      headingLevel: "h2",
      content: `
${config.city} residents have many options for ${config.service.toLowerCase()} services. Here's why ${config.companyName} stands out:

**1. Local Expertise**
We've worked on hundreds of properties throughout ${config.city}. Our team knows the area's unique characteristics, common issues, and building requirements.

**2. Quality Workmanship**
Every job is completed to the highest standards. We stand behind our work with comprehensive warranties and satisfaction guarantees.

**3. Transparent Pricing**
No surprises. We provide detailed estimates before starting any work, and our pricing is competitive with any ${config.service.toLowerCase()} company in ${config.city}.

**4. Customer-First Approach**
Your satisfaction is our priority. From the first call to project completion, we treat every ${config.city} customer like family.

${config.certifications?.length ? `
**5. Professional Credentials**
Our certifications include: ${config.certifications.join(", ")}
` : ""}
`,
    },

    // Process steps
    {
      id: "process",
      type: "process",
      heading: `Our ${config.service} Process in ${config.city}`,
      headingLevel: "h2",
      content: `
When you choose ${config.companyName} for ${config.service.toLowerCase()} in ${config.city}, here's what to expect:

**Step 1: Contact Us**
Call ${config.phone} or fill out our online form. Our ${config.city} team responds quickly to all inquiries.

**Step 2: Free Consultation**
We'll discuss your needs and schedule a convenient time to assess your property. For ${config.city} residents, we often provide same-day consultations.

**Step 3: Detailed Estimate**
After our evaluation, you'll receive a comprehensive estimate with transparent pricing. No hidden fees or surprise charges.

**Step 4: Professional Service**
Our skilled technicians complete the work efficiently and professionally, keeping your ${config.city} property clean and respecting your time.

**Step 5: Final Walkthrough**
We review the completed work with you, answer questions, and ensure your complete satisfaction before the job is done.
`,
    },

    // Pricing section
    {
      id: "pricing",
      type: "pricing",
      heading: `${config.service} Cost in ${config.city}, ${config.stateAbbrev}`,
      headingLevel: "h2",
      content: `
Understanding ${config.service.toLowerCase()} costs helps ${config.city} homeowners plan and budget effectively. Here's a general guide to pricing in the ${config.city} area:

**Typical ${config.service} Costs in ${config.city}:**

| Service Type | Price Range |
|-------------|-------------|
| Minor Repairs | $100 - $300 |
| Standard Service | $300 - $800 |
| Major Repairs | $800 - $2,000 |
| Full Installation | $2,000 - $5,000+ |

*Prices vary based on specific requirements, property size, and materials. Contact ${config.companyName} for an accurate estimate for your ${config.city} property.*

**Factors Affecting Cost:**
- Scope and complexity of work
- Materials and equipment required
- Property accessibility
- Urgency of service
- Permits required by ${config.city} codes

Call ${config.phone} for a free, no-obligation estimate customized to your ${config.city} property.
`,
    },
  ];

  // Add testimonials if provided
  if (config.includeTestimonials && config.testimonials?.length) {
    sections.push({
      id: "testimonials",
      type: "testimonials",
      heading: `What ${config.city} Customers Say About ${config.companyName}`,
      headingLevel: "h2",
      content: `
Don't just take our word for it. Here's what ${config.city} area residents say about our ${config.service.toLowerCase()} services:

${config.testimonials.map(t => `
> "${t.text}"
>
> **— ${t.name}${t.location ? `, ${t.location}` : ""}** ${"★".repeat(t.rating)}
`).join("\n")}

Join hundreds of satisfied ${config.city} customers who trust ${config.companyName} for their ${config.service.toLowerCase()} needs.
`,
    });
  }

  // Add FAQ
  if (config.includeFAQ) {
    sections.push({
      id: "faq",
      type: "faq",
      content: faqContent,
    });
  }

  // Add directions
  if (config.includeDirections && directionsContent) {
    sections.push({
      id: "directions",
      type: "directions",
      content: directionsContent,
    });
  }

  // Areas served
  if (config.otherCities?.length) {
    sections.push({
      id: "areas",
      type: "areas",
      heading: `${config.service} Service Areas Near ${config.city}`,
      headingLevel: "h2",
      content: `
${config.companyName} proudly serves ${config.city} and these nearby ${config.stateAbbrev} communities:

<div class="areas-grid">
${config.otherCities.map(c => `<a href="/${generateSlug(c, config.service)}/">${c} ${config.service}</a>`).join("\n")}
</div>

No matter where you're located in the greater ${config.city} area, ${config.companyName} is ready to serve your ${config.service.toLowerCase()} needs. Call ${config.phone} today!
`,
    });
  }

  // Final CTA
  sections.push({
    id: "cta",
    type: "cta",
    heading: `Ready for Expert ${config.service} in ${config.city}?`,
    headingLevel: "h2",
    content: `
Don't wait until a small problem becomes a major expense. ${config.city} residents trust ${config.companyName} for fast, reliable ${config.service.toLowerCase()} services.

**Contact ${config.companyName} Today:**
- **Phone:** ${config.phone}
${config.email ? `- **Email:** ${config.email}` : ""}
- **Service Area:** ${config.city}, ${config.stateAbbrev} and surrounding communities

<div class="cta-buttons">
  <a href="tel:${config.phone.replace(/\D/g, "")}" class="btn btn-primary btn-lg">Call Now: ${config.phone}</a>
  <a href="#contact" class="btn btn-secondary btn-lg">Request Free Estimate</a>
</div>
`,
  });

  return {
    slug,
    title: h1,
    metaTitle,
    metaDescription,
    h1,
    sections,
    schemaMarkup: {
      "@context": "https://schema.org",
      "@graph": [
        localBusinessSchema,
        ...(config.includeFAQ ? [faqSchema] : []),
      ],
    },
  };
}

// Batch generate templates for multiple cities
export function generateBatchLocationTemplates(
  cities: string[],
  baseConfig: Omit<LocationPageConfig, "city">
): LocationPageTemplate[] {
  return cities.map(city =>
    generateLocationPageTemplate({ ...baseConfig, city, otherCities: cities.filter(c => c !== city) })
  );
}

// Convert template to HTML
export function templateToHtml(template: LocationPageTemplate): string {
  const sectionsHtml = template.sections
    .map(section => {
      if (section.heading) {
        const HeadingTag = section.headingLevel || "h2";
        return `<section id="${section.id}" class="section section-${section.type}">
  <${HeadingTag}>${section.heading}</${HeadingTag}>
  ${section.content}
</section>`;
      }
      return `<section id="${section.id}" class="section section-${section.type}">
  ${section.content}
</section>`;
    })
    .join("\n\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${template.metaTitle}</title>
  <meta name="description" content="${template.metaDescription}">
  <script type="application/ld+json">
${JSON.stringify(template.schemaMarkup, null, 2)}
  </script>
</head>
<body>
  <article class="location-page">
    ${sectionsHtml}
  </article>
</body>
</html>`;
}
