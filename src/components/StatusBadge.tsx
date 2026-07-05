import type { TaskStatus } from "../lib/model/task";

const COLORS: Record<TaskStatus, string> = {
  todo: "bg-slate-800 text-slate-300 ring-1 ring-slate-700",
  in_progress: "bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/30",
  qa: "bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/30",
  blocked: "bg-red-500/10 text-red-300 ring-1 ring-red-500/30",
  done: "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30",
  unknown: "bg-purple-500/10 text-purple-300 ring-1 ring-purple-500/30",
};

export default function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${COLORS[status]}`}>
      {status}
    </span>
  );
}
