@AGENTS.md

# Rurana — Workout Tracker PWA

## Project Overview
Single-user PWA para registro de entrenamientos. Mobile-first (iPhone), offline-first, UI en español.
Stack: Next.js 16 App Router + TypeScript + Tailwind CSS 4 + Supabase + IndexedDB (idb).
Auth: Google OAuth con JWT custom.

---

## Stack & Versions
- **Next.js** 16.2.1 (App Router)
- **React** 19.2.4
- **TypeScript** 5
- **Tailwind CSS** 4 (PostCSS plugin: `@tailwindcss/postcss`)
- **Supabase JS** ^2.100.0
- **Framer Motion** ^12.38.0
- **Lucide React** ^1.6.0
- **idb** ^8.0.3 (IndexedDB wrapper)
- **date-fns** ^4.1.0
- **clsx** ^2.1.1
- **jose** ^6.2.2 (JWT)

---

## Design System
- **Theme**: Dark-only (no light mode toggle)
- **Style**: Apple HIG — iOS system tokens, SF Pro typography, rounded corners, blur surfaces
- **CSS tokens**: definidos en `src/app/globals.css` como custom properties `:root`
- **Key tokens**: `--background: #0C0C0E`, `--background-secondary: #1C1C1E`, `--accent: #0A84FF`, `--foreground: #FFF`
- **CSS utilities**: `.ios-surface`, `.ios-card`, `.ios-list`, `.ios-input`, `.safe-top`, `.safe-bottom`
- **Icons**: Lucide React
- **Animations**: Framer Motion (sheets, tab transitions, set completion)

---

## Architecture

### Rendering
- Client-side SPA after auth (no server rendering for app content)
- Tab navigation via React state (NOT Next.js file-based routing)
- Tabs: Home (`"home"`), Workout (`"workout"`), Profile (`"profile"`)
- Bottom tab bar fixed with safe-area insets

### Data Flow (Offline-First)
1. All writes go to **IndexedDB** immediately (zero latency)
2. Background sync pushes pending changes to **Supabase**
3. On app startup, pull latest from Supabase → merge into IndexedDB
4. `_sync_status` field on each record: `"synced"` | `"pending"`

### React Contexts
- `useAuth()` → `src/lib/auth-client.ts` — user, supabaseToken, status
- `useData()` → `src/lib/data-context.tsx` — CRUD operations, sync state
- `useWorkout()` → `src/lib/workout-context.tsx` — active workout session state

---

## Auth Flow
- Google OAuth → custom JWT sessions (jose HS256)
- Session cookie: `rurana-session` (httpOnly, 30 days)
- Supabase token: separate JWT signed with `SUPABASE_JWT_SECRET` for RLS
- `AppUser` interface: `{ id, email, fullName, avatarUrl }` (src/lib/auth.ts)
- `getSupabaseBrowserClient(token)` creates RLS-enabled client (src/lib/supabase.ts)

---

## Data Models

### ExerciseType
`"weight_reps"` | `"bodyweight_reps"` | `"duration"` | `"duration_weight"` | `"distance_duration"` | `"weight_distance"` | `"bands"`

### MuscleGroup
`"chest"` | `"back"` | `"shoulders"` | `"biceps"` | `"triceps"` | `"forearms"` | `"quads"` | `"hamstrings"` | `"glutes"` | `"calves"` | `"abs"` | `"traps"` | `"lats"` | `"full_body"`

### Supabase Tables
- `profiles` — user_id (PK, UUID), email, full_name, avatar_url
- `exercise_library` — id, user_id (nullable: NULL=global seed), name, exercise_type, unilateral, muscle_groups[], created_at
- `routines` — id, user_id, name, created_at, updated_at
- `routine_exercises` — id, routine_id, exercise_id, position, default_sets
- `workout_sessions` — id, user_id, routine_id?, started_at, finished_at?, notes
- `workout_entries` — id, session_id, exercise_id, position
- `workout_sets` — id, entry_id, position, weight_kg?, reps?, duration_seconds?, distance_m?, band_color?, band_resistance?, completed

### IndexedDB (rurana-db v1)
Stores mirror Supabase tables: `exercises`, `routines`, `routine_exercises`, `sessions`, `entries`, `sets`

---

## File Structure
```
src/
├── app/
│   ├── layout.tsx              # Root layout + metadata
│   ├── page.tsx                # Renders <App />
│   ├── globals.css             # Dark theme design tokens
│   ├── manifest.ts             # PWA manifest
│   ├── icon.tsx / apple-icon.tsx
│   ├── sw.js/route.ts          # Service worker
│   └── api/auth/               # OAuth routes (google, callback, session, signout)
├── components/
│   ├── app.tsx                 # Auth shell → DataProvider → WorkoutProvider → TabLayout
│   ├── tab-bar.tsx             # Bottom navigation (3 tabs)
│   ├── ui/                     # Shared primitives (sheet, button, input, empty-state)
│   ├── tabs/                   # Tab screens (home-tab, workout-tab, profile-tab)
│   ├── workout/                # Workout features (active-workout, exercise-card, exercise-picker, create-exercise, create-routine, routine-detail, workout-timer)
│   ├── home/                   # Home features (workout-card, workout-detail)
│   └── profile/                # Profile features (training-calendar)
├── lib/
│   ├── auth.ts                 # Server: JWT, OAuth, session management
│   ├── auth-client.ts          # Client: useAuth() hook
│   ├── supabase.ts             # Supabase client factory
│   ├── db.ts                   # IndexedDB setup (idb)
│   ├── data.ts                 # CRUD data access layer (offline-first)
│   ├── sync.ts                 # Supabase ↔ IndexedDB sync
│   ├── data-context.tsx        # DataProvider + useData() hook
│   └── workout-context.tsx     # WorkoutProvider + useWorkout() hook
└── types/
    └── models.ts               # All domain types and interfaces
```

---

## Service Worker (src/app/sw.js/route.ts)
- Served at `/sw.js` with no-cache headers (next.config.ts)
- Versioned by build timestamp → forces cache bust on deploy
- Network-first for navigation; stale-while-revalidate for `/_next/static/`, fonts, images
- `SKIP_WAITING` message handler for immediate activation

---

## Conventions
- UI language: **español** (labels, placeholders, messages)
- Prefer `var(--token)` over hardcoded colors
- Use `clsx()` for conditional classNames
- All new components: `"use client"` (client-side SPA)
- Bottom sheets for create/edit flows (framer-motion slide-up)
- Exercise type determines which columns render in set tables (polymorphic nullable columns)

---
