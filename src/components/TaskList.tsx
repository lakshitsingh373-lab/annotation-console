"use client";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectFilteredSortedTasks, selectTasksMeta } from "../store/selectors";
import { setSort, selectTask } from "../store/filtersSlice";
import { loadTasksPage } from "../store/tasksSlice";
import StatusBadge from "./StatusBadge";
import type { SortKey } from "../store/filtersSlice";

export default function TaskList() {
  const dispatch = useAppDispatch();
  const tasks = useAppSelector(selectFilteredSortedTasks);
  const meta = useAppSelector(selectTasksMeta);
  const { sortKey, sortDir, selectedTaskId } = useAppSelector((s) => s.filters);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      dispatch(setSort({ key, dir: sortDir === "asc" ? "desc" : "asc" }));
    } else {
      dispatch(setSort({ key, dir: "desc" }));
    }
  }

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.pageSize || 1));

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
      {meta.isFromCache && (
        <div className="bg-amber-500/10 text-amber-300 text-xs px-3 py-1.5 border-b border-amber-500/20">
          Showing cached data — revalidating from server…
        </div>
      )}

      {meta.status === "failed" && (
        <div className="bg-red-500/10 text-red-300 text-sm px-3 py-2 border-b border-red-500/20">
          Failed to load tasks: {meta.error}
          <button
            className="ml-3 underline decoration-red-400"
            onClick={() => dispatch(loadTasksPage(meta.page || 1))}
          >
            Retry
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-left text-slate-400">
            <tr>
              <th className="px-3 py-2 font-medium">Title</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Assignee</th>
              <th
                className="px-3 py-2 font-medium cursor-pointer select-none hover:text-slate-200"
                onClick={() => toggleSort("annotationCount")}
              >
                Annotations {sortKey === "annotationCount" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="px-3 py-2 font-medium cursor-pointer select-none hover:text-slate-200"
                onClick={() => toggleSort("updatedAt")}
              >
                Updated {sortKey === "updatedAt" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
            </tr>
          </thead>
          <tbody>
            {meta.status === "loading" && meta.loadedCount === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                  Loading tasks…
                </td>
              </tr>
            )}
            {meta.status !== "loading" && tasks.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                  No tasks match the current filters.
                </td>
              </tr>
            )}
            {tasks.map((t) => (
              <tr
                key={t.id}
                onClick={() => dispatch(selectTask(t.id))}
                className={`border-b border-slate-900 cursor-pointer hover:bg-slate-900/70 transition-colors ${
                  selectedTaskId === t.id
                    ? "bg-indigo-500/10 border-l-2 border-l-indigo-400"
                    : "border-l-2 border-l-transparent"
                } ${t.hadNormalizationIssues ? "italic text-slate-400" : "text-slate-200"}`}
                title={t.hadNormalizationIssues ? "This record had messy/unparseable fields" : undefined}
              >
                <td className="px-3 py-2">{t.title}</td>
                <td className="px-3 py-2 text-slate-400">
                  {t.type === "unknown" ? `unknown (${t.rawType})` : t.type}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={t.status} />
                </td>
                <td className="px-3 py-2 text-slate-400">{t.assignee ? t.assignee.name : "—"}</td>
                <td className="px-3 py-2 text-slate-400">{t.annotationCount}</td>
                <td className="px-3 py-2 text-slate-500">{new Date(t.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-3 py-2 border-t border-slate-800 bg-slate-900/40 text-sm">
        <span className="text-slate-500">
          Page {meta.page || 1} of {totalPages} · {meta.loadedCount} of {meta.total} loaded
        </span>
        <div className="flex gap-2">
          <button
            disabled={meta.page <= 1 || meta.status === "loading"}
            onClick={() => dispatch(loadTasksPage((meta.page || 1) - 1))}
            className="px-2 py-1 border border-slate-700 text-slate-300 rounded disabled:opacity-40 hover:bg-slate-800 transition-colors"
          >
            Prev
          </button>
          <button
            disabled={meta.page >= totalPages || meta.status === "loading"}
            onClick={() => dispatch(loadTasksPage((meta.page || 1) + 1))}
            className="px-2 py-1 border border-slate-700 text-slate-300 rounded disabled:opacity-40 hover:bg-slate-800 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
