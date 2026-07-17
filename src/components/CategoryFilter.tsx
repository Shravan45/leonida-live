"use client";

import type { PinCategory } from "@/lib/types";
import { CATEGORY_COLORS, CATEGORY_OPTIONS } from "@/lib/categories";

interface CategoryFilterProps {
  active: Set<PinCategory>;
  onToggle: (category: PinCategory) => void;
}

export default function CategoryFilter({ active, onToggle }: CategoryFilterProps) {
  return (
    <div className="absolute bottom-3 left-3 z-[1000] max-w-[calc(100vw-1.5rem)] rounded-xl border border-white/10 bg-[#0f0a1a]/90 p-3 shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur">
      <div className="mb-2 flex items-center gap-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-widest text-white/50">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M3 5h18l-7 8v6l-4 2v-8L3 5z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
        Filter pins
      </div>
      <div className="flex flex-wrap gap-2">
        {CATEGORY_OPTIONS.map((opt) => {
          const isActive = active.has(opt.value);
          const color = CATEGORY_COLORS[opt.value];
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onToggle(opt.value)}
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
                      color: "rgba(255,255,255,0.4)",
                    }
              }
            >
              <span
                className="h-2.5 w-2.5 rounded-full transition-opacity"
                style={{
                  background: color,
                  boxShadow: isActive ? `0 0 6px 1px ${color}` : "none",
                  opacity: isActive ? 1 : 0.35,
                }}
              />
              {opt.label}
              {!isActive && <span className="text-white/25">— off</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
