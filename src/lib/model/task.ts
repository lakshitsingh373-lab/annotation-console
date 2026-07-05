/**
 * Clean internal domain model. This is what the rest of the app (state,
 * selectors, UI) is built against -- never the raw API shape.
 */

/**
 * Normalized status enum. Includes an explicit "unknown" bucket rather than
 * guessing/coercing garbage input into one of the "real" statuses -- see
 * DECISIONS.md for the reasoning (we never silently drop or misrepresent
 * data we can't confidently map).
 */
export type TaskStatus =
  | "todo"
  | "in_progress"
  | "qa"
  | "blocked"
  | "done"
  | "unknown";

export type Assignee = {
  id: string;
  name: string;
} | null;

interface TaskCommon {
  id: string;
  title: string;
  status: TaskStatus;
  assignee: Assignee;
  annotationCount: number;
  /** Always normalized to epoch milliseconds, regardless of wire format. */
  updatedAt: number;
  meta: Record<string, unknown>;
  /**
   * Set when a field on this task couldn't be confidently parsed and a
   * fallback was substituted (e.g. unparseable timestamp, non-numeric
   * count). Lets the UI surface "this record looked malformed" instead of
   * pretending everything was clean.
   */
  hadNormalizationIssues: boolean;
}

export interface ImageTask extends TaskCommon {
  type: "image";
}

export interface AudioTask extends TaskCommon {
  type: "audio";
}

export interface TextTask extends TaskCommon {
  type: "text";
}

/**
 * Any `type` value the backend sends that we don't recognize (e.g. "video")
 * lands here. We preserve the original string in `rawType` instead of
 * dropping it, so the UI/interviewer can see exactly what came over the
 * wire.
 */
export interface UnknownTypeTask extends TaskCommon {
  type: "unknown";
  rawType: string;
}

/** Discriminated union on `type`, as required by the spec. */
export type Task = ImageTask | AudioTask | TextTask | UnknownTypeTask;

export const KNOWN_TASK_TYPES = ["image", "audio", "text"] as const;
export type KnownTaskType = (typeof KNOWN_TASK_TYPES)[number];

export const TASK_STATUSES: TaskStatus[] = [
  "todo",
  "in_progress",
  "qa",
  "blocked",
  "done",
  "unknown",
];
