// components/seo/GeoGridRankTracker/LocationPicker.tsx
// Interactive map for selecting center location by clicking

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import styles from "./GeoGridRankTracker.module.css";

// Dynamically import the map component
const LocationPickerMap = dynamic(
  () => import("./LocationPickerMap"),
  {
    ssr: false,
    loading: () => (
      <div className={styles.locationPickerLoading}>
        <div className={styles.spinner} />
        <p>Loading map...</p>
      </div>
    )
  }
);

interface LocationPickerProps {
  lat: number | null;
  lng: number | null;
  radiusMiles: number;
  onLocationSelect: (lat: number, lng: number, city?: string, state?: string) => void;
}

export function LocationPicker({
  lat,
  lng,
  radiusMiles,
  onLocationSelect
}: LocationPickerProps) {
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Reverse geocode to get city/state
  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      setIsGeocoding(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
      );
      const data = await response.json();

      const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || "";
      const state = data.address?.state || "";

      onLocationSelect(latitude, longitude, city, state);
    } catch (error) {
      console.error("Geocoding error:", error);
      onLocationSelect(latitude, longitude);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Search for location by name
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsGeocoding(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&countrycodes=us`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const newLat = parseFloat(result.lat);
        const newLng = parseFloat(result.lon);

        // Get detailed address
        await reverseGeocode(newLat, newLng);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleMapClick = (clickLat: number, clickLng: number) => {
    reverseGeocode(clickLat, clickLng);
  };

  return (
    <div className={styles.locationPicker}>
      <div className={styles.locationPickerHeader}>
        <span className={styles.locationPickerLabel}>Click on the map to select center point</span>
        {isGeocoding && <span className={styles.geocodingStatus}>Looking up location...</span>}
      </div>

      <form className={styles.locationSearchForm} onSubmit={handleSearch}>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search for a city or address..."
          className={styles.locationSearchInput}
        />
        <button type="submit" className={styles.locationSearchBtn} disabled={isGeocoding}>
          Search
        </button>
      </form>

      <div className={styles.locationPickerMap}>
        <LocationPickerMap
          lat={lat}
          lng={lng}
          radiusMiles={radiusMiles}
          onMapClick={handleMapClick}
        />
      </div>

      {lat && lng && (
        <div className={styles.selectedLocation}>
          <span className={styles.selectedLocationIcon}>📍</span>
          <span>
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </span>
        </div>
      )}
    </div>
  );
}
