// components/seo/SEOHeatmap.tsx
// Geographic SEO Heatmap - Shows SEO performance across service areas on a real map

import React, { useState, useCallback, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import styles from "../../styles/SEOHeatmap.module.css";

// Dynamically import map components to avoid SSR issues with Leaflet
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((mod) => mod.CircleMarker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import("react-leaflet").then((mod) => mod.Tooltip),
  { ssr: false }
);

interface LocationSEOData {
  city: string;
  state: string;
  lat: number;
  lng: number;
  searchVolume: number;
  competition: "low" | "medium" | "high";
  competitionScore: number;
  estimatedTraffic: number;
  topCompetitors: string[];
  avgCPC: number;
  ranking?: number;
  localIntent: number; // percentage of searches with local intent
}

interface KeywordData {
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: string;
  trend: "up" | "down" | "stable";
  intent: "informational" | "commercial" | "transactional" | "navigational";
}

interface CompetitorData {
  domain: string;
  position: number;
  authority: number;
  traffic: string;
  keywords: number;
}

interface SERPFeature {
  type: string;
  present: boolean;
  opportunity: string;
}

interface SEOHeatmapProps {
  companyProfile?: {
    name: string;
    website: string;
    industryType: string;
    services: string[];
    cities?: string[];
    headquarters?: string;
    state?: string;
  };
}

// Comprehensive US cities database with coordinates
const US_CITIES: { [key: string]: { lat: number; lng: number; state: string } } = {
  // Alabama
  "Birmingham": { lat: 33.5186, lng: -86.8104, state: "AL" },
  "Montgomery": { lat: 32.3792, lng: -86.3077, state: "AL" },
  "Huntsville": { lat: 34.7304, lng: -86.5861, state: "AL" },
  "Mobile": { lat: 30.6954, lng: -88.0399, state: "AL" },
  // Alaska
  "Anchorage": { lat: 61.2181, lng: -149.9003, state: "AK" },
  "Fairbanks": { lat: 64.8378, lng: -147.7164, state: "AK" },
  // Arizona
  "Phoenix": { lat: 33.4484, lng: -112.0740, state: "AZ" },
  "Scottsdale": { lat: 33.4942, lng: -111.9261, state: "AZ" },
  "Tempe": { lat: 33.4255, lng: -111.9400, state: "AZ" },
  "Mesa": { lat: 33.4152, lng: -111.8315, state: "AZ" },
  "Chandler": { lat: 33.3062, lng: -111.8413, state: "AZ" },
  "Gilbert": { lat: 33.3528, lng: -111.7890, state: "AZ" },
  "Glendale": { lat: 33.5387, lng: -112.1859, state: "AZ" },
  "Peoria": { lat: 33.5806, lng: -112.2374, state: "AZ" },
  "Surprise": { lat: 33.6292, lng: -112.3680, state: "AZ" },
  "Goodyear": { lat: 33.4353, lng: -112.3585, state: "AZ" },
  "Tucson": { lat: 32.2226, lng: -110.9747, state: "AZ" },
  "Flagstaff": { lat: 35.1983, lng: -111.6513, state: "AZ" },
  // Arkansas
  "Little Rock": { lat: 34.7465, lng: -92.2896, state: "AR" },
  "Fayetteville": { lat: 36.0626, lng: -94.1574, state: "AR" },
  // California
  "Los Angeles": { lat: 34.0522, lng: -118.2437, state: "CA" },
  "San Diego": { lat: 32.7157, lng: -117.1611, state: "CA" },
  "San Francisco": { lat: 37.7749, lng: -122.4194, state: "CA" },
  "San Jose": { lat: 37.3382, lng: -121.8863, state: "CA" },
  "Sacramento": { lat: 38.5816, lng: -121.4944, state: "CA" },
  "Fresno": { lat: 36.7378, lng: -119.7871, state: "CA" },
  "Long Beach": { lat: 33.7701, lng: -118.1937, state: "CA" },
  "Oakland": { lat: 37.8044, lng: -122.2712, state: "CA" },
  "Bakersfield": { lat: 35.3733, lng: -119.0187, state: "CA" },
  "Anaheim": { lat: 33.8366, lng: -117.9143, state: "CA" },
  "Santa Ana": { lat: 33.7455, lng: -117.8677, state: "CA" },
  "Riverside": { lat: 33.9533, lng: -117.3962, state: "CA" },
  "Stockton": { lat: 37.9577, lng: -121.2908, state: "CA" },
  "Irvine": { lat: 33.6846, lng: -117.8265, state: "CA" },
  "Chula Vista": { lat: 32.6401, lng: -117.0842, state: "CA" },
  "Santa Clarita": { lat: 34.3917, lng: -118.5426, state: "CA" },
  "Modesto": { lat: 37.6391, lng: -120.9969, state: "CA" },
  "Oceanside": { lat: 33.1959, lng: -117.3795, state: "CA" },
  "Fontana": { lat: 34.0922, lng: -117.4350, state: "CA" },
  "Rancho Cucamonga": { lat: 34.1064, lng: -117.5931, state: "CA" },
  "Ontario": { lat: 34.0633, lng: -117.6509, state: "CA" },
  "Santa Rosa": { lat: 38.4404, lng: -122.7141, state: "CA" },
  "Elk Grove": { lat: 38.4088, lng: -121.3716, state: "CA" },
  "Corona": { lat: 33.8753, lng: -117.5664, state: "CA" },
  "Lancaster": { lat: 34.6868, lng: -118.1542, state: "CA" },
  "Palmdale": { lat: 34.5794, lng: -118.1165, state: "CA" },
  "Salinas": { lat: 36.6777, lng: -121.6555, state: "CA" },
  "Pomona": { lat: 34.0551, lng: -117.7500, state: "CA" },
  "Pasadena": { lat: 34.1478, lng: -118.1445, state: "CA" },
  "Torrance": { lat: 33.8358, lng: -118.3406, state: "CA" },
  "Fullerton": { lat: 33.8704, lng: -117.9242, state: "CA" },
  "Orange": { lat: 33.7879, lng: -117.8531, state: "CA" },
  "Thousand Oaks": { lat: 34.1706, lng: -118.8376, state: "CA" },
  "Visalia": { lat: 36.3302, lng: -119.2921, state: "CA" },
  "Roseville": { lat: 38.7521, lng: -121.2880, state: "CA" },
  "Concord": { lat: 37.9780, lng: -122.0311, state: "CA" },
  "Simi Valley": { lat: 34.2694, lng: -118.7815, state: "CA" },
  "Santa Clara": { lat: 37.3541, lng: -121.9552, state: "CA" },
  "Victorville": { lat: 34.5362, lng: -117.2928, state: "CA" },
  "Vallejo": { lat: 38.1041, lng: -122.2566, state: "CA" },
  "Berkeley": { lat: 37.8716, lng: -122.2727, state: "CA" },
  "El Monte": { lat: 34.0686, lng: -118.0276, state: "CA" },
  "Downey": { lat: 33.9401, lng: -118.1332, state: "CA" },
  "Costa Mesa": { lat: 33.6412, lng: -117.9187, state: "CA" },
  "Inglewood": { lat: 33.9617, lng: -118.3531, state: "CA" },
  "San Buenaventura": { lat: 34.2805, lng: -119.2945, state: "CA" },
  "Ventura": { lat: 34.2805, lng: -119.2945, state: "CA" },
  // Colorado
  "Denver": { lat: 39.7392, lng: -104.9903, state: "CO" },
  "Colorado Springs": { lat: 38.8339, lng: -104.8214, state: "CO" },
  "Aurora": { lat: 39.7294, lng: -104.8319, state: "CO" },
  "Fort Collins": { lat: 40.5853, lng: -105.0844, state: "CO" },
  "Lakewood": { lat: 39.7047, lng: -105.0814, state: "CO" },
  "Thornton": { lat: 39.8680, lng: -104.9719, state: "CO" },
  "Arvada": { lat: 39.8028, lng: -105.0875, state: "CO" },
  "Westminster": { lat: 39.8367, lng: -105.0372, state: "CO" },
  "Pueblo": { lat: 38.2544, lng: -104.6091, state: "CO" },
  "Centennial": { lat: 39.5791, lng: -104.8769, state: "CO" },
  "Boulder": { lat: 40.0150, lng: -105.2705, state: "CO" },
  // Connecticut
  "Bridgeport": { lat: 41.1865, lng: -73.1952, state: "CT" },
  "New Haven": { lat: 41.3083, lng: -72.9279, state: "CT" },
  "Stamford": { lat: 41.0534, lng: -73.5387, state: "CT" },
  "Hartford": { lat: 41.7658, lng: -72.6734, state: "CT" },
  "Waterbury": { lat: 41.5582, lng: -73.0515, state: "CT" },
  // Delaware
  "Wilmington": { lat: 39.7391, lng: -75.5398, state: "DE" },
  "Dover": { lat: 39.1582, lng: -75.5244, state: "DE" },
  // Florida
  "Miami": { lat: 25.7617, lng: -80.1918, state: "FL" },
  "Tampa": { lat: 27.9506, lng: -82.4572, state: "FL" },
  "Orlando": { lat: 28.5383, lng: -81.3792, state: "FL" },
  "Jacksonville": { lat: 30.3322, lng: -81.6557, state: "FL" },
  "St. Petersburg": { lat: 27.7676, lng: -82.6403, state: "FL" },
  "Hialeah": { lat: 25.8576, lng: -80.2781, state: "FL" },
  "Port St. Lucie": { lat: 27.2730, lng: -80.3582, state: "FL" },
  "Cape Coral": { lat: 26.5629, lng: -81.9495, state: "FL" },
  "Tallahassee": { lat: 30.4383, lng: -84.2807, state: "FL" },
  "Fort Lauderdale": { lat: 26.1224, lng: -80.1373, state: "FL" },
  "Pembroke Pines": { lat: 26.0128, lng: -80.2239, state: "FL" },
  "Hollywood": { lat: 26.0112, lng: -80.1495, state: "FL" },
  "Miramar": { lat: 25.9860, lng: -80.2323, state: "FL" },
  "Gainesville": { lat: 29.6516, lng: -82.3248, state: "FL" },
  "Coral Springs": { lat: 26.2712, lng: -80.2706, state: "FL" },
  "Clearwater": { lat: 27.9659, lng: -82.8001, state: "FL" },
  "Palm Bay": { lat: 28.0345, lng: -80.5887, state: "FL" },
  "Pompano Beach": { lat: 26.2379, lng: -80.1248, state: "FL" },
  "West Palm Beach": { lat: 26.7153, lng: -80.0534, state: "FL" },
  "Lakeland": { lat: 28.0395, lng: -81.9498, state: "FL" },
  "Davie": { lat: 26.0765, lng: -80.2521, state: "FL" },
  "Boca Raton": { lat: 26.3683, lng: -80.1289, state: "FL" },
  "Sunrise": { lat: 26.1339, lng: -80.1131, state: "FL" },
  "Deltona": { lat: 28.9005, lng: -81.2637, state: "FL" },
  "Plantation": { lat: 26.1276, lng: -80.2331, state: "FL" },
  "Palm Coast": { lat: 29.5844, lng: -81.2078, state: "FL" },
  "Deerfield Beach": { lat: 26.3184, lng: -80.0998, state: "FL" },
  "Melbourne": { lat: 28.0836, lng: -80.6081, state: "FL" },
  "Boynton Beach": { lat: 26.5254, lng: -80.0662, state: "FL" },
  "Lauderhill": { lat: 26.1404, lng: -80.2134, state: "FL" },
  "Fort Myers": { lat: 26.6406, lng: -81.8723, state: "FL" },
  "Weston": { lat: 26.1004, lng: -80.3998, state: "FL" },
  "Kissimmee": { lat: 28.2920, lng: -81.4076, state: "FL" },
  "Homestead": { lat: 25.4687, lng: -80.4776, state: "FL" },
  "Tamarac": { lat: 26.2128, lng: -80.2498, state: "FL" },
  "Delray Beach": { lat: 26.4615, lng: -80.0728, state: "FL" },
  "Daytona Beach": { lat: 29.2108, lng: -81.0228, state: "FL" },
  "North Miami": { lat: 25.8901, lng: -80.1867, state: "FL" },
  "Wellington": { lat: 26.6618, lng: -80.2684, state: "FL" },
  "North Port": { lat: 27.0442, lng: -82.2359, state: "FL" },
  "Jupiter": { lat: 26.9342, lng: -80.0942, state: "FL" },
  "Ocala": { lat: 29.1872, lng: -82.1401, state: "FL" },
  "Port Orange": { lat: 29.1383, lng: -80.9956, state: "FL" },
  "Margate": { lat: 26.2445, lng: -80.2064, state: "FL" },
  "Coconut Creek": { lat: 26.2517, lng: -80.1789, state: "FL" },
  "Sanford": { lat: 28.8001, lng: -81.2731, state: "FL" },
  "Sarasota": { lat: 27.3364, lng: -82.5307, state: "FL" },
  "Pensacola": { lat: 30.4213, lng: -87.2169, state: "FL" },
  "Bradenton": { lat: 27.4989, lng: -82.5748, state: "FL" },
  "Panama City": { lat: 30.1588, lng: -85.6602, state: "FL" },
  // Georgia
  "Atlanta": { lat: 33.7490, lng: -84.3880, state: "GA" },
  "Augusta": { lat: 33.4735, lng: -82.0105, state: "GA" },
  "Columbus": { lat: 32.4610, lng: -84.9877, state: "GA" },
  "Savannah": { lat: 32.0809, lng: -81.0912, state: "GA" },
  "Athens": { lat: 33.9519, lng: -83.3576, state: "GA" },
  "Macon": { lat: 32.8407, lng: -83.6324, state: "GA" },
  "Roswell": { lat: 34.0232, lng: -84.3616, state: "GA" },
  "Albany": { lat: 31.5785, lng: -84.1557, state: "GA" },
  "Johns Creek": { lat: 34.0290, lng: -84.1984, state: "GA" },
  "Warner Robins": { lat: 32.6130, lng: -83.5990, state: "GA" },
  "Alpharetta": { lat: 34.0754, lng: -84.2941, state: "GA" },
  "Marietta": { lat: 33.9526, lng: -84.5499, state: "GA" },
  "Valdosta": { lat: 30.8327, lng: -83.2785, state: "GA" },
  "Smyrna": { lat: 33.8839, lng: -84.5144, state: "GA" },
  "Dunwoody": { lat: 33.9462, lng: -84.3346, state: "GA" },
  // Hawaii
  "Honolulu": { lat: 21.3069, lng: -157.8583, state: "HI" },
  "Pearl City": { lat: 21.3972, lng: -157.9753, state: "HI" },
  "Hilo": { lat: 19.7297, lng: -155.0900, state: "HI" },
  // Idaho
  "Boise": { lat: 43.6150, lng: -116.2023, state: "ID" },
  "Meridian": { lat: 43.6121, lng: -116.3915, state: "ID" },
  "Nampa": { lat: 43.5407, lng: -116.5635, state: "ID" },
  "Idaho Falls": { lat: 43.4917, lng: -112.0339, state: "ID" },
  "Pocatello": { lat: 42.8713, lng: -112.4455, state: "ID" },
  // Illinois
  "Chicago": { lat: 41.8781, lng: -87.6298, state: "IL" },
  "Aurora": { lat: 41.7606, lng: -88.3201, state: "IL" },
  "Naperville": { lat: 41.7508, lng: -88.1535, state: "IL" },
  "Joliet": { lat: 41.5250, lng: -88.0817, state: "IL" },
  "Rockford": { lat: 42.2711, lng: -89.0940, state: "IL" },
  "Springfield": { lat: 39.7817, lng: -89.6501, state: "IL" },
  "Elgin": { lat: 42.0354, lng: -88.2826, state: "IL" },
  "Peoria": { lat: 40.6936, lng: -89.5890, state: "IL" },
  "Champaign": { lat: 40.1164, lng: -88.2434, state: "IL" },
  "Waukegan": { lat: 42.3636, lng: -87.8448, state: "IL" },
  "Cicero": { lat: 41.8456, lng: -87.7539, state: "IL" },
  "Bloomington": { lat: 40.4842, lng: -88.9937, state: "IL" },
  "Arlington Heights": { lat: 42.0884, lng: -87.9806, state: "IL" },
  "Evanston": { lat: 42.0451, lng: -87.6877, state: "IL" },
  "Decatur": { lat: 39.8403, lng: -88.9548, state: "IL" },
  "Schaumburg": { lat: 42.0334, lng: -88.0834, state: "IL" },
  "Bolingbrook": { lat: 41.6986, lng: -88.0684, state: "IL" },
  "Palatine": { lat: 42.1103, lng: -88.0340, state: "IL" },
  "Skokie": { lat: 42.0324, lng: -87.7416, state: "IL" },
  "Des Plaines": { lat: 42.0334, lng: -87.8834, state: "IL" },
  // Indiana
  "Indianapolis": { lat: 39.7684, lng: -86.1581, state: "IN" },
  "Fort Wayne": { lat: 41.0793, lng: -85.1394, state: "IN" },
  "Evansville": { lat: 37.9716, lng: -87.5711, state: "IN" },
  "South Bend": { lat: 41.6764, lng: -86.2520, state: "IN" },
  "Carmel": { lat: 39.9784, lng: -86.1180, state: "IN" },
  "Fishers": { lat: 39.9567, lng: -86.0139, state: "IN" },
  "Bloomington": { lat: 39.1653, lng: -86.5264, state: "IN" },
  "Hammond": { lat: 41.5833, lng: -87.5000, state: "IN" },
  "Gary": { lat: 41.5934, lng: -87.3464, state: "IN" },
  "Lafayette": { lat: 40.4167, lng: -86.8753, state: "IN" },
  "Muncie": { lat: 40.1934, lng: -85.3864, state: "IN" },
  "Terre Haute": { lat: 39.4667, lng: -87.4139, state: "IN" },
  "Kokomo": { lat: 40.4864, lng: -86.1336, state: "IN" },
  "Noblesville": { lat: 40.0456, lng: -86.0086, state: "IN" },
  "Anderson": { lat: 40.1053, lng: -85.6803, state: "IN" },
  // Iowa
  "Des Moines": { lat: 41.5868, lng: -93.6250, state: "IA" },
  "Cedar Rapids": { lat: 41.9779, lng: -91.6656, state: "IA" },
  "Davenport": { lat: 41.5236, lng: -90.5776, state: "IA" },
  "Sioux City": { lat: 42.4963, lng: -96.4049, state: "IA" },
  "Iowa City": { lat: 41.6611, lng: -91.5302, state: "IA" },
  "Waterloo": { lat: 42.4928, lng: -92.3426, state: "IA" },
  "Ames": { lat: 42.0308, lng: -93.6319, state: "IA" },
  "West Des Moines": { lat: 41.5772, lng: -93.7113, state: "IA" },
  "Council Bluffs": { lat: 41.2619, lng: -95.8608, state: "IA" },
  "Ankeny": { lat: 41.7318, lng: -93.6001, state: "IA" },
  // Kansas
  "Wichita": { lat: 37.6872, lng: -97.3301, state: "KS" },
  "Overland Park": { lat: 38.9822, lng: -94.6708, state: "KS" },
  "Kansas City": { lat: 39.1142, lng: -94.6275, state: "KS" },
  "Olathe": { lat: 38.8814, lng: -94.8191, state: "KS" },
  "Topeka": { lat: 39.0473, lng: -95.6752, state: "KS" },
  "Lawrence": { lat: 38.9717, lng: -95.2353, state: "KS" },
  "Shawnee": { lat: 39.0228, lng: -94.7151, state: "KS" },
  "Manhattan": { lat: 39.1836, lng: -96.5717, state: "KS" },
  "Lenexa": { lat: 38.9536, lng: -94.7336, state: "KS" },
  "Salina": { lat: 38.8403, lng: -97.6114, state: "KS" },
  // Kentucky
  "Louisville": { lat: 38.2527, lng: -85.7585, state: "KY" },
  "Lexington": { lat: 38.0406, lng: -84.5037, state: "KY" },
  "Bowling Green": { lat: 36.9685, lng: -86.4808, state: "KY" },
  "Owensboro": { lat: 37.7719, lng: -87.1112, state: "KY" },
  "Covington": { lat: 39.0837, lng: -84.5086, state: "KY" },
  // Louisiana
  "New Orleans": { lat: 29.9511, lng: -90.0715, state: "LA" },
  "Baton Rouge": { lat: 30.4515, lng: -91.1871, state: "LA" },
  "Shreveport": { lat: 32.5252, lng: -93.7502, state: "LA" },
  "Lafayette": { lat: 30.2241, lng: -92.0198, state: "LA" },
  "Lake Charles": { lat: 30.2266, lng: -93.2174, state: "LA" },
  // Maine
  "Portland": { lat: 43.6591, lng: -70.2568, state: "ME" },
  "Lewiston": { lat: 44.1004, lng: -70.2148, state: "ME" },
  "Bangor": { lat: 44.8016, lng: -68.7712, state: "ME" },
  // Maryland
  "Baltimore": { lat: 39.2904, lng: -76.6122, state: "MD" },
  "Frederick": { lat: 39.4143, lng: -77.4105, state: "MD" },
  "Rockville": { lat: 39.0840, lng: -77.1528, state: "MD" },
  "Gaithersburg": { lat: 39.1434, lng: -77.2014, state: "MD" },
  "Bowie": { lat: 39.0068, lng: -76.7791, state: "MD" },
  // Massachusetts
  "Boston": { lat: 42.3601, lng: -71.0589, state: "MA" },
  "Worcester": { lat: 42.2626, lng: -71.8023, state: "MA" },
  "Springfield": { lat: 42.1015, lng: -72.5898, state: "MA" },
  "Cambridge": { lat: 42.3736, lng: -71.1097, state: "MA" },
  "Lowell": { lat: 42.6334, lng: -71.3162, state: "MA" },
  "Brockton": { lat: 42.0834, lng: -71.0184, state: "MA" },
  "New Bedford": { lat: 41.6362, lng: -70.9342, state: "MA" },
  "Quincy": { lat: 42.2529, lng: -71.0023, state: "MA" },
  "Lynn": { lat: 42.4668, lng: -70.9495, state: "MA" },
  "Fall River": { lat: 41.7015, lng: -71.1550, state: "MA" },
  // Michigan
  "Detroit": { lat: 42.3314, lng: -83.0458, state: "MI" },
  "Grand Rapids": { lat: 42.9634, lng: -85.6681, state: "MI" },
  "Warren": { lat: 42.5145, lng: -83.0147, state: "MI" },
  "Sterling Heights": { lat: 42.5803, lng: -83.0302, state: "MI" },
  "Ann Arbor": { lat: 42.2808, lng: -83.7430, state: "MI" },
  "Lansing": { lat: 42.7325, lng: -84.5555, state: "MI" },
  "Flint": { lat: 43.0125, lng: -83.6875, state: "MI" },
  "Dearborn": { lat: 42.3223, lng: -83.1763, state: "MI" },
  "Livonia": { lat: 42.3684, lng: -83.3527, state: "MI" },
  "Troy": { lat: 42.6064, lng: -83.1498, state: "MI" },
  "Westland": { lat: 42.3242, lng: -83.4002, state: "MI" },
  "Farmington Hills": { lat: 42.4989, lng: -83.3677, state: "MI" },
  "Kalamazoo": { lat: 42.2917, lng: -85.5872, state: "MI" },
  "Wyoming": { lat: 42.9133, lng: -85.7053, state: "MI" },
  "Southfield": { lat: 42.4734, lng: -83.2219, state: "MI" },
  "Rochester Hills": { lat: 42.6584, lng: -83.1499, state: "MI" },
  "Taylor": { lat: 42.2409, lng: -83.2697, state: "MI" },
  "Pontiac": { lat: 42.6389, lng: -83.2910, state: "MI" },
  "St. Clair Shores": { lat: 42.4970, lng: -82.8963, state: "MI" },
  "Royal Oak": { lat: 42.4895, lng: -83.1446, state: "MI" },
  // Minnesota
  "Minneapolis": { lat: 44.9778, lng: -93.2650, state: "MN" },
  "St. Paul": { lat: 44.9537, lng: -93.0900, state: "MN" },
  "Rochester": { lat: 44.0121, lng: -92.4802, state: "MN" },
  "Duluth": { lat: 46.7867, lng: -92.1005, state: "MN" },
  "Bloomington": { lat: 44.8408, lng: -93.2983, state: "MN" },
  "Brooklyn Park": { lat: 45.0941, lng: -93.3564, state: "MN" },
  "Plymouth": { lat: 45.0105, lng: -93.4555, state: "MN" },
  "St. Cloud": { lat: 45.5579, lng: -94.1632, state: "MN" },
  "Woodbury": { lat: 44.9239, lng: -92.9594, state: "MN" },
  "Eagan": { lat: 44.8041, lng: -93.1669, state: "MN" },
  "Maple Grove": { lat: 45.0724, lng: -93.4558, state: "MN" },
  "Eden Prairie": { lat: 44.8547, lng: -93.4708, state: "MN" },
  "Coon Rapids": { lat: 45.1732, lng: -93.3030, state: "MN" },
  "Burnsville": { lat: 44.7677, lng: -93.2777, state: "MN" },
  "Blaine": { lat: 45.1608, lng: -93.2349, state: "MN" },
  "Lakeville": { lat: 44.6497, lng: -93.2427, state: "MN" },
  "Minnetonka": { lat: 44.9211, lng: -93.4687, state: "MN" },
  "Apple Valley": { lat: 44.7319, lng: -93.2177, state: "MN" },
  "Edina": { lat: 44.8897, lng: -93.3499, state: "MN" },
  "St. Louis Park": { lat: 44.9483, lng: -93.3702, state: "MN" },
  // Mississippi
  "Jackson": { lat: 32.2988, lng: -90.1848, state: "MS" },
  "Gulfport": { lat: 30.3674, lng: -89.0928, state: "MS" },
  "Southaven": { lat: 34.9889, lng: -90.0126, state: "MS" },
  "Hattiesburg": { lat: 31.3271, lng: -89.2903, state: "MS" },
  "Biloxi": { lat: 30.3960, lng: -88.8853, state: "MS" },
  // Missouri
  "Kansas City": { lat: 39.0997, lng: -94.5786, state: "MO" },
  "St. Louis": { lat: 38.6270, lng: -90.1994, state: "MO" },
  "Springfield": { lat: 37.2090, lng: -93.2923, state: "MO" },
  "Independence": { lat: 39.0911, lng: -94.4155, state: "MO" },
  "Columbia": { lat: 38.9517, lng: -92.3341, state: "MO" },
  "Lee's Summit": { lat: 38.9108, lng: -94.3822, state: "MO" },
  "O'Fallon": { lat: 38.8106, lng: -90.6998, state: "MO" },
  "St. Joseph": { lat: 39.7675, lng: -94.8467, state: "MO" },
  "St. Charles": { lat: 38.7881, lng: -90.4974, state: "MO" },
  "St. Peters": { lat: 38.7875, lng: -90.6298, state: "MO" },
  "Blue Springs": { lat: 39.0169, lng: -94.2816, state: "MO" },
  "Florissant": { lat: 38.7892, lng: -90.3226, state: "MO" },
  "Joplin": { lat: 37.0842, lng: -94.5133, state: "MO" },
  "Chesterfield": { lat: 38.6631, lng: -90.5771, state: "MO" },
  "Jefferson City": { lat: 38.5767, lng: -92.1735, state: "MO" },
  // Montana
  "Billings": { lat: 45.7833, lng: -108.5007, state: "MT" },
  "Missoula": { lat: 46.8721, lng: -113.9940, state: "MT" },
  "Great Falls": { lat: 47.4942, lng: -111.2833, state: "MT" },
  "Bozeman": { lat: 45.6770, lng: -111.0429, state: "MT" },
  "Helena": { lat: 46.5891, lng: -112.0391, state: "MT" },
  // Nebraska
  "Omaha": { lat: 41.2565, lng: -95.9345, state: "NE" },
  "Lincoln": { lat: 40.8258, lng: -96.6852, state: "NE" },
  "Bellevue": { lat: 41.1544, lng: -95.9146, state: "NE" },
  "Grand Island": { lat: 40.9264, lng: -98.3420, state: "NE" },
  // Nevada
  "Las Vegas": { lat: 36.1699, lng: -115.1398, state: "NV" },
  "Henderson": { lat: 36.0395, lng: -114.9817, state: "NV" },
  "Reno": { lat: 39.5296, lng: -119.8138, state: "NV" },
  "North Las Vegas": { lat: 36.1989, lng: -115.1175, state: "NV" },
  "Sparks": { lat: 39.5349, lng: -119.7527, state: "NV" },
  "Carson City": { lat: 39.1638, lng: -119.7674, state: "NV" },
  // New Hampshire
  "Manchester": { lat: 42.9956, lng: -71.4548, state: "NH" },
  "Nashua": { lat: 42.7654, lng: -71.4676, state: "NH" },
  "Concord": { lat: 43.2081, lng: -71.5376, state: "NH" },
  // New Jersey
  "Newark": { lat: 40.7357, lng: -74.1724, state: "NJ" },
  "Jersey City": { lat: 40.7178, lng: -74.0431, state: "NJ" },
  "Paterson": { lat: 40.9168, lng: -74.1718, state: "NJ" },
  "Elizabeth": { lat: 40.6640, lng: -74.2107, state: "NJ" },
  "Edison": { lat: 40.5187, lng: -74.4121, state: "NJ" },
  "Woodbridge": { lat: 40.5576, lng: -74.2846, state: "NJ" },
  "Lakewood": { lat: 40.0979, lng: -74.2177, state: "NJ" },
  "Toms River": { lat: 39.9537, lng: -74.1979, state: "NJ" },
  "Hamilton": { lat: 40.2171, lng: -74.7429, state: "NJ" },
  "Trenton": { lat: 40.2206, lng: -74.7597, state: "NJ" },
  "Clifton": { lat: 40.8584, lng: -74.1638, state: "NJ" },
  "Camden": { lat: 39.9259, lng: -75.1196, state: "NJ" },
  "Brick": { lat: 40.0579, lng: -74.1379, state: "NJ" },
  "Cherry Hill": { lat: 39.9348, lng: -74.9946, state: "NJ" },
  "Passaic": { lat: 40.8568, lng: -74.1285, state: "NJ" },
  "Union City": { lat: 40.7795, lng: -74.0246, state: "NJ" },
  "Old Bridge": { lat: 40.4151, lng: -74.3654, state: "NJ" },
  "Middletown": { lat: 40.3965, lng: -74.1182, state: "NJ" },
  "East Orange": { lat: 40.7673, lng: -74.2049, state: "NJ" },
  "Bayonne": { lat: 40.6687, lng: -74.1143, state: "NJ" },
  // New Mexico
  "Albuquerque": { lat: 35.0844, lng: -106.6504, state: "NM" },
  "Las Cruces": { lat: 32.3199, lng: -106.7637, state: "NM" },
  "Rio Rancho": { lat: 35.2328, lng: -106.6630, state: "NM" },
  "Santa Fe": { lat: 35.6870, lng: -105.9378, state: "NM" },
  "Roswell": { lat: 33.3943, lng: -104.5230, state: "NM" },
  // New York
  "New York": { lat: 40.7128, lng: -74.0060, state: "NY" },
  "Buffalo": { lat: 42.8864, lng: -78.8784, state: "NY" },
  "Rochester": { lat: 43.1566, lng: -77.6088, state: "NY" },
  "Yonkers": { lat: 40.9312, lng: -73.8988, state: "NY" },
  "Syracuse": { lat: 43.0481, lng: -76.1474, state: "NY" },
  "Albany": { lat: 42.6526, lng: -73.7562, state: "NY" },
  "New Rochelle": { lat: 40.9115, lng: -73.7824, state: "NY" },
  "Mount Vernon": { lat: 40.9126, lng: -73.8371, state: "NY" },
  "Schenectady": { lat: 42.8142, lng: -73.9396, state: "NY" },
  "Utica": { lat: 43.1009, lng: -75.2327, state: "NY" },
  "White Plains": { lat: 41.0340, lng: -73.7629, state: "NY" },
  "Hempstead": { lat: 40.7062, lng: -73.6187, state: "NY" },
  "Troy": { lat: 42.7284, lng: -73.6918, state: "NY" },
  "Niagara Falls": { lat: 43.0945, lng: -79.0567, state: "NY" },
  "Binghamton": { lat: 42.0987, lng: -75.9180, state: "NY" },
  // North Carolina
  "Charlotte": { lat: 35.2271, lng: -80.8431, state: "NC" },
  "Raleigh": { lat: 35.7796, lng: -78.6382, state: "NC" },
  "Greensboro": { lat: 36.0726, lng: -79.7920, state: "NC" },
  "Durham": { lat: 35.9940, lng: -78.8986, state: "NC" },
  "Winston-Salem": { lat: 36.0999, lng: -80.2442, state: "NC" },
  "Fayetteville": { lat: 35.0527, lng: -78.8784, state: "NC" },
  "Cary": { lat: 35.7915, lng: -78.7811, state: "NC" },
  "Wilmington": { lat: 34.2257, lng: -77.9447, state: "NC" },
  "High Point": { lat: 35.9557, lng: -80.0053, state: "NC" },
  "Concord": { lat: 35.4088, lng: -80.5795, state: "NC" },
  "Asheville": { lat: 35.5951, lng: -82.5515, state: "NC" },
  "Gastonia": { lat: 35.2621, lng: -81.1873, state: "NC" },
  "Jacksonville": { lat: 34.7540, lng: -77.4302, state: "NC" },
  "Chapel Hill": { lat: 35.9132, lng: -79.0558, state: "NC" },
  "Huntersville": { lat: 35.4107, lng: -80.8429, state: "NC" },
  "Apex": { lat: 35.7327, lng: -78.8503, state: "NC" },
  "Wake Forest": { lat: 35.9799, lng: -78.5097, state: "NC" },
  "Kannapolis": { lat: 35.4874, lng: -80.6217, state: "NC" },
  "Indian Trail": { lat: 35.0768, lng: -80.6692, state: "NC" },
  "Mooresville": { lat: 35.5849, lng: -80.8101, state: "NC" },
  // North Dakota
  "Fargo": { lat: 46.8772, lng: -96.7898, state: "ND" },
  "Bismarck": { lat: 46.8083, lng: -100.7837, state: "ND" },
  "Grand Forks": { lat: 47.9253, lng: -97.0329, state: "ND" },
  "Minot": { lat: 48.2325, lng: -101.2963, state: "ND" },
  // Ohio
  "Columbus": { lat: 39.9612, lng: -82.9988, state: "OH" },
  "Cleveland": { lat: 41.4993, lng: -81.6944, state: "OH" },
  "Cincinnati": { lat: 39.1031, lng: -84.5120, state: "OH" },
  "Toledo": { lat: 41.6528, lng: -83.5379, state: "OH" },
  "Akron": { lat: 41.0814, lng: -81.5190, state: "OH" },
  "Dayton": { lat: 39.7589, lng: -84.1916, state: "OH" },
  "Parma": { lat: 41.4048, lng: -81.7229, state: "OH" },
  "Canton": { lat: 40.7989, lng: -81.3784, state: "OH" },
  "Youngstown": { lat: 41.0998, lng: -80.6495, state: "OH" },
  "Lorain": { lat: 41.4528, lng: -82.1824, state: "OH" },
  "Hamilton": { lat: 39.3995, lng: -84.5613, state: "OH" },
  "Springfield": { lat: 39.9242, lng: -83.8088, state: "OH" },
  "Kettering": { lat: 39.6895, lng: -84.1688, state: "OH" },
  "Elyria": { lat: 41.3684, lng: -82.1076, state: "OH" },
  "Lakewood": { lat: 41.4819, lng: -81.7982, state: "OH" },
  "Cuyahoga Falls": { lat: 41.1339, lng: -81.4845, state: "OH" },
  "Middletown": { lat: 39.5151, lng: -84.3983, state: "OH" },
  "Euclid": { lat: 41.5931, lng: -81.5268, state: "OH" },
  "Newark": { lat: 40.0581, lng: -82.4013, state: "OH" },
  "Mansfield": { lat: 40.7589, lng: -82.5156, state: "OH" },
  "Mentor": { lat: 41.6661, lng: -81.3396, state: "OH" },
  "Beavercreek": { lat: 39.7092, lng: -84.0633, state: "OH" },
  "Dublin": { lat: 40.0992, lng: -83.1141, state: "OH" },
  // Oklahoma
  "Oklahoma City": { lat: 35.4676, lng: -97.5164, state: "OK" },
  "Tulsa": { lat: 36.1540, lng: -95.9928, state: "OK" },
  "Norman": { lat: 35.2226, lng: -97.4395, state: "OK" },
  "Broken Arrow": { lat: 36.0609, lng: -95.7808, state: "OK" },
  "Lawton": { lat: 34.6036, lng: -98.3959, state: "OK" },
  "Edmond": { lat: 35.6528, lng: -97.4781, state: "OK" },
  "Moore": { lat: 35.3395, lng: -97.4867, state: "OK" },
  "Midwest City": { lat: 35.4495, lng: -97.3967, state: "OK" },
  "Enid": { lat: 36.3956, lng: -97.8784, state: "OK" },
  "Stillwater": { lat: 36.1156, lng: -97.0584, state: "OK" },
  // Oregon
  "Portland": { lat: 45.5152, lng: -122.6784, state: "OR" },
  "Salem": { lat: 44.9429, lng: -123.0351, state: "OR" },
  "Eugene": { lat: 44.0521, lng: -123.0868, state: "OR" },
  "Gresham": { lat: 45.4968, lng: -122.4302, state: "OR" },
  "Hillsboro": { lat: 45.5229, lng: -122.9898, state: "OR" },
  "Beaverton": { lat: 45.4871, lng: -122.8037, state: "OR" },
  "Bend": { lat: 44.0582, lng: -121.3153, state: "OR" },
  "Medford": { lat: 42.3265, lng: -122.8756, state: "OR" },
  "Springfield": { lat: 44.0462, lng: -123.0220, state: "OR" },
  "Corvallis": { lat: 44.5646, lng: -123.2620, state: "OR" },
  // Pennsylvania
  "Philadelphia": { lat: 39.9526, lng: -75.1652, state: "PA" },
  "Pittsburgh": { lat: 40.4406, lng: -79.9959, state: "PA" },
  "Allentown": { lat: 40.6084, lng: -75.4902, state: "PA" },
  "Reading": { lat: 40.3356, lng: -75.9269, state: "PA" },
  "Erie": { lat: 42.1292, lng: -80.0851, state: "PA" },
  "Scranton": { lat: 41.4090, lng: -75.6624, state: "PA" },
  "Bethlehem": { lat: 40.6259, lng: -75.3705, state: "PA" },
  "Lancaster": { lat: 40.0379, lng: -76.3055, state: "PA" },
  "Harrisburg": { lat: 40.2732, lng: -76.8867, state: "PA" },
  "Altoona": { lat: 40.5187, lng: -78.3947, state: "PA" },
  "York": { lat: 39.9626, lng: -76.7277, state: "PA" },
  "State College": { lat: 40.7934, lng: -77.8600, state: "PA" },
  "Wilkes-Barre": { lat: 41.2459, lng: -75.8813, state: "PA" },
  // Rhode Island
  "Providence": { lat: 41.8240, lng: -71.4128, state: "RI" },
  "Warwick": { lat: 41.7001, lng: -71.4162, state: "RI" },
  "Cranston": { lat: 41.7798, lng: -71.4373, state: "RI" },
  "Pawtucket": { lat: 41.8787, lng: -71.3826, state: "RI" },
  // South Carolina
  "Charleston": { lat: 32.7765, lng: -79.9311, state: "SC" },
  "Columbia": { lat: 34.0007, lng: -81.0348, state: "SC" },
  "North Charleston": { lat: 32.8546, lng: -79.9748, state: "SC" },
  "Mount Pleasant": { lat: 32.8323, lng: -79.8284, state: "SC" },
  "Rock Hill": { lat: 34.9249, lng: -81.0251, state: "SC" },
  "Greenville": { lat: 34.8526, lng: -82.3940, state: "SC" },
  "Summerville": { lat: 33.0185, lng: -80.1756, state: "SC" },
  "Goose Creek": { lat: 32.9810, lng: -80.0326, state: "SC" },
  "Hilton Head Island": { lat: 32.2163, lng: -80.7526, state: "SC" },
  "Spartanburg": { lat: 34.9496, lng: -81.9320, state: "SC" },
  "Florence": { lat: 34.1954, lng: -79.7626, state: "SC" },
  "Myrtle Beach": { lat: 33.6891, lng: -78.8867, state: "SC" },
  // South Dakota
  "Sioux Falls": { lat: 43.5446, lng: -96.7311, state: "SD" },
  "Rapid City": { lat: 44.0805, lng: -103.2310, state: "SD" },
  "Aberdeen": { lat: 45.4647, lng: -98.4865, state: "SD" },
  // Tennessee
  "Nashville": { lat: 36.1627, lng: -86.7816, state: "TN" },
  "Memphis": { lat: 35.1495, lng: -90.0490, state: "TN" },
  "Knoxville": { lat: 35.9606, lng: -83.9207, state: "TN" },
  "Chattanooga": { lat: 35.0456, lng: -85.3097, state: "TN" },
  "Clarksville": { lat: 36.5298, lng: -87.3595, state: "TN" },
  "Murfreesboro": { lat: 35.8456, lng: -86.3903, state: "TN" },
  "Franklin": { lat: 35.9251, lng: -86.8689, state: "TN" },
  "Jackson": { lat: 35.6145, lng: -88.8139, state: "TN" },
  "Johnson City": { lat: 36.3134, lng: -82.3535, state: "TN" },
  "Bartlett": { lat: 35.2045, lng: -89.8739, state: "TN" },
  "Hendersonville": { lat: 36.3048, lng: -86.6200, state: "TN" },
  "Kingsport": { lat: 36.5484, lng: -82.5618, state: "TN" },
  "Collierville": { lat: 35.0420, lng: -89.6645, state: "TN" },
  "Smyrna": { lat: 35.9828, lng: -86.5186, state: "TN" },
  "Cleveland": { lat: 35.1595, lng: -84.8766, state: "TN" },
  // Texas
  "Austin": { lat: 30.2672, lng: -97.7431, state: "TX" },
  "Dallas": { lat: 32.7767, lng: -96.7970, state: "TX" },
  "Houston": { lat: 29.7604, lng: -95.3698, state: "TX" },
  "San Antonio": { lat: 29.4241, lng: -98.4936, state: "TX" },
  "Fort Worth": { lat: 32.7555, lng: -97.3308, state: "TX" },
  "El Paso": { lat: 31.7619, lng: -106.4850, state: "TX" },
  "Arlington": { lat: 32.7357, lng: -97.1081, state: "TX" },
  "Corpus Christi": { lat: 27.8006, lng: -97.3964, state: "TX" },
  "Plano": { lat: 33.0198, lng: -96.6989, state: "TX" },
  "Laredo": { lat: 27.5306, lng: -99.4803, state: "TX" },
  "Lubbock": { lat: 33.5779, lng: -101.8552, state: "TX" },
  "Garland": { lat: 32.9126, lng: -96.6389, state: "TX" },
  "Irving": { lat: 32.8140, lng: -96.9489, state: "TX" },
  "Amarillo": { lat: 35.2220, lng: -101.8313, state: "TX" },
  "Grand Prairie": { lat: 32.7459, lng: -96.9978, state: "TX" },
  "Brownsville": { lat: 25.9017, lng: -97.4975, state: "TX" },
  "McKinney": { lat: 33.1972, lng: -96.6397, state: "TX" },
  "Frisco": { lat: 33.1507, lng: -96.8236, state: "TX" },
  "Pasadena": { lat: 29.6911, lng: -95.2091, state: "TX" },
  "Mesquite": { lat: 32.7668, lng: -96.5992, state: "TX" },
  "Killeen": { lat: 31.1171, lng: -97.7278, state: "TX" },
  "McAllen": { lat: 26.2034, lng: -98.2300, state: "TX" },
  "Waco": { lat: 31.5493, lng: -97.1467, state: "TX" },
  "Denton": { lat: 33.2148, lng: -97.1331, state: "TX" },
  "Carrollton": { lat: 32.9537, lng: -96.8903, state: "TX" },
  "Midland": { lat: 31.9973, lng: -102.0779, state: "TX" },
  "Abilene": { lat: 32.4487, lng: -99.7331, state: "TX" },
  "Beaumont": { lat: 30.0802, lng: -94.1266, state: "TX" },
  "Round Rock": { lat: 30.5083, lng: -97.6789, state: "TX" },
  "Odessa": { lat: 31.8457, lng: -102.3676, state: "TX" },
  "Wichita Falls": { lat: 33.9137, lng: -98.4934, state: "TX" },
  "Richardson": { lat: 32.9483, lng: -96.7298, state: "TX" },
  "Lewisville": { lat: 33.0462, lng: -96.9942, state: "TX" },
  "Tyler": { lat: 32.3513, lng: -95.3011, state: "TX" },
  "College Station": { lat: 30.6280, lng: -96.3344, state: "TX" },
  "Pearland": { lat: 29.5636, lng: -95.2860, state: "TX" },
  "San Angelo": { lat: 31.4638, lng: -100.4370, state: "TX" },
  "Allen": { lat: 33.1032, lng: -96.6706, state: "TX" },
  "League City": { lat: 29.5075, lng: -95.0949, state: "TX" },
  "Sugar Land": { lat: 29.6197, lng: -95.6349, state: "TX" },
  "Longview": { lat: 32.5007, lng: -94.7405, state: "TX" },
  "Edinburg": { lat: 26.3017, lng: -98.1634, state: "TX" },
  "Mission": { lat: 26.2159, lng: -98.3253, state: "TX" },
  "Bryan": { lat: 30.6744, lng: -96.3698, state: "TX" },
  "Baytown": { lat: 29.7355, lng: -94.9774, state: "TX" },
  "Pharr": { lat: 26.1948, lng: -98.1836, state: "TX" },
  "Temple": { lat: 31.0982, lng: -97.3428, state: "TX" },
  "Missouri City": { lat: 29.6186, lng: -95.5377, state: "TX" },
  "Flower Mound": { lat: 33.0146, lng: -97.0970, state: "TX" },
  "North Richland Hills": { lat: 32.8343, lng: -97.2289, state: "TX" },
  "Harlingen": { lat: 26.1906, lng: -97.6961, state: "TX" },
  "Victoria": { lat: 28.8053, lng: -97.0036, state: "TX" },
  "New Braunfels": { lat: 29.7030, lng: -98.1245, state: "TX" },
  "Conroe": { lat: 30.3119, lng: -95.4560, state: "TX" },
  "Cedar Park": { lat: 30.5052, lng: -97.8203, state: "TX" },
  "Mansfield": { lat: 32.5632, lng: -97.1417, state: "TX" },
  "Rowlett": { lat: 32.9029, lng: -96.5639, state: "TX" },
  "Georgetown": { lat: 30.6333, lng: -97.6781, state: "TX" },
  "Pflugerville": { lat: 30.4394, lng: -97.6200, state: "TX" },
  "Port Arthur": { lat: 29.8850, lng: -93.9400, state: "TX" },
  "San Marcos": { lat: 29.8833, lng: -97.9414, state: "TX" },
  "Euless": { lat: 32.8370, lng: -97.0820, state: "TX" },
  "DeSoto": { lat: 32.5896, lng: -96.8570, state: "TX" },
  "Grapevine": { lat: 32.9343, lng: -97.0781, state: "TX" },
  "Bedford": { lat: 32.8440, lng: -97.1431, state: "TX" },
  "Galveston": { lat: 29.2990, lng: -94.7977, state: "TX" },
  "Cedar Hill": { lat: 32.5885, lng: -96.9561, state: "TX" },
  "Texas City": { lat: 29.3838, lng: -94.9027, state: "TX" },
  "Wylie": { lat: 33.0151, lng: -96.5389, state: "TX" },
  "Burleson": { lat: 32.5421, lng: -97.3208, state: "TX" },
  "Haltom City": { lat: 32.7996, lng: -97.2692, state: "TX" },
  "Keller": { lat: 32.9346, lng: -97.2517, state: "TX" },
  "Rockwall": { lat: 32.9313, lng: -96.4597, state: "TX" },
  "Coppell": { lat: 32.9546, lng: -97.0150, state: "TX" },
  "Duncanville": { lat: 32.6518, lng: -96.9083, state: "TX" },
  "Huntsville": { lat: 30.7235, lng: -95.5508, state: "TX" },
  "The Colony": { lat: 33.0901, lng: -96.8917, state: "TX" },
  "Sherman": { lat: 33.6357, lng: -96.6089, state: "TX" },
  "Hurst": { lat: 32.8234, lng: -97.1706, state: "TX" },
  "Lancaster": { lat: 32.5921, lng: -96.7561, state: "TX" },
  "Texarkana": { lat: 33.4251, lng: -94.0477, state: "TX" },
  "Friendswood": { lat: 29.5294, lng: -95.2011, state: "TX" },
  "Weslaco": { lat: 26.1596, lng: -97.9908, state: "TX" },
  // Utah
  "Salt Lake City": { lat: 40.7608, lng: -111.8910, state: "UT" },
  "West Valley City": { lat: 40.6916, lng: -112.0011, state: "UT" },
  "Provo": { lat: 40.2338, lng: -111.6585, state: "UT" },
  "West Jordan": { lat: 40.6097, lng: -111.9391, state: "UT" },
  "Orem": { lat: 40.2969, lng: -111.6946, state: "UT" },
  "Sandy": { lat: 40.5649, lng: -111.8389, state: "UT" },
  "Ogden": { lat: 41.2230, lng: -111.9738, state: "UT" },
  "St. George": { lat: 37.0965, lng: -113.5684, state: "UT" },
  "Layton": { lat: 41.0602, lng: -111.9711, state: "UT" },
  "South Jordan": { lat: 40.5621, lng: -111.9296, state: "UT" },
  "Lehi": { lat: 40.3916, lng: -111.8508, state: "UT" },
  "Millcreek": { lat: 40.6866, lng: -111.8755, state: "UT" },
  "Taylorsville": { lat: 40.6677, lng: -111.9388, state: "UT" },
  "Logan": { lat: 41.7370, lng: -111.8338, state: "UT" },
  "Murray": { lat: 40.6669, lng: -111.8879, state: "UT" },
  "Draper": { lat: 40.5247, lng: -111.8638, state: "UT" },
  "Bountiful": { lat: 40.8894, lng: -111.8808, state: "UT" },
  "Riverton": { lat: 40.5219, lng: -111.9391, state: "UT" },
  // Vermont
  "Burlington": { lat: 44.4759, lng: -73.2121, state: "VT" },
  "South Burlington": { lat: 44.4669, lng: -73.1710, state: "VT" },
  "Rutland": { lat: 43.6106, lng: -72.9726, state: "VT" },
  // Virginia
  "Virginia Beach": { lat: 36.8529, lng: -75.9780, state: "VA" },
  "Norfolk": { lat: 36.8508, lng: -76.2859, state: "VA" },
  "Chesapeake": { lat: 36.7682, lng: -76.2875, state: "VA" },
  "Richmond": { lat: 37.5407, lng: -77.4360, state: "VA" },
  "Newport News": { lat: 37.0871, lng: -76.4730, state: "VA" },
  "Alexandria": { lat: 38.8048, lng: -77.0469, state: "VA" },
  "Hampton": { lat: 37.0299, lng: -76.3452, state: "VA" },
  "Roanoke": { lat: 37.2710, lng: -79.9414, state: "VA" },
  "Portsmouth": { lat: 36.8354, lng: -76.2983, state: "VA" },
  "Suffolk": { lat: 36.7282, lng: -76.5836, state: "VA" },
  "Lynchburg": { lat: 37.4138, lng: -79.1422, state: "VA" },
  "Harrisonburg": { lat: 38.4496, lng: -78.8689, state: "VA" },
  "Charlottesville": { lat: 38.0293, lng: -78.4767, state: "VA" },
  "Danville": { lat: 36.5860, lng: -79.3950, state: "VA" },
  "Blacksburg": { lat: 37.2296, lng: -80.4139, state: "VA" },
  "Manassas": { lat: 38.7509, lng: -77.4753, state: "VA" },
  // Washington
  "Seattle": { lat: 47.6062, lng: -122.3321, state: "WA" },
  "Spokane": { lat: 47.6588, lng: -117.4260, state: "WA" },
  "Tacoma": { lat: 47.2529, lng: -122.4443, state: "WA" },
  "Vancouver": { lat: 45.6387, lng: -122.6615, state: "WA" },
  "Bellevue": { lat: 47.6101, lng: -122.2015, state: "WA" },
  "Kent": { lat: 47.3809, lng: -122.2348, state: "WA" },
  "Everett": { lat: 47.9790, lng: -122.2021, state: "WA" },
  "Renton": { lat: 47.4829, lng: -122.2171, state: "WA" },
  "Spokane Valley": { lat: 47.6732, lng: -117.2394, state: "WA" },
  "Federal Way": { lat: 47.3223, lng: -122.3126, state: "WA" },
  "Yakima": { lat: 46.6021, lng: -120.5059, state: "WA" },
  "Bellingham": { lat: 48.7519, lng: -122.4787, state: "WA" },
  "Kirkland": { lat: 47.6815, lng: -122.2087, state: "WA" },
  "Auburn": { lat: 47.3073, lng: -122.2285, state: "WA" },
  "Kennewick": { lat: 46.2112, lng: -119.1372, state: "WA" },
  "Marysville": { lat: 48.0518, lng: -122.1771, state: "WA" },
  "Redmond": { lat: 47.6740, lng: -122.1215, state: "WA" },
  "Pasco": { lat: 46.2396, lng: -119.1006, state: "WA" },
  "Lakewood": { lat: 47.1718, lng: -122.5185, state: "WA" },
  "Sammamish": { lat: 47.6163, lng: -122.0356, state: "WA" },
  "Richland": { lat: 46.2857, lng: -119.2845, state: "WA" },
  "Burien": { lat: 47.4704, lng: -122.3468, state: "WA" },
  "Olympia": { lat: 47.0379, lng: -122.9007, state: "WA" },
  "Lacey": { lat: 47.0343, lng: -122.8232, state: "WA" },
  "Edmonds": { lat: 47.8107, lng: -122.3774, state: "WA" },
  "Bremerton": { lat: 47.5673, lng: -122.6326, state: "WA" },
  "Puyallup": { lat: 47.1854, lng: -122.2929, state: "WA" },
  // West Virginia
  "Charleston": { lat: 38.3498, lng: -81.6326, state: "WV" },
  "Huntington": { lat: 38.4192, lng: -82.4452, state: "WV" },
  "Morgantown": { lat: 39.6295, lng: -79.9559, state: "WV" },
  "Parkersburg": { lat: 39.2667, lng: -81.5615, state: "WV" },
  "Wheeling": { lat: 40.0640, lng: -80.7209, state: "WV" },
  // Wisconsin
  "Milwaukee": { lat: 43.0389, lng: -87.9065, state: "WI" },
  "Madison": { lat: 43.0731, lng: -89.4012, state: "WI" },
  "Green Bay": { lat: 44.5192, lng: -88.0198, state: "WI" },
  "Kenosha": { lat: 42.5847, lng: -87.8212, state: "WI" },
  "Racine": { lat: 42.7261, lng: -87.7829, state: "WI" },
  "Appleton": { lat: 44.2619, lng: -88.4154, state: "WI" },
  "Waukesha": { lat: 43.0117, lng: -88.2315, state: "WI" },
  "Eau Claire": { lat: 44.8113, lng: -91.4985, state: "WI" },
  "Oshkosh": { lat: 44.0247, lng: -88.5426, state: "WI" },
  "Janesville": { lat: 42.6828, lng: -89.0187, state: "WI" },
  "West Allis": { lat: 43.0167, lng: -88.0070, state: "WI" },
  "La Crosse": { lat: 43.8014, lng: -91.2396, state: "WI" },
  "Sheboygan": { lat: 43.7508, lng: -87.7145, state: "WI" },
  "Wauwatosa": { lat: 43.0495, lng: -88.0076, state: "WI" },
  "Fond du Lac": { lat: 43.7730, lng: -88.4390, state: "WI" },
  "New Berlin": { lat: 42.9764, lng: -88.1084, state: "WI" },
  "Wausau": { lat: 44.9591, lng: -89.6301, state: "WI" },
  "Brookfield": { lat: 43.0606, lng: -88.1065, state: "WI" },
  "Greenfield": { lat: 42.9614, lng: -88.0126, state: "WI" },
  "Beloit": { lat: 42.5083, lng: -89.0318, state: "WI" },
  // Wyoming
  "Cheyenne": { lat: 41.1400, lng: -104.8202, state: "WY" },
  "Casper": { lat: 42.8501, lng: -106.3252, state: "WY" },
  "Laramie": { lat: 41.3114, lng: -105.5911, state: "WY" },
  "Gillette": { lat: 44.2911, lng: -105.5022, state: "WY" },
  "Rock Springs": { lat: 41.5875, lng: -109.2029, state: "WY" },
};

export function SEOHeatmap({ companyProfile }: SEOHeatmapProps) {
  const [keyword, setKeyword] = useState("");
  const [isResearching, setIsResearching] = useState(false);
  const [activeTab, setActiveTab] = useState<"map" | "keywords" | "competitors" | "serp" | "content">("map");
  const [mapLoaded, setMapLoaded] = useState(false);
  const [locationData, setLocationData] = useState<LocationSEOData[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationSEOData | null>(null);
  const [keywordResults, setKeywordResults] = useState<KeywordData[]>([]);
  const [competitors, setCompetitors] = useState<CompetitorData[]>([]);
  const [serpFeatures, setSerpFeatures] = useState<SERPFeature[]>([]);
  const [contentGaps, setContentGaps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load Leaflet CSS on client side
  useEffect(() => {
    if (typeof window !== "undefined") {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
      setMapLoaded(true);
    }
  }, []);

  // Check if using company profile data
  const hasCompanyProfile = !!(companyProfile?.cities?.length || companyProfile?.headquarters);

  // Calculate map center based on company profile
  const mapCenter = useMemo(() => {
    // First try headquarters
    if (companyProfile?.headquarters && US_CITIES[companyProfile.headquarters]) {
      return [US_CITIES[companyProfile.headquarters].lat, US_CITIES[companyProfile.headquarters].lng] as [number, number];
    }
    // Then try first service city
    if (companyProfile?.cities?.length) {
      const firstCity = companyProfile.cities[0];
      if (US_CITIES[firstCity]) {
        return [US_CITIES[firstCity].lat, US_CITIES[firstCity].lng] as [number, number];
      }
    }
    // Try to find a city matching the company's state
    if (companyProfile?.state) {
      const stateAbbr = companyProfile.state.toUpperCase();
      const cityInState = Object.entries(US_CITIES).find(([, data]) => data.state === stateAbbr);
      if (cityInState) {
        return [cityInState[1].lat, cityInState[1].lng] as [number, number];
      }
    }
    // Default to center of US
    return [39.8283, -98.5795] as [number, number]; // Geographic center of US
  }, [companyProfile]);

  // Generate location data from company service areas
  const generateLocationData = useCallback((baseKeyword: string): LocationSEOData[] => {
    // Use company cities if available, otherwise empty array (user needs to set up profile)
    const cities = companyProfile?.cities?.length ? companyProfile.cities : [];

    return cities.map((city) => {
      const cityData = US_CITIES[city] || {
        lat: 33.4484 + (Math.random() - 0.5) * 2,
        lng: -112.0740 + (Math.random() - 0.5) * 2,
        state: companyProfile?.state || "AZ",
      };

      const searchVolume = Math.floor(Math.random() * 5000) + 100;
      const competitionScore = Math.random() * 100;

      return {
        city,
        state: cityData.state,
        lat: cityData.lat,
        lng: cityData.lng,
        searchVolume,
        competition: competitionScore < 33 ? "low" : competitionScore < 66 ? "medium" : "high",
        competitionScore: Math.round(competitionScore),
        estimatedTraffic: Math.floor(searchVolume * (Math.random() * 0.3 + 0.05)),
        topCompetitors: generateCompetitorDomains(city, 3),
        avgCPC: Math.round((Math.random() * 15 + 2) * 100) / 100,
        ranking: Math.random() > 0.6 ? Math.floor(Math.random() * 50) + 1 : undefined,
        localIntent: Math.floor(Math.random() * 40 + 50), // 50-90% local intent
      };
    });
  }, [companyProfile]);

  const handleResearch = useCallback(async () => {
    if (!keyword.trim()) {
      setError("Please enter a keyword to research");
      return;
    }

    setIsResearching(true);
    setError(null);

    try {
      // Generate geographic SEO data
      const geoData = generateLocationData(keyword);
      setLocationData(geoData);

      // Generate keyword variations
      setKeywordResults(generateKeywordVariations(keyword));

      // Generate competitor data
      setCompetitors(generateCompetitorData());

      // Generate SERP features
      setSerpFeatures(generateSERPFeatures());

      // Generate content gaps
      setContentGaps(generateContentGaps(keyword));

    } catch (err) {
      console.error("SEO research error:", err);
      setError("Research failed. Using sample data.");

      // Use sample data on error
      setLocationData(generateLocationData(keyword));
      setKeywordResults(generateKeywordVariations(keyword));
    } finally {
      setIsResearching(false);
    }
  }, [keyword, generateLocationData]);

  // Get color based on search volume and competition
  const getHeatmapColor = (data: LocationSEOData): string => {
    const score = (data.searchVolume / 5000) * (1 - data.competitionScore / 100);
    if (score > 0.5) return "#22c55e"; // Green - high opportunity
    if (score > 0.25) return "#eab308"; // Yellow - moderate
    return "#ef4444"; // Red - high competition/low volume
  };

  const getMarkerRadius = (volume: number): number => {
    return Math.min(Math.max(volume / 200, 8), 30);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h2 className={styles.title}>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            Geographic SEO Heatmap
          </h2>
          <p className={styles.subtitle}>
            Visualize keyword opportunities across your service areas
            {hasCompanyProfile && companyProfile?.cities?.length && (
              <span style={{ marginLeft: "8px", color: "#22c55e", fontWeight: 500 }}>
                ({companyProfile.cities.length} service areas configured)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Demo Data Warning */}
      <div style={{
        background: "linear-gradient(135deg, rgba(234, 179, 8, 0.1), rgba(234, 179, 8, 0.05))",
        border: "1px solid rgba(234, 179, 8, 0.3)",
        borderRadius: "8px",
        padding: "12px 16px",
        marginBottom: "16px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#eab308" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span style={{ color: "#a3a3a3", fontSize: "14px" }}>
          <strong style={{ color: "#eab308" }}>Demo Mode:</strong> SEO metrics shown are simulated for demonstration purposes.
          {!hasCompanyProfile && (
            <span style={{ marginLeft: "4px" }}>
              Set up your <a href="#" onClick={(e) => { e.preventDefault(); }} style={{ color: "#8b5cf6", textDecoration: "underline" }}>company profile</a> with service areas to see your local markets.
            </span>
          )}
        </span>
      </div>

      {/* No Profile Warning */}
      {!hasCompanyProfile && (
        <div style={{
          background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05))",
          border: "1px solid rgba(139, 92, 246, 0.3)",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "24px",
          textAlign: "center",
        }}>
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#8b5cf6" strokeWidth="1.5" style={{ marginBottom: "12px" }}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <h3 style={{ color: "#fff", margin: "0 0 8px 0", fontSize: "18px" }}>Configure Your Service Areas</h3>
          <p style={{ color: "#a3a3a3", margin: "0 0 16px 0", fontSize: "14px" }}>
            Add your service cities in the Company Profile section to see SEO opportunities in your local markets.
          </p>
          <p style={{ color: "#737373", margin: 0, fontSize: "13px" }}>
            Go to <strong>Setup → Company Profile</strong> and add your service areas under the &quot;Service Cities&quot; section.
          </p>
        </div>
      )}

      {/* Search Form */}
      <div className={styles.searchSection}>
        <div className={styles.searchForm}>
          <div className={styles.searchInputGroup}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder={hasCompanyProfile ? "Enter keyword (e.g., 'roof repair', 'HVAC installation')" : "Configure service areas first..."}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className={styles.searchInput}
              onKeyDown={(e) => e.key === "Enter" && hasCompanyProfile && handleResearch()}
              disabled={!hasCompanyProfile}
            />
          </div>
          <motion.button
            className={styles.searchButton}
            onClick={handleResearch}
            disabled={isResearching || !keyword.trim() || !hasCompanyProfile}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isResearching ? (
              <>
                <span className={styles.spinner} />
                Analyzing...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
                Analyze Locations
              </>
            )}
          </motion.button>
        </div>

        {error && (
          <div className={styles.errorMessage}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {locationData.length > 0 && (
          <motion.div
            className={styles.results}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Tabs */}
            <div className={styles.tabs}>
              {[
                { id: "map", label: "Geographic Map" },
                { id: "keywords", label: "Keywords" },
                { id: "competitors", label: "Competitors" },
                { id: "serp", label: "SERP Features" },
                { id: "content", label: "Content Ideas" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`${styles.tab} ${activeTab === tab.id ? styles.active : ""}`}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className={styles.tabContent}>
              {/* Map Tab */}
              {activeTab === "map" && mapLoaded && (
                <div className={styles.mapTab}>
                  <div className={styles.mapSection}>
                    {/* Map Container */}
                    <div className={styles.mapContainer}>
                      <MapContainer
                        center={mapCenter}
                        zoom={8}
                        style={{ height: "500px", width: "100%", borderRadius: "12px" }}
                        scrollWheelZoom={true}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {locationData.map((location) => (
                          <CircleMarker
                            key={location.city}
                            center={[location.lat, location.lng]}
                            radius={getMarkerRadius(location.searchVolume)}
                            pathOptions={{
                              fillColor: getHeatmapColor(location),
                              fillOpacity: 0.7,
                              color: "#ffffff",
                              weight: 2,
                            }}
                            eventHandlers={{
                              click: () => setSelectedLocation(location),
                            }}
                          >
                            <Tooltip permanent={false}>
                              <div>
                                <strong>{location.city}, {location.state}</strong><br/>
                                Volume: {location.searchVolume.toLocaleString()}<br/>
                                Competition: {location.competition}
                              </div>
                            </Tooltip>
                          </CircleMarker>
                        ))}
                      </MapContainer>
                    </div>

                    {/* Map Legend */}
                    <div className={styles.mapLegend}>
                      <h4>Legend</h4>
                      <div className={styles.legendItems}>
                        <div className={styles.legendItem}>
                          <span className={styles.legendDot} style={{ backgroundColor: "#22c55e" }} />
                          <span>High Opportunity (Low competition, high volume)</span>
                        </div>
                        <div className={styles.legendItem}>
                          <span className={styles.legendDot} style={{ backgroundColor: "#eab308" }} />
                          <span>Moderate Opportunity</span>
                        </div>
                        <div className={styles.legendItem}>
                          <span className={styles.legendDot} style={{ backgroundColor: "#ef4444" }} />
                          <span>High Competition / Low Volume</span>
                        </div>
                      </div>
                      <p className={styles.legendNote}>Circle size = Search volume</p>
                    </div>
                  </div>

                  {/* Location Details Panel */}
                  {selectedLocation && (
                    <motion.div
                      className={styles.locationPanel}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <div className={styles.locationHeader}>
                        <h3>{selectedLocation.city}, {selectedLocation.state}</h3>
                        <button
                          className={styles.closeBtn}
                          onClick={() => setSelectedLocation(null)}
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>

                      <div className={styles.locationStats}>
                        <div className={styles.statCard}>
                          <span className={styles.statValue}>{selectedLocation.searchVolume.toLocaleString()}</span>
                          <span className={styles.statLabel}>Monthly Searches</span>
                        </div>
                        <div className={styles.statCard}>
                          <span className={styles.statValue} style={{
                            color: selectedLocation.competition === "low" ? "#22c55e" :
                                   selectedLocation.competition === "medium" ? "#eab308" : "#ef4444"
                          }}>
                            {selectedLocation.competitionScore}%
                          </span>
                          <span className={styles.statLabel}>Competition</span>
                        </div>
                        <div className={styles.statCard}>
                          <span className={styles.statValue}>${selectedLocation.avgCPC}</span>
                          <span className={styles.statLabel}>Avg. CPC</span>
                        </div>
                        <div className={styles.statCard}>
                          <span className={styles.statValue}>{selectedLocation.localIntent}%</span>
                          <span className={styles.statLabel}>Local Intent</span>
                        </div>
                      </div>

                      {selectedLocation.ranking && (
                        <div className={styles.rankingInfo}>
                          <span className={styles.rankingLabel}>Your Current Ranking</span>
                          <span className={styles.rankingValue}>#{selectedLocation.ranking}</span>
                        </div>
                      )}

                      <div className={styles.competitorsSection}>
                        <h4>Top Competitors</h4>
                        <ul>
                          {selectedLocation.topCompetitors.map((comp, i) => (
                            <li key={i}>{comp}</li>
                          ))}
                        </ul>
                      </div>

                      <div className={styles.trafficEstimate}>
                        <h4>Estimated Monthly Traffic</h4>
                        <div className={styles.trafficBar}>
                          <div
                            className={styles.trafficFill}
                            style={{ width: `${Math.min(selectedLocation.estimatedTraffic / 500 * 100, 100)}%` }}
                          />
                        </div>
                        <span>{selectedLocation.estimatedTraffic.toLocaleString()} visits/month</span>
                      </div>

                      <button className={styles.createContentBtn}>
                        Create "{keyword} in {selectedLocation.city}" Content
                      </button>
                    </motion.div>
                  )}

                  {/* Location Summary Table */}
                  <div className={styles.locationTable}>
                    <h3>All Service Area Opportunities</h3>
                    <table>
                      <thead>
                        <tr>
                          <th>Location</th>
                          <th>Volume</th>
                          <th>Competition</th>
                          <th>CPC</th>
                          <th>Est. Traffic</th>
                          <th>Opportunity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {locationData
                          .sort((a, b) => b.searchVolume - a.searchVolume)
                          .map((loc) => {
                            const opportunityScore = (loc.searchVolume / 5000) * (1 - loc.competitionScore / 100);
                            return (
                              <tr
                                key={loc.city}
                                onClick={() => setSelectedLocation(loc)}
                                className={selectedLocation?.city === loc.city ? styles.selectedRow : ""}
                              >
                                <td>{loc.city}, {loc.state}</td>
                                <td>{loc.searchVolume.toLocaleString()}</td>
                                <td>
                                  <span className={`${styles.compBadge} ${styles[loc.competition]}`}>
                                    {loc.competition}
                                  </span>
                                </td>
                                <td>${loc.avgCPC}</td>
                                <td>{loc.estimatedTraffic.toLocaleString()}</td>
                                <td>
                                  <span
                                    className={styles.opportunityDot}
                                    style={{ backgroundColor: getHeatmapColor(loc) }}
                                  />
                                  {opportunityScore > 0.5 ? "High" : opportunityScore > 0.25 ? "Medium" : "Low"}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Keywords Tab */}
              {activeTab === "keywords" && (
                <div className={styles.keywordsTab}>
                  <h3 className={styles.sectionTitle}>Related Keywords</h3>
                  <div className={styles.keywordsTable}>
                    <div className={styles.tableHeader}>
                      <span>Keyword</span>
                      <span>Volume</span>
                      <span>Difficulty</span>
                      <span>CPC</span>
                      <span>Intent</span>
                      <span>Trend</span>
                    </div>
                    {keywordResults.map((kw, index) => (
                      <motion.div
                        key={kw.keyword}
                        className={styles.tableRow}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <span className={styles.keywordCell}>{kw.keyword}</span>
                        <span className={styles.volumeCell}>
                          <span className={styles.volumeBar} style={{
                            width: `${Math.min(kw.volume / 100, 100)}%`,
                            backgroundColor: getVolumeColor(kw.volume)
                          }} />
                          {kw.volume.toLocaleString()}
                        </span>
                        <span className={styles.difficultyCell}>
                          <span
                            className={styles.difficultyBadge}
                            style={{ backgroundColor: getDifficultyColor(kw.difficulty) }}
                          >
                            {kw.difficulty}
                          </span>
                        </span>
                        <span className={styles.cpcCell}>{kw.cpc}</span>
                        <span className={styles.intentCell}>
                          <span className={`${styles.intentBadge} ${styles[kw.intent]}`}>
                            {kw.intent}
                          </span>
                        </span>
                        <span className={styles.trendCell}>
                          {kw.trend === "up" && <span className={styles.trendUp}>↑</span>}
                          {kw.trend === "down" && <span className={styles.trendDown}>↓</span>}
                          {kw.trend === "stable" && <span className={styles.trendStable}>→</span>}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Competitors Tab */}
              {activeTab === "competitors" && (
                <div className={styles.competitorsTab}>
                  <h3 className={styles.sectionTitle}>Top Competitors</h3>
                  <div className={styles.competitorsList}>
                    {competitors.map((comp, index) => (
                      <motion.div
                        key={comp.domain}
                        className={styles.competitorCard}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className={styles.competitorRank}>#{comp.position}</div>
                        <div className={styles.competitorInfo}>
                          <span className={styles.competitorDomain}>{comp.domain}</span>
                          <div className={styles.competitorStats}>
                            <span><strong>DA:</strong> {comp.authority}</span>
                            <span><strong>Traffic:</strong> {comp.traffic}</span>
                            <span><strong>Keywords:</strong> {comp.keywords.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className={styles.competitorActions}>
                          <button className={styles.analyzeBtn}>Analyze</button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* SERP Features Tab */}
              {activeTab === "serp" && (
                <div className={styles.serpTab}>
                  <h3 className={styles.sectionTitle}>SERP Features</h3>
                  <div className={styles.serpGrid}>
                    {serpFeatures.map((feature, index) => (
                      <motion.div
                        key={feature.type}
                        className={`${styles.serpCard} ${feature.present ? styles.present : styles.absent}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div className={styles.serpHeader}>
                          <span className={styles.serpType}>{feature.type}</span>
                          <span className={`${styles.serpStatus} ${feature.present ? styles.active : ""}`}>
                            {feature.present ? "Present" : "Absent"}
                          </span>
                        </div>
                        <p className={styles.serpOpportunity}>{feature.opportunity}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Ideas Tab */}
              {activeTab === "content" && (
                <div className={styles.contentTab}>
                  <h3 className={styles.sectionTitle}>Location-Based Content Ideas</h3>
                  <div className={styles.contentGaps}>
                    {contentGaps.map((gap, index) => (
                      <motion.div
                        key={gap}
                        className={styles.gapItem}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <span className={styles.gapIcon}>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="16"/>
                            <line x1="8" y1="12" x2="16" y2="12"/>
                          </svg>
                        </span>
                        <span>{gap}</span>
                        <button className={styles.createBtn}>Create Content</button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {locationData.length === 0 && !isResearching && (
        <div className={styles.emptyState}>
          <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <h3>Geographic SEO Analysis</h3>
          <p>Enter a keyword to see SEO opportunities across your service areas on an interactive map</p>
          <div className={styles.emptyFeatures}>
            <div className={styles.emptyFeature}>
              <span className={styles.featureIcon}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </span>
              <span>Location Heatmap</span>
            </div>
            <div className={styles.emptyFeature}>
              <span className={styles.featureIcon}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              </span>
              <span>Local Search Volume</span>
            </div>
            <div className={styles.emptyFeature}>
              <span className={styles.featureIcon}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </span>
              <span>Local Competitors</span>
            </div>
            <div className={styles.emptyFeature}>
              <span className={styles.featureIcon}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </span>
              <span>Content Opportunities</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions
function generateCompetitorDomains(city: string, count: number): string[] {
  const prefixes = ["best", "pro", "expert", "local", "premier", "quality", "top"];
  const domains: string[] = [];
  for (let i = 0; i < count; i++) {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    domains.push(`${prefix}${city.toLowerCase().replace(/\s+/g, "")}services.com`);
  }
  return domains;
}

function generateKeywordVariations(baseKeyword: string): KeywordData[] {
  const modifiers = ["best", "affordable", "professional", "near me", "cost", "services", "company", "licensed", "emergency", "same day"];
  return modifiers.map((mod) => ({
    keyword: `${mod} ${baseKeyword}`,
    volume: Math.floor(Math.random() * 10000) + 100,
    difficulty: Math.floor(Math.random() * 100),
    cpc: `$${(Math.random() * 10 + 0.5).toFixed(2)}`,
    trend: ["up", "down", "stable"][Math.floor(Math.random() * 3)] as "up" | "down" | "stable",
    intent: ["informational", "commercial", "transactional", "navigational"][Math.floor(Math.random() * 4)] as KeywordData["intent"],
  }));
}

function generateCompetitorData(): CompetitorData[] {
  const domains = ["competitor1.com", "topranker.com", "industryleader.com", "localexpert.com", "bestservice.com"];
  return domains.map((domain, i) => ({
    domain,
    position: i + 1,
    authority: Math.floor(Math.random() * 50) + 30,
    traffic: `${Math.floor(Math.random() * 100)}K`,
    keywords: Math.floor(Math.random() * 5000) + 500,
  }));
}

function generateSERPFeatures(): SERPFeature[] {
  return [
    { type: "Featured Snippet", present: Math.random() > 0.5, opportunity: "Create concise, structured answer" },
    { type: "People Also Ask", present: true, opportunity: "Add FAQ section" },
    { type: "Local Pack", present: Math.random() > 0.3, opportunity: "Optimize Google Business Profile" },
    { type: "Image Pack", present: Math.random() > 0.5, opportunity: "Add optimized images" },
    { type: "Video Results", present: Math.random() > 0.6, opportunity: "Create video content" },
    { type: "Knowledge Panel", present: Math.random() > 0.7, opportunity: "Build entity authority" },
  ];
}

function generateContentGaps(keyword: string): string[] {
  return [
    `Complete ${keyword} guide for [City]`,
    `${keyword} cost breakdown by location`,
    `How to choose ${keyword} services in [Your Area]`,
    `${keyword} vs alternatives comparison`,
    `Seasonal ${keyword} tips for local homeowners`,
    `${keyword} FAQs answered by local experts`,
  ];
}

function getDifficultyColor(difficulty: number): string {
  if (difficulty <= 30) return "#22c55e";
  if (difficulty <= 50) return "#84cc16";
  if (difficulty <= 70) return "#eab308";
  if (difficulty <= 85) return "#f97316";
  return "#ef4444";
}

function getVolumeColor(volume: number): string {
  if (volume >= 10000) return "#22c55e";
  if (volume >= 5000) return "#84cc16";
  if (volume >= 1000) return "#eab308";
  if (volume >= 100) return "#f97316";
  return "#6b7280";
}

export default SEOHeatmap;
