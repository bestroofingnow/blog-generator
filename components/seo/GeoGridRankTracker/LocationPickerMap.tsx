// components/seo/GeoGridRankTracker/LocationPickerMap.tsx
// Map component with click handler (imported dynamically to avoid SSR issues)

import React from "react";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icons in Leaflet with webpack
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

interface LocationPickerMapProps {
  lat: number | null;
  lng: number | null;
  radiusMiles: number;
  onMapClick: (lat: number, lng: number) => void;
}

// Component to handle map click events
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

export default function LocationPickerMap({
  lat,
  lng,
  radiusMiles,
  onMapClick
}: LocationPickerMapProps) {
  // Default center (US center) if no location selected
  const defaultCenter: [number, number] = [39.8283, -98.5795];
  const center: [number, number] = lat && lng ? [lat, lng] : defaultCenter;
  const zoom = lat && lng ? 12 : 4;

  // Convert radius to meters for the circle
  const radiusMeters = radiusMiles * 1609.34;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapClickHandler onMapClick={onMapClick} />

      {lat && lng && (
        <>
          {/* Selected location marker */}
          <Marker position={[lat, lng]} />

          {/* Radius preview circle */}
          <Circle
            center={[lat, lng]}
            radius={radiusMeters}
            pathOptions={{
              color: "#3b82f6",
              fillColor: "#3b82f6",
              fillOpacity: 0.1,
              weight: 2,
              dashArray: "5, 5"
            }}
          />
        </>
      )}
    </MapContainer>
  );
}
