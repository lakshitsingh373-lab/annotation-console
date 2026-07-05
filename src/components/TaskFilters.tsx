"use client";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setSearch, setStatusFilter, setTypeFilter } from "../store/filtersSlice";
import { TASK_STATUSES } from "../lib/model/task";

export default function TaskFilters() {
  const dispatch = useAppDispatch();
  const { type, status, search } = useAppSelector((s) => s.filters);

  return (
    <div className="flex flex-wrap gap-3 items-center p-3 border-b border-slate-800 bg-slate-900/40">
      <input
        type="text"
        placeholder="Search title, id, assignee…"
        value={search}
        onChange={(e) => dispatch(setSearch(e.target.value))}
        className="border border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 rounded px-2 py-1 text-sm w-64 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
      />
      <select
        value={type}
        onChange={(e) => dispatch(setTypeFilter(e.target.value as never))}
        className="border border-slate-700 bg-slate-900 text-slate-100 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <option value="all">All types</option>
        <option value="image">Image</option>
        <option value="audio">Audio</option>
        <option value="text">Text</option>
        <option value="unknown">Unknown</option>
      </select>
      <select
        value={status}
        onChange={(e) => dispatch(setStatusFilter(e.target.value as never))}
        className="border border-slate-700 bg-slate-900 text-slate-100 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <option value="all">All statuses</option>
        {TASK_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
