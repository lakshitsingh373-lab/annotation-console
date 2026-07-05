import {
  createAsyncThunk,
  createEntityAdapter,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type { RootState } from "./store";
import type { Task } from "../lib/model/task";
import { normalizeAssignee, normalizeStatus, normalizeTask } from "../lib/model/normalize";
import { fetchTaskById, fetchTasksPage } from "../lib/api/tasksApi";

const adapter = createEntityAdapter<Task>();

interface TasksExtraState {
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  page: number;
  pageSize: number;
  total: number;
  /** True until the first successful network fetch completes. */
  isFromCache: boolean;
  lastFetchedAt: number | null;
  /** ids we've asked the server for (via a realtime event) but haven't heard back on yet */
  pendingFetchIds: string[];
}

const initialExtraState: TasksExtraState = {
  status: "idle",
  error: null,
  page: 0,
  pageSize: 20,
  total: 0,
  isFromCache: false,
  lastFetchedAt: null,
  pendingFetchIds: [],
};

export const loadTasksPage = createAsyncThunk(
  "tasks/loadPage",
  async (page: number) => {
    const res = await fetchTasksPage(page, 20);
    return { ...res, tasks: res.items.map(normalizeTask) };
  }
);

/**
 * Used when a realtime event references a task id we haven't loaded yet
 * (e.g. it's beyond the current page). Fetches it directly by id and
 * upserts it so the event isn't silently dropped.
 */
export const hydrateMissingTask = createAsyncThunk(
  "tasks/hydrateMissing",
  async (id: string) => {
    const raw = await fetchTaskById(id);
    return normalizeTask(raw);
  }
);

const tasksSlice = createSlice({
  name: "tasks",
  initialState: adapter.getInitialState(initialExtraState),
  reducers: {
    /** Hydrate from IndexedDB cache on startup, before the network responds. */
    hydratedFromCache(state, action: PayloadAction<Task[]>) {
      adapter.setAll(state, action.payload);
      state.isFromCache = true;
    },
    taskUpdatedFromFeed(
      state,
      action: PayloadAction<{ id: string; status: string; updatedAt: number }>
    ) {
      const existing = state.entities[action.payload.id];
      if (!existing) return; // caller is responsible for triggering hydrateMissingTask
      adapter.updateOne(state, {
        id: action.payload.id,
        changes: {
          status: normalizeStatus(action.payload.status),
          updatedAt: action.payload.updatedAt,
        },
      });
    },
    taskAssignedFromFeed(
      state,
      action: PayloadAction<{ id: string; assignee: unknown }>
    ) {
      const existing = state.entities[action.payload.id];
      if (!existing) return;
      adapter.updateOne(state, {
        id: action.payload.id,
        changes: { assignee: normalizeAssignee(action.payload.assignee) },
      });
    },
    annotationCreatedFromFeed(
      state,
      action: PayloadAction<{ taskId: string }>
    ) {
      const existing = state.entities[action.payload.taskId];
      if (!existing) return;
      adapter.updateOne(state, {
        id: action.payload.taskId,
        changes: { annotationCount: existing.annotationCount + 1 },
      });
    },
    markPendingFetch(state, action: PayloadAction<string>) {
      if (!state.pendingFetchIds.includes(action.payload)) {
        state.pendingFetchIds.push(action.payload);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadTasksPage.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loadTasksPage.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.isFromCache = false;
        state.page = action.payload.page;
        state.pageSize = action.payload.pageSize;
        state.total = action.payload.total;
        state.lastFetchedAt = Date.now();
        adapter.upsertMany(state, action.payload.tasks);
      })
      .addCase(loadTasksPage.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Failed to load tasks";
      })
      .addCase(hydrateMissingTask.fulfilled, (state, action) => {
        adapter.upsertOne(state, action.payload);
        state.pendingFetchIds = state.pendingFetchIds.filter(
          (id) => id !== action.payload.id
        );
      })
      .addCase(hydrateMissingTask.rejected, (state, action) => {
        // Task may genuinely not exist server-side; drop the pending marker
        // rather than retrying forever, but don't crash the app.
        const id = action.meta.arg;
        state.pendingFetchIds = state.pendingFetchIds.filter((x) => x !== id);
      });
  },
});

export const {
  hydratedFromCache,
  taskUpdatedFromFeed,
  taskAssignedFromFeed,
  annotationCreatedFromFeed,
  markPendingFetch,
} = tasksSlice.actions;

export default tasksSlice.reducer;

export const tasksAdapterSelectors = adapter.getSelectors<RootState>(
  (state) => state.tasks
);
