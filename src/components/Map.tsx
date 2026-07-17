"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import L from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import type { Pin, PinCategory } from "@/lib/types";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/categories";

// Colored dot markers per category — a plain divIcon needs no image asset,
// which sidesteps the bundler asset-import issues the old marker-icon.png
// setup had under Turbopack.
const categoryIcons: Record<PinCategory, L.DivIcon> = Object.fromEntries(
  (Object.keys(CATEGORY_COLORS) as PinCategory[]).map((category) => [
    category,
    L.divIcon({
      className: "",
      html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:${CATEGORY_COLORS[category]};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></span>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      popupAnchor: [0, -8],
    }),
  ]),
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
      className="h-full w-full"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <ClickHandler onMapClick={onMapClick} />
      <MarkerClusterGroup chunkedLoading>
        {pins.map((pin) => (
          <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={categoryIcons[pin.category]}>
            <Popup>
              <div className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-semibold uppercase text-neutral-500">
                  {CATEGORY_LABELS[pin.category]}
                </span>
                <span className="font-semibold">{pin.title}</span>
                {pin.description && <span>{pin.description}</span>}
                <button
                  type="button"
                  onClick={() => onUpvote(pin.id)}
                  className={`mt-1 min-h-[36px] self-start rounded px-3 py-1.5 text-xs font-medium ${
                    votedPinIds.has(pin.id)
                      ? "bg-blue-600 text-white"
                      : "bg-neutral-200 text-neutral-800"
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
