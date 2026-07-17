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

## Phase 4 — Performance & launch-hype readiness ✅ done

- [x] ~~Edge/route caching for the initial pins fetch~~ — **decided
      against.** Pins load client-side directly from Supabase, not
      through a Next.js route, so Vercel edge caching wouldn't touch
      that path. A real fix would mean adding a caching layer in front
      of Supabase — not worth building without real traffic to justify
      it. Revisit only if Supabase read load actually becomes a problem.
- [x] Documented Supabase Realtime connection limits (no load-testing
      infra built — not warranted pre-launch; just know the caps).
      Per [supabase.com/pricing](https://supabase.com/pricing) as of
      2026-07-16: **Free tier** (this project's current tier) = 200
      concurrent peak connections, 2M messages/month included. **Pro/
      Team** = 500 concurrent included, then $10 per additional 1000;
      5M messages/month included, then $2.50/M. Each connected browser
      tab counts as ~1 connection regardless of how many channels it
      subscribes to (pins-changes + online-users are multiplexed over
      one websocket). 200 concurrent is generous for early traffic —
      upgrade to Pro before a real launch/marketing push if you expect
      to exceed that.
- [x] Bundle size check on the Leaflet client chunk — ~54KB gzipped
      (leaflet + react-leaflet + leaflet.markercluster), actually smaller
      than the Supabase client chunk (~65KB gzip). Total client JS across
      all chunks is ~304KB gzipped. Nothing bloated, no action needed.

## Phase 6 — Identity, AI moderation, admin (not started)

User-requested additions beyond the original MVP scope. Decisions locked
in with the user before starting:
- Moderation **hard-blocks at submission** (never lands in the DB), rather
  than posting-then-flagging.
- Moderation scope is **abusive/hateful content only** — explicitly *not*
  filtering "political" content, since GTA itself satirizes real-world
  politics and a strict filter would over-block legitimate pins.
- Admin is a **real Supabase email/password account** (not a shared
  passcode), gated by an `admins` allowlist table — regular visitors stay
  anonymous.
- Email-on-new-pin uses **Resend**.

### 6a. Reddit-style anonymous usernames

- [ ] Migration `0004_profiles.sql`: `profiles` table (`id` → `auth.users`,
      `display_name`), publicly readable via RLS. `generate_random_username()`
      SQL function (adjective+noun+number). `handle_new_user()` trigger on
      `auth.users` insert auto-populates a profile. Backfill any existing
      users without one.
- [ ] Denormalize onto pins: add `pins.author_name`, populated by a
      `before insert` trigger from the pin's `created_by` profile — keeps
      it present in `postgres_changes` realtime payloads without a join.
- [ ] Show `author_name` in the map popup; update `Pin` type.

### 6b. AI moderation on pin submission

- [ ] Move pin creation from a direct client-side `supabase.insert()` to a
      server-side Route Handler (`/api/pins`, POST) — required because the
      moderation call needs a server context (can't safely call an LLM
      with a secret-backed gateway from the browser), and because a hard
      block must happen *before* the row is ever written.
- [ ] Route handler: read the authenticated user from the server Supabase
      client (cookies), classify `title`+`description` via the AI SDK
      (`generateText` + `Output.object()` + zod schema
      `{ flagged: boolean, reason?: string }`), model
      `anthropic/claude-haiku-4.5` via Vercel AI Gateway (plain model
      string, no provider package — auth via the `VERCEL_OIDC_TOKEN`
      already in `.env.local` from `vercel link`, no extra API key
      expected to be needed). Abusive/hateful only, not political.
      If flagged, return 422 with a user-facing message; otherwise insert
      via the server client (RLS/rate-limit trigger/author_name trigger
      all still apply normally).
- [ ] Update `handleSubmitPin` in `page.tsx` to POST to `/api/pins`
      instead of calling `supabase.insert()` directly; surface the 422
      moderation message through the existing `submitError` UI.

### 6c. Admin moderation + email-on-new-pin

- [ ] Migration `0005_admin.sql`: `admins` table (`user_id` → `auth.users`,
      self-select RLS policy so a client can check "am I admin"), plus a
      `delete` RLS policy on `pins` for admins.
- [ ] User creates their own admin account in the Supabase dashboard
      (Authentication → Users → Add user, email+password), then runs a
      one-line `insert into admins (user_id) values ('<uuid>');` — guided
      step, not automatable from here.
- [ ] `/admin` page: email/password sign-in (`supabase.auth.signInWithPassword`,
      coexists fine with the anonymous-by-default flow — signing in
      replaces the anonymous session), then a list of all pins with a
      delete button for confirmed admins only.
- [ ] Email notification: Postgres `after insert` trigger on `pins` using
      the `pg_net` extension (`net.http_post`) to call a new
      `/api/webhooks/new-pin` Route Handler, verified via a shared-secret
      header, which sends the email via Resend. Chosen over client-side
      email sending or a dashboard-configured webhook so the whole thing
      ships as a migration + one route, no manual dashboard webhook setup.
- [ ] User creates a Resend account + API key, and sets
      `RESEND_API_KEY`, `ADMIN_EMAIL`, `WEBHOOK_SECRET` in `.env.local`
      and Vercel env vars (guided step).

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
  HTTP 200. **Live at https://leonida-live.vercel.app.** User confirmed
  it works in production. Then closed out Phase 4: skipped edge caching
  entirely (decided it doesn't apply to how this app fetches data — see
  above), checked the Leaflet client bundle (~54KB gzipped, not
  bloated), and documented Supabase Realtime's connection limits (Free
  tier = 200 concurrent, upgrade to Pro before a real launch push).
  **All planned phases (0–5) are now done.** Next: no fixed plan —
  whatever the user wants to add/improve next (see Phase 3's "not yet
  verified on a real device" note as one open thread if nothing else
  comes up).
