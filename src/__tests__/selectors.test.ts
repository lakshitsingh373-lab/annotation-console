import { configureStore } from "@reduxjs/toolkit";
import tasksReducer, { hydratedFromCache } from "../store/tasksSlice";
import filtersReducer, { setStatusFilter, setTypeFilter, setSearch } from "../store/filtersSlice";
import { selectFilteredSortedTasks } from "../store/selectors";
import type { Task } from "../lib/model/task";

function buildTask(overrides: Partial<Task> & { id: string }): Task {
  return {
    title: `Task ${overrides.id}`,
    type: "text",
    status: "todo",
    assignee: null,
    annotationCount: 0,
    updatedAt: 0,
    meta: {},
    hadNormalizationIssues: false,
    ...overrides,
  } as Task;
}

function makeTestStore() {
  return configureStore({
    reducer: { tasks: tasksReducer, filters: filtersReducer },
  });
}

describe("selectFilteredSortedTasks", () => {
  const tasks: Task[] = [
    buildTask({ id: "t1", title: "Alpha", type: "image", status: "todo", updatedAt: 100 }),
    buildTask({ id: "t2", title: "Bravo", type: "audio", status: "done", updatedAt: 300 }),
    buildTask({ id: "t3", title: "Charlie", type: "text", status: "done", updatedAt: 200 }),
  ];

  it("returns all tasks sorted by updatedAt desc by default", () => {
    const store = makeTestStore();
    store.dispatch(hydratedFromCache(tasks));

    const result = selectFilteredSortedTasks(store.getState());
    expect(result.map((t) => t.id)).toEqual(["t2", "t3", "t1"]);
  });

  it("filters by status", () => {
    const store = makeTestStore();
    store.dispatch(hydratedFromCache(tasks));
    store.dispatch(setStatusFilter("done"));

    const result = selectFilteredSortedTasks(store.getState());
    expect(result.map((t) => t.id).sort()).toEqual(["t2", "t3"]);
  });

  it("filters by type", () => {
    const store = makeTestStore();
    store.dispatch(hydratedFromCache(tasks));
    store.dispatch(setTypeFilter("image"));

    const result = selectFilteredSortedTasks(store.getState());
    expect(result.map((t) => t.id)).toEqual(["t1"]);
  });

  it("filters by search across title", () => {
    const store = makeTestStore();
    store.dispatch(hydratedFromCache(tasks));
    store.dispatch(setSearch("brav"));

    const result = selectFilteredSortedTasks(store.getState());
    expect(result.map((t) => t.id)).toEqual(["t2"]);
  });
});
