import type { PinCategory } from "@/lib/types";

export const CATEGORY_LABELS: Record<PinCategory, string> = {
  location: "Location",
  easter_egg: "Easter Egg",
  leak: "Leak",
  other: "Other",
};

// Neon palette matching the app's Vice-City-at-night theme.
export const CATEGORY_COLORS: Record<PinCategory, string> = {
  location: "#22e5ff", // cyan
  easter_egg: "#a855f7", // purple
  leak: "#ff2d78", // pink
  other: "#ffb020", // amber
};

export const CATEGORY_OPTIONS: { value: PinCategory; label: string }[] = (
  Object.keys(CATEGORY_LABELS) as PinCategory[]
).map((value) => ({ value, label: CATEGORY_LABELS[value] }));
