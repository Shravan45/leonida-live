"use client";

import { useState } from "react";
import type { PinCategory } from "@/lib/types";
import { CATEGORY_OPTIONS } from "@/lib/categories";

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

  return (
    <div className="absolute inset-x-0 bottom-0 z-[1000] flex justify-center p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          onSubmit({ title: title.trim(), description: description.trim(), category });
        }}
        className="flex w-full max-w-md flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-4 shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
      >
        <span className="text-xs text-neutral-500">
          New pin at {lat.toFixed(5)}, {lng.toFixed(5)}
        </span>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          // text-base (not text-sm) avoids iOS Safari auto-zooming the page
          // on focus, which it does for inputs under 16px font size.
          className="rounded border border-neutral-300 px-2 py-2 text-base dark:border-neutral-700 dark:bg-neutral-800"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="rounded border border-neutral-300 px-2 py-2 text-base dark:border-neutral-700 dark:bg-neutral-800"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as PinCategory)}
          className="rounded border border-neutral-300 px-2 py-2 text-base dark:border-neutral-700 dark:bg-neutral-800"
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] rounded px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="min-h-[44px] rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Dropping…" : "Drop pin"}
          </button>
        </div>
      </form>
    </div>
  );
}
