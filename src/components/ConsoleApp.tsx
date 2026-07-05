"use client";

import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { hydratedFromCache, loadTasksPage } from "../store/tasksSlice";
import { tasksAdapterSelectors } from "../store/tasksSlice";
import { cacheTaskList, readCachedTaskList } from "../lib/db/taskCache";
import { useTaskFeed } from "../hooks/useTaskFeed";
import TaskFilters from "./TaskFilters";
import TaskList from "./TaskList";
import TaskDetail from "./TaskDetail";

export default function ConsoleApp() {
  const dispatch = useAppDispatch();
  const allTasks = useAppSelector(tasksAdapterSelectors.selectAll);
  const status = useAppSelector((s) => s.tasks.status);
  const hasHydratedCache = useRef(false);

  // 1. Hydrate instantly from IndexedDB (if present), then kick off a real
  //    network fetch to revalidate. The "isFromCache" flag flips off once
  //    the network response lands, so the banner in TaskList disappears.
  useEffect(() => {
    if (hasHydratedCache.current) return;
    hasHydratedCache.current = true;
    readCachedTaskList().then((cached) => {
      if (cached) {
        dispatch(hydratedFromCache(cached.tasks));
      }
      dispatch(loadTasksPage(1));
    });
  }, [dispatch]);

  // 2. Keep the cache in sync with whatever's currently loaded, so a
  //    reload shows fresh-ish data immediately next time. Cheap + async;
  //    doesn't block the main thread.
  useEffect(() => {
    if (status === "succeeded" && allTasks.length > 0) {
      cacheTaskList(allTasks);
    }
  }, [status, allTasks]);

  // 3. Live updates.
  useTaskFeed();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100">
      <header className="px-4 py-3 border-b border-slate-800 bg-slate-900/60 backdrop-blur">
        <h1 className="font-semibold text-lg tracking-tight">
          <span className="text-indigo-400">Annotation</span> Activity Console
        </h1>
      </header>
      <TaskFilters />
      <div className="flex flex-1 min-h-0">
        <TaskList />
        <TaskDetail />
      </div>
    </div>
  );
}
