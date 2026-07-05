import localforage from "localforage";
import type { Task } from "../model/task";

const store = localforage.createInstance({
  name: "annotation-console",
  storeName: "task_cache",
});

const KEY_TASKS = "tasks:list";
const KEY_CACHED_AT = "tasks:cachedAt";

/**
 * Writes the current task list to IndexedDB. localforage's IndexedDB driver
 * is async and doesn't block the main thread; we additionally fire-and-forget
 * this so callers never await a slow write on the UI thread.
 */
export function cacheTaskList(tasks: Task[]): void {
  void store.setItem(KEY_TASKS, tasks);
  void store.setItem(KEY_CACHED_AT, Date.now());
}

export async function readCachedTaskList(): Promise<{
  tasks: Task[];
  cachedAt: number | null;
} | null> {
  try {
    const tasks = await store.getItem<Task[]>(KEY_TASKS);
    if (!tasks || tasks.length === 0) return null;
    const cachedAt = await store.getItem<number>(KEY_CACHED_AT);
    return { tasks, cachedAt };
  } catch {
    // IndexedDB unavailable (private browsing, etc.) -- degrade gracefully.
    return null;
  }
}
