# AGENTS.md

Instructions for AI coding agents working on the Craft Supply Scanner & Project Suggester. Keep changes small, focused, and aligned with the existing patterns described here. Refer to `data_model.md` for the data model specification.

## Project Overview

A mobile-first web app where users photograph craft supplies, build a persistent inventory, and receive project suggestions using only what they own. Core loop: **scan â†’ inventory â†’ suggest â†’ craft â†’ XP**.

- **Stack:** Next.js (App Router), TypeScript strict, Tailwind CSS, Supabase (Auth, Postgres, Storage, RLS), Gemini API (suggestions), Roboflow (object detection), Vercel (deployment).
- **Repo:** `Mekha0/nextjs-with-supabase-template`

## Setup & Commands

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Run tests (Vitest, node environment for API routes)
npm test

# Type check without full build
npx tsc --noEmit

# Lint
npx eslint .

# Start local Supabase stack (requires Docker)
supabase start
```

Environment variables live in `.env.local`. Required keys: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `ROBOFLOW_API_KEY`, `GEMINI_API_KEY`.

## Architecture: Where Things Live

```
app/
  (app)/                    # protected pages: home, inventory, scanner, suggestions, crafts
  (auth)/                   # public: login, signup
  api/
    items/route.ts          # GET list, POST create
    items/[id]/route.ts     # PATCH update, DELETE
    crafts/route.ts         # GET list, POST create
    crafts/[id]/route.ts    # PATCH (XP side effect), DELETE
    scan/route.ts           # POST image â†’ Roboflow â†’ candidates (does NOT write DB)
    suggestions/route.ts    # GET â†’ Gemini â†’ filtered suggestions
    health/route.ts         # GET smoke test
lib/
  data/                     # server-only data access functions (items.ts, crafts.ts)
  validation/               # shared Zod schemas (items.ts, crafts.ts) â€” imported by BOTH route handlers and frontend
  supabase/server.ts        # createServerClient for RSC / Route Handlers / Actions
  supabase/client.ts        # createBrowserClient for Client Components only
components/                 # UI components
hooks/                      # client-side state (useScan, useSuggestions)
supabase/migrations/        # SQL migrations
```

## Critical Rules (Do Not Violate)

**1. Data access lives in `lib/data/`, not in route handlers or components.**
Route handlers and Server Actions call the same data function. This is what makes frontend/backend parallel work safe. Do not write `supabase.from('items').insert(...)` inside `route.ts` or inside a component.

**2. Validate with Zod, not handwritten if-else.**
All input validation uses schemas in `lib/validation/`. The same schema is imported by the frontend form and the backend route. If you change a shape, update the schema first.

**3. `/api/scan` does not write to the database.**
It returns `{ candidates: [{ name, confidence }] }`. The client confirms candidates and calls `POST /api/items` for each accepted one. This keeps the scanner a pure detection endpoint.

**4. XP awarding is transactional, not application-level.**
`PATCH /api/crafts/:id` with `status: "complete"` must call the `complete_craft(craft_id)` Postgres RPC. That function locks the row, checks idempotency, updates the craft, and increments `profiles.xp` in one transaction. Do not implement XP increment in the route handler with two separate writes.

**5. Auth: username maps to email internally.**
Supabase Auth is email-based. On sign-up/login, map `username` â†’ `{username}@craftstash.local` (lowercased, trimmed). Store the display `username` in `public.profiles`. A Postgres trigger on `auth.users` creates the `profiles` row automatically.

**6. Server Components fetch data directly; do not `fetch('/api/...')` from them.**
Page data (inventory list, craft gallery) uses `await getItems()` from `lib/data/`. Route handlers exist for external clients, file uploads, and third-party API callsâ€”not as an internal HTTP layer.

## Component Model

- **Server Components by default.** Add `"use client"` only for `useState`, `useEffect`, event handlers, or browser APIs.
- **Client Components that need mutations call Server Actions**, not `fetch('/api/...')` directly. The only exceptions are `/api/scan` and `/api/suggestions`, which are consumed via hooks (`useScan`, `useSuggestions`) because they manage upload progress / on-demand loading state.
- **Never import `lib/supabase/server.ts` in a Client Component.** Use `lib/supabase/client.ts` if the client truly needs Supabase (e.g., realtime subscriptionsâ€”not in MVP).

## Testing

- API route tests use `next-test-api-route-handler` with Vitest (`environment: 'node'`).
- Mock the Supabase auth helper and any outbound `fetch` (Roboflow, Gemini) inside the test file.
- Priority tests: 401 without session, 201 with valid body, 400 with `fields` for invalid body, 404 for another user's resource.
- Do not unit-test Roboflow detection accuracy. Mock the provider response and test that your route parses it and handles `502`.

## Git & Deployment

- `main` is the integration branch. Do not commit directly to `main`.
- Branch naming: `feat/`, `fix/`, `docs/` + short description.
- Vercel auto-deploys from `main`. Preview deploys exist per PR.
- **Deployment Protection is disabled** on this project so external users (professor, demo audience) can access the URL without a Vercel login.

## Environment Gotchas
- **Roboflow endpoint:** use the serverless cloud API (`serverless.roboflow.com`), not the deprecated `detect.roboflow.com` . Pass the API key in the `Authorization: Bearer` header, not as a query param.
