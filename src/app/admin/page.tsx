"use client";

import { useCallback, useEffect, useState } from "react";
import { useSupabase } from "@/components/SupabaseProvider";
import type { Pin } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/categories";

export default function AdminPage() {
  const { supabase, user, loading } = useSupabase();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [pins, setPins] = useState<Pin[]>([]);
  const [pinsLoading, setPinsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    async function checkAdmin() {
      const { data } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (!cancelled) setIsAdmin(Boolean(data));
    }
    checkAdmin();
    return () => {
      cancelled = true;
    };
  }, [supabase, user]);

  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;
    async function loadPins() {
      setPinsLoading(true);
      const { data } = await supabase
        .from("pins")
        .select("*")
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setPins(data ?? []);
        setPinsLoading(false);
      }
    }
    loadPins();
    return () => {
      cancelled = true;
    };
  }, [supabase, isAdmin]);

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoggingIn(true);
      setLoginError(null);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoggingIn(false);
      if (error) setLoginError(error.message);
    },
    [supabase, email, password],
  );

  const handleDelete = useCallback(
    async (pinId: string) => {
      const prev = pins;
      setPins((p) => p.filter((pin) => pin.id !== pinId));
      const { error } = await supabase.from("pins").delete().eq("id", pinId);
      if (error) {
        console.error("Failed to delete pin:", error.message);
        setPins(prev);
      }
    },
    [supabase, pins],
  );

  if (loading || isAdmin === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--background)] text-sm text-white/50">
        Loading…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--background)] p-4">
        <form
          onSubmit={handleLogin}
          className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-white/10 bg-[#0f0a1a]/95 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
        >
          <span className="font-display text-2xl tracking-wide text-white">Admin sign-in</span>
          <input
            type="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-3 text-base text-white placeholder:text-white/35 outline-none focus:border-[var(--neon-cyan)]"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-3 text-base text-white placeholder:text-white/35 outline-none focus:border-[var(--neon-cyan)]"
          />
          {loginError && <span className="text-sm text-[var(--neon-pink)]">{loginError}</span>}
          <button
            type="submit"
            disabled={loggingIn}
            className="min-h-[44px] rounded-full bg-[var(--neon-pink)] px-6 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
          >
            {loggingIn ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 sm:p-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="font-display text-3xl tracking-wide text-white">Admin</span>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="rounded-full px-4 py-2 text-sm text-white/60 hover:bg-white/10 hover:text-white"
          >
            Sign out
          </button>
        </div>

        {pinsLoading ? (
          <span className="text-sm text-white/50">Loading pins…</span>
        ) : pins.length === 0 ? (
          <span className="text-sm text-white/50">No pins yet.</span>
        ) : (
          <div className="flex flex-col gap-2">
            {pins.map((pin) => (
              <div
                key={pin.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-[#0f0a1a]/80 p-4"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-white/40">
                    {CATEGORY_LABELS[pin.category]} · by {pin.author_name ?? "unknown"}
                  </span>
                  <span className="font-semibold text-white">{pin.title}</span>
                  {pin.description && (
                    <span className="text-sm text-white/60">{pin.description}</span>
                  )}
                  <span className="text-xs text-white/30">
                    {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)} ·{" "}
                    {new Date(pin.created_at).toLocaleString()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(pin.id)}
                  className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--neon-pink)]"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
