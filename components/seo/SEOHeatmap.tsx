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

// Major US cities with coordinates for demo
const US_CITIES: { [key: string]: { lat: number; lng: number; state: string } } = {
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
  "Los Angeles": { lat: 34.0522, lng: -118.2437, state: "CA" },
  "San Diego": { lat: 32.7157, lng: -117.1611, state: "CA" },
  "San Francisco": { lat: 37.7749, lng: -122.4194, state: "CA" },
  "Denver": { lat: 39.7392, lng: -104.9903, state: "CO" },
  "Austin": { lat: 30.2672, lng: -97.7431, state: "TX" },
  "Dallas": { lat: 32.7767, lng: -96.7970, state: "TX" },
  "Houston": { lat: 29.7604, lng: -95.3698, state: "TX" },
  "Miami": { lat: 25.7617, lng: -80.1918, state: "FL" },
  "Tampa": { lat: 27.9506, lng: -82.4572, state: "FL" },
  "Orlando": { lat: 28.5383, lng: -81.3792, state: "FL" },
  "Atlanta": { lat: 33.7490, lng: -84.3880, state: "GA" },
  "Chicago": { lat: 41.8781, lng: -87.6298, state: "IL" },
  "New York": { lat: 40.7128, lng: -74.0060, state: "NY" },
  "Seattle": { lat: 47.6062, lng: -122.3321, state: "WA" },
  "Portland": { lat: 45.5152, lng: -122.6784, state: "OR" },
  "Las Vegas": { lat: 36.1699, lng: -115.1398, state: "NV" },
  "Salt Lake City": { lat: 40.7608, lng: -111.8910, state: "UT" },
  "Albuquerque": { lat: 35.0844, lng: -106.6504, state: "NM" },
  "Tucson": { lat: 32.2226, lng: -110.9747, state: "AZ" },
  "Flagstaff": { lat: 35.1983, lng: -111.6513, state: "AZ" },
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

  // Calculate map center based on company profile or default to Phoenix area
  const mapCenter = useMemo(() => {
    if (companyProfile?.headquarters && US_CITIES[companyProfile.headquarters]) {
      return [US_CITIES[companyProfile.headquarters].lat, US_CITIES[companyProfile.headquarters].lng] as [number, number];
    }
    return [33.4484, -112.0740] as [number, number]; // Default: Phoenix, AZ
  }, [companyProfile]);

  // Generate location data from company service areas
  const generateLocationData = useCallback((baseKeyword: string): LocationSEOData[] => {
    const cities = companyProfile?.cities || Object.keys(US_CITIES).slice(0, 10);

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
          </p>
        </div>
      </div>

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
              placeholder="Enter keyword (e.g., 'roof repair', 'HVAC installation')"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className={styles.searchInput}
              onKeyDown={(e) => e.key === "Enter" && handleResearch()}
            />
          </div>
          <motion.button
            className={styles.searchButton}
            onClick={handleResearch}
            disabled={isResearching || !keyword.trim()}
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
