import { API_BASE } from "./config";
import type { RawTask, RawTasksResponse } from "../model/raw";

export async function fetchTasksPage(
  page: number,
  pageSize = 20,
  signal?: AbortSignal
): Promise<RawTasksResponse> {
  const res = await fetch(
    `${API_BASE}/api/tasks?page=${page}&pageSize=${pageSize}`,
    { signal }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch tasks page ${page}: ${res.status}`);
  }
  return res.json();
}

export async function fetchTaskById(
  id: string,
  signal?: AbortSignal
): Promise<RawTask> {
  const res = await fetch(`${API_BASE}/api/tasks/${id}`, { signal });
  if (!res.ok) {
    throw new Error(`Failed to fetch task ${id}: ${res.status}`);
  }
  return res.json();
}
