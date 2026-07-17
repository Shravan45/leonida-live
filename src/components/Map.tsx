"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import type { Pin } from "@/lib/types";

// react-leaflet's default marker icons resolve to broken paths under
// bundlers; serve the marker images from /public instead (copied from
// leaflet/dist/images) so they're plain static URLs.
const defaultIcon = L.icon({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export const MIAMI_CENTER: [number, number] = [25.7617, -80.1918];

// Roughly the Miami-Dade urban core (Homestead to North Miami, Everglades to
// the barrier islands) — keeps the map focused on the city instead of
// panning/zooming out to the rest of Florida.
const MIAMI_BOUNDS: L.LatLngBoundsExpression = [
  [25.55, -80.55],
  [25.98, -80.05],
];

const CATEGORY_LABELS: Record<Pin["category"], string> = {
  location: "Location",
  easter_egg: "Easter Egg",
  leak: "Leak",
  other: "Other",
};

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
      {pins.map((pin) => (
        <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={defaultIcon}>
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
                className={`mt-1 self-start rounded px-2 py-1 text-xs font-medium ${
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
    </MapContainer>
  );
}
