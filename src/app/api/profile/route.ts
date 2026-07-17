import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { moderateText } from "@/lib/moderation";

const NAME_PATTERN = /^[a-zA-Z0-9 _-]+$/;

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const displayName = typeof body?.display_name === "string" ? body.display_name.trim() : "";

  if (displayName.length < 2 || displayName.length > 24) {
    return NextResponse.json(
      { error: "Username must be 2-24 characters." },
      { status: 400 },
    );
  }

  if (!NAME_PATTERN.test(displayName)) {
    return NextResponse.json(
      { error: "Username can only contain letters, numbers, spaces, - and _." },
      { status: 400 },
    );
  }

  const moderation = await moderateText(`Username: ${displayName}`);
  if (moderation.flagged) {
    return NextResponse.json(
      { error: "That username isn't allowed. Try something else." },
      { status: 422 },
    );
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    }
    return NextResponse.json({ error: "Couldn't update username." }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
