export type PinCategory = "location" | "easter_egg" | "leak" | "other";

export interface Pin {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description: string | null;
  category: PinCategory;
  created_by: string | null;
  created_at: string;
  upvote_count: number;
  author_name: string | null;
}
