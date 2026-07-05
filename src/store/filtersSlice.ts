import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { KnownTaskType } from "../lib/model/task";
import type { TaskStatus } from "../lib/model/task";

export type SortKey = "updatedAt" | "annotationCount";
export type SortDir = "asc" | "desc";

interface FiltersState {
  type: KnownTaskType | "unknown" | "all";
  status: TaskStatus | "all";
  search: string;
  sortKey: SortKey;
  sortDir: SortDir;
  selectedTaskId: string | null;
}

const initialState: FiltersState = {
  type: "all",
  status: "all",
  search: "",
  sortKey: "updatedAt",
  sortDir: "desc",
  selectedTaskId: null,
};

const filtersSlice = createSlice({
  name: "filters",
  initialState,
  reducers: {
    setTypeFilter(state, action: PayloadAction<FiltersState["type"]>) {
      state.type = action.payload;
    },
    setStatusFilter(state, action: PayloadAction<FiltersState["status"]>) {
      state.status = action.payload;
    },
    setSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
    },
    setSort(state, action: PayloadAction<{ key: SortKey; dir: SortDir }>) {
      state.sortKey = action.payload.key;
      state.sortDir = action.payload.dir;
    },
    selectTask(state, action: PayloadAction<string | null>) {
      state.selectedTaskId = action.payload;
    },
  },
});

export const {
  setTypeFilter,
  setStatusFilter,
  setSearch,
  setSort,
  selectTask,
} = filtersSlice.actions;

export default filtersSlice.reducer;
