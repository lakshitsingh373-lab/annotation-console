import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import tasksReducer, { hydratedFromCache } from "../store/tasksSlice";
import filtersReducer from "../store/filtersSlice";
import TaskFilters from "../components/TaskFilters";
import TaskList from "../components/TaskList";
import type { Task } from "../lib/model/task";

function buildTask(overrides: Partial<Task> & { id: string; title: string }): Task {
  return {
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

function renderWithStore() {
  const store = configureStore({
    reducer: { tasks: tasksReducer, filters: filtersReducer },
  });
  store.dispatch(
    hydratedFromCache([
      buildTask({ id: "t1", title: "Label the cat photos", type: "image", status: "todo" }),
      buildTask({ id: "t2", title: "Transcribe podcast", type: "audio", status: "done" }),
      buildTask({ id: "t3", title: "Review contract text", type: "text", status: "done" }),
    ])
  );

  return render(
    <Provider store={store}>
      <TaskFilters />
      <TaskList />
    </Provider>
  );
}

describe("Task filtering interaction", () => {
  it("shows all tasks initially, then narrows results when searching", async () => {
    renderWithStore();
    const user = userEvent.setup();

    expect(screen.getByText("Label the cat photos")).toBeInTheDocument();
    expect(screen.getByText("Transcribe podcast")).toBeInTheDocument();
    expect(screen.getByText("Review contract text")).toBeInTheDocument();

    const search = screen.getByPlaceholderText(/search title/i);
    await user.type(search, "podcast");

    expect(screen.queryByText("Label the cat photos")).not.toBeInTheDocument();
    expect(screen.getByText("Transcribe podcast")).toBeInTheDocument();
    expect(screen.queryByText("Review contract text")).not.toBeInTheDocument();
  });

  it("filters rows by type dropdown", async () => {
    renderWithStore();
    const user = userEvent.setup();

    const typeSelect = screen.getByDisplayValue("All types");
    await user.selectOptions(typeSelect, "image");

    expect(screen.getByText("Label the cat photos")).toBeInTheDocument();
    expect(screen.queryByText("Transcribe podcast")).not.toBeInTheDocument();
    expect(screen.queryByText("Review contract text")).not.toBeInTheDocument();
  });
});
