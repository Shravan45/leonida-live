"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import L from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMapEvents } from "react-leaflet";
import type { Pin, PinCategory } from "@/lib/types";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/categories";

// Colored, glowing dot markers per category — a plain divIcon needs no image
// asset, which sidesteps the bundler asset-import issues the old
// marker-icon.png setup had under Turbopack.
const categoryIcons: Record<PinCategory, L.DivIcon> = Object.fromEntries(
  (Object.keys(CATEGORY_COLORS) as PinCategory[]).map((category) => {
    const color = CATEGORY_COLORS[category];
    return [
      category,
      L.divIcon({
        className: "",
        html: `<span style="display:block;width:22px;height:22px;border-radius:9999px;background:${color};border:2px solid rgba(10,7,20,0.9);box-shadow:0 0 12px 2px ${color}99, 0 0 0 1px rgba(255,255,255,0.15)"></span>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -11],
      }),
    ];
  }),
) as Record<PinCategory, L.DivIcon>;

export const MIAMI_CENTER: [number, number] = [25.7617, -80.1918];

// Roughly the Miami-Dade urban core (Homestead to North Miami, Everglades to
// the barrier islands) — keeps the map focused on the city instead of
// panning/zooming out to the rest of Florida.
const MIAMI_BOUNDS: L.LatLngBoundsExpression = [
  [25.55, -80.55],
  [25.98, -80.05],
];

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface MapProps {
  pins: Pin[];
  votedPinIds: Set<string>;
  onMapClick: (lat: number, lng: number) => void;
  onUpvote: (pinId: string) => void;
}

export default function Map({ pins, votedPinIds, onMapClick, onUpvote }: MapProps) {
  return (
    <MapContainer
      center={MIAMI_CENTER}
      zoom={12}
      minZoom={11}
      maxBounds={MIAMI_BOUNDS}
      maxBoundsViscosity={1.0}
      zoomControl={false}
      className="h-full w-full"
    >
      {/* CARTO's dark basemap (free, no API key) instead of stock OSM tiles
          — the light basemap clashed hard with a neon/dark theme. */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
      />
      <ZoomControl position="bottomright" />
      <ClickHandler onMapClick={onMapClick} />
      <MarkerClusterGroup chunkedLoading>
        {pins.map((pin) => (
          <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={categoryIcons[pin.category]}>
            <Popup>
              <div className="flex min-w-[180px] flex-col gap-1.5">
                <span
                  className="font-display text-sm tracking-wide"
                  style={{ color: CATEGORY_COLORS[pin.category] }}
                >
                  {CATEGORY_LABELS[pin.category].toUpperCase()}
                </span>
                <span className="text-base font-semibold text-white">{pin.title}</span>
                {pin.description && (
                  <span className="text-sm text-white/70">{pin.description}</span>
                )}
                <button
                  type="button"
                  onClick={() => onUpvote(pin.id)}
                  className={`mt-1.5 min-h-[40px] self-start rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    votedPinIds.has(pin.id)
                      ? "bg-[var(--neon-pink)] text-white shadow-[0_0_12px_2px_rgba(255,45,120,0.5)]"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  ▲ {pin.upvote_count}
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
