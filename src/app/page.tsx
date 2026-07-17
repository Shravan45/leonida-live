"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { useSupabase } from "@/components/SupabaseProvider";
import NewPinForm from "@/components/NewPinForm";
import CategoryFilter from "@/components/CategoryFilter";
import UsernameBadge from "@/components/UsernameBadge";
import OnboardingModal from "@/components/OnboardingModal";
import type { Pin, PinCategory } from "@/lib/types";

// Keep in sync with the 30s window enforced server-side in
// supabase/migrations/0003_pin_rate_limit.sql — this is just a faster local
// pre-check, not the actual enforcement.
const PIN_COOLDOWN_MS = 30_000;

const ONBOARDING_STORAGE_KEY = "leonida-live-onboarded";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-white/50">
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
  const [myName, setMyName] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

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

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    async function loadProfile() {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user!.id)
        .maybeSingle();
      if (cancelled) return;

      const name = data?.display_name ?? null;
      setMyName(name);

      // First visit on this browser: prompt to pick a name (pre-filled
      // with the auto-generated one).
      if (name && !localStorage.getItem(ONBOARDING_STORAGE_KEY)) {
        setShowOnboarding(true);
      }
    }
    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [supabase, user]);

  const handleSaveUsername = useCallback(async (name: string): Promise<string | null> => {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: name }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return (body?.error as string | undefined) ?? "Couldn't update username.";
    }

    const { profile } = await res.json();
    setMyName(profile.display_name);
    return null;
  }, []);

  const handleOnboardingConfirm = useCallback(
    async (name: string): Promise<string | null> => {
      const err = await handleSaveUsername(name);
      if (!err) {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
        setShowOnboarding(false);
      }
      return err;
    },
    [handleSaveUsername],
  );

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

      // Goes through a server route (not a direct client insert) so an AI
      // moderation check can run before the row ever lands in the DB.
      const res = await fetch("/api/pins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: draft.lat,
          lng: draft.lng,
          title: fields.title,
          description: fields.description,
          category: fields.category,
        }),
      });

      setSubmitting(false);

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        console.error("Failed to create pin:", body?.error ?? res.statusText);
        setSubmitError(
          res.status === 422
            ? ((body?.error as string | undefined) ??
                "This looks like it violates our content guidelines.")
            : res.status === 429
              ? "You're dropping pins too fast — wait a bit before the next one."
              : "Couldn't drop the pin. Try again.",
        );
        return;
      }

      const { pin } = await res.json();
      setLastDropAt(Date.now());
      setPins((prev) => [pin as Pin, ...prev]);
      setDraft(null);
    },
    [draft, user],
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
      <div className="flex h-screen w-full items-center justify-center bg-[var(--background)] text-sm text-white/50">
        Signing you in…
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full">
      {showOnboarding && myName && (
        <OnboardingModal suggestedName={myName} onConfirm={handleOnboardingConfirm} />
      )}

      <div className="absolute left-3 top-3 z-[1000] flex flex-col gap-0.5 rounded-2xl border border-white/10 bg-[#0f0a1a]/85 px-3 py-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.4)] backdrop-blur sm:px-4">
        <span className="font-display bg-gradient-to-r from-[var(--neon-pink)] to-[var(--neon-cyan)] bg-clip-text text-base leading-none tracking-wider text-transparent sm:text-xl">
          LEONIDA LIVE
        </span>
        <span className="text-[10px] leading-none text-white/35 sm:text-xs">
          by Shravan Ramdurg
        </span>
      </div>

      <div className="absolute right-3 top-3 z-[1000] flex items-center gap-2 rounded-full border border-white/10 bg-[#0f0a1a]/85 px-3 py-1.5 text-xs font-medium text-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.4)] backdrop-blur sm:px-3.5 sm:text-sm">
        <span className="h-2 w-2 rounded-full bg-[var(--neon-cyan)] shadow-[0_0_6px_1px_var(--neon-cyan)]" />
        {onlineCount} live
      </div>

      {/* Sits below the top badges (not beside them) so long banner text
          never collides with them, even on narrow screens. */}
      {pinsLoading && !loadError && (
        <div className="absolute left-1/2 top-16 z-[1000] max-w-[92vw] -translate-x-1/2 rounded-full border border-white/10 bg-[#0f0a1a]/85 px-3.5 py-1.5 text-xs font-medium text-white/60 shadow-sm backdrop-blur">
          Loading pins…
        </div>
      )}

      {loadError && (
        <div className="absolute left-1/2 top-16 z-[1000] flex max-w-[92vw] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-lg border border-[var(--neon-pink)]/40 bg-[#1a0a14]/95 px-3.5 py-2 text-xs font-medium text-white shadow-sm backdrop-blur">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => setRetryToken((t) => t + 1)}
            className="shrink-0 rounded-full bg-[var(--neon-pink)] px-3 py-1 font-semibold text-white"
          >
            Retry
          </button>
        </div>
      )}

      {actionError && !loadError && (
        <div className="absolute left-1/2 top-16 z-[1000] max-w-[92vw] -translate-x-1/2 rounded-full border border-[var(--neon-pink)]/40 bg-[#1a0a14]/95 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm backdrop-blur">
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
      {!draft && <UsernameBadge name={myName} onSave={handleSaveUsername} />}
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
