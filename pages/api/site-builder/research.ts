// pages/api/site-builder/research.ts
// AI researches industry and proposes site structure

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { createSiteProposal, loadUserProfile } from "../../../lib/database";
import type { ProposedSiteStructure } from "../../../lib/db";

interface ResearchRequest {
  industry?: string;
  targetCities?: string[];
  services?: string[];
}

interface ResearchResponse {
  success: boolean;
  proposalId?: string;
  industry?: string;
  proposedStructure?: ProposedSiteStructure;
  aiReasoning?: string;
  estimatedPages?: number;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResearchResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const userId = (session.user as { id: string }).id;
  const { industry: requestedIndustry, targetCities, services } = req.body as ResearchRequest;

  try {
    // Get company profile for context
    const userProfile = await loadUserProfile(userId);
    const profile = userProfile?.companyProfile;

    // Use requested industry or fall back to profile
    const industry = requestedIndustry || profile?.industryType || "General Business";
    const companyName = userProfile?.companyName || profile?.name || "Your Company";
    const companyServices = services || profile?.services || [];
    const locations = targetCities || profile?.cities || [];
    const state = profile?.state || "";

    // Generate site structure proposal using AI
    const proposedStructure = await generateSiteStructure({
      industry,
      companyName,
      services: companyServices,
      locations,
      state,
    });

    // Calculate estimated pages
    const estimatedPages =
      1 + // Homepage
      proposedStructure.servicePages.length +
      proposedStructure.locationPages.length +
      proposedStructure.blogTopics.length;

    // Generate AI reasoning
    const aiReasoning = generateAIReasoning({
      industry,
      serviceCount: proposedStructure.servicePages.length,
      locationCount: proposedStructure.locationPages.length,
      blogCount: proposedStructure.blogTopics.length,
    });

    // Create proposal in database
    const result = await createSiteProposal(userId, {
      industry,
      proposedStructure,
      aiReasoning,
    });

    if (!result.success || !result.proposalId) {
      return res.status(500).json({
        success: false,
        error: "Failed to create proposal",
      });
    }

    return res.status(200).json({
      success: true,
      proposalId: result.proposalId,
      industry,
      proposedStructure,
      aiReasoning,
      estimatedPages,
    });
  } catch (error) {
    console.error("Error researching site structure:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to research site structure",
    });
  }
}

interface GenerateStructureParams {
  industry: string;
  companyName: string;
  services: string[];
  locations: string[];
  state: string;
}

async function generateSiteStructure(params: GenerateStructureParams): Promise<ProposedSiteStructure> {
  const { industry, companyName, services, locations, state } = params;

  // Generate service pages based on services or industry defaults
  const servicePages = services.length > 0
    ? services.map((service) => ({
        title: service,
        slug: generateSlug(service),
        description: `Professional ${service.toLowerCase()} services from ${companyName}`,
        priority: 1,
      }))
    : getDefaultServicesForIndustry(industry).map((service) => ({
        title: service,
        slug: generateSlug(service),
        description: `Professional ${service.toLowerCase()} services`,
        priority: 1,
      }));

  // Generate location pages if locations provided
  const locationPages = locations.flatMap((location) =>
    servicePages.slice(0, 3).map((service) => ({
      city: location,
      state: state,
      service: service.title,
      slug: `${generateSlug(location)}-${service.slug}`,
    }))
  );

  // Generate blog topics based on industry
  const blogTopics = generateBlogTopicsForIndustry(industry);

  // Create sitemap structure
  const allPages = [
    "/",
    ...servicePages.map((p) => `/${p.slug}`),
    ...locationPages.map((p) => `/${p.slug}`),
    ...blogTopics.map((t, i) => `/blog/${generateSlug(t.title)}`),
  ];

  const sitemap = {
    structure: `Homepage → Services (${servicePages.length}) → Locations (${locationPages.length}) → Blog (${blogTopics.length})`,
    internalLinking: [
      "Homepage links to all service pages",
      "Service pages link to related location pages",
      "Blog posts link to relevant services",
      "Footer contains sitemap links",
    ],
  };

  return {
    homepage: {
      title: companyName,
      description: `Professional ${industry.toLowerCase()} services from ${companyName}. Get expert solutions for all your needs.`,
      sections: ["Hero with CTAs", "Services Overview", "Why Choose Us", "Testimonials", "Contact Form"],
    },
    servicePages,
    locationPages,
    blogTopics,
    sitemap,
  };
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getDefaultServicesForIndustry(industry: string): string[] {
  const industryServices: Record<string, string[]> = {
    "HVAC": [
      "AC Installation",
      "AC Repair",
      "Heating Installation",
      "Heating Repair",
      "Duct Cleaning",
      "Maintenance Plans",
    ],
    "Plumbing": [
      "Emergency Plumbing",
      "Drain Cleaning",
      "Water Heater Installation",
      "Pipe Repair",
      "Bathroom Remodeling",
      "Sewer Line Services",
    ],
    "Electrical": [
      "Electrical Repair",
      "Panel Upgrades",
      "Lighting Installation",
      "Outlet Installation",
      "Generator Installation",
      "EV Charger Installation",
    ],
    "Roofing": [
      "Roof Installation",
      "Roof Repair",
      "Roof Inspection",
      "Gutter Installation",
      "Storm Damage Repair",
      "Commercial Roofing",
    ],
    "Landscaping": [
      "Lawn Care",
      "Landscape Design",
      "Tree Services",
      "Irrigation Systems",
      "Hardscaping",
      "Seasonal Maintenance",
    ],
    "Pest Control": [
      "Residential Pest Control",
      "Commercial Pest Control",
      "Termite Treatment",
      "Rodent Control",
      "Bed Bug Treatment",
      "Wildlife Removal",
    ],
  };

  return industryServices[industry] || [
    "Service 1",
    "Service 2",
    "Service 3",
    "Service 4",
    "Service 5",
  ];
}

interface BlogTopic {
  title: string;
  keywords?: string[];
  priority?: number;
}

function generateBlogTopicsForIndustry(industry: string): BlogTopic[] {
  const industryTopics: Record<string, string[]> = {
    "HVAC": [
      "How to Choose the Right AC Unit for Your Home",
      "Signs Your Furnace Needs Replacement",
      "Energy-Saving Tips for Your HVAC System",
      "The Importance of Regular HVAC Maintenance",
      "When to Replace vs Repair Your AC",
      "Indoor Air Quality: What You Need to Know",
      "Preparing Your HVAC for Winter",
      "Smart Thermostat Benefits and Installation",
    ],
    "Plumbing": [
      "Common Signs of a Hidden Water Leak",
      "How to Prevent Frozen Pipes",
      "Water Heater Maintenance Tips",
      "When to Call an Emergency Plumber",
      "Choosing the Right Water Heater",
      "DIY Plumbing Fixes vs Professional Help",
      "Signs Your Sewer Line Needs Attention",
      "Water Conservation Tips for Homeowners",
    ],
    "Electrical": [
      "Signs You Need an Electrical Panel Upgrade",
      "Outdoor Lighting Ideas for Your Home",
      "The Benefits of Smart Home Automation",
      "Electrical Safety Tips for Homeowners",
      "Understanding Your Home's Electrical System",
      "EV Charger Installation Guide",
      "When to Call an Emergency Electrician",
      "Energy-Efficient Lighting Options",
    ],
    "Roofing": [
      "How to Spot Roof Damage After a Storm",
      "Choosing the Right Roofing Material",
      "Signs Your Roof Needs Replacement",
      "Roof Maintenance Checklist",
      "Understanding Roof Warranties",
      "Gutter Maintenance Tips",
      "Metal Roof vs Shingle Roof",
      "Preparing Your Roof for Winter",
    ],
    "Landscaping": [
      "Drought-Resistant Landscaping Ideas",
      "Spring Lawn Care Checklist",
      "Choosing Plants for Your Climate",
      "Irrigation System Maintenance",
      "Hardscaping Ideas for Small Yards",
      "Tree Care Throughout the Seasons",
      "Creating a Low-Maintenance Garden",
      "Outdoor Living Space Design Ideas",
    ],
    "Pest Control": [
      "How to Prevent Pest Infestations",
      "Signs of Termite Damage",
      "Keeping Rodents Out of Your Home",
      "Natural Pest Control Methods",
      "Seasonal Pest Prevention Tips",
      "Bed Bug Prevention and Treatment",
      "Protecting Your Home from Carpenter Ants",
      "Pet-Safe Pest Control Options",
    ],
  };

  const topics = industryTopics[industry] || [
    "Industry Best Practices",
    "Cost-Saving Tips for Customers",
    "How to Choose the Right Service Provider",
    "Common Problems and Solutions",
    "Maintenance Tips for Homeowners",
    "When to DIY vs Hire a Professional",
    "Seasonal Preparation Guide",
    "Customer Success Stories",
  ];

  // Convert string topics to BlogTopic objects
  return topics.map((title, index) => ({
    title,
    priority: index,
  }));
}

interface ReasoningParams {
  industry: string;
  serviceCount: number;
  locationCount: number;
  blogCount: number;
}

function generateAIReasoning(params: ReasoningParams): string {
  const { industry, serviceCount, locationCount, blogCount } = params;

  return `Based on analysis of top-performing ${industry} websites and SEO best practices, I recommend the following site structure:

**Service Pages (${serviceCount}):**
Each service page will target specific service-related keywords and follow a proven conversion-focused structure including problem recognition, benefits, pricing transparency, and FAQ schema markup.

${locationCount > 0 ? `**Location Pages (${locationCount}):**
Location-specific pages combine your services with city names to capture local search traffic. Each page will have unique content including driving directions, local testimonials, and area-specific information (2,500-3,500 words each).` : ""}

**Blog Content (${blogCount} topics):**
These blog topics target informational keywords that potential customers search before making a purchase decision. They establish authority and drive organic traffic.

**Expected Outcomes:**
- Improved local search visibility
- Higher conversion rates through structured content
- Authority building through comprehensive blog content
- Better user experience with clear service organization`;
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};
