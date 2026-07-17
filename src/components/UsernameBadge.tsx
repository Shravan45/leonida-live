"use client";

import { useState } from "react";

interface UsernameBadgeProps {
  name: string | null;
  onSave: (name: string) => Promise<string | null>;
}

export default function UsernameBadge({ name, onSave }: UsernameBadgeProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!name && !editing) return null;

  if (editing) {
    return (
      <div className="absolute bottom-3 right-3 z-[1000] flex w-48 flex-col gap-1.5 rounded-xl border border-white/10 bg-[#0f0a1a]/95 p-3 shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur">
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={24}
          className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-base text-white outline-none focus:border-[var(--neon-cyan)]"
        />
        {error && <span className="text-xs text-[var(--neon-pink)]">{error}</span>}
        <div className="flex justify-end gap-1.5">
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setValue(name ?? "");
              setError(null);
            }}
            className="rounded-full px-3 py-1 text-xs text-white/60 hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              setError(null);
              const err = await onSave(value.trim());
              setSaving(false);
              if (err) {
                setError(err);
              } else {
                setEditing(false);
              }
            }}
            className="rounded-full bg-[var(--neon-pink)] px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setValue(name ?? "");
        setEditing(true);
      }}
      className="absolute bottom-3 right-3 z-[1000] flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0f0a1a]/85 px-3.5 py-2 text-sm font-medium text-white/70 shadow-[0_4px_20px_rgba(0,0,0,0.4)] backdrop-blur transition-colors hover:text-white"
    >
      You: {name}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="opacity-60">
        <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
