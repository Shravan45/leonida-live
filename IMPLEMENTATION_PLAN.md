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
- **Theme**: committed dark "Vice-City-at-night" look, not a light/dark
  toggle — neon pink/cyan/purple/amber palette (`src/lib/categories.ts`,
  CSS vars in `globals.css`), Bebas Neue display font for headers/wordmark,
  CARTO dark basemap tiles, glowing category markers, glass-panel UI.

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

## Phase 1 — Realtime pin sync ✅ done

- [x] Subscribe to `postgres_changes` on `public.pins` (INSERT/UPDATE/DELETE)
      in `page.tsx`, merging into state and deduping by id against
      optimistic local updates
- [x] Clean up channel subscription on unmount (`supabase.removeChannel`)
- [x] Migration `0002_realtime.sql` registers `public.pins` with the
      `supabase_realtime` publication (required — without it the
      subscription connects but receives nothing)
- [x] Verified live: pin dropped in an incognito tab appeared in a
      logged-in tab without a refresh

## Phase 2 — Presence ✅ done

- [x] Supabase Realtime Presence channel (`online-users`) keyed by the
      anonymous `user.id`, so multiple tabs/reconnects from the same
      user don't inflate the count
- [x] "N live" indicator in the top-right corner of the map
- [x] Verified with 3 windows (1 regular + 2 incognito) — correctly
      showed 2, since Chrome's incognito windows share one session
- [ ] (Stretch, deferred) show rough cursor positions or last-clicked
      location of other online users on the map

## Phase 3 — Map & UX polish ✅ done

- [x] Category filter/legend — toggle chips in `CategoryFilter.tsx`,
      bottom-left, hidden while the pin-drop form is open
- [x] Distinct colored dot markers per category (`L.divIcon`, no image
      assets — sidesteps the earlier Turbopack marker-icon bug entirely).
      Colors/labels centralized in `src/lib/categories.ts`
- [x] Marker clustering via `react-leaflet-cluster` for dense areas
- [x] Loading/error states: "Loading pins…" indicator, a retry banner on
      fetch failure, inline error in the pin-drop form, and a transient
      toast for vote-sync failures
- [x] Anti-spam: 30s pin-drop cooldown, enforced server-side via a
      `before insert` trigger (`0003_pin_rate_limit.sql` — can't be
      bypassed) plus a client-side pre-check for instant feedback without
      a round trip
- [x] Mobile layout pass — fixed banner/badge overlap risk on narrow
      screens, constrained the category filter's width so it wraps
      instead of overflowing off-screen, bumped touch targets toward
      ~44px, bumped form fields to `text-base` (prevents iOS Safari's
      auto-zoom-on-focus for <16px inputs). **Not yet visually verified
      on a real device/viewport — worth a manual check.**

## Phase 4 — Performance & launch-hype readiness (not started)

- [ ] Decide caching strategy for the initial pins fetch (edge caching /
      route handler with `Cache-Control`, given data is realtime-updated
      client-side after load — see `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`
      for this Next.js version's current caching model before implementing)
- [ ] Load-test / sanity-check Supabase Realtime connection limits against
      expected concurrent users
- [ ] Bundle size check on the Leaflet client chunk

## Phase 5 — Deploy ✅ done

- [x] Linked project to Vercel (`vercel link --yes`) — project
      `brewed-entropy/leonida-live`, GitHub repo auto-connected for
      future git-push deploys
- [x] Set `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` in
      Vercel for Production, Preview, and Development
- [x] First deploy — build succeeded, no runtime errors in logs,
      HTTP 200. **Live at https://leonida-live.vercel.app**
- [ ] Custom domain (not requested yet)

Note: the very first `vercel` deploy auto-aliased straight to the
production domain (no separate preview step) since there was no prior
production deployment yet to distinguish it from. Later deploys with
plain `vercel` should behave as normal preview deploys; use
`vercel --prod` to intentionally promote to production.

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
  Also added Miami-only map bounds. Then shipped Phase 1 (realtime pin
  sync) — required manually running the `0002_realtime.sql` publication
  migration in the SQL Editor since it wasn't applied automatically.
  Verified with two concurrent browser sessions. Then shipped Phase 2
  (presence) — a live-user-count badge via Supabase Realtime Presence,
  keyed by anon user id. Verified across 3 windows (correctly showed 2,
  since Chrome incognito windows share one session). Then shipped
  Phase 3 (map/UX polish): category filter + colored markers,
  clustering, loading/error states, a server-enforced 30s pin-drop
  cooldown (`0003_pin_rate_limit.sql`), and a mobile layout pass (not
  yet visually verified on a real device). Then did a full visual theme
  pass at the user's request: committed dark "Vice City at night" look
  instead of adaptive light/dark — CARTO dark basemap tiles (replacing
  stock OSM), a neon pink/cyan/purple/amber palette, glowing category
  markers, Bebas Neue display font + gradient-text wordmark, dark-glass
  panels throughout, restyled Leaflet chrome (zoom control moved to
  bottom-right, popups/clusters/attribution re-themed), and a redesigned
  category filter that reads clearly as a filter control (labeled
  "Filter pins", glow-on-active, dim-with-"— off" when inactive) plus a
  chip-based category picker in the pin-drop form (replacing the native
  `<select>`). User confirmed it looks good in browser. Then shipped
  Phase 5 (deploy): updated the Vercel CLI (55.0.0 → 56.3.1, installed
  via nvm's npm since Homebrew's install was blocked by broken Xcode
  CLT), linked the project, set Supabase env vars for all three
  environments, and deployed. Build succeeded, no runtime errors,
  HTTP 200. **Live at https://leonida-live.vercel.app.** Next: user to
  smoke-test the production URL, then revisit Phase 4 (caching/perf)
  now that there's a real production URL to test against.
