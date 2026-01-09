// pages/api/seo/geocode.ts
// Geocoding API - Convert city names to coordinates using Google Maps API

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";

interface GeocodedCity {
  city: string;
  state: string;
  lat: number;
  lng: number;
  formattedAddress?: string;
}

interface GeocodeResponse {
  success: boolean;
  data?: GeocodedCity[];
  error?: string;
}

// In-memory cache to reduce API calls (expires after 24 hours)
const geocodeCache: Map<string, { data: GeocodedCity; timestamp: number }> = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GeocodeResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // Auth check
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const { cities } = req.body;

  if (!Array.isArray(cities) || cities.length === 0) {
    return res.status(400).json({ success: false, error: "Cities array is required" });
  }

  // Limit to 50 cities per request
  if (cities.length > 50) {
    return res.status(400).json({ success: false, error: "Maximum 50 cities per request" });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error("[Geocode API] Missing GOOGLE_MAPS_API_KEY");
    return res.status(500).json({ success: false, error: "Geocoding service not configured" });
  }

  try {
    const results: GeocodedCity[] = [];
    const now = Date.now();

    for (const city of cities) {
      // Check cache first
      const cacheKey = city.toLowerCase().trim();
      const cached = geocodeCache.get(cacheKey);

      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        results.push(cached.data);
        continue;
      }

      // Call Google Geocoding API
      const encodedCity = encodeURIComponent(`${city}, USA`);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedCity}&key=${apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK" && data.results?.[0]) {
        const result = data.results[0];
        const { lat, lng } = result.geometry.location;

        // Extract state from address components
        const stateComponent = result.address_components?.find(
          (comp: { types: string[] }) => comp.types.includes("administrative_area_level_1")
        );
        const stateAbbr = stateComponent?.short_name || "";

        const geocodedCity: GeocodedCity = {
          city,
          state: stateAbbr,
          lat,
          lng,
          formattedAddress: result.formatted_address,
        };

        // Cache the result
        geocodeCache.set(cacheKey, { data: geocodedCity, timestamp: now });
        results.push(geocodedCity);
      } else {
        console.warn(`[Geocode API] Failed to geocode city: ${city}, status: ${data.status}`);
        // Add with null coordinates - component should handle this
        results.push({
          city,
          state: "",
          lat: 0,
          lng: 0,
        });
      }

      // Rate limiting - wait 50ms between requests
      if (cities.indexOf(city) < cities.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("[Geocode API] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Geocoding failed",
    });
  }
}
