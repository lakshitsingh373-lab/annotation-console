# Annotation Activity Console

Internal console for viewing annotator task activity: status/list view,
live updates over WebSocket, and a streamed AI summary rendered safely as
markdown.

## Stack

Next.js (App Router) + React 18/19 + TypeScript (strict) + Redux Toolkit
+ Tailwind + Jest/RTL, per the take-home spec.

## Running it

### 1. Start the mock server

```bash
cd mock-server
npm install
npm run mock
```

Serves on `http://localhost:4000` (REST + `ws://localhost:4000/ws`).

### 2. Start the app (separate terminal, from the repo root)

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### 3. Run tests

```bash
npm test
```

19 tests: the normalizer (messy-data edge cases), a memoized selector
(filter/sort/search), and an RTL interaction test (filtering the task
list updates visible rows).

### 4. Production build

```bash
npm run build
```

## What's where

- `src/lib/model/` — `raw.ts` (untrusted wire types), `task.ts` (clean
  discriminated union), `normalize.ts` (the conversion, with no `any`).
- `src/store/` — Redux Toolkit: `tasksSlice.ts` (entity adapter + thunks +
  realtime reducers), `filtersSlice.ts`, `selectors.ts` (memoized derived
  views).
- `src/hooks/` — `useTaskFeed.ts` (WebSocket, reconnect, missing-task
  hydration), `useSummaryStream.ts` (SSE consumption for the AI summary).
- `src/components/` — UI: `TaskFilters`, `TaskList`, `TaskDetail`,
  `SafeMarkdown` (sanitized markdown rendering).
- `src/lib/db/taskCache.ts` — IndexedDB (via `localforage`) caching of the
  task list for instant reload + background revalidation.
- `buggy/` — `TaskTicker.original.tsx` (given, unmodified) and
  `TaskTicker.tsx` (fixed); see `DECISIONS.md` for the bug writeup.
- `DECISIONS.md` — the interview document: key decisions, sanitization
  details, caching approach, what was/wasn't handled, and the bug hunt.

## Notes

- `NEXT_PUBLIC_API_BASE` / `NEXT_PUBLIC_WS_URL` env vars override the
  mock server location if you're not running it on localhost:4000.
- The mock server's `server.js` is unmodified from the spec's appendix.
