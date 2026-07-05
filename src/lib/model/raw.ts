/**
 * Types describing the *raw, messy* shape returned by the mock server.
 * Nothing here is trustworthy: casing/spelling of `status` is inconsistent,
 * `type` may be a value we don't recognize, `updatedAt` is either epoch-ms
 * or an ISO string, `annotationCount` is sometimes a numeric string, and
 * `assignee` may be null. These types exist purely to document what we
 * might receive on the wire before normalize.ts cleans it up.
 */

export interface RawAssignee {
  id: string;
  name: string;
}

export interface RawTask {
  id: string;
  title: string;
  /** Deliberately untyped as string: server sends "video" which we don't model. */
  type: string;
  /** Deliberately untyped as string: inconsistent casing/spelling on the wire. */
  status: string;
  assignee: RawAssignee | null;
  /** Sometimes a number, sometimes a numeric string. */
  annotationCount: number | string;
  /** Sometimes epoch-ms number, sometimes ISO 8601 string. */
  updatedAt: number | string;
  meta: Record<string, unknown>;
}

export interface RawTasksResponse {
  page: number;
  pageSize: number;
  total: number;
  items: RawTask[];
}

export interface RawTaskUpdatedEvent {
  kind: "task.updated";
  payload: {
    id: string;
    status: string;
    updatedAt: number;
  };
}

export interface RawTaskAssignedEvent {
  kind: "task.assigned";
  payload: {
    id: string;
    assignee: RawAssignee | null;
  };
}

export interface RawAnnotationCreatedEvent {
  kind: "annotation.created";
  payload: {
    taskId: string;
    by: string;
    at: number;
  };
}

export type RawServerEvent =
  | RawTaskUpdatedEvent
  | RawTaskAssignedEvent
  | RawAnnotationCreatedEvent;
