// buggy/TaskTicker.tsx (fixed)
import React, { useEffect, useState } from "react";

type Task = { id: string; title: string; updatedAt: number };

export function TaskTicker({ apiBase }: { apiBase: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Bug A fix (continued): rather than an incrementing counter that's only
  // ever used to force a re-render, keep the actual timestamp used for the
  // "x seconds ago" math in state. This also resolves a purity issue in
  // the original: calling `Date.now()` directly in the render body (inside
  // .map) makes the component impure (re-rendering for unrelated reasons
  // silently changes displayed values). Now `Date.now()` is only ever
  // called inside the interval callback, and render just reads `now`.
  const [now, setNow] = useState(() => Date.now());

  // (A) keep a running clock for "x seconds ago"
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // (B) refetch whenever selection changes
  useEffect(() => {
    // Bug B1 fix: guard against selectedId being null. The original fetched
    // `${apiBase}/api/tasks/null` on mount (before any real selection),
    // hitting a 404 and still trying to push the error body into state.
    if (!selectedId) return;

    let cancelled = false;
    const controller = new AbortController();

    fetch(`${apiBase}/api/tasks/${selectedId}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((t: Task) => {
        // Bug B4 fix (race condition): if the user re-selects another task
        // before this response lands, ignore the stale response instead of
        // overwriting newer state with older data.
        if (cancelled) return;
        setTasks((prev) => {
          // Bug B2 fix: don't mutate state in place (`prev.push` mutates
          // the existing array and returns its length, not a new array --
          // React can miss the update or, worse, treat it as the same
          // reference and skip re-rendering entirely).
          // Bug B3 fix: upsert by id instead of always appending. The
          // original pushed a new entry every time the *same* task was
          // clicked again, producing duplicate rows that grew unbounded.
          const withoutExisting = prev.filter((task) => task.id !== t.id);
          return [...withoutExisting, t];
        });
      })
      .catch((err) => {
        // Bug B5 fix: the original had no .catch, so a failed fetch (or an
        // aborted one) became an unhandled promise rejection.
        if (err.name !== "AbortError") {
          console.error("Failed to load task", selectedId, err);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [apiBase, selectedId]);

  // (C) newest first
  // Bug C fix: Array.prototype.sort mutates in place. Sorting `tasks`
  // directly mutates state outside of a setState call, which can cause
  // components to miss re-renders (same array reference) and generally
  // violates React's immutability expectations. Sort a shallow copy.
  const sorted = [...tasks].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <ul>
      {sorted.map((t) => (
        // Bug D fix: key={i} (array index) breaks identity tracking once
        // the list re-sorts -- React can match the wrong DOM node to the
        // wrong task, causing stale click handlers / mismatched content.
        // The task's own stable id is the correct key.
        <li key={t.id} onClick={() => setSelectedId(t.id)}>
          {t.title} (updated {Math.floor((now - t.updatedAt) / 1000)}s ago)
        </li>
      ))}
    </ul>
  );
}
