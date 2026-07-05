import {
  normalizeAssignee,
  normalizeCount,
  normalizeStatus,
  normalizeTask,
  normalizeTimestamp,
  normalizeType,
} from "../lib/model/normalize";
import type { RawTask } from "../lib/model/raw";

describe("normalizeStatus", () => {
  it("maps known casing/spelling variants to the canonical enum", () => {
    expect(normalizeStatus("in_progress")).toBe("in_progress");
    expect(normalizeStatus("InProgress")).toBe("in_progress");
    expect(normalizeStatus("QA")).toBe("qa");
    expect(normalizeStatus("done")).toBe("done");
    expect(normalizeStatus("BLOCKED")).toBe("blocked");
    expect(normalizeStatus("todo")).toBe("todo");
  });

  it("falls back to 'unknown' for unrecognized or malformed values", () => {
    expect(normalizeStatus("something-weird")).toBe("unknown");
    expect(normalizeStatus(null)).toBe("unknown");
    expect(normalizeStatus(undefined)).toBe("unknown");
    expect(normalizeStatus(42)).toBe("unknown");
  });
});

describe("normalizeType", () => {
  it("recognizes known types case-insensitively", () => {
    expect(normalizeType("image")).toEqual({ type: "image" });
    expect(normalizeType("Audio")).toEqual({ type: "audio" });
  });

  it("preserves the original string for unrecognized types instead of dropping it", () => {
    expect(normalizeType("video")).toEqual({ type: "unknown", rawType: "video" });
  });
});

describe("normalizeTimestamp", () => {
  it("passes through epoch-ms numbers unchanged", () => {
    expect(normalizeTimestamp(1719600000000)).toEqual({ value: 1719600000000, ok: true });
  });

  it("parses ISO strings to epoch-ms", () => {
    const result = normalizeTimestamp("2024-06-28T18:00:00.000Z");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(Date.parse("2024-06-28T18:00:00.000Z"));
  });

  it("falls back to 0 and flags not-ok for garbage input", () => {
    expect(normalizeTimestamp("not-a-date")).toEqual({ value: 0, ok: false });
    expect(normalizeTimestamp(undefined)).toEqual({ value: 0, ok: false });
  });
});

describe("normalizeCount", () => {
  it("accepts numbers and numeric strings", () => {
    expect(normalizeCount(5)).toEqual({ value: 5, ok: true });
    expect(normalizeCount("5")).toEqual({ value: 5, ok: true });
  });

  it("falls back to 0 for non-numeric input", () => {
    expect(normalizeCount("abc")).toEqual({ value: 0, ok: false });
    expect(normalizeCount(null)).toEqual({ value: 0, ok: false });
  });
});

describe("normalizeAssignee", () => {
  it("passes through a well-formed assignee", () => {
    expect(normalizeAssignee({ id: "u1", name: "Asha" })).toEqual({ id: "u1", name: "Asha" });
  });

  it("treats null and malformed shapes as unassigned", () => {
    expect(normalizeAssignee(null)).toBeNull();
    expect(normalizeAssignee({ id: "u1" })).toBeNull();
    expect(normalizeAssignee("Asha")).toBeNull();
  });
});

describe("normalizeTask", () => {
  it("normalizes a fully messy raw payload end to end without throwing", () => {
    const raw: RawTask = {
      id: "t1",
      title: "Task 1",
      type: "video", // unknown type
      status: "InProgress", // inconsistent casing
      assignee: null,
      annotationCount: "7", // numeric string
      updatedAt: "2024-06-28T18:00:00.000Z", // ISO string
      meta: { priority: "high" },
    };

    const task = normalizeTask(raw);

    expect(task.type).toBe("unknown");
    if (task.type === "unknown") {
      expect(task.rawType).toBe("video");
    }
    expect(task.status).toBe("in_progress");
    expect(task.annotationCount).toBe(7);
    expect(task.updatedAt).toBe(Date.parse("2024-06-28T18:00:00.000Z"));
    expect(task.hadNormalizationIssues).toBe(true); // unknown type flags it
  });

  it("does not flag a clean payload as having normalization issues", () => {
    const raw: RawTask = {
      id: "t2",
      title: "Task 2",
      type: "image",
      status: "done",
      assignee: { id: "u1", name: "Asha" },
      annotationCount: 3,
      updatedAt: 1719600000000,
      meta: {},
    };

    const task = normalizeTask(raw);
    expect(task.hadNormalizationIssues).toBe(false);
  });
});
