"use client";

import { useState } from "react";
import type { PinCategory } from "@/lib/types";
import { CATEGORY_COLORS, CATEGORY_OPTIONS } from "@/lib/categories";

interface NewPinFormProps {
  lat: number;
  lng: number;
  submitting: boolean;
  error?: string | null;
  onCancel: () => void;
  onSubmit: (fields: { title: string; description: string; category: PinCategory }) => void;
}

export default function NewPinForm({
  lat,
  lng,
  submitting,
  error,
  onCancel,
  onSubmit,
}: NewPinFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<PinCategory>("location");
  const activeColor = CATEGORY_COLORS[category];

  return (
    <div className="absolute inset-x-0 bottom-0 z-[1000] flex justify-center p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          onSubmit({ title: title.trim(), description: description.trim(), category });
        }}
        className="flex w-full max-w-lg flex-col gap-3 rounded-2xl border border-white/10 bg-[#0f0a1a]/95 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur"
      >
        <div className="flex items-center justify-between">
          <span className="font-display text-2xl tracking-wide text-white">New pin</span>
          <span className="text-xs text-white/40">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </span>
        </div>

        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          // text-base (not text-sm) avoids iOS Safari auto-zooming the page
          // on focus, which it does for inputs under 16px font size.
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-3 text-base text-white placeholder:text-white/35 outline-none focus:border-[var(--neon-cyan)]"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-3 text-base text-white placeholder:text-white/35 outline-none focus:border-[var(--neon-cyan)]"
        />

        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((opt) => {
            const isActive = category === opt.value;
            const color = CATEGORY_COLORS[opt.value];
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCategory(opt.value)}
                aria-pressed={isActive}
                className="flex min-h-[44px] items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-all"
                style={
                  isActive
                    ? {
                        borderColor: color,
                        backgroundColor: `${color}26`,
                        color: "#ffffff",
                        boxShadow: `0 0 14px 0 ${color}66`,
                      }
                    : {
                        borderColor: "rgba(255,255,255,0.12)",
                        backgroundColor: "transparent",
                        color: "rgba(255,255,255,0.5)",
                      }
                }
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                {opt.label}
              </button>
            );
          })}
        </div>

        {error && <span className="text-sm text-[var(--neon-pink)]">{error}</span>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] rounded-full px-5 py-2 text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !title.trim()}
            style={{
              backgroundColor: activeColor,
              boxShadow: `0 0 20px 0 ${activeColor}66`,
            }}
            className="min-h-[44px] rounded-full px-6 py-2 text-sm font-semibold text-[#0a0714] transition-opacity disabled:opacity-40"
          >
            {submitting ? "Dropping…" : "Drop pin"}
          </button>
        </div>
      </form>
    </div>
  );
}
