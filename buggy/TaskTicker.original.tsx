// buggy/TaskTicker.tsx
import React, { useEffect, useState } from "react";

type Task = { id: string; title: string; updatedAt: number };

export function TaskTicker({ apiBase }: { apiBase: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // (A) keep a running clock for "x seconds ago"
  useEffect(() => {
    const id = setInterval(() => {
      setTick(tick + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // (B) refetch whenever selection changes
  useEffect(() => {
    fetch(`${apiBase}/api/tasks/${selectedId}`)
      .then((r) => r.json())
      .then((t) => {
        setTasks((prev) => {
          prev.push(t);          // add the freshly-loaded task
          return prev;
        });
      });
  }, [selectedId]);

  // (C) newest first
  const sorted = tasks.sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <ul>
      {sorted.map((t, i) => (
        <li key={i} onClick={() => setSelectedId(t.id)}>
          {t.title} (updated {Math.floor((Date.now() - t.updatedAt) / 1000)}s ago)
        </li>
      ))}
    </ul>
  );
}
