// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { saveTasks, loadTasks, saveLists, loadLists } from "../js/storage.js";

// ===== Fixtures =====

const TASKS_KEY = "todo_tasks";
const LISTS_KEY = "todo_lists";

const sampleTasks = [
  {
    id: "a",
    title: "Buy milk",
    completed: false,
    listId: "personal",
    dueDate: "",
    tags: [],
    subtasks: [],
    createdAt: 1,
  },
  {
    id: "b",
    title: "Read book",
    completed: true,
    listId: "work",
    dueDate: "2026-07-20",
    tags: ["Meeting"],
    subtasks: [],
    createdAt: 2,
  },
];

const sampleLists = [
  { id: "personal", name: "Personal", color: "#105666" },
  { id: "work", name: "Work", color: "#D3968C" },
];

// ===== saveTasks =====

describe("saveTasks", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("serializes tasks to localStorage", () => {
    saveTasks(sampleTasks);
    const stored = JSON.parse(localStorage.getItem(TASKS_KEY));
    expect(stored).toEqual(sampleTasks);
  });

  it("overwrites previous data", () => {
    saveTasks(sampleTasks);
    saveTasks([sampleTasks[0]]);
    const stored = JSON.parse(localStorage.getItem(TASKS_KEY));
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe("a");
  });

  it("saves an empty array without error", () => {
    saveTasks([]);
    const stored = JSON.parse(localStorage.getItem(TASKS_KEY));
    expect(stored).toEqual([]);
  });
});

// ===== loadTasks =====

describe("loadTasks", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns an empty array when nothing is stored", () => {
    expect(loadTasks()).toEqual([]);
  });

  it("parses and returns stored tasks", () => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(sampleTasks));
    expect(loadTasks()).toEqual(sampleTasks);
  });

  it("applies migrate callback to each task", () => {
    const oldFormat = [
      { id: "a", title: "Test", list: "Personal", completed: false },
    ];
    localStorage.setItem(TASKS_KEY, JSON.stringify(oldFormat));
    const result = loadTasks((task) => {
      if ("list" in task && !("listId" in task)) {
        const { list: _list, ...rest } = task;
        return { ...rest, listId: "personal" };
      }
      return task;
    });
    expect(result).toEqual([
      { id: "a", title: "Test", listId: "personal", completed: false },
    ]);
  });

  it("works without a migrate callback", () => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(sampleTasks));
    expect(loadTasks()).toEqual(sampleTasks);
  });

  it("returns empty array when stored value is not an array", () => {
    localStorage.setItem(TASKS_KEY, JSON.stringify("not an array"));
    expect(loadTasks()).toEqual([]);
  });

  it("returns empty array when stored value is invalid JSON", () => {
    localStorage.setItem(TASKS_KEY, "{broken");
    expect(loadTasks()).toEqual([]);
  });

  it("returns empty array when stored value is an object instead of array", () => {
    localStorage.setItem(TASKS_KEY, JSON.stringify({ id: "a" }));
    expect(loadTasks()).toEqual([]);
  });
});

// ===== saveLists =====

describe("saveLists", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("serializes lists to localStorage", () => {
    saveLists(sampleLists);
    const stored = JSON.parse(localStorage.getItem(LISTS_KEY));
    expect(stored).toEqual(sampleLists);
  });

  it("overwrites previous data", () => {
    saveLists(sampleLists);
    saveLists([sampleLists[0]]);
    const stored = JSON.parse(localStorage.getItem(LISTS_KEY));
    expect(stored).toHaveLength(1);
  });
});

// ===== loadLists =====

describe("loadLists", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when nothing is stored", () => {
    expect(loadLists()).toBeNull();
  });

  it("parses and returns stored lists", () => {
    localStorage.setItem(LISTS_KEY, JSON.stringify(sampleLists));
    expect(loadLists()).toEqual(sampleLists);
  });

  it("returns null when stored value is not an array", () => {
    localStorage.setItem(LISTS_KEY, JSON.stringify("not an array"));
    expect(loadLists()).toBeNull();
  });

  it("returns null when stored value is invalid JSON", () => {
    localStorage.setItem(LISTS_KEY, "{broken");
    expect(loadLists()).toBeNull();
  });

  it("returns null when stored value is an object instead of array", () => {
    localStorage.setItem(LISTS_KEY, JSON.stringify({ id: "x" }));
    expect(loadLists()).toBeNull();
  });
});

// ===== Cross-cutting: localStorage isolation =====

describe("storage key isolation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("tasks and lists use separate keys", () => {
    saveTasks(sampleTasks);
    saveLists(sampleLists);
    expect(localStorage.getItem(TASKS_KEY)).not.toBe(
      localStorage.getItem(LISTS_KEY),
    );
  });

  it("corrupt task storage does not affect list loading", () => {
    localStorage.setItem(TASKS_KEY, "{broken");
    localStorage.setItem(LISTS_KEY, JSON.stringify(sampleLists));
    expect(loadTasks()).toEqual([]);
    expect(loadLists()).toEqual(sampleLists);
  });
});
