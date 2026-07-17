import type { PinCategory } from "@/lib/types";

export const CATEGORY_LABELS: Record<PinCategory, string> = {
  location: "Location",
  easter_egg: "Easter Egg",
  leak: "Leak",
  other: "Other",
};

export const CATEGORY_COLORS: Record<PinCategory, string> = {
  location: "#2563eb",
  easter_egg: "#9333ea",
  leak: "#dc2626",
  other: "#525252",
};

export const CATEGORY_OPTIONS: { value: PinCategory; label: string }[] = (
  Object.keys(CATEGORY_LABELS) as PinCategory[]
).map((value) => ({ value, label: CATEGORY_LABELS[value] }));
