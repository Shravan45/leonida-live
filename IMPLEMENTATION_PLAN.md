# Leonida Live — Implementation Plan

GTA 6 community map: fans drop and upvote in-game locations, easter eggs, and
leaks on a live map, with real-time sync and presence across concurrent
users. Built on Next.js (App Router) + Supabase (Postgres, Auth, Realtime) +
Leaflet. Standing in for Leonida with a Miami basemap during early
development.

This file is the source of truth for project status across sessions. Update
the checkboxes as work lands — don't let a phase drift out of sync with the
code.

## Stack decisions

- **Auth**: Supabase anonymous sign-in (no signup friction — every visitor
  is an authenticated `auth.users` row under the hood).
- **Data**: Postgres tables `pins` and `pin_votes`, RLS-protected, with a
  trigger that keeps `pins.upvote_count` denormalized.
- **Map**: Leaflet via `react-leaflet`, dynamically imported client-side
  (Leaflet needs `window`). Centered on Miami (`[25.7617, -80.1918]`) as a
  stand-in basemap.
- **Realtime**: Supabase Realtime (`postgres_changes` for pin/vote sync,
  Presence for concurrent-user tracking) — not yet wired, see Phase 2.
- **Hosting**: Vercel.

---

## Phase 0 — Foundations ✅ mostly done

- [x] Next.js 16 + TypeScript + Tailwind v4 scaffold
- [x] Supabase browser/server client helpers (`src/lib/supabase/*`)
- [x] `SupabaseProvider` — bootstraps session, falls back to
      `signInAnonymously()`, exposes `useSupabase()`
- [x] DB schema (`supabase/migrations/0001_init.sql`): `pins`, `pin_votes`,
      RLS policies, vote-count trigger
- [x] Map renders, centered on Miami
- [x] Click-to-drop pin flow with title/description/category form
- [x] Upvote/unvote with optimistic UI + rollback on error
- [x] Map bounded to the Miami-Dade urban core (can't pan/zoom to rest of FL)
- [x] Verified end-to-end in browser: anonymous sign-in, pin drop, upvote
- [x] `.env.local` populated with the real Supabase project URL + anon key
- [x] `0001_init.sql` applied to the remote Supabase DB
- [x] Pushed to GitHub (https://github.com/Shravan45/leonida-live)

These three unchecked items are the immediate blockers before any new
feature work — the app can't actually talk to Supabase yet.

## Phase 1 — Realtime pin sync (not started)

Right now pins/votes only load once on mount via `SupabaseProvider`'s user
effect in `page.tsx`. Other users' changes don't appear until a manual
refresh.

- [ ] Subscribe to `postgres_changes` on `public.pins` (INSERT) in
      `page.tsx` (or a dedicated hook) and merge new rows into state
- [ ] Subscribe to `public.pins` (UPDATE) so `upvote_count` changes from
      other users' votes show up live
- [ ] Clean up channel subscriptions on unmount
- [ ] Handle the case where the local optimistic update and an incoming
      realtime event describe the same change (avoid double-counting)

## Phase 2 — Presence (not started)

- [ ] Supabase Realtime Presence channel keyed by the anonymous
      `user.id`
- [ ] Show a "N live" indicator somewhere in the UI
- [ ] (Stretch) show rough cursor positions or last-clicked location of
      other online users on the map

## Phase 3 — Map & UX polish (not started)

- [ ] Category filter/legend (toggle location / easter egg / leak / other)
- [ ] Marker clustering for dense areas (`react-leaflet-cluster` or similar)
- [ ] Distinct marker icons/colors per category
- [ ] Mobile layout pass (drop-pin form is currently a bottom sheet — verify
      touch targets, keyboard behavior on iOS Safari)
- [ ] Empty/loading/error states beyond the current bare spinner text
- [ ] Basic anti-spam: cooldown between pin drops per user, max pins/user,
      or a report/flag action

## Phase 4 — Performance & launch-hype readiness (not started)

- [ ] Decide caching strategy for the initial pins fetch (edge caching /
      route handler with `Cache-Control`, given data is realtime-updated
      client-side after load — see `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`
      for this Next.js version's current caching model before implementing)
- [ ] Load-test / sanity-check Supabase Realtime connection limits against
      expected concurrent users
- [ ] Bundle size check on the Leaflet client chunk

## Phase 5 — Deploy

- [ ] Link project to Vercel (`vercel link`)
- [ ] Set `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` in
      Vercel project env vars (Preview + Production)
- [ ] First deploy, smoke test against the real Supabase project
- [ ] Custom domain (if applicable)

---

## Session log

- **2026-07-16**: Recovered a lost session's progress (Phase 0 code was
  already written). Confirmed a Supabase project exists with anonymous
  sign-in enabled. Wrote this plan, pushed the repo to
  https://github.com/Shravan45/leonida-live, applied the DB migration,
  and wired `.env.local` to the real project. Local dev requires Node
  ≥20.9.0 — this machine's system Node was 19.8.1, fixed via `nvm`
  (`nvm use default` before `npm run dev`; Xcode Command Line Tools are
  broken on this machine, which blocks Homebrew node/supabase-cli
  upgrades — fix later with `xcode-select --install` if the CLI is
  needed). Verified pin drop/upvote end-to-end in browser after two
  fixes: (1) anonymous sign-ins were toggled off in the Supabase
  project despite earlier setup — re-enabled in Authentication →
  Sign In/Providers; (2) Leaflet's default marker icons broke under
  Turbopack when statically imported from `node_modules` (`.src`
  came back `undefined`) — fixed by copying the marker PNGs into
  `public/leaflet/` and referencing them as plain static URLs instead.
  Also added Miami-only map bounds. Next: Phase 1 (realtime sync).
