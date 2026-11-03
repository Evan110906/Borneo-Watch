"use client";

import { useEffect } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";

export type MapCategory = "Forest degradation" | "Waste pollution" | "Wildlife sighting" | "River pollution" | "Other";

export type MapReport = {
  id: string;
  title: string;
  category: MapCategory;
  description: string;
  location: string;
  lat: number;
  lng: number;
  createdAt?: string;
};

export type MapViewProps = {
  reports: MapReport[];
  compact?: boolean;
  picker?: boolean;
  layer?: "standard" | "humanitarian";
  onMapClick?: (lat: number, lng: number) => void;
  resetToken?: number;
  pickedPoint?: [number, number];
};

const colors: Record<string, string> = {
  "Forest degradation": "#ad654c",
  "Waste pollution": "#c69037",
  "Wildlife sighting": "#628c51",
  "River pollution": "#438ba0",
  Other: "#797b70",
};

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 100);
    return () => window.clearTimeout(timer);
  }, [map]);
  return null;
}

function MapClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (event) => onMapClick?.(event.latlng.lat, event.latlng.lng) });
  return null;
}

function MapResetter({ resetToken }: { resetToken: number }) {
  const map = useMap();
  useEffect(() => {
    if (resetToken > 0) map.setView([-1.3, 114.0], 6);
  }, [map, resetToken]);
  return null;
}

export default function MapView({ reports, compact = false, picker = false, layer = "standard", onMapClick, resetToken = 0, pickedPoint }: MapViewProps) {
  const tileUrl = layer === "humanitarian"
    ? "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  return (
    <MapContainer
      center={[-1.3, 114.0]}
      zoom={compact ? 5 : 6}
      scrollWheelZoom={!compact}
      className={`leaflet-map${compact ? " compact" : ""}${picker ? " picker" : ""}`}
      zoomControl={!compact}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url={tileUrl}
      />
      <MapResizer />
      <MapResetter resetToken={resetToken} />
      {picker && <MapClickHandler onMapClick={onMapClick} />}
      {pickedPoint && <CircleMarker center={pickedPoint} radius={7} pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#238b57", fillOpacity: 1 }} />}
      {reports.map((report) => (
        <CircleMarker
          key={report.id}
          center={[report.lat, report.lng]}
          radius={compact ? 6 : 8}
          pathOptions={{ color: "#ffffff", weight: 2, fillColor: colors[report.category] ?? colors.Other, fillOpacity: 0.96 }}
        >
          <Popup>
            <div className="map-popup">
              <span style={{ color: colors[report.category] ?? colors.Other }}>{report.category}</span>
              <strong>{report.title}</strong>
              <small>{report.location}</small>
              {report.createdAt && <small>{new Date(`${report.createdAt}T12:00:00`).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })}</small>}
              <p>{report.description}</p>
              <small>Community-submitted · not satellite-verified</small>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
