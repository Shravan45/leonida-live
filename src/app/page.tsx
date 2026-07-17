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
  const [onlineCount, setOnlineCount] = useState(1);

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

  // Sync pins created/upvoted by other users in real time. Own inserts/votes
  // are already applied optimistically above, so these handlers dedupe by id
  // rather than assuming every event is new.
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("pins-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pins" },
        (payload) => {
          const newPin = payload.new as Pin;
          setPins((prev) => (prev.some((p) => p.id === newPin.id) ? prev : [newPin, ...prev]));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pins" },
        (payload) => {
          const updatedPin = payload.new as Pin;
          setPins((prev) => prev.map((p) => (p.id === updatedPin.id ? updatedPin : p)));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "pins" },
        (payload) => {
          const deletedId = (payload.old as Pin).id;
          setPins((prev) => prev.filter((p) => p.id !== deletedId));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, user]);

  // Presence: track this anonymous user on a shared channel keyed by their
  // user id, so tabs/reconnects from the same user don't inflate the count.
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel("online-users", {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        setOnlineCount(Object.keys(channel.presenceState()).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
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
      <div className="absolute right-3 top-3 z-[1000] flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white/90 px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90 dark:text-neutral-200">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        {onlineCount} live
      </div>
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
