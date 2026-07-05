import type { RawAssignee, RawTask } from "./raw";
import type { Assignee, KnownTaskType, Task, TaskStatus } from "./task";
import { KNOWN_TASK_TYPES } from "./task";

/**
 * Maps every casing/spelling variant we've observed (or might reasonably
 * see) to a normalized status. Anything not in this table maps to
 * "unknown" rather than being guessed at -- see DECISIONS.md.
 */
const STATUS_MAP: Record<string, TaskStatus> = {
  todo: "todo",
  in_progress: "in_progress",
  inprogress: "in_progress",
  "in-progress": "in_progress",
  qa: "qa",
  blocked: "blocked",
  done: "done",
};

export function normalizeStatus(rawStatus: unknown): TaskStatus {
  if (typeof rawStatus !== "string") return "unknown";
  const key = rawStatus.trim().toLowerCase().replace(/\s+/g, "_");
  return STATUS_MAP[key] ?? "unknown";
}

export function normalizeType(
  rawType: unknown
): { type: KnownTaskType | "unknown"; rawType?: string } {
  if (typeof rawType === "string") {
    const lower = rawType.toLowerCase();
    if ((KNOWN_TASK_TYPES as readonly string[]).includes(lower)) {
      return { type: lower as KnownTaskType };
    }
    return { type: "unknown", rawType };
  }
  return { type: "unknown", rawType: String(rawType) };
}

/**
 * Normalizes a timestamp that may arrive as epoch-ms (number) or an ISO
 * 8601 string. Returns `{ value, ok }` so callers can flag records whose
 * timestamp couldn't be parsed, instead of silently coercing to something
 * misleading like `Date.now()` or `0` without a trace.
 */
export function normalizeTimestamp(raw: unknown): { value: number; ok: boolean } {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return { value: raw, ok: true };
  }
  if (typeof raw === "string") {
    const parsed = Date.parse(raw);
    if (!Number.isNaN(parsed)) return { value: parsed, ok: true };
  }
  // Fallback: 0 (epoch) is a deliberately obvious sentinel -- sorts to the
  // very bottom/top rather than silently pretending "now".
  return { value: 0, ok: false };
}

/**
 * Normalizes a count that may arrive as a number or a numeric string.
 */
export function normalizeCount(raw: unknown): { value: number; ok: boolean } {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return { value: raw, ok: true };
  }
  if (typeof raw === "string") {
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) return { value: parsed, ok: true };
  }
  return { value: 0, ok: false };
}

export function normalizeAssignee(raw: unknown): Assignee {
  if (raw === null || raw === undefined) return null;
  if (
    typeof raw === "object" &&
    raw !== null &&
    "id" in raw &&
    "name" in raw &&
    typeof (raw as RawAssignee).id === "string" &&
    typeof (raw as RawAssignee).name === "string"
  ) {
    return { id: (raw as RawAssignee).id, name: (raw as RawAssignee).name };
  }
  // Malformed assignee shape: treat as unassigned rather than crash/guess.
  return null;
}

/**
 * Converts one raw API task into our clean internal Task model.
 * Never throws -- garbage fields are mapped to documented fallbacks and
 * flagged via `hadNormalizationIssues`, never silently dropped.
 */
export function normalizeTask(raw: RawTask): Task {
  const { type, rawType } = normalizeType(raw?.type);
  const status = normalizeStatus(raw?.status);
  const assignee = normalizeAssignee(raw?.assignee);
  const { value: annotationCount, ok: countOk } = normalizeCount(
    raw?.annotationCount
  );
  const { value: updatedAt, ok: timeOk } = normalizeTimestamp(raw?.updatedAt);

  const hadNormalizationIssues =
    !countOk ||
    !timeOk ||
    status === "unknown" ||
    type === "unknown" ||
    typeof raw?.id !== "string" ||
    typeof raw?.title !== "string";

  const common = {
    id: typeof raw?.id === "string" ? raw.id : "unknown-id",
    title: typeof raw?.title === "string" ? raw.title : "(untitled task)",
    status,
    assignee,
    annotationCount,
    updatedAt,
    meta:
      raw?.meta && typeof raw.meta === "object" ? raw.meta : ({} as Record<string, unknown>),
    hadNormalizationIssues,
  };

  if (type === "unknown") {
    return { ...common, type: "unknown", rawType: rawType ?? "unknown" };
  }
  return { ...common, type };
}

export function normalizeTasks(raw: RawTask[]): Task[] {
  return raw.map(normalizeTask);
}
