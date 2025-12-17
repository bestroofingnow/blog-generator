// lib/industries.ts
// Industry configurations for SEO planning and content generation

export interface ServiceOption {
  value: string;
  checked: boolean;
}

export interface Directory {
  name: string;
  url: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

export interface IndustryConfig {
  name: string;
  icon: string;
  schemaType: string;
  gbpCategory: string;
  urlSlug: string;
  serviceNoun: string;
  servicePlural: string;
  providerNoun: string;
  description: string;
  services: {
    core: ServiceOption[];
    commercial: ServiceOption[];
    specialty: ServiceOption[];
  };
  usps: ServiceOption[];
  directories: Directory[];
  blogCategories: string[];
}

export const INDUSTRIES: Record<string, IndustryConfig> = {
  roofing: {
    name: "Roofing",
    icon: "🏠",
    schemaType: "RoofingContractor",
    gbpCategory: "Roofing Contractor",
    urlSlug: "roofing",
    serviceNoun: "roofing",
    servicePlural: "roofing services",
    providerNoun: "roofers",
    description: "Roofing contractors specializing in roof repair, replacement, and storm damage restoration.",
    services: {
      core: [
        { value: "Roof Repair", checked: true },
        { value: "Roof Replacement", checked: true },
        { value: "Roof Inspection", checked: true },
        { value: "Emergency Repair", checked: true },
        { value: "Storm Damage", checked: true },
        { value: "Leak Repair", checked: true },
        { value: "Insurance Claims", checked: true },
        { value: "Roof Maintenance", checked: false },
        { value: "Gutter Services", checked: false },
        { value: "Siding", checked: false },
        { value: "Skylights", checked: false },
        { value: "Ventilation", checked: false },
        { value: "Soffit Fascia", checked: false },
        { value: "Chimney Repair", checked: false },
      ],
      commercial: [
        { value: "Commercial Roofing", checked: true },
        { value: "Flat Roof Repair", checked: false },
        { value: "Flat Roof Replacement", checked: false },
        { value: "Roof Coating", checked: false },
        { value: "Commercial Maintenance", checked: false },
        { value: "Industrial Roofing", checked: false },
      ],
      specialty: [
        { value: "Asphalt Shingles", checked: true },
        { value: "Architectural Shingles", checked: true },
        { value: "Metal Roofing", checked: false },
        { value: "Standing Seam", checked: false },
        { value: "Tile Roofing", checked: false },
        { value: "Slate Roofing", checked: false },
        { value: "Cedar Shake", checked: false },
        { value: "TPO", checked: false },
        { value: "EPDM", checked: false },
      ],
    },
    usps: [
      { value: "24/7 Emergency", checked: true },
      { value: "Free Estimates", checked: true },
      { value: "Free Inspections", checked: true },
      { value: "Licensed & Insured", checked: true },
      { value: "Financing Available", checked: false },
      { value: "Lifetime Warranty", checked: false },
      { value: "Family Owned", checked: false },
      { value: "Veteran Owned", checked: false },
      { value: "BBB A+ Rated", checked: false },
      { value: "GAF Certified", checked: false },
      { value: "Owens Corning Preferred", checked: false },
      { value: "CertainTeed SELECT", checked: false },
      { value: "Locally Owned", checked: false },
      { value: "Same-Day Service", checked: false },
      { value: "Drone Inspections", checked: false },
    ],
    directories: [
      { name: "GAF Contractor Locator", url: "gaf.com", priority: "HIGH" },
      { name: "Owens Corning Network", url: "owenscorning.com", priority: "HIGH" },
      { name: "CertainTeed Directory", url: "certainteed.com", priority: "HIGH" },
      { name: "NRCA Member Directory", url: "nrca.net", priority: "HIGH" },
    ],
    blogCategories: ["insurance", "storm", "repair", "replacement", "materials", "commercial", "contractor", "seasonal", "issues", "local", "cost", "faq", "emergency"],
  },

  hvac: {
    name: "HVAC",
    icon: "❄️",
    schemaType: "HVACBusiness",
    gbpCategory: "HVAC Contractor",
    urlSlug: "hvac",
    serviceNoun: "HVAC",
    servicePlural: "heating and cooling services",
    providerNoun: "HVAC contractors",
    description: "HVAC companies providing heating, cooling, and air quality services.",
    services: {
      core: [
        { value: "AC Repair", checked: true },
        { value: "AC Installation", checked: true },
        { value: "Heating Repair", checked: true },
        { value: "Furnace Installation", checked: true },
        { value: "Heat Pump Services", checked: true },
        { value: "Emergency HVAC", checked: true },
        { value: "HVAC Maintenance", checked: true },
        { value: "Duct Cleaning", checked: false },
        { value: "Duct Repair", checked: false },
        { value: "Thermostat Installation", checked: false },
        { value: "Indoor Air Quality", checked: false },
        { value: "Refrigerant Recharge", checked: false },
      ],
      commercial: [
        { value: "Commercial HVAC", checked: true },
        { value: "Commercial AC Repair", checked: false },
        { value: "Rooftop Units", checked: false },
        { value: "Commercial Maintenance", checked: false },
        { value: "Building Automation", checked: false },
      ],
      specialty: [
        { value: "Mini Split Systems", checked: false },
        { value: "Geothermal Systems", checked: false },
        { value: "Radiant Heating", checked: false },
        { value: "Boiler Services", checked: false },
        { value: "Air Purification", checked: false },
        { value: "Humidifier Installation", checked: false },
      ],
    },
    usps: [
      { value: "24/7 Emergency", checked: true },
      { value: "Free Estimates", checked: true },
      { value: "Licensed & Insured", checked: true },
      { value: "NATE Certified", checked: false },
      { value: "EPA Certified", checked: false },
      { value: "Financing Available", checked: false },
      { value: "Same-Day Service", checked: false },
      { value: "Trane Dealer", checked: false },
      { value: "Carrier Dealer", checked: false },
      { value: "Lennox Dealer", checked: false },
      { value: "Family Owned", checked: false },
      { value: "Veteran Owned", checked: false },
      { value: "BBB A+ Rated", checked: false },
      { value: "Maintenance Plans", checked: false },
    ],
    directories: [
      { name: "Trane Dealer Locator", url: "trane.com", priority: "HIGH" },
      { name: "Carrier Factory Authorized", url: "carrier.com", priority: "HIGH" },
      { name: "Lennox Premier Dealer", url: "lennox.com", priority: "HIGH" },
      { name: "ACCA Member", url: "acca.org", priority: "MEDIUM" },
    ],
    blogCategories: ["hvac_repair", "hvac_install", "hvac_maintenance", "hvac_efficiency", "hvac_seasonal", "hvac_commercial", "hvac_cost", "hvac_tips"],
  },

  plumbing: {
    name: "Plumbing",
    icon: "🔧",
    schemaType: "Plumber",
    gbpCategory: "Plumber",
    urlSlug: "plumbing",
    serviceNoun: "plumbing",
    servicePlural: "plumbing services",
    providerNoun: "plumbers",
    description: "Plumbing companies providing residential and commercial plumbing services.",
    services: {
      core: [
        { value: "Drain Cleaning", checked: true },
        { value: "Leak Repair", checked: true },
        { value: "Water Heater Repair", checked: true },
        { value: "Water Heater Installation", checked: true },
        { value: "Pipe Repair", checked: true },
        { value: "Emergency Plumbing", checked: true },
        { value: "Toilet Repair", checked: true },
        { value: "Faucet Repair", checked: false },
        { value: "Garbage Disposal", checked: false },
        { value: "Sump Pump Services", checked: false },
        { value: "Gas Line Services", checked: false },
        { value: "Repiping", checked: false },
      ],
      commercial: [
        { value: "Commercial Plumbing", checked: true },
        { value: "Backflow Testing", checked: false },
        { value: "Grease Trap Cleaning", checked: false },
        { value: "Commercial Water Heaters", checked: false },
        { value: "Hydro Jetting", checked: false },
      ],
      specialty: [
        { value: "Sewer Line Repair", checked: false },
        { value: "Trenchless Repair", checked: false },
        { value: "Water Filtration", checked: false },
        { value: "Tankless Water Heaters", checked: false },
        { value: "Well Pump Services", checked: false },
        { value: "Water Softener", checked: false },
      ],
    },
    usps: [
      { value: "24/7 Emergency", checked: true },
      { value: "Free Estimates", checked: true },
      { value: "Licensed & Insured", checked: true },
      { value: "Same-Day Service", checked: false },
      { value: "Upfront Pricing", checked: false },
      { value: "No Overtime Charges", checked: false },
      { value: "Senior Discount", checked: false },
      { value: "Military Discount", checked: false },
      { value: "Financing Available", checked: false },
      { value: "Family Owned", checked: false },
      { value: "BBB A+ Rated", checked: false },
      { value: "Locally Owned", checked: false },
    ],
    directories: [
      { name: "Plumbing-Heating-Cooling Contractors Association", url: "phccweb.org", priority: "HIGH" },
      { name: "Roto-Rooter Franchise", url: "rotorooter.com", priority: "MEDIUM" },
    ],
    blogCategories: ["plumbing_emergency", "plumbing_drains", "plumbing_waterheater", "plumbing_pipes", "plumbing_tips", "plumbing_cost", "plumbing_diy"],
  },

  electrical: {
    name: "Electrical",
    icon: "⚡",
    schemaType: "Electrician",
    gbpCategory: "Electrician",
    urlSlug: "electrical",
    serviceNoun: "electrical",
    servicePlural: "electrical services",
    providerNoun: "electricians",
    description: "Electrical contractors providing residential and commercial electrical services.",
    services: {
      core: [
        { value: "Electrical Repair", checked: true },
        { value: "Panel Upgrades", checked: true },
        { value: "Outlet Installation", checked: true },
        { value: "Lighting Installation", checked: true },
        { value: "Ceiling Fan Installation", checked: true },
        { value: "Emergency Electrical", checked: true },
        { value: "Wiring Repair", checked: true },
        { value: "Circuit Breaker Repair", checked: false },
        { value: "Smoke Detector Install", checked: false },
        { value: "Surge Protection", checked: false },
        { value: "Electrical Inspection", checked: false },
      ],
      commercial: [
        { value: "Commercial Electrical", checked: true },
        { value: "Commercial Wiring", checked: false },
        { value: "Office Lighting", checked: false },
        { value: "Parking Lot Lighting", checked: false },
        { value: "Data/Network Wiring", checked: false },
      ],
      specialty: [
        { value: "EV Charger Installation", checked: false },
        { value: "Generator Installation", checked: false },
        { value: "Smart Home Wiring", checked: false },
        { value: "Landscape Lighting", checked: false },
        { value: "Hot Tub Wiring", checked: false },
        { value: "Pool Electrical", checked: false },
      ],
    },
    usps: [
      { value: "24/7 Emergency", checked: true },
      { value: "Free Estimates", checked: true },
      { value: "Licensed & Insured", checked: true },
      { value: "Master Electrician", checked: false },
      { value: "Same-Day Service", checked: false },
      { value: "Upfront Pricing", checked: false },
      { value: "Background Checked", checked: false },
      { value: "Financing Available", checked: false },
      { value: "Family Owned", checked: false },
      { value: "BBB A+ Rated", checked: false },
      { value: "Locally Owned", checked: false },
    ],
    directories: [
      { name: "NECA (National Electrical Contractors Association)", url: "necanet.org", priority: "HIGH" },
      { name: "Independent Electrical Contractors", url: "ieci.org", priority: "MEDIUM" },
    ],
    blogCategories: ["electrical_safety", "electrical_repair", "electrical_upgrade", "electrical_smart", "electrical_outdoor", "electrical_cost", "electrical_tips"],
  },

  realtor: {
    name: "Real Estate",
    icon: "🏡",
    schemaType: "RealEstateAgent",
    gbpCategory: "Real Estate Agent",
    urlSlug: "realtor",
    serviceNoun: "real estate",
    servicePlural: "real estate services",
    providerNoun: "realtors",
    description: "Real estate agents and brokers helping buyers, sellers, and investors.",
    services: {
      core: [
        { value: "Home Buying", checked: true },
        { value: "Home Selling", checked: true },
        { value: "Home Valuation", checked: true },
        { value: "Market Analysis", checked: true },
        { value: "First-Time Buyers", checked: true },
        { value: "Relocation Services", checked: true },
        { value: "Buyer Representation", checked: true },
        { value: "Seller Representation", checked: true },
        { value: "Negotiation", checked: false },
        { value: "Home Staging Advice", checked: false },
        { value: "Virtual Tours", checked: false },
      ],
      commercial: [
        { value: "Commercial Real Estate", checked: false },
        { value: "Investment Properties", checked: false },
        { value: "Multi-Family", checked: false },
        { value: "Land Sales", checked: false },
        { value: "Business Brokerage", checked: false },
      ],
      specialty: [
        { value: "Luxury Homes", checked: false },
        { value: "Waterfront Properties", checked: false },
        { value: "New Construction", checked: false },
        { value: "Foreclosures/Short Sales", checked: false },
        { value: "Senior Relocation", checked: false },
        { value: "Military Relocation", checked: false },
        { value: "Vacation Homes", checked: false },
        { value: "Condos & Townhomes", checked: false },
      ],
    },
    usps: [
      { value: "Free Home Valuation", checked: true },
      { value: "Licensed Realtor", checked: true },
      { value: "Local Market Expert", checked: true },
      { value: "Top Producer", checked: false },
      { value: "Certified Negotiation Expert", checked: false },
      { value: "Accredited Buyer Rep", checked: false },
      { value: "Seller Rep Specialist", checked: false },
      { value: "e-PRO Certified", checked: false },
      { value: "Military Relocation Pro", checked: false },
      { value: "Senior Real Estate Specialist", checked: false },
      { value: "5-Star Reviews", checked: false },
      { value: "Multilingual", checked: false },
    ],
    directories: [
      { name: "Realtor.com", url: "realtor.com", priority: "CRITICAL" },
      { name: "Zillow Agent", url: "zillow.com", priority: "CRITICAL" },
      { name: "Redfin Partner Agent", url: "redfin.com", priority: "HIGH" },
      { name: "Homes.com", url: "homes.com", priority: "HIGH" },
      { name: "Trulia", url: "trulia.com", priority: "HIGH" },
      { name: "Local MLS", url: "[local]", priority: "CRITICAL" },
    ],
    blogCategories: ["re_buying", "re_selling", "re_market", "re_firsttime", "re_investment", "re_neighborhoods", "re_tips", "re_financing"],
  },

  landscaping: {
    name: "Landscaping",
    icon: "🌳",
    schemaType: "LandscapingBusiness",
    gbpCategory: "Landscaper",
    urlSlug: "landscaping",
    serviceNoun: "landscaping",
    servicePlural: "landscaping services",
    providerNoun: "landscapers",
    description: "Landscaping and lawn care companies providing outdoor services.",
    services: {
      core: [
        { value: "Lawn Mowing", checked: true },
        { value: "Lawn Care", checked: true },
        { value: "Landscape Design", checked: true },
        { value: "Landscape Installation", checked: true },
        { value: "Mulching", checked: true },
        { value: "Pruning & Trimming", checked: true },
        { value: "Spring Cleanup", checked: true },
        { value: "Fall Cleanup", checked: true },
        { value: "Fertilization", checked: false },
        { value: "Weed Control", checked: false },
        { value: "Aeration", checked: false },
        { value: "Overseeding", checked: false },
      ],
      commercial: [
        { value: "Commercial Landscaping", checked: false },
        { value: "HOA Landscaping", checked: false },
        { value: "Property Maintenance", checked: false },
        { value: "Snow Removal", checked: false },
      ],
      specialty: [
        { value: "Hardscaping", checked: false },
        { value: "Patio Installation", checked: false },
        { value: "Retaining Walls", checked: false },
        { value: "Irrigation Systems", checked: false },
        { value: "Outdoor Lighting", checked: false },
        { value: "Tree Services", checked: false },
        { value: "Sod Installation", checked: false },
        { value: "Drainage Solutions", checked: false },
      ],
    },
    usps: [
      { value: "Free Estimates", checked: true },
      { value: "Licensed & Insured", checked: true },
      { value: "Locally Owned", checked: true },
      { value: "Satisfaction Guaranteed", checked: false },
      { value: "Weekly Service", checked: false },
      { value: "Seasonal Contracts", checked: false },
      { value: "Eco-Friendly Options", checked: false },
      { value: "Family Owned", checked: false },
      { value: "BBB A+ Rated", checked: false },
    ],
    directories: [
      { name: "National Association of Landscape Professionals", url: "landscapeprofessionals.org", priority: "HIGH" },
      { name: "LawnStarter", url: "lawnstarter.com", priority: "MEDIUM" },
    ],
    blogCategories: ["lawn_care", "landscaping_design", "seasonal_tips", "hardscaping", "irrigation", "landscaping_cost"],
  },

  pest: {
    name: "Pest Control",
    icon: "🐛",
    schemaType: "PestControlBusiness",
    gbpCategory: "Pest Control Service",
    urlSlug: "pest-control",
    serviceNoun: "pest control",
    servicePlural: "pest control services",
    providerNoun: "pest control experts",
    description: "Pest control companies providing extermination and prevention services.",
    services: {
      core: [
        { value: "General Pest Control", checked: true },
        { value: "Ant Control", checked: true },
        { value: "Roach Control", checked: true },
        { value: "Spider Control", checked: true },
        { value: "Rodent Control", checked: true },
        { value: "Bed Bug Treatment", checked: true },
        { value: "Termite Control", checked: true },
        { value: "Mosquito Control", checked: false },
        { value: "Flea & Tick Control", checked: false },
        { value: "Wasp & Bee Removal", checked: false },
        { value: "Wildlife Removal", checked: false },
      ],
      commercial: [
        { value: "Commercial Pest Control", checked: false },
        { value: "Restaurant Pest Control", checked: false },
        { value: "Property Management", checked: false },
      ],
      specialty: [
        { value: "Termite Inspection", checked: false },
        { value: "Termite Warranty", checked: false },
        { value: "Fumigation", checked: false },
        { value: "Green Pest Control", checked: false },
        { value: "Preventive Plans", checked: false },
      ],
    },
    usps: [
      { value: "Free Inspection", checked: true },
      { value: "Licensed & Insured", checked: true },
      { value: "Same-Day Service", checked: false },
      { value: "Eco-Friendly Options", checked: false },
      { value: "Satisfaction Guaranteed", checked: false },
      { value: "Monthly Plans", checked: false },
      { value: "Family & Pet Safe", checked: false },
      { value: "Locally Owned", checked: false },
      { value: "BBB A+ Rated", checked: false },
    ],
    directories: [
      { name: "National Pest Management Association", url: "npmapestworld.org", priority: "HIGH" },
      { name: "QualityPro Certified", url: "npmaqualitypro.org", priority: "HIGH" },
    ],
    blogCategories: ["pest_prevention", "pest_types", "pest_seasonal", "pest_diy", "pest_commercial", "pest_cost"],
  },

  cleaning: {
    name: "Cleaning",
    icon: "🧹",
    schemaType: "HouseCleaning",
    gbpCategory: "House Cleaning Service",
    urlSlug: "cleaning",
    serviceNoun: "cleaning",
    servicePlural: "cleaning services",
    providerNoun: "cleaning professionals",
    description: "Cleaning and maid services for residential and commercial properties.",
    services: {
      core: [
        { value: "House Cleaning", checked: true },
        { value: "Deep Cleaning", checked: true },
        { value: "Move-In Cleaning", checked: true },
        { value: "Move-Out Cleaning", checked: true },
        { value: "Recurring Cleaning", checked: true },
        { value: "One-Time Cleaning", checked: true },
        { value: "Kitchen Cleaning", checked: false },
        { value: "Bathroom Cleaning", checked: false },
        { value: "Apartment Cleaning", checked: false },
      ],
      commercial: [
        { value: "Office Cleaning", checked: false },
        { value: "Commercial Cleaning", checked: false },
        { value: "Janitorial Services", checked: false },
        { value: "Post-Construction Cleaning", checked: false },
      ],
      specialty: [
        { value: "Carpet Cleaning", checked: false },
        { value: "Window Cleaning", checked: false },
        { value: "Pressure Washing", checked: false },
        { value: "Airbnb Cleaning", checked: false },
        { value: "Green Cleaning", checked: false },
        { value: "Organization Services", checked: false },
      ],
    },
    usps: [
      { value: "Free Estimates", checked: true },
      { value: "Licensed & Insured", checked: true },
      { value: "Background Checked", checked: true },
      { value: "Satisfaction Guaranteed", checked: false },
      { value: "Eco-Friendly Products", checked: false },
      { value: "Same-Day Service", checked: false },
      { value: "Bonded Employees", checked: false },
      { value: "Locally Owned", checked: false },
    ],
    directories: [
      { name: "ISSA (Cleaning Industry Association)", url: "issa.com", priority: "MEDIUM" },
      { name: "ARCSI", url: "arcsi.org", priority: "MEDIUM" },
    ],
    blogCategories: ["cleaning_tips", "cleaning_deep", "cleaning_move", "cleaning_eco", "cleaning_organization", "cleaning_cost"],
  },

  painting: {
    name: "Painting",
    icon: "🎨",
    schemaType: "HousePainter",
    gbpCategory: "Painter",
    urlSlug: "painting",
    serviceNoun: "painting",
    servicePlural: "painting services",
    providerNoun: "painters",
    description: "Professional painting contractors for interior and exterior projects.",
    services: {
      core: [
        { value: "Interior Painting", checked: true },
        { value: "Exterior Painting", checked: true },
        { value: "Cabinet Painting", checked: true },
        { value: "Deck Staining", checked: true },
        { value: "Fence Staining", checked: false },
        { value: "Trim Painting", checked: false },
        { value: "Ceiling Painting", checked: false },
        { value: "Drywall Repair", checked: false },
        { value: "Popcorn Ceiling Removal", checked: false },
      ],
      commercial: [
        { value: "Commercial Painting", checked: false },
        { value: "Office Painting", checked: false },
        { value: "Industrial Coatings", checked: false },
      ],
      specialty: [
        { value: "Wallpaper Removal", checked: false },
        { value: "Wallpaper Installation", checked: false },
        { value: "Faux Finishes", checked: false },
        { value: "Epoxy Flooring", checked: false },
        { value: "Pressure Washing", checked: false },
      ],
    },
    usps: [
      { value: "Free Estimates", checked: true },
      { value: "Licensed & Insured", checked: true },
      { value: "Color Consultation", checked: false },
      { value: "Premium Paints", checked: false },
      { value: "Satisfaction Guaranteed", checked: false },
      { value: "Locally Owned", checked: false },
      { value: "Family Owned", checked: false },
      { value: "BBB A+ Rated", checked: false },
    ],
    directories: [
      { name: "Painting Contractors Association", url: "pcapainted.org", priority: "HIGH" },
    ],
    blogCategories: ["painting_interior", "painting_exterior", "painting_color", "painting_prep", "painting_cost", "painting_tips"],
  },

  flooring: {
    name: "Flooring",
    icon: "🪵",
    schemaType: "FlooringContractor",
    gbpCategory: "Flooring Contractor",
    urlSlug: "flooring",
    serviceNoun: "flooring",
    servicePlural: "flooring services",
    providerNoun: "flooring contractors",
    description: "Flooring installation and refinishing contractors.",
    services: {
      core: [
        { value: "Hardwood Installation", checked: true },
        { value: "Hardwood Refinishing", checked: true },
        { value: "Laminate Installation", checked: true },
        { value: "Vinyl Installation", checked: true },
        { value: "Tile Installation", checked: true },
        { value: "Carpet Installation", checked: true },
        { value: "Floor Repair", checked: false },
        { value: "Subfloor Repair", checked: false },
      ],
      commercial: [
        { value: "Commercial Flooring", checked: false },
        { value: "Epoxy Flooring", checked: false },
      ],
      specialty: [
        { value: "Luxury Vinyl Plank", checked: false },
        { value: "Engineered Hardwood", checked: false },
        { value: "Bamboo Flooring", checked: false },
        { value: "Cork Flooring", checked: false },
        { value: "Heated Floors", checked: false },
      ],
    },
    usps: [
      { value: "Free Estimates", checked: true },
      { value: "Licensed & Insured", checked: true },
      { value: "Showroom Available", checked: false },
      { value: "Financing Available", checked: false },
      { value: "Satisfaction Guaranteed", checked: false },
      { value: "Locally Owned", checked: false },
    ],
    directories: [
      { name: "National Wood Flooring Association", url: "nwfa.org", priority: "HIGH" },
    ],
    blogCategories: ["flooring_hardwood", "flooring_tile", "flooring_vinyl", "flooring_carpet", "flooring_cost", "flooring_care"],
  },

  garage: {
    name: "Garage Doors",
    icon: "🚗",
    schemaType: "GarageDoorService",
    gbpCategory: "Garage Door Supplier",
    urlSlug: "garage-doors",
    serviceNoun: "garage door",
    servicePlural: "garage door services",
    providerNoun: "garage door technicians",
    description: "Garage door installation, repair, and maintenance services.",
    services: {
      core: [
        { value: "Garage Door Repair", checked: true },
        { value: "Garage Door Installation", checked: true },
        { value: "Spring Replacement", checked: true },
        { value: "Opener Repair", checked: true },
        { value: "Opener Installation", checked: true },
        { value: "Emergency Service", checked: true },
        { value: "Cable Repair", checked: false },
        { value: "Panel Replacement", checked: false },
        { value: "Maintenance", checked: false },
      ],
      commercial: [
        { value: "Commercial Doors", checked: false },
        { value: "Roll-Up Doors", checked: false },
        { value: "Loading Dock Doors", checked: false },
      ],
      specialty: [
        { value: "Smart Openers", checked: false },
        { value: "Insulated Doors", checked: false },
        { value: "Custom Doors", checked: false },
        { value: "Carriage House Style", checked: false },
      ],
    },
    usps: [
      { value: "24/7 Emergency", checked: true },
      { value: "Free Estimates", checked: true },
      { value: "Licensed & Insured", checked: true },
      { value: "Same-Day Service", checked: false },
      { value: "Lifetime Warranty", checked: false },
      { value: "Locally Owned", checked: false },
    ],
    directories: [
      { name: "International Door Association", url: "doors.org", priority: "HIGH" },
    ],
    blogCategories: ["garage_repair", "garage_installation", "garage_maintenance", "garage_safety", "garage_cost"],
  },

  windows: {
    name: "Windows & Doors",
    icon: "🪟",
    schemaType: "WindowInstaller",
    gbpCategory: "Window Installation Service",
    urlSlug: "windows",
    serviceNoun: "window",
    servicePlural: "window and door services",
    providerNoun: "window specialists",
    description: "Window and door installation and replacement contractors.",
    services: {
      core: [
        { value: "Window Replacement", checked: true },
        { value: "Window Installation", checked: true },
        { value: "Door Replacement", checked: true },
        { value: "Entry Door Installation", checked: true },
        { value: "Patio Door Installation", checked: true },
        { value: "Window Repair", checked: false },
        { value: "Screen Repair", checked: false },
        { value: "Glass Replacement", checked: false },
      ],
      commercial: [
        { value: "Commercial Windows", checked: false },
        { value: "Storefront Installation", checked: false },
      ],
      specialty: [
        { value: "Energy Efficient Windows", checked: false },
        { value: "Impact Windows", checked: false },
        { value: "Bay Windows", checked: false },
        { value: "Skylights", checked: false },
        { value: "French Doors", checked: false },
        { value: "Sliding Doors", checked: false },
      ],
    },
    usps: [
      { value: "Free Estimates", checked: true },
      { value: "Licensed & Insured", checked: true },
      { value: "Energy Star Partner", checked: false },
      { value: "Financing Available", checked: false },
      { value: "Lifetime Warranty", checked: false },
      { value: "Locally Owned", checked: false },
    ],
    directories: [
      { name: "Window & Door Manufacturers Association", url: "wdma.com", priority: "HIGH" },
    ],
    blogCategories: ["window_replacement", "window_energy", "door_replacement", "window_cost", "window_styles"],
  },

  solar: {
    name: "Solar",
    icon: "☀️",
    schemaType: "SolarEnergyContractor",
    gbpCategory: "Solar Energy Contractor",
    urlSlug: "solar",
    serviceNoun: "solar",
    servicePlural: "solar installation services",
    providerNoun: "solar installers",
    description: "Solar panel installation and energy services.",
    services: {
      core: [
        { value: "Solar Panel Installation", checked: true },
        { value: "Solar Consultation", checked: true },
        { value: "Solar System Design", checked: true },
        { value: "Solar Financing", checked: true },
        { value: "Solar Maintenance", checked: false },
        { value: "Solar Repair", checked: false },
        { value: "Panel Cleaning", checked: false },
      ],
      commercial: [
        { value: "Commercial Solar", checked: false },
        { value: "Solar Farm Development", checked: false },
      ],
      specialty: [
        { value: "Battery Storage", checked: false },
        { value: "Tesla Powerwall", checked: false },
        { value: "EV Charger Combo", checked: false },
        { value: "Roof + Solar", checked: false },
        { value: "Ground Mount Systems", checked: false },
      ],
    },
    usps: [
      { value: "Free Solar Consultation", checked: true },
      { value: "Licensed & Insured", checked: true },
      { value: "NABCEP Certified", checked: false },
      { value: "Zero Down Financing", checked: false },
      { value: "25-Year Warranty", checked: false },
      { value: "Tesla Certified", checked: false },
      { value: "Local Installer", checked: false },
    ],
    directories: [
      { name: "Solar Energy Industries Association", url: "seia.org", priority: "HIGH" },
      { name: "EnergySage", url: "energysage.com", priority: "HIGH" },
    ],
    blogCategories: ["solar_benefits", "solar_cost", "solar_process", "solar_financing", "solar_maintenance"],
  },

  pool: {
    name: "Pool Service",
    icon: "🏊",
    schemaType: "PoolService",
    gbpCategory: "Swimming Pool Contractor",
    urlSlug: "pool-service",
    serviceNoun: "pool",
    servicePlural: "pool services",
    providerNoun: "pool technicians",
    description: "Swimming pool construction, maintenance, and repair services.",
    services: {
      core: [
        { value: "Pool Cleaning", checked: true },
        { value: "Pool Maintenance", checked: true },
        { value: "Pool Repair", checked: true },
        { value: "Pool Opening", checked: true },
        { value: "Pool Closing", checked: true },
        { value: "Chemical Balancing", checked: true },
        { value: "Filter Cleaning", checked: false },
        { value: "Pump Repair", checked: false },
        { value: "Heater Repair", checked: false },
      ],
      commercial: [
        { value: "Commercial Pool Service", checked: false },
        { value: "HOA Pool Maintenance", checked: false },
      ],
      specialty: [
        { value: "Pool Renovation", checked: false },
        { value: "Pool Resurfacing", checked: false },
        { value: "Tile Repair", checked: false },
        { value: "Pool Equipment Upgrade", checked: false },
        { value: "Salt System Install", checked: false },
        { value: "Pool Inspection", checked: false },
      ],
    },
    usps: [
      { value: "Free Estimates", checked: true },
      { value: "Licensed & Insured", checked: true },
      { value: "CPO Certified", checked: false },
      { value: "Weekly Service Plans", checked: false },
      { value: "Same-Day Service", checked: false },
      { value: "Locally Owned", checked: false },
    ],
    directories: [
      { name: "Association of Pool & Spa Professionals", url: "apsp.org", priority: "HIGH" },
    ],
    blogCategories: ["pool_maintenance", "pool_chemistry", "pool_seasonal", "pool_repair", "pool_cost"],
  },

  general: {
    name: "General Contractor",
    icon: "🔨",
    schemaType: "GeneralContractor",
    gbpCategory: "General Contractor",
    urlSlug: "contractor",
    serviceNoun: "contracting",
    servicePlural: "contracting services",
    providerNoun: "contractors",
    description: "General contractors providing home improvement and construction services.",
    services: {
      core: [
        { value: "Home Remodeling", checked: true },
        { value: "Kitchen Remodeling", checked: true },
        { value: "Bathroom Remodeling", checked: true },
        { value: "Basement Finishing", checked: true },
        { value: "Room Additions", checked: true },
        { value: "Home Repairs", checked: true },
        { value: "Drywall Services", checked: false },
        { value: "Carpentry", checked: false },
        { value: "Framing", checked: false },
      ],
      commercial: [
        { value: "Commercial Construction", checked: false },
        { value: "Tenant Build-Out", checked: false },
        { value: "Office Renovation", checked: false },
      ],
      specialty: [
        { value: "Deck Building", checked: false },
        { value: "Porch Construction", checked: false },
        { value: "Garage Conversion", checked: false },
        { value: "Aging-in-Place Modifications", checked: false },
        { value: "Energy Efficiency Upgrades", checked: false },
      ],
    },
    usps: [
      { value: "Free Estimates", checked: true },
      { value: "Licensed & Insured", checked: true },
      { value: "Design-Build Services", checked: false },
      { value: "Financing Available", checked: false },
      { value: "Satisfaction Guaranteed", checked: false },
      { value: "Family Owned", checked: false },
      { value: "BBB A+ Rated", checked: false },
      { value: "Locally Owned", checked: false },
    ],
    directories: [
      { name: "National Association of Home Builders", url: "nahb.org", priority: "HIGH" },
      { name: "Associated Builders and Contractors", url: "abc.org", priority: "MEDIUM" },
    ],
    blogCategories: ["remodeling_kitchen", "remodeling_bathroom", "remodeling_basement", "home_improvement", "contractor_tips", "remodeling_cost"],
  },

  equestrian: {
    name: "Equestrian / Horse Farm",
    icon: "🐴",
    schemaType: "LocalBusiness",
    gbpCategory: "Horse Boarding Stable",
    urlSlug: "equestrian",
    serviceNoun: "equestrian",
    servicePlural: "equestrian services",
    providerNoun: "equestrian professionals",
    description: "Equestrian facilities, horse farms, and horse-related services.",
    services: {
      core: [
        { value: "Horse Boarding", checked: true },
        { value: "Pasture Boarding", checked: true },
        { value: "Stall Boarding", checked: true },
        { value: "Horse Training", checked: true },
        { value: "Riding Lessons", checked: true },
        { value: "Horse Sales", checked: true },
        { value: "Horse Leasing", checked: false },
        { value: "Horse Transport", checked: false },
        { value: "Breeding Services", checked: false },
        { value: "Foaling Services", checked: false },
        { value: "Layup & Rehabilitation", checked: false },
        { value: "Turnout Services", checked: false },
      ],
      commercial: [
        { value: "Event Hosting", checked: false },
        { value: "Horse Shows", checked: false },
        { value: "Trail Rides", checked: false },
        { value: "Corporate Events", checked: false },
        { value: "Wedding Venue", checked: false },
        { value: "Farm Tours", checked: false },
      ],
      specialty: [
        { value: "Dressage Training", checked: false },
        { value: "Hunter/Jumper Training", checked: false },
        { value: "Western Training", checked: false },
        { value: "Eventing", checked: false },
        { value: "Reining", checked: false },
        { value: "Therapeutic Riding", checked: false },
        { value: "Youth Programs", checked: false },
        { value: "Summer Camps", checked: false },
        { value: "Pony Parties", checked: false },
        { value: "Farrier Services", checked: false },
        { value: "Equine Dentistry", checked: false },
        { value: "Nutrition Consulting", checked: false },
      ],
    },
    usps: [
      { value: "Full-Care Boarding", checked: true },
      { value: "Licensed & Insured", checked: true },
      { value: "Indoor Arena", checked: false },
      { value: "Outdoor Arena", checked: false },
      { value: "Round Pen", checked: false },
      { value: "Trail Access", checked: false },
      { value: "24/7 On-Site Care", checked: false },
      { value: "Heated Barn", checked: false },
      { value: "Certified Trainers", checked: false },
      { value: "USEF Certified", checked: false },
      { value: "USDF Member", checked: false },
      { value: "AQHA Approved", checked: false },
      { value: "Family Owned", checked: false },
      { value: "Locally Owned", checked: false },
      { value: "Veterinary Relationship", checked: false },
    ],
    directories: [
      { name: "EquineNow", url: "equinenow.com", priority: "HIGH" },
      { name: "Barnmice", url: "barnmice.com", priority: "HIGH" },
      { name: "HorseProperties.net", url: "horseproperties.net", priority: "HIGH" },
      { name: "Horses.com", url: "horses.com", priority: "MEDIUM" },
      { name: "DreamHorse", url: "dreamhorse.com", priority: "MEDIUM" },
      { name: "USEF Find A Club", url: "usef.org", priority: "HIGH" },
    ],
    blogCategories: ["equine_boarding", "equine_training", "equine_health", "equine_facility", "equine_events", "equine_buying", "equine_seasonal", "equine_cost"],
  },
};

// Helper function to get all checked services for an industry
export function getDefaultServices(industryKey: string): string[] {
  const industry = INDUSTRIES[industryKey];
  if (!industry) return [];

  const services: string[] = [];

  Object.values(industry.services).forEach((category) => {
    category.forEach((service) => {
      if (service.checked) {
        services.push(service.value);
      }
    });
  });

  return services;
}

// Helper function to get all checked USPs for an industry
export function getDefaultUSPs(industryKey: string): string[] {
  const industry = INDUSTRIES[industryKey];
  if (!industry) return [];

  return industry.usps
    .filter((usp) => usp.checked)
    .map((usp) => usp.value);
}

// Get industry options for dropdown
export function getIndustryOptions(): { value: string; label: string; icon: string }[] {
  return Object.entries(INDUSTRIES).map(([key, config]) => ({
    value: key,
    label: config.name,
    icon: config.icon,
  }));
}
