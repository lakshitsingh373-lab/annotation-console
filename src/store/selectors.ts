import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "./store";
import { tasksAdapterSelectors } from "./tasksSlice";

const selectAllTasks = tasksAdapterSelectors.selectAll;
const selectFilters = (state: RootState) => state.filters;

export const selectFilteredSortedTasks = createSelector(
  [selectAllTasks, selectFilters],
  (tasks, filters) => {
    let result = tasks;

    if (filters.type !== "all") {
      result = result.filter((t) => t.type === filters.type);
    }
    if (filters.status !== "all") {
      result = result.filter((t) => t.status === filters.status);
    }
    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          (t.assignee?.name.toLowerCase().includes(q) ?? false)
      );
    }

    const dir = filters.sortDir === "asc" ? 1 : -1;
    result = [...result].sort((a, b) => (a[filters.sortKey] - b[filters.sortKey]) * dir);

    return result;
  }
);

export const selectTaskById = (id: string | null) => (state: RootState) =>
  id ? tasksAdapterSelectors.selectById(state, id) : undefined;

export const selectTasksMeta = createSelector(
  [
    (state: RootState) => state.tasks.status,
    (state: RootState) => state.tasks.error,
    (state: RootState) => state.tasks.page,
    (state: RootState) => state.tasks.pageSize,
    (state: RootState) => state.tasks.total,
    (state: RootState) => state.tasks.isFromCache,
    tasksAdapterSelectors.selectTotal,
  ],
  (status, error, page, pageSize, total, isFromCache, loadedCount) => ({
    status,
    error,
    page,
    pageSize,
    total,
    isFromCache,
    loadedCount,
  })
);

export const selectStatusCounts = createSelector([selectAllTasks], (tasks) => {
  const counts: Record<string, number> = {};
  for (const t of tasks) {
    counts[t.status] = (counts[t.status] ?? 0) + 1;
  }
  return counts;
});
