# DECISIONS.md

## Stack note

I initially prototyped this in plain React + JS to move fast, then rebuilt
on the required stack (Next.js App Router, TypeScript strict, Redux
Toolkit, Tailwind) once I confirmed that was the actual expectation. The
version in this repo is the Next.js/TS one.

## Key decisions and tradeoffs

**Thunks over RTK Query.** RTK Query is a great fit for typical
REST-CRUD-plus-cache scenarios, but this app's data doesn't fit its model
cleanly: the "cache" here is IndexedDB-backed and cross-session, the
realtime layer mutates entities outside of any query lifecycle, and
pagination needs to *merge* into one growing entity collection rather than
cache per-page. `createAsyncThunk` + `createEntityAdapter` gave me direct
control over how fetched pages, WebSocket events, and IndexedDB hydration
all funnel into the same normalized store, without fighting RTK Query's
cache invalidation model. Trade-off: I hand-rolled loading/error state
that RTK Query would have given me for free.

**Normalization approach.** `normalize.ts` never throws and never drops a
record. Every messy field has an explicit, documented fallback:
- Unknown `status` values map to an explicit `"unknown"` status (not
  guessed into an existing bucket) so the UI can visibly flag them instead
  of quietly mis-categorizing a task.
- Unknown `type` values (e.g. `"video"`) become a `type: "unknown"`
  variant of the discriminated union that preserves the original string as
  `rawType`, so nothing is silently lost.
- Timestamps and counts that can't be parsed fall back to `0`, and the
  task is flagged via `hadNormalizationIssues: true` so the UI can surface
  "this record looked malformed" (small amber flag in the detail panel,
  italic row in the table) rather than pretending the data was clean.

**Typing the messy data.** Two separate type modules: `raw.ts` (the
untrustworthy wire shape — everything stringly-typed where the server is
inconsistent) and `task.ts` (the clean discriminated union on `type`,
consumed by everything else). `normalize.ts` is the only file allowed to
see both. No `any` anywhere in the app code — genuinely unknown shapes
(e.g. `raw.meta`) are typed `Record<string, unknown>` and narrowed at the
point of use.

**Realtime merge strategy.** WebSocket events dispatch directly into the
`tasks` slice via three small reducers (`taskUpdatedFromFeed`,
`taskAssignedFromFeed`, `annotationCreatedFromFeed`). If an event
references a task id not yet in the store, `useTaskFeed` queues the
event's patch, fires `hydrateMissingTask(id)` (a `GET
/api/tasks/:id`), and applies the queued patch(es) once that resolves —
so out-of-order arrival (event before the task is loaded) never loses
data, and a burst of events for the same missing id doesn't trigger
duplicate fetches. Reconnects use exponential backoff (500ms → 10s cap).

## Streamed markdown: exactly where sanitization happens

The summary endpoint is treated as fully untrusted. Rendering pipeline in
`SafeMarkdown.tsx`:
1. `remark-gfm` parses GFM markdown (tables, fenced code, etc).
2. `rehype-raw` turns literal HTML embedded in the markdown source (the
   `<img onerror=...>` and `<script>` payloads) into real HAST nodes. This
   step is necessary for the next step to actually inspect that content —
   without it, react-markdown just renders raw HTML as inert text, which
   is safe but means rehype-sanitize never sees it.
3. `rehype-sanitize` (default schema) strips disallowed tags and
   attributes — `<script>` is removed entirely, and event-handler
   attributes like `onerror`/`onclick` are stripped from any tag that
   survives. **This is the actual security boundary.**

I verified this by watching the summary render for `t1`: the `##
Summary`, bold/italic text, list, and fenced ```ts code block all render
normally; the `<img src=x onerror=...>` and `<script>alert(...)</script>`
chunks produce no image and no alert — they're stripped before reaching
the DOM.

## IndexedDB caching approach

`lib/db/taskCache.ts` wraps `localforage`. On mount, `ConsoleApp` reads
the cached task list (if any) and dispatches it immediately via
`hydratedFromCache`, setting `isFromCache: true` — the UI shows a "showing
cached data, revalidating…" banner. It then always fires a real
`loadTasksPage(1)` fetch regardless of whether the cache hit, and that
fetch's success clears `isFromCache`. The cache itself is refreshed
(fire-and-forget, not awaited) any time the task list changes after a
successful fetch. This is deliberately simple: cache is "last known good
list," not per-page, and staleness is surfaced honestly rather than
silently served as if it were fresh.

## What I handled vs. deliberately didn't

Handled: inconsistent status casing/spelling, unknown task types,
mixed epoch/ISO timestamps, string-typed counts, null assignees,
malformed assignee shapes, WebSocket events for not-yet-loaded tasks,
reconnect/backoff, stream cancellation on task switch, stream errors,
loading/error/empty states, XSS in the streamed summary.

Deliberately skipped (see "with more time" below): virtualization
(dataset is only 137 rows — not needed yet), optimistic "assign to me"
(bonus), redux-persist for filters (bonus), a derived chart (bonus),
caching streamed summaries in IndexedDB (bonus).

## What I'd do differently / next with more time

- Add a proper toast/log for realtime events that couldn't be hydrated
  (currently they're dropped quietly after `hydrateMissingTask` rejects,
  e.g. server 404s a task id beyond the seeded range).
- Debounce the IndexedDB cache write instead of writing on every
  successful page load.
- Add the bonus items in rough priority order: optimistic assign-to-me
  with rollback, then the tasks-per-status chart, then summary caching.
- Add an integration test for `useTaskFeed`'s missing-task hydration path
  (currently covered by reasoning/code review, not a test, due to time).

## AI use and verification

I used AI assistance to scaffold boilerplate (Next.js/Tailwind/Jest
config, the initial component shells) and to draft the normalizer edge
cases from the messy-data spec. I verified all of it by: running
`tsc --noEmit` (strict mode, zero errors), running the full Jest suite
(19 tests, normalizer/selector/RTL interaction), running `next build` in
production mode, running `eslint` (including the newer React Compiler
purity rules) and fixing the real violations it caught — a ref-during-
render pattern in the Redux store provider, a `Date.now()` call during
render in the ticker's list item, and a synchronous `setState` in an
effect — rather than suppressing them by default. I read every generated
line before keeping it; nothing here is unreviewed output.

## Part 2: Bug hunt — `buggy/TaskTicker.tsx`

Original preserved unmodified at `buggy/TaskTicker.original.tsx`; fixed
version at `buggy/TaskTicker.tsx`. Bugs found:

**Bug A — stale closure in the clock interval.** `setInterval` reads
`tick` from the render that scheduled the effect (`tick === 0`, since the
effect has an empty dependency array), so every tick computed `0 + 1` and
the displayed "x seconds ago" values never advanced. Fixed with a
functional update; also replaced the plain counter with a `now` timestamp
kept in state, since that's what's actually needed and avoids a separate
purity issue (see Bug E).

**Bug B1 — fetch fires with `selectedId === null` on mount.** The fetch
effect has no guard, so on first render it requests
`${apiBase}/api/tasks/null`, which 404s, and the error body still gets
pushed into `tasks`. Fixed by returning early when `selectedId` is falsy.

**Bug B2 — direct state mutation.** `prev.push(t); return prev;` mutates
the existing array in place and returns the *same reference* Redux/React
compares by identity, so React can legitimately skip re-rendering
altogether, and any consumer relying on immutability breaks silently.
Fixed by building a new array (`[...withoutExisting, t]`).

**Bug B3 — duplicate entries on re-selecting the same task.** The
original always appended, so clicking the same row twice added two
identical rows (compounding indefinitely on repeated clicks). Fixed by
filtering out any existing entry with the same `id` before appending
(upsert-by-id).

**Bug B4 — race condition on rapid re-selection.** Nothing prevented an
older, slower response from overwriting a newer selection's data if
requests resolved out of order. Fixed with a `cancelled` flag (and an
`AbortController`) set in the effect's cleanup, so a stale response is
ignored.

**Bug B5 — unhandled promise rejection.** The fetch chain had no
`.catch`; any network failure became an unhandled rejection instead of a
recoverable error. Fixed by adding a `.catch` that logs (ignoring the
expected `AbortError` from cancellation).

**Bug C — mutating sort.** `tasks.sort(...)` sorts the array in place
(`Array.prototype.sort` mutates and returns the same reference), which is
the same "mutating state outside setState" problem as Bug B2, just
triggered on every render instead of only on fetch. Fixed by sorting a
shallow copy: `[...tasks].sort(...)`.

**Bug D — using array index as React key.** `key={i}` on a list that
reorders every time `now` ticks or a new task is upserted means React can
match the wrong DOM node (and its `onClick` closure) to the wrong task
after a reorder. Fixed by using the task's own stable `id` as the key.

**Bug E (extra, caught by lint) — impure render.** Calling `Date.now()`
directly inside the `.map()` in the render body makes the component
impure: a re-render triggered for an unrelated reason (e.g. React 18
Strict Mode's double-invoke, or a parent re-render) can silently change
the displayed "x seconds ago" value without any state change causing it.
Fixed by moving the `Date.now()` call into the interval callback only,
storing the result in `now` state, and having render just read `now`.
