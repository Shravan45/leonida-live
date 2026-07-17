"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import type { Pin } from "@/lib/types";

// react-leaflet's default marker icon paths break under bundlers; point them
// at the actual bundled asset URLs instead.
const defaultIcon = L.icon({
  iconRetinaUrl: markerIcon2x.src,
  iconUrl: markerIcon.src,
  shadowUrl: markerShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export const MIAMI_CENTER: [number, number] = [25.7617, -80.1918];

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
    <MapContainer center={MIAMI_CENTER} zoom={12} className="h-full w-full">
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
