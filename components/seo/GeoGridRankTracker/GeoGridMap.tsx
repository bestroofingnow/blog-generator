// components/seo/GeoGridRankTracker/GeoGridMap.tsx
// Interactive map with grid visualization

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import styles from "./GeoGridRankTracker.module.css";
import type { GridConfiguration, Keyword, GridPointResult, Scan } from "./index";
import { GeoGridLegend } from "./GeoGridLegend";

// Dynamically import Leaflet components (they require browser)
const MapContainer = dynamic(
  () => import("react-leaflet").then(mod => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then(mod => mod.TileLayer),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then(mod => mod.CircleMarker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then(mod => mod.Popup),
  { ssr: false }
);
const Circle = dynamic(
  () => import("react-leaflet").then(mod => mod.Circle),
  { ssr: false }
);

interface GeoGridMapProps {
  config: GridConfiguration;
  keywords: Keyword[];
  selectedKeywordId: string | null;
  onSelectKeyword: (keywordId: string) => void;
  results?: GridPointResult[];
  activeScan: Scan | null;
}

// Rank color scheme
function getRankColor(rank: number | null): string {
  if (rank === null) return "#6b7280"; // Gray - not found
  if (rank <= 3) return "#22c55e"; // Green - excellent
  if (rank <= 10) return "#84cc16"; // Light green - good
  if (rank <= 20) return "#eab308"; // Yellow - moderate
  if (rank <= 50) return "#f97316"; // Orange - poor
  return "#ef4444"; // Red - bad
}

function getRankLabel(rank: number | null): string {
  if (rank === null) return "Not found";
  return `Rank #${rank}`;
}

export function GeoGridMap({
  config,
  keywords,
  selectedKeywordId,
  onSelectKeyword,
  results,
  activeScan
}: GeoGridMapProps) {
  const selectedKeyword = keywords.find(k => k.id === selectedKeywordId);

  // Calculate grid bounds for map
  const mapBounds = useMemo(() => {
    if (!results || results.length === 0) {
      // Default to config center with padding
      const radiusInDegrees = config.radiusMiles / 69; // Approximate degrees
      return {
        center: [config.centerLat, config.centerLng] as [number, number],
        zoom: config.radiusMiles <= 3 ? 14 : config.radiusMiles <= 10 ? 12 : 10
      };
    }

    const lats = results.map(r => r.lat);
    const lngs = results.map(r => r.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return {
      center: [(minLat + maxLat) / 2, (minLng + maxLng) / 2] as [number, number],
      zoom: config.radiusMiles <= 3 ? 14 : config.radiusMiles <= 10 ? 12 : 10
    };
  }, [config, results]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!results || results.length === 0) {
      return { avgRank: null, top3: 0, top10: 0, notFound: 0, total: 0 };
    }

    const ranks = results.filter(r => r.rankPosition !== null).map(r => r.rankPosition!);
    const avgRank = ranks.length > 0 ? ranks.reduce((a, b) => a + b, 0) / ranks.length : null;
    const top3 = ranks.filter(r => r <= 3).length;
    const top10 = ranks.filter(r => r <= 10).length;
    const notFound = results.filter(r => r.rankPosition === null).length;

    return {
      avgRank: avgRank !== null ? avgRank.toFixed(1) : null,
      top3,
      top10,
      notFound,
      total: results.length
    };
  }, [results]);

  // Radius in meters for circle
  const radiusMeters = config.radiusMiles * 1609.34;

  return (
    <div className={styles.mapContainer}>
      <div className={styles.mapControls}>
        <div className={styles.keywordSelector}>
          <label>Keyword:</label>
          <select
            value={selectedKeywordId || ""}
            onChange={e => onSelectKeyword(e.target.value)}
          >
            {keywords.map(kw => (
              <option key={kw.id} value={kw.id}>
                {kw.keyword}
              </option>
            ))}
          </select>
        </div>

        {stats.avgRank && (
          <div className={styles.mapStats}>
            <span>Avg Rank: <strong>{stats.avgRank}</strong></span>
            <span>Top 3: <strong>{stats.top3}/{stats.total}</strong></span>
            <span>Top 10: <strong>{stats.top10}/{stats.total}</strong></span>
            <span>Not Found: <strong>{stats.notFound}</strong></span>
          </div>
        )}
      </div>

      {activeScan && (
        <div className={styles.scanningOverlay}>
          <div className={styles.scanningMessage}>
            <div className={styles.spinner} />
            <p>Scanning {activeScan.pointsCompleted} of {activeScan.totalPoints} points...</p>
          </div>
        </div>
      )}

      <div className={styles.leafletContainer}>
        <MapContainer
          center={mapBounds.center}
          zoom={mapBounds.zoom}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Radius circle */}
          <Circle
            center={[config.centerLat, config.centerLng]}
            radius={radiusMeters}
            pathOptions={{
              color: "#3b82f6",
              fillColor: "#3b82f6",
              fillOpacity: 0.1,
              weight: 2,
              dashArray: "5, 5"
            }}
          />

          {/* Grid points */}
          {results?.map((point, index) => (
            <CircleMarker
              key={`${point.row}-${point.col}-${index}`}
              center={[point.lat, point.lng]}
              radius={12}
              pathOptions={{
                color: "#fff",
                weight: 2,
                fillColor: getRankColor(point.rankPosition),
                fillOpacity: 0.9
              }}
            >
              <Popup>
                <div className={styles.popupContent}>
                  <strong>{selectedKeyword?.keyword || "Keyword"}</strong>
                  <div className={styles.popupRank} style={{ color: getRankColor(point.rankPosition) }}>
                    {getRankLabel(point.rankPosition)}
                  </div>
                  {point.rankPosition && (
                    <>
                      <div className={styles.popupUrl}>{point.serpUrl}</div>
                      <div className={styles.popupTitle}>{point.serpTitle}</div>
                    </>
                  )}
                  {point.isInLocalPack && (
                    <div className={styles.popupLocalPack}>
                      Local Pack: #{point.localPackPosition}
                    </div>
                  )}
                  {point.topCompetitors && point.topCompetitors.length > 0 && (
                    <div className={styles.popupCompetitors}>
                      <strong>Top competitors:</strong>
                      {point.topCompetitors.map((c, i) => (
                        <div key={i}>#{c.position} {c.domain}</div>
                      ))}
                    </div>
                  )}
                  <div className={styles.popupCoords}>
                    {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* Center marker */}
          <CircleMarker
            center={[config.centerLat, config.centerLng]}
            radius={8}
            pathOptions={{
              color: "#1e40af",
              weight: 3,
              fillColor: "#3b82f6",
              fillOpacity: 1
            }}
          >
            <Popup>
              <div className={styles.popupContent}>
                <strong>Grid Center</strong>
                <div>{config.centerCity ? `${config.centerCity}, ${config.centerState}` : ""}</div>
                <div className={styles.popupCoords}>
                  {config.centerLat}, {config.centerLng}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        </MapContainer>
      </div>

      <GeoGridLegend />

      {!results && !activeScan && (
        <div className={styles.noResults}>
          <p>No scan results yet. Run a scan from the Setup tab to see your rankings on the map.</p>
        </div>
      )}
    </div>
  );
}
