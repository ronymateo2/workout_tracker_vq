@AGENTS.md

# Rurana — Workout Tracker PWA

## Project Overview
Single-user PWA para registro de entrenamientos. Mobile-first (iPhone), offline-first, UI en español.
Stack: Next.js 16 App Router + TypeScript + Tailwind CSS 4 + Supabase + IndexedDB (idb).
Auth: Google OAuth via Supabase.

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

---

## Directory Structure
```
src/
├── app/
│   ├── layout.tsx           # Root layout, metadata, manifest, icons
│   ├── page.tsx             # Renders <WorkoutTrackerApp />
│   ├── globals.css          # iOS design tokens, ios-card/ios-list/ios-input utilities
│   ├── manifest.ts          # PWA manifest (icons, standalone, es-CO)
│   ├── icon.tsx             # App icon
│   ├── apple-icon.tsx       # Apple touch icon
│   └── sw.js/route.ts       # Service worker served dynamically (versioned)
├── components/
│   └── workout-tracker-app.tsx     # Main client component, tab routing, header
├── features/                       # Feature-based slices (UI only, no data logic)
│   ├── today/
│   │   └── TodayView.tsx           # Session list for selected date
│   ├── calendar/
│   │   ├── CalendarView.tsx        # Month calendar grid
│   │   └── calendar-utils.ts      # goToPreviousMonth, goToNextMonth, monthFromDateKey
│   ├── library/
│   │   └── LibraryView.tsx         # Searchable exercise library list
│   └── exercise-editor/
│       ├── ExerciseEditorSheet.tsx # Bottom sheet: create/edit exercise + suggestion panel
│       └── draft-utils.ts          # ExerciseDraft type, createExerciseDraft, buildEntryFromDraft
├── shared/
│   ├── components/
│   │   ├── NavBar.tsx              # iOS-style bottom tab bar
│   │   └── StatusPill.tsx         # Online/offline/pending badge
│   └── lib/
│       ├── formatters.ts           # formatCompactDate, formatShortDate, describeEntry
│       └── use-service-worker-updater.ts  # SW update detection hook
└── lib/                            # Domain types and data layer (no UI)
    ├── workout-types.ts     # All domain types and interfaces
    ├── use-workout-tracker.ts  # Main data hook (auth, sync, CRUD)
    ├── supabase.ts          # Supabase client
    └── local-db.ts          # IndexedDB (stores: sessions, library, queue)
supabase/
└── migrations/202603250001_init_workout_tracker.sql
```

---

## Domain Types (src/lib/workout-types.ts)
```ts
ExerciseMode = "reps" | "isometric"
LoadMode     = "bodyweight" | "weight" | "band" | "mixed"
SyncState    = "synced" | "pending" | "error"

WorkoutSession  → id, userId, date, notes, entries[], syncState, timestamps
WorkoutEntry    → exerciseName, exerciseMode, loadMode, unilateral, sets[], defaults, canonicalExerciseId?
WorkoutSet      → reps?, durationSeconds?, weightKg?, bandColor?, bandResistance?
ExerciseLibraryItem → canonicalName, aliases[], lastUsedAt, normalized
SyncQueueItem   → kind: "upsert-session" | "delete-session"
```

---

## Database Schema (Supabase Postgres)
- `profiles` — userId, email, full_name, avatar_url
- `exercise_library` — user_id, canonical_name, aliases[], last_used_at
- `workout_sessions` — user_id, session_date, notes; unique per user+date
- `workout_entries` — session_id, user_id, exercise_name, canonical_exercise_id?, position, exercise_mode, load_mode, unilateral, defaults JSON
- `workout_sets` — entry_id, user_id, position, reps?, duration_seconds?, weight_kg?, band_color?, band_resistance?

All tables: RLS enabled (users own their rows), cascading deletes, auto `updated_at` trigger.

---

## Auth Flow
Google OAuth via Supabase (`supabase.auth.signInWithOAuth({ provider: 'google' })`).
On signin: upsert profile with full_name and avatar_url from user metadata.
`useWorkoutTracker` manages auth state; app shows login screen when not authenticated.

---

## Offline-First & Sync
- IndexedDB (3 stores): `sessions`, `library`, `queue`
- On write: save locally first, add to queue if offline; sync when online
- Conflict resolution: last-write-wins (single user)
- `SyncQueueItem.kind`: `upsert-session` | `delete-session`
- Manual sync button in header; pending count badge

---

## Service Worker (src/app/sw.js/route.ts)
- Served at `/sw.js` with no-cache headers (next.config.ts)
- Versioned by build timestamp → forces cache bust on deploy
- Network-first for navigation; stale-while-revalidate for `/_next/static/`, fonts, images
- `SKIP_WAITING` message handler for immediate activation
- `useServiceWorkerUpdater` hook detects new worker and shows refresh prompt

---

## Exercise Suggestion Logic
- Triggered after filling exercise name, before final save
- Jaccard similarity on normalized names (NFD, diacritics removed, lowercase, alphanumeric only)
- Shows 1–3 matches in bottom sheet; user can accept (links to canonical) or ignore (creates new library entry)

---

## UI Conventions
- **Language**: Spanish (`lang="es"`, `es-CO` locale)
- **Units**: kg, seconds
- **Navigation**: 3 bottom tabs — Hoy, Calendario, Librería
- **Design**: Apple iOS HIG — `#f2f2f7` grouped background, `#007aff` accent, SF Pro font, iOS system color tokens
- **CSS utilities**: `ios-card` (white card), `ios-list` / `ios-list-item` (grouped list), `ios-input` (text input), `ios-surface` (blur header/sheet)
- **Theme color**: `#f2f2f7`
- **Animations**: Framer Motion spring transitions; bottom sheet enters from bottom
- **Icons**: Lucide React
- **Spacing**: 4-point grid; touch targets min 44px

---

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```
Both are public/client-side. See `.env.example`.

---

## Key Conventions
- Path alias `@/*` → `src/*`
- No multiuser in v1; user_id is on all tables for future extensibility
- No pre-built exercise catalog; library grows from usage
- No templates, routines, PRs, streaks, or analytics in v1
- `buildEntryFromDraft` validates and normalizes before save
- Numeric parsing supports comma and dot as decimal separator
