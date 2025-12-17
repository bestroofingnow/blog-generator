// lib/blog-templates.ts
// Blog topic templates organized by category and industry

export interface BlogCategory {
  name: string;
  priority: 1 | 2 | 3; // 1 = highest priority
  industries: string[]; // "all" or specific industry keys
  topics: string[]; // Templates with placeholders: {city}, {state}, {year}, {company}, {industry}
}

export const BLOG_TEMPLATES: Record<string, BlogCategory> = {
  // ============================================
  // ROOFING BLOGS
  // ============================================
  insurance: {
    name: "💰 Insurance & Claims",
    priority: 1,
    industries: ["roofing"],
    topics: [
      "How to Maximize Your Insurance Claim for Roof Storm Damage in {city}",
      "Insurance Company Secrets: What Adjusters Don't Want {city} Homeowners to Know",
      "Step-by-Step Guide to Filing a Roof Insurance Claim in {state}",
      "Why Call Your Roofer Before Your Insurance Company in {city}",
      "10 Common Reasons Roof Insurance Claims Get Denied in {state}",
    ],
  },

  storm: {
    name: "⛈️ Storm Damage",
    priority: 1,
    industries: ["roofing"],
    topics: [
      "How to Spot Storm Damage on Your {city} Roof",
      "Complete Guide to Hail Damage Roof Repair in {city}",
      "Emergency Steps After Storm Damage to Your {city} Roof",
      "How {city} Weather Affects Your Roof Lifespan",
      "Storm Chaser Roofing Scams: How to Protect Your {city} Home",
    ],
  },

  repair: {
    name: "🔧 Roof Repair",
    priority: 2,
    industries: ["roofing"],
    topics: [
      "Complete Guide to Roof Repair Costs in {city} ({year})",
      "DIY vs Professional Roof Repair: When to Call a {city} Contractor",
      "How to Find and Fix Roof Leaks in Your {city} Home",
      "Signs Your {city} Roof Needs Immediate Repair",
      "Roof Repair vs Replacement: How to Decide",
    ],
  },

  replacement: {
    name: "🏠 Roof Replacement",
    priority: 2,
    industries: ["roofing"],
    topics: [
      "Complete Guide to Roof Replacement in {city} ({year})",
      "How Much Does a New Roof Cost in {city}?",
      "Best Time of Year to Replace Your Roof in {city}",
      "10 Signs It's Time to Replace Your {city} Roof",
      "Choosing the Right Roofing Materials for {city} Climate",
    ],
  },

  materials: {
    name: "🧱 Roofing Materials",
    priority: 3,
    industries: ["roofing"],
    topics: [
      "Best Roofing Materials for {city} Climate ({year})",
      "Architectural Shingles vs 3-Tab: What's Best for {city}?",
      "Metal Roofing Pros and Cons for {city} Homeowners",
      "How Long Do Different Roofing Materials Last?",
      "Energy Efficient Roofing Options for {city} Homes",
    ],
  },

  // ============================================
  // HVAC BLOGS
  // ============================================
  hvac_repair: {
    name: "🔧 HVAC Repair",
    priority: 1,
    industries: ["hvac"],
    topics: [
      "AC Not Cooling? Top Causes and Fixes in {city}",
      "How Much Does AC Repair Cost in {city}? ({year} Guide)",
      "Signs Your {city} AC Needs Repair vs Replacement",
      "Emergency AC Repair in {city}: What to Do When It Breaks",
      "Common Furnace Problems in {city} and How to Fix Them",
    ],
  },

  hvac_install: {
    name: "❄️ HVAC Installation",
    priority: 1,
    industries: ["hvac"],
    topics: [
      "How Much Does a New AC Unit Cost in {city}? ({year})",
      "Best Time to Replace Your HVAC System in {city}",
      "Central Air vs Mini Split: Which is Best for {city} Homes?",
      "Heat Pump vs Furnace: Best Heating for {city} Climate",
      "What Size AC Do I Need for My {city} Home?",
    ],
  },

  hvac_maintenance: {
    name: "🛠 HVAC Maintenance",
    priority: 2,
    industries: ["hvac"],
    topics: [
      "HVAC Maintenance Checklist for {city} Homeowners",
      "How Often Should You Service Your AC in {city}?",
      "DIY HVAC Maintenance Tips for {city} Homeowners",
      "Why Annual HVAC Tune-Ups Save {city} Homeowners Money",
      "Change Your Air Filter: How Often in {city} Climate?",
    ],
  },

  hvac_efficiency: {
    name: "🌡 Energy Efficiency",
    priority: 2,
    industries: ["hvac"],
    topics: [
      "How to Lower Your Energy Bills in {city}",
      "Most Energy Efficient HVAC Systems for {city} ({year})",
      "Smart Thermostat Benefits for {city} Homeowners",
      "SEER Ratings Explained: What {city} Homeowners Should Know",
      "Ductwork Problems That Increase Your {city} Energy Bills",
    ],
  },

  hvac_seasonal: {
    name: "🍂 Seasonal HVAC",
    priority: 2,
    industries: ["hvac"],
    topics: [
      "Preparing Your AC for {city} Summer",
      "Fall Furnace Preparation Checklist for {city}",
      "Winterizing Your HVAC System in {city}",
      "Spring AC Maintenance Tips for {city} Homeowners",
      "How {city} Weather Affects Your HVAC System",
    ],
  },

  // ============================================
  // PLUMBING BLOGS
  // ============================================
  plumbing_emergency: {
    name: "🚨 Emergency Plumbing",
    priority: 1,
    industries: ["plumbing"],
    topics: [
      "24/7 Emergency Plumber in {city}: When to Call",
      "How to Shut Off Your Water in a Plumbing Emergency",
      "Burst Pipe? Emergency Steps for {city} Homeowners",
      "Signs You Need Emergency Plumbing Service in {city}",
      "What to Do When Your Toilet Overflows",
    ],
  },

  plumbing_drains: {
    name: "🔧 Drain Services",
    priority: 1,
    industries: ["plumbing"],
    topics: [
      "How Much Does Drain Cleaning Cost in {city}?",
      "Signs You Need Professional Drain Cleaning",
      "DIY vs Professional Drain Cleaning: When to Call a {city} Plumber",
      "Why Your {city} Home Has Recurring Drain Clogs",
      "Hydro Jetting vs Snaking: Best Drain Cleaning Method",
    ],
  },

  plumbing_waterheater: {
    name: "🔥 Water Heaters",
    priority: 1,
    industries: ["plumbing"],
    topics: [
      "How Much Does Water Heater Replacement Cost in {city}?",
      "Tank vs Tankless Water Heater: Best for {city} Homes",
      "Signs Your Water Heater Needs Replacement",
      "How Long Do Water Heaters Last in {city}?",
      "Water Heater Maintenance Tips for {city} Homeowners",
    ],
  },

  // ============================================
  // ELECTRICAL BLOGS
  // ============================================
  electrical_safety: {
    name: "⚡ Electrical Safety",
    priority: 1,
    industries: ["electrical"],
    topics: [
      "Electrical Safety Tips for {city} Homeowners",
      "Signs of Dangerous Electrical Problems in Your {city} Home",
      "When to Call an Emergency Electrician in {city}",
      "Is Your {city} Home's Electrical Panel Safe?",
      "Aluminum Wiring Dangers: What {city} Homeowners Should Know",
    ],
  },

  electrical_repair: {
    name: "🔧 Electrical Repair",
    priority: 1,
    industries: ["electrical"],
    topics: [
      "How Much Do Electricians Charge in {city}? ({year})",
      "Common Electrical Problems in {city} Homes",
      "Flickering Lights? What {city} Homeowners Need to Know",
      "Troubleshooting Circuit Breaker Problems",
      "When to Upgrade Your Electrical Panel in {city}",
    ],
  },

  electrical_upgrade: {
    name: "⬆️ Electrical Upgrades",
    priority: 2,
    industries: ["electrical"],
    topics: [
      "Electrical Panel Upgrade Cost in {city} ({year})",
      "Should You Upgrade to 200 Amp Service?",
      "Whole House Surge Protection in {city}",
      "Rewiring an Older Home: What {city} Owners Should Know",
      "Adding Outlets: Cost and Considerations in {city}",
    ],
  },

  electrical_smart: {
    name: "🏠 Smart Home",
    priority: 2,
    industries: ["electrical"],
    topics: [
      "Smart Home Wiring Guide for {city} Homeowners",
      "EV Charger Installation Cost in {city} ({year})",
      "Best Smart Switches for Your {city} Home",
      "How to Prepare Your {city} Home for an EV Charger",
      "Home Automation Wiring: Planning Guide",
    ],
  },

  // ============================================
  // REAL ESTATE BLOGS
  // ============================================
  re_buying: {
    name: "🏠 Home Buying",
    priority: 1,
    industries: ["realtor"],
    topics: [
      "Ultimate Home Buying Guide for {city} ({year})",
      "Best Neighborhoods to Buy a Home in {city}",
      "How to Buy a House in {city}: Step-by-Step Guide",
      "Is Now a Good Time to Buy a Home in {city}?",
      "Hidden Costs of Buying a Home in {city}",
    ],
  },

  re_selling: {
    name: "🏷️ Home Selling",
    priority: 1,
    industries: ["realtor"],
    topics: [
      "How to Sell Your {city} Home Fast ({year})",
      "What's My Home Worth in {city}?",
      "Best Time to Sell a House in {city}",
      "Staging Tips to Sell Your {city} Home Faster",
      "Common Home Selling Mistakes in {city}",
    ],
  },

  re_market: {
    name: "📊 Market Updates",
    priority: 1,
    industries: ["realtor"],
    topics: [
      "{city} Real Estate Market Update ({year})",
      "{city} Housing Market Forecast: What to Expect",
      "Are {city} Home Prices Going Up or Down?",
      "{city} vs {state} Average Home Prices",
      "Best Time to Buy or Sell in {city}'s Market",
    ],
  },

  re_firsttime: {
    name: "🔑 First-Time Buyers",
    priority: 2,
    industries: ["realtor"],
    topics: [
      "First-Time Home Buyer Guide for {city}",
      "First-Time Buyer Programs Available in {city}",
      "How Much House Can You Afford in {city}?",
      "First-Time Buyer Mistakes to Avoid in {city}",
      "Down Payment Assistance Programs in {state}",
    ],
  },

  re_neighborhoods: {
    name: "📍 Neighborhoods",
    priority: 2,
    industries: ["realtor"],
    topics: [
      "Best Neighborhoods in {city} for Families",
      "{city} Neighborhood Guide: Where to Live",
      "Up-and-Coming Neighborhoods in {city}",
      "Best Schools in {city}: Neighborhood Guide",
      "Safest Neighborhoods in {city}",
    ],
  },

  re_investment: {
    name: "💰 Investment",
    priority: 2,
    industries: ["realtor"],
    topics: [
      "Real Estate Investment Guide for {city}",
      "Best Areas to Invest in {city} Real Estate",
      "Rental Property ROI in {city}: What to Expect",
      "Is {city} Good for Real Estate Investment?",
      "Fix and Flip Opportunities in {city}",
    ],
  },

  // ============================================
  // LANDSCAPING BLOGS
  // ============================================
  lawn_care: {
    name: "🌱 Lawn Care",
    priority: 1,
    industries: ["landscaping"],
    topics: [
      "Complete Lawn Care Guide for {city} ({year})",
      "Best Grass Types for {city} Lawns",
      "How to Get a Green Lawn in {city}",
      "Lawn Fertilization Schedule for {city}",
      "Common Lawn Problems in {city} and How to Fix Them",
    ],
  },

  landscaping_design: {
    name: "🎨 Landscape Design",
    priority: 1,
    industries: ["landscaping"],
    topics: [
      "Landscaping Ideas for {city} Homes",
      "Best Plants for {city} Landscapes",
      "Low Maintenance Landscaping for {city}",
      "Front Yard Landscaping Ideas for {city} Homes",
      "Backyard Design Ideas for {city}",
    ],
  },

  seasonal_tips: {
    name: "🍂 Seasonal Tips",
    priority: 2,
    industries: ["landscaping"],
    topics: [
      "Spring Landscaping Checklist for {city}",
      "Summer Lawn Care Tips for {city}",
      "Fall Yard Cleanup Guide for {city}",
      "Winterizing Your {city} Landscape",
      "Year-Round Landscaping Calendar for {city}",
    ],
  },

  // ============================================
  // PEST CONTROL BLOGS
  // ============================================
  pest_prevention: {
    name: "🛡️ Prevention",
    priority: 1,
    industries: ["pest"],
    topics: [
      "How to Keep Pests Out of Your {city} Home",
      "Pest-Proofing Your {city} Home: Complete Guide",
      "Seasonal Pest Prevention Tips for {city}",
      "Why Pests Love {city} Homes (And How to Stop Them)",
      "Natural Pest Prevention Methods for {city} Homeowners",
    ],
  },

  pest_types: {
    name: "🐛 Pest Types",
    priority: 1,
    industries: ["pest"],
    topics: [
      "Common Household Pests in {city}: Identification Guide",
      "How to Get Rid of Ants in Your {city} Home",
      "Cockroach Control in {city}: Complete Guide",
      "Mouse and Rat Control for {city} Homeowners",
      "Termite Warning Signs Every {city} Homeowner Should Know",
    ],
  },

  pest_seasonal: {
    name: "🍂 Seasonal Pests",
    priority: 2,
    industries: ["pest"],
    topics: [
      "Spring Pest Problems in {city}",
      "Summer Pest Control Tips for {city}",
      "Fall Pest Prevention for {city} Homes",
      "Winter Pests in {city}: What to Watch For",
      "Mosquito Season in {city}: Prevention Guide",
    ],
  },

  // ============================================
  // CLEANING BLOGS
  // ============================================
  cleaning_tips: {
    name: "✨ Cleaning Tips",
    priority: 1,
    industries: ["cleaning"],
    topics: [
      "House Cleaning Checklist for {city} Homeowners",
      "How Often Should You Clean Your {city} Home?",
      "Professional Cleaning Tips for a Spotless Home",
      "Room-by-Room Cleaning Guide",
      "Speed Cleaning Tips for Busy {city} Families",
    ],
  },

  cleaning_deep: {
    name: "🧹 Deep Cleaning",
    priority: 1,
    industries: ["cleaning"],
    topics: [
      "Deep Cleaning Your {city} Home: Complete Guide",
      "Spring Cleaning Checklist for {city}",
      "How Much Does Deep Cleaning Cost in {city}?",
      "When to Hire a Professional Deep Cleaning Service",
      "Deep Cleaning vs Regular Cleaning: What's the Difference?",
    ],
  },

  cleaning_move: {
    name: "📦 Move Cleaning",
    priority: 2,
    industries: ["cleaning"],
    topics: [
      "Move-Out Cleaning Checklist for {city} Renters",
      "Move-In Cleaning: What to Expect",
      "How to Get Your Security Deposit Back with Cleaning",
      "Move-Out Cleaning Cost in {city}",
      "End of Lease Cleaning Requirements in {state}",
    ],
  },

  // ============================================
  // PAINTING BLOGS
  // ============================================
  painting_interior: {
    name: "🎨 Interior Painting",
    priority: 1,
    industries: ["painting"],
    topics: [
      "Interior Painting Cost in {city} ({year})",
      "Best Interior Paint Colors for {city} Homes",
      "How Long Does Interior Painting Take?",
      "DIY vs Professional Interior Painting",
      "Interior Painting Tips for {city} Homeowners",
    ],
  },

  painting_exterior: {
    name: "🏠 Exterior Painting",
    priority: 1,
    industries: ["painting"],
    topics: [
      "Exterior House Painting Cost in {city} ({year})",
      "Best Time to Paint Your {city} Home Exterior",
      "How Often Should You Paint Your {city} Home?",
      "Exterior Paint Colors That Increase Home Value",
      "Preparing Your {city} Home for Exterior Painting",
    ],
  },

  painting_color: {
    name: "🎨 Color Selection",
    priority: 2,
    industries: ["painting"],
    topics: [
      "Trending Paint Colors for {city} Homes ({year})",
      "How to Choose Paint Colors for Your Home",
      "Best Paint Colors for Small Rooms",
      "Color Psychology: Choosing the Right Paint",
      "Paint Colors That Increase Home Value",
    ],
  },

  // ============================================
  // EQUESTRIAN BLOGS
  // ============================================
  equine_boarding: {
    name: "🐴 Horse Boarding",
    priority: 1,
    industries: ["equestrian"],
    topics: [
      "Complete Guide to Horse Boarding in {city} ({year})",
      "Horse Boarding Costs in {city}: What to Expect",
      "Full Care vs Pasture Boarding: Which is Right for Your Horse?",
      "Questions to Ask When Choosing a Boarding Stable in {city}",
      "What to Look for in a {city} Horse Boarding Facility",
    ],
  },

  equine_training: {
    name: "🎯 Horse Training",
    priority: 1,
    industries: ["equestrian"],
    topics: [
      "Finding the Right Horse Trainer in {city}",
      "Dressage Training Programs in {city}",
      "Hunter/Jumper Lessons Near {city}: What to Know",
      "Western Riding Lessons in {city} for Beginners",
      "How to Choose a Riding Instructor in {city}",
    ],
  },

  equine_health: {
    name: "🩺 Equine Health",
    priority: 2,
    industries: ["equestrian"],
    topics: [
      "Essential Horse Care Tips for {city} Owners",
      "Seasonal Horse Health Checklist for {state}",
      "Signs Your Horse Needs Veterinary Attention",
      "Equine Nutrition Guide for {city} Climate",
      "Keeping Your Horse Healthy in {city} Weather",
    ],
  },

  equine_facility: {
    name: "🏠 Facility Amenities",
    priority: 2,
    industries: ["equestrian"],
    topics: [
      "Best Horse Facilities and Amenities in {city}",
      "Indoor vs Outdoor Arena: What {city} Riders Should Know",
      "Trail Riding Near {city}: Best Locations and Tips",
      "What Makes a Great Equestrian Facility in {city}?",
      "Horse Farm Safety Standards to Look For",
    ],
  },

  equine_events: {
    name: "🏆 Shows & Events",
    priority: 2,
    industries: ["equestrian"],
    topics: [
      "Horse Shows and Competitions Near {city}",
      "Preparing Your Horse for Competition in {city}",
      "Youth Equestrian Programs in {city}",
      "Equestrian Summer Camps Near {city}",
      "Hosting Horse Events at Your {city} Property",
    ],
  },

  equine_buying: {
    name: "💰 Buying & Selling",
    priority: 2,
    industries: ["equestrian"],
    topics: [
      "Buying Your First Horse in {city}: Complete Guide",
      "Horse for Sale Near {city}: What to Look For",
      "Pre-Purchase Exam Guide for {city} Horse Buyers",
      "Horse Leasing Options in {city}",
      "Selling Your Horse in {city}: Tips for Success",
    ],
  },

  equine_seasonal: {
    name: "🍂 Seasonal Care",
    priority: 3,
    industries: ["equestrian"],
    topics: [
      "Winter Horse Care Tips for {city} Owners",
      "Summer Heat Safety for Horses in {city}",
      "Spring Pasture Management in {state}",
      "Fall Horse Care Checklist for {city}",
      "Blanketing Guide for {city} Climate",
    ],
  },

  equine_cost: {
    name: "💵 Costs & Budgeting",
    priority: 2,
    industries: ["equestrian"],
    topics: [
      "True Cost of Horse Ownership in {city} ({year})",
      "Horse Boarding Prices Comparison: {city} Area",
      "Riding Lesson Costs in {city}: What to Budget",
      "Hidden Costs of Horse Ownership New Owners Miss",
      "Affordable Ways to Get Into Horses in {city}",
    ],
  },

  // ============================================
  // UNIVERSAL BLOGS (work for most industries)
  // ============================================
  contractor: {
    name: "✅ Choosing a Pro",
    priority: 2,
    industries: ["all"],
    topics: [
      "How to Choose the Best {industry} Company in {city}",
      "Red Flags When Hiring a {industry} Contractor in {city}",
      "Questions to Ask Before Hiring a {industry} Company",
      "Why Choose a Local {industry} Company in {city}?",
      "How to Check {industry} Reviews in {city}",
    ],
  },

  cost: {
    name: "💵 Cost Guides",
    priority: 2,
    industries: ["all"],
    topics: [
      "{industry} Prices in {city}: Complete Cost Breakdown ({year})",
      "How to Save Money on {industry} Services",
      "Is {industry} Worth the Investment?",
      "Getting {industry} Quotes: How Many Should You Get?",
      "Understanding {industry} Estimates and Pricing",
    ],
  },

  local: {
    name: "📍 Local Guides",
    priority: 2,
    industries: ["all"],
    topics: [
      "Complete {city} {industry} Guide for Homeowners",
      "{city} {industry} Regulations and Requirements",
      "Average {industry} Costs in {city} vs {state} Average",
      "Best {industry} Companies in {city}: How to Choose",
      "{industry} Tips for {city} Home Sellers",
    ],
  },

  faq: {
    name: "❓ FAQs",
    priority: 3,
    industries: ["all"],
    topics: [
      "Frequently Asked {industry} Questions in {city}",
      "What to Expect from {industry} Service in {city}",
      "How Long Does {industry} Service Take?",
      "Do {industry} Companies Offer Free Estimates?",
      "Is {industry} Licensing Required in {city}?",
    ],
  },

  emergency: {
    name: "🚨 Emergency",
    priority: 1,
    industries: ["all"],
    topics: [
      "24/7 Emergency {industry} Service in {city}",
      "What Qualifies as a {industry} Emergency?",
      "Emergency {industry} in {city}: Who to Call",
      "After Hours {industry} Service in {city}",
    ],
  },

  seasonal: {
    name: "🍂 Seasonal",
    priority: 3,
    industries: ["all"],
    topics: [
      "Spring {industry} Maintenance for {city} Homeowners",
      "Summer {industry} Tips for {city}",
      "Fall {industry} Preparation Guide for {city}",
      "Winter {industry} Care Tips for {state}",
    ],
  },
};

// Helper function to get blog topics for an industry
export function getBlogTopicsForIndustry(industryKey: string): BlogCategory[] {
  const result: BlogCategory[] = [];

  Object.values(BLOG_TEMPLATES).forEach((category) => {
    if (
      category.industries.includes("all") ||
      category.industries.includes(industryKey)
    ) {
      result.push(category);
    }
  });

  // Sort by priority (1 = highest)
  result.sort((a, b) => a.priority - b.priority);

  return result;
}

// Helper function to generate a specific blog title
export function generateBlogTitle(
  template: string,
  params: {
    city: string;
    state: string;
    year?: number;
    company?: string;
    industry?: string;
  }
): string {
  const year = params.year || new Date().getFullYear();

  return template
    .replace(/{city}/g, params.city)
    .replace(/{state}/g, params.state)
    .replace(/{year}/g, year.toString())
    .replace(/{company}/g, params.company || "")
    .replace(/{industry}/g, params.industry || "");
}

// Helper function to generate all blog topics for a city
export function generateBlogListForCity(
  industryKey: string,
  city: string,
  state: string,
  industryName: string
): {
  id: number;
  category: string;
  title: string;
  template: string;
  priority: number;
}[] {
  const categories = getBlogTopicsForIndustry(industryKey);
  const blogs: {
    id: number;
    category: string;
    title: string;
    template: string;
    priority: number;
  }[] = [];
  let id = 0;

  categories.forEach((category) => {
    category.topics.forEach((template) => {
      id++;
      const title = generateBlogTitle(template, {
        city,
        state,
        industry: industryName,
      });

      blogs.push({
        id,
        category: category.name,
        title,
        template,
        priority: category.priority,
      });
    });
  });

  return blogs;
}
