"use client";

import { useState } from "react";

interface OnboardingModalProps {
  suggestedName: string;
  onConfirm: (name: string) => Promise<string | null>;
}

export default function OnboardingModal({ suggestedName, onConfirm }: OnboardingModalProps) {
  const [value, setValue] = useState(suggestedName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setSaving(true);
    setError(null);
    const err = await onConfirm(value.trim());
    setSaving(false);
    if (err) setError(err);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-white/10 bg-[#0f0a1a]/95 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
      >
        <span className="font-display bg-gradient-to-r from-[var(--neon-pink)] to-[var(--neon-cyan)] bg-clip-text text-3xl tracking-wide text-transparent">
          Welcome to Leonida
        </span>
        <p className="text-sm text-white/60">
          You&apos;re browsing anonymously — pick a name to show on the pins you drop, or keep
          the one we picked for you.
        </p>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={24}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-3 text-base text-white outline-none focus:border-[var(--neon-cyan)]"
        />
        {error && <span className="text-sm text-[var(--neon-pink)]">{error}</span>}
        <button
          type="submit"
          disabled={saving || !value.trim()}
          className="min-h-[44px] rounded-full bg-[var(--neon-pink)] px-6 py-2 text-sm font-semibold text-white shadow-[0_0_20px_0_rgba(255,45,120,0.4)] transition-opacity disabled:opacity-40"
        >
          {saving ? "Saving…" : "Let's go"}
        </button>
      </form>
    </div>
  );
}
