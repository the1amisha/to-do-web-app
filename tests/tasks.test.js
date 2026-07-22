import { describe, it, expect, vi } from "vitest";
import {
  createTask,
  findTask,
  findTaskIndex,
  addTask,
  deleteTask,
  toggleTask,
  editTask,
} from "../js/tasks.js";

// ===== Fixtures =====

function makeTask(overrides = {}) {
  return {
    id: "1",
    title: "Buy milk",
    completed: false,
    listId: "personal",
    dueDate: "2026-07-15",
    tags: ["Work"],
    subtasks: [],
    createdAt: 1752451200000,
    ...overrides,
  };
}

// ===== createTask =====

describe("createTask", () => {
  it("returns a task with the given title (trimmed)", () => {
    const task = createTask("  Buy milk  ");
    expect(task.title).toBe("Buy milk");
  });

  it("sets completed to false by default", () => {
    const task = createTask("Test");
    expect(task.completed).toBe(false);
  });

  it("generates a unique id", () => {
    const a = createTask("A");
    const b = createTask("B");
    expect(a.id).not.toBe(b.id);
  });

  it("uses crypto.randomUUID for the id", () => {
    const spy = vi.spyOn(crypto, "randomUUID");
    spy.mockReturnValueOnce("mock-uuid-1");
    const task = createTask("Test");
    expect(task.id).toBe("mock-uuid-1");
    spy.mockRestore();
  });

  it("sets listId from options", () => {
    const task = createTask("Test", { listId: "work" });
    expect(task.listId).toBe("work");
  });

  it("defaults listId to null when not provided", () => {
    const task = createTask("Test");
    expect(task.listId).toBeNull();
  });

  it("sets dueDate from options", () => {
    const task = createTask("Test", { dueDate: "2026-07-20" });
    expect(task.dueDate).toBe("2026-07-20");
  });

  it("defaults dueDate to empty string", () => {
    const task = createTask("Test");
    expect(task.dueDate).toBe("");
  });

  it("sets tags from options", () => {
    const task = createTask("Test", { tags: ["Urgent", "Home"] });
    expect(task.tags).toEqual(["Urgent", "Home"]);
  });

  it("defaults tags to empty array", () => {
    const task = createTask("Test");
    expect(task.tags).toEqual([]);
  });

  it("sets subtasks from options", () => {
    const subtasks = [{ title: "Step 1", completed: false }];
    const task = createTask("Test", { subtasks });
    expect(task.subtasks).toEqual(subtasks);
  });

  it("defaults subtasks to empty array", () => {
    const task = createTask("Test");
    expect(task.subtasks).toEqual([]);
  });

  it("sets createdAt to a timestamp number", () => {
    const before = Date.now();
    const task = createTask("Test");
    const after = Date.now();
    expect(task.createdAt).toBeGreaterThanOrEqual(before);
    expect(task.createdAt).toBeLessThanOrEqual(after);
  });

  it("ignores unknown option keys", () => {
    const task = createTask("Test", { listId: "work", unknown: true });
    expect(task.unknown).toBeUndefined();
  });
});

// ===== findTaskIndex =====

describe("findTaskIndex", () => {
  const tasks = [
    makeTask({ id: "a", title: "First" }),
    makeTask({ id: "b", title: "Second" }),
    makeTask({ id: "c", title: "Third" }),
  ];

  it("returns the index of the matching task", () => {
    expect(findTaskIndex(tasks, "b")).toBe(1);
  });

  it("returns 0 for the first task", () => {
    expect(findTaskIndex(tasks, "a")).toBe(0);
  });

  it("returns -1 when id is not found", () => {
    expect(findTaskIndex(tasks, "missing")).toBe(-1);
  });

  it("returns -1 for empty array", () => {
    expect(findTaskIndex([], "a")).toBe(-1);
  });
});

// ===== findTask =====

describe("findTask", () => {
  const tasks = [
    makeTask({ id: "a", title: "First" }),
    makeTask({ id: "b", title: "Second" }),
  ];

  it("returns the matching task object", () => {
    expect(findTask(tasks, "b").title).toBe("Second");
  });

  it("returns null when id is not found", () => {
    expect(findTask(tasks, "missing")).toBeNull();
  });

  it("returns null for empty array", () => {
    expect(findTask([], "a")).toBeNull();
  });

  it("returns the first match when ids are duplicated", () => {
    const dup = [
      makeTask({ id: "x", title: "Original" }),
      makeTask({ id: "x", title: "Duplicate" }),
    ];
    expect(findTask(dup, "x").title).toBe("Original");
  });
});

// ===== addTask =====

describe("addTask", () => {
  it("appends a task to the end of the array", () => {
    const tasks = [makeTask({ id: "a" })];
    const newTask = makeTask({ id: "b" });
    addTask(tasks, newTask);
    expect(tasks).toHaveLength(2);
    expect(tasks[1].id).toBe("b");
  });

  it("mutates the original array (push)", () => {
    const tasks = [];
    const task = makeTask({ id: "a" });
    addTask(tasks, task);
    expect(tasks[0]).toBe(task);
  });

  it("adds to an already-populated list", () => {
    const tasks = [makeTask({ id: "a" }), makeTask({ id: "b" })];
    addTask(tasks, makeTask({ id: "c" }));
    expect(tasks).toHaveLength(3);
  });
});

// ===== deleteTask =====

describe("deleteTask", () => {
  it("removes the task at the given index and returns it", () => {
    const tasks = [
      makeTask({ id: "a" }),
      makeTask({ id: "b" }),
      makeTask({ id: "c" }),
    ];
    const removed = deleteTask(tasks, 1);
    expect(removed.id).toBe("b");
    expect(tasks).toHaveLength(2);
    expect(tasks.map((t) => t.id)).toEqual(["a", "c"]);
  });

  it("returns undefined when index is out of bounds", () => {
    const tasks = [makeTask({ id: "a" })];
    const removed = deleteTask(tasks, 5);
    expect(removed).toBeUndefined();
    expect(tasks).toHaveLength(1);
  });

  it("works for the last element", () => {
    const tasks = [makeTask({ id: "a" }), makeTask({ id: "b" })];
    deleteTask(tasks, 1);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe("a");
  });
});

// ===== toggleTask =====

describe("toggleTask", () => {
  it("toggles an active task to completed", () => {
    const tasks = [makeTask({ id: "a", completed: false })];
    toggleTask(tasks, "a");
    expect(tasks[0].completed).toBe(true);
  });

  it("toggles a completed task to active", () => {
    const tasks = [makeTask({ id: "a", completed: true })];
    toggleTask(tasks, "a");
    expect(tasks[0].completed).toBe(false);
  });

  it("does nothing when id is not found", () => {
    const tasks = [makeTask({ id: "a", completed: false })];
    toggleTask(tasks, "missing");
    expect(tasks[0].completed).toBe(false);
  });

  it("only toggles the matching task, not others", () => {
    const tasks = [
      makeTask({ id: "a", completed: false }),
      makeTask({ id: "b", completed: false }),
    ];
    toggleTask(tasks, "a");
    expect(tasks[0].completed).toBe(true);
    expect(tasks[1].completed).toBe(false);
  });
});

// ===== editTask =====

describe("editTask", () => {
  it("applies updates to the matching task", () => {
    const tasks = [makeTask({ id: "a", title: "Old title" })];
    const result = editTask(tasks, "a", { title: "New title" });
    expect(result).toBe(true);
    expect(tasks[0].title).toBe("New title");
  });

  it("applies multiple updates at once", () => {
    const tasks = [makeTask({ id: "a", title: "Old", dueDate: "2026-07-15" })];
    editTask(tasks, "a", {
      title: "Updated",
      dueDate: "2026-07-20",
      listId: "work",
    });
    expect(tasks[0].title).toBe("Updated");
    expect(tasks[0].dueDate).toBe("2026-07-20");
    expect(tasks[0].listId).toBe("work");
  });

  it("returns false when id is not found", () => {
    const tasks = [makeTask({ id: "a" })];
    const result = editTask(tasks, "missing", { title: "Nope" });
    expect(result).toBe(false);
    expect(tasks[0].title).toBe("Buy milk");
  });

  it("does not modify other tasks", () => {
    const tasks = [
      makeTask({ id: "a", title: "First" }),
      makeTask({ id: "b", title: "Second" }),
    ];
    editTask(tasks, "a", { title: "Changed" });
    expect(tasks[1].title).toBe("Second");
  });

  it("overwrites fields that already exist", () => {
    const tasks = [makeTask({ id: "a", completed: false })];
    editTask(tasks, "a", { completed: true });
    expect(tasks[0].completed).toBe(true);
  });
});
