// lib/geo-grid/grid-generator.ts
// Generate N x N grid points around a center location

export interface GridPoint {
  row: number;
  col: number;
  lat: number;
  lng: number;
  distanceFromCenter: number; // in miles
}

export interface GridGenerationParams {
  centerLat: number;
  centerLng: number;
  gridSize: 3 | 5 | 7;
  radiusMiles: number;
}

export interface GridConfig {
  gridSize: 3 | 5 | 7;
  radiusMiles: 1 | 3 | 5 | 10 | 15 | 25;
}

// Earth's radius in miles
const EARTH_RADIUS_MILES = 3959;

/**
 * Generate N x N grid points around a center point
 * Uses accurate spherical calculations for lat/lng offsets
 */
export function generateGridPoints({
  centerLat,
  centerLng,
  gridSize,
  radiusMiles
}: GridGenerationParams): GridPoint[] {
  const points: GridPoint[] = [];

  // Calculate the step distance between points
  // For a 5x5 grid with 10 mile radius:
  // - Grid spans from -10 to +10 miles (20 miles total)
  // - 5 points means 4 intervals
  // - Step = 20 / 4 = 5 miles between points
  const gridDiameter = radiusMiles * 2;
  const intervals = gridSize - 1;
  const stepMiles = gridDiameter / intervals;

  // Center point index
  const halfGrid = Math.floor(gridSize / 2);

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      // Calculate offset from center in miles
      // Positive x = east, positive y = north
      const xOffsetMiles = (col - halfGrid) * stepMiles;
      const yOffsetMiles = (halfGrid - row) * stepMiles; // Invert row for map coordinates (north is up)

      // Convert mile offsets to lat/lng
      const { lat, lng } = offsetLatLng(centerLat, centerLng, yOffsetMiles, xOffsetMiles);

      // Calculate distance from center
      const distanceFromCenter = calculateDistance(centerLat, centerLng, lat, lng);

      points.push({
        row,
        col,
        lat: Number(lat.toFixed(7)),
        lng: Number(lng.toFixed(7)),
        distanceFromCenter: Number(distanceFromCenter.toFixed(2))
      });
    }
  }

  return points;
}

/**
 * Offset a lat/lng point by north/east miles
 * Uses accurate spherical calculations
 */
function offsetLatLng(
  lat: number,
  lng: number,
  northMiles: number,
  eastMiles: number
): { lat: number; lng: number } {
  // Convert lat/lng to radians
  const latRad = lat * Math.PI / 180;

  // Latitude offset (constant regardless of longitude)
  // 1 degree of latitude = approximately 69 miles
  const latOffset = northMiles / 69;

  // Longitude offset (varies with latitude due to Earth's curvature)
  // At the equator: 1 degree = ~69 miles
  // At latitude φ: 1 degree = 69 * cos(φ) miles
  const lngOffset = eastMiles / (69 * Math.cos(latRad));

  return {
    lat: lat + latOffset,
    lng: lng + lngOffset
  };
}

/**
 * Calculate distance between two points in miles (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;

  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_MILES * c;
}

/**
 * Get the total number of points for a grid size
 */
export function getGridPointCount(gridSize: 3 | 5 | 7): number {
  return gridSize * gridSize;
}

/**
 * Get grid center point index
 */
export function getGridCenter(gridSize: 3 | 5 | 7): { row: number; col: number } {
  const center = Math.floor(gridSize / 2);
  return { row: center, col: center };
}

/**
 * Check if a point is the center of the grid
 */
export function isGridCenter(row: number, col: number, gridSize: 3 | 5 | 7): boolean {
  const center = Math.floor(gridSize / 2);
  return row === center && col === center;
}

/**
 * Get available grid sizes with their point counts
 */
export function getAvailableGridSizes(): Array<{ size: 3 | 5 | 7; points: number; label: string }> {
  return [
    { size: 3, points: 9, label: "3x3 (9 points)" },
    { size: 5, points: 25, label: "5x5 (25 points)" },
    { size: 7, points: 49, label: "7x7 (49 points)" }
  ];
}

/**
 * Get available radius options
 */
export function getAvailableRadii(): Array<{ miles: 1 | 3 | 5 | 10 | 15 | 25; label: string }> {
  return [
    { miles: 1, label: "1 mile" },
    { miles: 3, label: "3 miles" },
    { miles: 5, label: "5 miles" },
    { miles: 10, label: "10 miles" },
    { miles: 15, label: "15 miles" },
    { miles: 25, label: "25 miles" }
  ];
}

/**
 * Validate grid configuration
 */
export function validateGridConfig(config: GridConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (![3, 5, 7].includes(config.gridSize)) {
    errors.push("Grid size must be 3, 5, or 7");
  }

  if (![1, 3, 5, 10, 15, 25].includes(config.radiusMiles)) {
    errors.push("Radius must be 1, 3, 5, 10, 15, or 25 miles");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get ISO week number and year for a date
 */
export function getISOWeek(date: Date = new Date()): { weekNumber: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { weekNumber, year: d.getUTCFullYear() };
}
