import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  annotationCreatedFromFeed,
  hydrateMissingTask,
  markPendingFetch,
  taskAssignedFromFeed,
  taskUpdatedFromFeed,
} from "../store/tasksSlice";
import { tasksAdapterSelectors } from "../store/tasksSlice";
import type { RawServerEvent } from "../lib/model/raw";
import { WS_URL } from "../lib/api/config";
import type { RootState } from "../store/store";

const MAX_BACKOFF_MS = 10_000;
const BASE_BACKOFF_MS = 500;

/**
 * Subscribes to the realtime event WebSocket and dispatches normalized
 * updates into Redux. Reconnects with exponential backoff on close/error.
 * Events referencing a task we haven't loaded yet trigger an on-demand
 * fetch (hydrateMissingTask) instead of being silently dropped.
 */
export function useTaskFeed() {
  const dispatch = useAppDispatch();
  const attemptRef = useRef(0);
  const closedByUsRef = useRef(false);

  // Ref mirror of loaded task ids so the socket handler (defined once) can
  // check membership without re-subscribing on every store change.
  const idsRef = useRef<Set<string>>(new Set());
  const loadedIds = useAppSelector(
    (state: RootState) => tasksAdapterSelectors.selectIds(state) as string[]
  );
  useEffect(() => {
    idsRef.current = new Set(loadedIds);
  }, [loadedIds]);

  const pendingRef = useRef<Map<string, Array<() => void>>>(new Map());

  useEffect(() => {
    closedByUsRef.current = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    /**
     * If the task referenced by an event isn't loaded yet, fetch it first
     * and apply `applyPatch` once it lands, instead of dropping the patch
     * on the floor (the entity-adapter update is a no-op on missing ids).
     * If a fetch for this id is already in flight, the patch is queued and
     * applied in order once that fetch resolves. If it's already loaded,
     * apply immediately.
     */
    function ensureTaskLoadedThenApply(id: string, applyPatch: () => void) {
      if (idsRef.current.has(id)) {
        applyPatch();
        return;
      }
      const existingQueue = pendingRef.current.get(id);
      if (existingQueue) {
        existingQueue.push(applyPatch);
        return;
      }
      pendingRef.current.set(id, [applyPatch]);
      dispatch(markPendingFetch(id));
      dispatch(hydrateMissingTask(id)).finally(() => {
        const queue = pendingRef.current.get(id) ?? [];
        pendingRef.current.delete(id);
        queue.forEach((fn) => fn());
      });
    }

    function connect() {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        attemptRef.current = 0;
      };

      ws.onmessage = (event) => {
        let msg: RawServerEvent;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return; // malformed frame, ignore rather than crash
        }

        switch (msg.kind) {
          case "task.updated": {
            const { id } = msg.payload;
            ensureTaskLoadedThenApply(id, () =>
              dispatch(taskUpdatedFromFeed(msg.payload))
            );
            break;
          }
          case "task.assigned": {
            const { id } = msg.payload;
            ensureTaskLoadedThenApply(id, () =>
              dispatch(taskAssignedFromFeed(msg.payload))
            );
            break;
          }
          case "annotation.created": {
            const { taskId } = msg.payload;
            ensureTaskLoadedThenApply(taskId, () =>
              dispatch(annotationCreatedFromFeed({ taskId }))
            );
            break;
          }
        }
      };

      ws.onclose = () => {
        if (closedByUsRef.current) return;
        const delay = Math.min(
          MAX_BACKOFF_MS,
          BASE_BACKOFF_MS * 2 ** attemptRef.current
        );
        attemptRef.current += 1;
        reconnectTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws?.close();
      };
    }

    connect();

    return () => {
      closedByUsRef.current = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [dispatch]);
}
