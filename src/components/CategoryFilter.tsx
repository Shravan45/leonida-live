"use client";

import type { PinCategory } from "@/lib/types";
import { CATEGORY_COLORS, CATEGORY_OPTIONS } from "@/lib/categories";

interface CategoryFilterProps {
  active: Set<PinCategory>;
  onToggle: (category: PinCategory) => void;
}

export default function CategoryFilter({ active, onToggle }: CategoryFilterProps) {
  return (
    <div className="absolute bottom-3 left-3 z-[1000] flex max-w-[calc(100vw-1.5rem)] flex-wrap gap-1.5 rounded-lg border border-neutral-200 bg-white/90 p-2 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
      {CATEGORY_OPTIONS.map((opt) => {
        const isActive = active.has(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onToggle(opt.value)}
            aria-pressed={isActive}
            className={`flex min-h-[36px] items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-opacity ${
              isActive
                ? "border-neutral-300 bg-white text-neutral-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                : "border-transparent text-neutral-400 opacity-50 dark:text-neutral-500"
            }`}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: CATEGORY_COLORS[opt.value] }}
            />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
