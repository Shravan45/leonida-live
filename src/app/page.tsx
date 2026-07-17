"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { useSupabase } from "@/components/SupabaseProvider";
import NewPinForm from "@/components/NewPinForm";
import type { Pin, PinCategory } from "@/lib/types";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-neutral-500">
      Loading map…
    </div>
  ),
});

export default function Home() {
  const { supabase, user, loading } = useSupabase();
  const [pins, setPins] = useState<Pin[]>([]);
  const [votedPinIds, setVotedPinIds] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;

    async function loadData() {
      const [{ data: pinRows, error: pinsError }, { data: voteRows, error: votesError }] =
        await Promise.all([
          supabase.from("pins").select("*").order("created_at", { ascending: false }),
          supabase.from("pin_votes").select("pin_id").eq("user_id", user!.id),
        ]);

      if (pinsError) console.error("Failed to load pins:", pinsError.message);
      if (votesError) console.error("Failed to load votes:", votesError.message);

      setPins(pinRows ?? []);
      setVotedPinIds(new Set((voteRows ?? []).map((v) => v.pin_id)));
    }

    loadData();
  }, [supabase, user]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setDraft({ lat, lng });
  }, []);

  const handleSubmitPin = useCallback(
    async (fields: { title: string; description: string; category: PinCategory }) => {
      if (!draft || !user) return;
      setSubmitting(true);

      const { data, error } = await supabase
        .from("pins")
        .insert({
          lat: draft.lat,
          lng: draft.lng,
          title: fields.title,
          description: fields.description || null,
          category: fields.category,
          created_by: user.id,
        })
        .select()
        .single();

      setSubmitting(false);

      if (error) {
        console.error("Failed to create pin:", error.message);
        return;
      }

      setPins((prev) => [data as Pin, ...prev]);
      setDraft(null);
    },
    [draft, supabase, user],
  );

  const handleUpvote = useCallback(
    async (pinId: string) => {
      if (!user) return;
      const alreadyVoted = votedPinIds.has(pinId);

      // Optimistic update, reverted on error.
      setVotedPinIds((prev) => {
        const next = new Set(prev);
        if (alreadyVoted) {
          next.delete(pinId);
        } else {
          next.add(pinId);
        }
        return next;
      });
      setPins((prev) =>
        prev.map((p) =>
          p.id === pinId ? { ...p, upvote_count: p.upvote_count + (alreadyVoted ? -1 : 1) } : p,
        ),
      );

      const { error } = alreadyVoted
        ? await supabase.from("pin_votes").delete().eq("pin_id", pinId).eq("user_id", user.id)
        : await supabase.from("pin_votes").insert({ pin_id: pinId, user_id: user.id });

      if (error) {
        console.error("Failed to update vote:", error.message);
        setVotedPinIds((prev) => {
          const next = new Set(prev);
          if (alreadyVoted) {
            next.add(pinId);
          } else {
            next.delete(pinId);
          }
          return next;
        });
        setPins((prev) =>
          prev.map((p) =>
            p.id === pinId ? { ...p, upvote_count: p.upvote_count + (alreadyVoted ? 1 : -1) } : p,
          ),
        );
      }
    },
    [supabase, user, votedPinIds],
  );

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center text-sm text-neutral-500">
        Signing you in…
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full">
      <Map pins={pins} votedPinIds={votedPinIds} onMapClick={handleMapClick} onUpvote={handleUpvote} />
      {draft && (
        <NewPinForm
          lat={draft.lat}
          lng={draft.lng}
          submitting={submitting}
          onCancel={() => setDraft(null)}
          onSubmit={handleSubmitPin}
        />
      )}
    </div>
  );
}
