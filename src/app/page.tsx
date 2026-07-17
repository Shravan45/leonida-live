"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { useSupabase } from "@/components/SupabaseProvider";
import NewPinForm from "@/components/NewPinForm";
import CategoryFilter from "@/components/CategoryFilter";
import type { Pin, PinCategory } from "@/lib/types";

// Keep in sync with the 30s window enforced server-side in
// supabase/migrations/0003_pin_rate_limit.sql — this is just a faster local
// pre-check, not the actual enforcement.
const PIN_COOLDOWN_MS = 30_000;

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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState(1);
  const [activeCategories, setActiveCategories] = useState<Set<PinCategory>>(
    new Set(["location", "easter_egg", "leak", "other"]),
  );
  const [pinsLoading, setPinsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [lastDropAt, setLastDropAt] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function loadData() {
      setPinsLoading(true);
      setLoadError(null);

      const [{ data: pinRows, error: pinsError }, { data: voteRows, error: votesError }] =
        await Promise.all([
          supabase.from("pins").select("*").order("created_at", { ascending: false }),
          supabase.from("pin_votes").select("pin_id").eq("user_id", user!.id),
        ]);

      if (cancelled) return;

      if (pinsError || votesError) {
        console.error("Failed to load pins:", pinsError?.message ?? votesError?.message);
        setLoadError("Couldn't load the map data. Check your connection and try again.");
        setPinsLoading(false);
        return;
      }

      setPins(pinRows ?? []);
      setVotedPinIds(new Set((voteRows ?? []).map((v) => v.pin_id)));
      setPinsLoading(false);
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [supabase, user, retryToken]);

  // Transient toast for background action failures (vote sync, etc).
  useEffect(() => {
    if (!actionError) return;
    const timer = setTimeout(() => setActionError(null), 4000);
    return () => clearTimeout(timer);
  }, [actionError]);

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

  const handleToggleCategory = useCallback((category: PinCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (lastDropAt) {
        const remainingMs = PIN_COOLDOWN_MS - (Date.now() - lastDropAt);
        if (remainingMs > 0) {
          setActionError(`Wait ${Math.ceil(remainingMs / 1000)}s before dropping another pin.`);
          return;
        }
      }
      setDraft({ lat, lng });
    },
    [lastDropAt],
  );

  const handleSubmitPin = useCallback(
    async (fields: { title: string; description: string; category: PinCategory }) => {
      if (!draft || !user) return;
      setSubmitting(true);
      setSubmitError(null);

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
        setSubmitError(
          error.message.includes("rate_limited")
            ? "You're dropping pins too fast — wait a bit before the next one."
            : "Couldn't drop the pin. Try again.",
        );
        return;
      }

      setLastDropAt(Date.now());
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
        setActionError("Couldn't update your vote. Try again.");
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

      {/* Sits below the "N live" badge (not beside it) so long banner text
          never collides with it, even on narrow screens. */}
      {pinsLoading && !loadError && (
        <div className="absolute left-1/2 top-14 z-[1000] max-w-[92vw] -translate-x-1/2 rounded-full border border-neutral-200 bg-white/90 px-3 py-1 text-xs font-medium text-neutral-600 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90 dark:text-neutral-300">
          Loading pins…
        </div>
      )}

      {loadError && (
        <div className="absolute left-1/2 top-14 z-[1000] flex max-w-[92vw] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => setRetryToken((t) => t + 1)}
            className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-white"
          >
            Retry
          </button>
        </div>
      )}

      {actionError && !loadError && (
        <div className="absolute left-1/2 top-14 z-[1000] max-w-[92vw] -translate-x-1/2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 shadow-sm dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {actionError}
        </div>
      )}

      <Map
        pins={pins.filter((p) => activeCategories.has(p.category))}
        votedPinIds={votedPinIds}
        onMapClick={handleMapClick}
        onUpvote={handleUpvote}
      />
      {!draft && <CategoryFilter active={activeCategories} onToggle={handleToggleCategory} />}
      {draft && (
        <NewPinForm
          lat={draft.lat}
          lng={draft.lng}
          submitting={submitting}
          error={submitError}
          onCancel={() => {
            setDraft(null);
            setSubmitError(null);
          }}
          onSubmit={handleSubmitPin}
        />
      )}
    </div>
  );
}
