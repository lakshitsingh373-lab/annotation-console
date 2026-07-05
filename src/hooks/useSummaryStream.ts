import { useEffect, useRef, useState } from "react";
import { API_BASE } from "../lib/api/config";

interface SummaryStreamState {
  text: string;
  status: "idle" | "streaming" | "done" | "error";
  error: string | null;
}

/**
 * Consumes the SSE summary endpoint for a task, appending markdown chunks
 * as they arrive so the caller can render incrementally. Switching taskId
 * cancels the previous stream (EventSource.close()); unmount does the same.
 */
export function useSummaryStream(taskId: string | null): SummaryStreamState {
  const [state, setState] = useState<SummaryStreamState>({
    text: "",
    status: "idle",
    error: null,
  });

  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Always close whatever stream was previously open -- this is the
    // "switching tasks mid-stream" cancellation.
    sourceRef.current?.close();
    sourceRef.current = null;

    if (!taskId) {
      // Resetting to idle here is part of synchronizing with the external
      // SSE connection when its target (taskId) changes/disappears, not a
      // derived-state anti-pattern.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ text: "", status: "idle", error: null });
      return;
    }

    setState({ text: "", status: "streaming", error: null });

    const es = new EventSource(`${API_BASE}/api/tasks/${taskId}/summary`);
    sourceRef.current = es;

    es.onmessage = (event) => {
      let chunk: string;
      try {
        chunk = JSON.parse(event.data);
      } catch {
        return; // skip malformed frame rather than corrupt the buffer
      }
      setState((prev) => ({ ...prev, text: prev.text + chunk }));
    };

    es.addEventListener("done", () => {
      setState((prev) => ({ ...prev, status: "done" }));
      es.close();
    });

    es.onerror = () => {
      // EventSource auto-retries by default; we treat any error as
      // terminal for this simple mock and surface it instead of hanging.
      setState((prev) => ({
        ...prev,
        status: "error",
        error: "Summary stream disconnected.",
      }));
      es.close();
    };

    return () => {
      es.close();
    };
  }, [taskId]);

  return state;
}
