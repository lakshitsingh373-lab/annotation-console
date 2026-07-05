"use client";

import { useAppSelector } from "../store/hooks";
import { tasksAdapterSelectors } from "../store/tasksSlice";
import { useSummaryStream } from "../hooks/useSummaryStream";
import SafeMarkdown from "./SafeMarkdown";
import StatusBadge from "./StatusBadge";

export default function TaskDetail() {
  const selectedTaskId = useAppSelector((s) => s.filters.selectedTaskId);
  const task = useAppSelector((state) =>
    selectedTaskId ? tasksAdapterSelectors.selectById(state, selectedTaskId) : undefined
  );

  const summary = useSummaryStream(task ? task.id : null);

  if (!task) {
    return (
      <div className="w-96 shrink-0 border-l border-slate-800 bg-slate-900/40 p-4 text-slate-500 text-sm">
        Select a task to see details and its AI summary.
      </div>
    );
  }

  return (
    <div className="w-96 shrink-0 border-l border-slate-800 bg-slate-900/40 p-4 overflow-y-auto">
      <h2 className="font-semibold text-lg text-slate-100">{task.title}</h2>
      <div className="mt-2 flex items-center gap-2">
        <StatusBadge status={task.status} />
        <span className="text-xs text-slate-500">
          {task.type === "unknown" ? `unknown type (${task.rawType})` : task.type}
        </span>
      </div>
      <dl className="mt-3 text-sm space-y-1 text-slate-200">
        <div className="flex justify-between">
          <dt className="text-slate-500">Assignee</dt>
          <dd>{task.assignee ? task.assignee.name : "Unassigned"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Annotations</dt>
          <dd>{task.annotationCount}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Updated</dt>
          <dd>{new Date(task.updatedAt).toLocaleString()}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Id</dt>
          <dd className="font-mono text-xs text-slate-400">{task.id}</dd>
        </div>
      </dl>

      {task.hadNormalizationIssues && (
        <div className="mt-3 text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded px-2 py-1.5">
          One or more fields on this task couldn&apos;t be confidently parsed
          and a fallback was substituted.
        </div>
      )}

      <div className="mt-4">
        <h3 className="text-sm font-semibold text-indigo-400 mb-1 tracking-wide uppercase text-xs">
          AI Summary
        </h3>
        {summary.status === "error" && (
          <p className="text-sm text-red-400">{summary.error}</p>
        )}
        <SafeMarkdown content={summary.text} />
        {summary.status === "streaming" && (
          <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse ml-0.5" />
        )}
      </div>
    </div>
  );
}
