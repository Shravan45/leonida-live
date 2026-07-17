import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { moderateText } from "@/lib/moderation";
import type { PinCategory } from "@/lib/types";

const CATEGORIES: PinCategory[] = ["location", "easter_egg", "leak", "other"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const lat = body?.lat;
  const lng = body?.lng;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description =
    typeof body?.description === "string" && body.description.trim()
      ? body.description.trim()
      : null;
  const category = body?.category;

  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !title ||
    !CATEGORIES.includes(category)
  ) {
    return NextResponse.json({ error: "Invalid pin data." }, { status: 400 });
  }

  const moderation = await moderateText(`Title: ${title}\nDescription: ${description ?? "(none)"}`);
  if (moderation.flagged) {
    return NextResponse.json(
      { error: "This looks like it violates our content guidelines." },
      { status: 422 },
    );
  }

  const { data, error } = await supabase
    .from("pins")
    .insert({ lat, lng, title, description, category, created_by: user.id })
    .select()
    .single();

  if (error) {
    const status = error.message.includes("rate_limited") ? 429 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ pin: data });
}
