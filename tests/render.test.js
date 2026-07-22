// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createTaskElement,
  renderSections,
  renderFilterSummary,
  renderDetailPanel,
} from "../js/render.js";

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

const listMap = new Map([
  ["personal", { id: "personal", name: "Personal", color: "#105666" }],
  ["work", { id: "work", name: "Work", color: "#D3968C" }],
]);

const lists = [
  { id: "personal", name: "Personal", color: "#105666" },
  { id: "work", name: "Work", color: "#D3968C" },
];

const defaultFilters = { status: "all", list: null, tag: null, search: "" };

function makeCtx(overrides = {}) {
  return {
    selectedTaskId: null,
    selectedTask: null,
    listMap,
    lists,
    activeFilters: { ...defaultFilters },
    hasActiveFilters: false,
    callbacks: {
      onTagFilter: vi.fn(),
      onStatusFilter: vi.fn(),
      onListFilter: vi.fn(),
      onSearchFilter: vi.fn(),
      onClearFilters: vi.fn(),
      onUpdateTitle: vi.fn().mockReturnValue(true),
      onUpdateDueDate: vi.fn().mockReturnValue(true),
      onUpdateList: vi.fn().mockReturnValue(true),
      onRemoveTag: vi.fn(),
      onAddTag: vi.fn().mockReturnValue([]),
      onClosePanel: vi.fn(),
    },
    ...overrides,
  };
}

// ===== createTaskElement =====

describe("createTaskElement", () => {
  let ctx;

  beforeEach(() => {
    ctx = makeCtx();
  });

  it('returns an <li> with class "task"', () => {
    const el = createTaskElement(makeTask(), ctx);
    expect(el.tagName).toBe("LI");
    expect(el.classList.contains("task")).toBe(true);
  });

  it("sets data-id from the task", () => {
    const el = createTaskElement(makeTask({ id: "abc" }), ctx);
    expect(el.dataset.id).toBe("abc");
  });

  it("adds task--completed when task is completed", () => {
    const el = createTaskElement(makeTask({ completed: true }), ctx);
    expect(el.classList.contains("task--completed")).toBe(true);
  });

  it("does not add task--completed when task is active", () => {
    const el = createTaskElement(makeTask({ completed: false }), ctx);
    expect(el.classList.contains("task--completed")).toBe(false);
  });

  it("adds task--selected when task id matches selectedTaskId", () => {
    const el = createTaskElement(
      makeTask({ id: "x" }),
      makeCtx({ selectedTaskId: "x" }),
    );
    expect(el.classList.contains("task--selected")).toBe(true);
  });

  it("does not add task--selected when id does not match", () => {
    const el = createTaskElement(
      makeTask({ id: "x" }),
      makeCtx({ selectedTaskId: "y" }),
    );
    expect(el.classList.contains("task--selected")).toBe(false);
  });

  it("contains a checkbox input", () => {
    const el = createTaskElement(makeTask(), ctx);
    const checkbox = el.querySelector(".task__checkbox");
    expect(checkbox).not.toBeNull();
    expect(checkbox.type).toBe("checkbox");
  });

  it("reflects completed state in checkbox", () => {
    const el = createTaskElement(makeTask({ completed: true }), ctx);
    expect(el.querySelector(".task__checkbox").checked).toBe(true);
  });

  it("contains the task title", () => {
    const el = createTaskElement(makeTask({ title: "Buy eggs" }), ctx);
    expect(el.querySelector(".task__title").textContent).toBe("Buy eggs");
  });

  it("contains a delete button", () => {
    const el = createTaskElement(makeTask(), ctx);
    expect(el.querySelector(".task__delete")).not.toBeNull();
  });

  it("contains an arrow button", () => {
    const el = createTaskElement(makeTask(), ctx);
    expect(el.querySelector(".task__arrow")).not.toBeNull();
  });

  it("shows the list name when task has a listId", () => {
    const el = createTaskElement(makeTask({ listId: "personal" }), ctx);
    const listEl = el.querySelector(".task__list");
    expect(listEl).not.toBeNull();
    expect(listEl.textContent).toBe("Personal");
  });

  it("does not show list name when listId is null", () => {
    const el = createTaskElement(makeTask({ listId: null }), ctx);
    expect(el.querySelector(".task__list")).toBeNull();
  });

  it("shows tag chips for tagged tasks", () => {
    const el = createTaskElement(makeTask({ tags: ["Work", "Urgent"] }), ctx);
    const chips = el.querySelectorAll(".tag-chip");
    expect(chips.length).toBe(2);
    expect(chips[0].textContent).toBe("Work");
    expect(chips[1].textContent).toBe("Urgent");
  });

  it("highlights active tag chip when filter matches", () => {
    const el = createTaskElement(
      makeTask({ tags: ["Work"] }),
      makeCtx({ activeFilters: { ...defaultFilters, tag: "work" } }),
    );
    const chip = el.querySelector(".tag-chip");
    expect(chip.classList.contains("tag-chip--active")).toBe(true);
  });

  it("calls onTagFilter when a tag chip is clicked", () => {
    const el = createTaskElement(makeTask({ tags: ["Work"] }), ctx);
    el.querySelector(".tag-chip").click();
    expect(ctx.callbacks.onTagFilter).toHaveBeenCalled();
  });

  it("limits visible tags to 2 and shows overflow", () => {
    const el = createTaskElement(makeTask({ tags: ["A", "B", "C", "D"] }), ctx);
    const chips = el.querySelectorAll(".tag-chip:not(.tag-chip--overflow)");
    expect(chips.length).toBe(2);
    expect(el.querySelector(".tag-chip--overflow").textContent).toBe("+2");
  });

  it("shows subtask count when subtasks exist", () => {
    const el = createTaskElement(
      makeTask({ subtasks: [{ title: "Step 1", completed: false }] }),
      ctx,
    );
    expect(el.querySelector(".task__subtasks").textContent).toBe("1 Subtasks");
  });

  it("shows no metadata section when task has no metadata", () => {
    const el = createTaskElement(
      makeTask({ listId: null, dueDate: "", tags: [], subtasks: [] }),
      ctx,
    );
    expect(el.querySelector(".task__meta")).toBeNull();
  });
});

// ===== renderSections =====

describe("renderSections", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="content__task-lists">
        <section class="content__group" data-group="today">
          <ul class="content__task-list"></ul>
        </section>
        <section class="content__group" data-group="tomorrow">
          <ul class="content__task-list"></ul>
        </section>
        <section class="content__group" data-group="thisWeek">
          <ul class="content__task-list"></ul>
        </section>
      </div>
    `;
  });

  it("renders tasks into the correct group sections", () => {
    const groups = {
      today: [makeTask({ id: "1", title: "Today task" })],
      tomorrow: [],
      thisWeek: [],
    };
    renderSections(groups, makeCtx());
    const todayList = document.querySelector(
      '[data-group="today"] .content__task-list',
    );
    expect(todayList.children.length).toBe(1);
    expect(todayList.children[0].dataset.id).toBe("1");
  });

  it("hides non-first sections when all groups are empty", () => {
    const groups = { today: [], tomorrow: [], thisWeek: [] };
    renderSections(groups, makeCtx());
    expect(document.querySelector('[data-group="today"]').hidden).toBe(false);
    expect(document.querySelector('[data-group="tomorrow"]').hidden).toBe(true);
    expect(document.querySelector('[data-group="thisWeek"]').hidden).toBe(true);
  });

  it("shows all sections when at least one group has tasks", () => {
    const groups = {
      today: [],
      tomorrow: [makeTask()],
      thisWeek: [],
    };
    renderSections(groups, makeCtx());
    expect(document.querySelector('[data-group="today"]').hidden).toBe(false);
    expect(document.querySelector('[data-group="tomorrow"]').hidden).toBe(
      false,
    );
    expect(document.querySelector('[data-group="thisWeek"]').hidden).toBe(
      false,
    );
  });

  it("shows empty state message when a group has no tasks", () => {
    const groups = { today: [makeTask()], tomorrow: [], thisWeek: [] };
    renderSections(groups, makeCtx());
    const tomorrowList = document.querySelector(
      '[data-group="tomorrow"] .content__task-list',
    );
    const empty = tomorrowList.querySelector(".task-list-empty");
    expect(empty).not.toBeNull();
    expect(
      empty.querySelector(".task-list-empty__title").textContent,
    ).toContain("tomorrow");
  });

  it("shows filter message when filters are active and group is empty", () => {
    const groups = { today: [], tomorrow: [], thisWeek: [] };
    renderSections(groups, makeCtx({ hasActiveFilters: true }));
    const empty = document.querySelector(".task-list-empty__title");
    expect(empty.textContent).toBe("No tasks match your filters.");
  });

  it("shows hint when filters are active and group is empty", () => {
    const groups = { today: [], tomorrow: [], thisWeek: [] };
    renderSections(groups, makeCtx({ hasActiveFilters: true }));
    const hint = document.querySelector(".task-list-empty__hint");
    expect(hint).not.toBeNull();
  });

  it("clears previous content before rendering", () => {
    const groups = { today: [], tomorrow: [], thisWeek: [] };
    renderSections(groups, makeCtx());
    renderSections(
      { today: [makeTask({ id: "new" })], tomorrow: [], thisWeek: [] },
      makeCtx(),
    );
    const todayList = document.querySelector(
      '[data-group="today"] .content__task-list',
    );
    expect(todayList.children.length).toBe(1);
    expect(todayList.children[0].dataset.id).toBe("new");
  });
});

// ===== renderFilterSummary =====

describe("renderFilterSummary", () => {
  beforeEach(() => {
    document.body.innerHTML = "<div data-filter-summary></div>";
  });

  it("hides the summary when no filters are active", () => {
    renderFilterSummary(makeCtx());
    expect(document.querySelector("[data-filter-summary]").hidden).toBe(true);
  });

  it("shows the summary when filters are active", () => {
    const ctx = makeCtx({
      hasActiveFilters: true,
      activeFilters: { ...defaultFilters, status: "active" },
    });
    renderFilterSummary(ctx);
    expect(document.querySelector("[data-filter-summary]").hidden).toBe(false);
  });

  it("displays a status filter chip", () => {
    const ctx = makeCtx({
      hasActiveFilters: true,
      activeFilters: { ...defaultFilters, status: "active" },
    });
    renderFilterSummary(ctx);
    const chip = document.querySelector(".filter-chip__text");
    expect(chip.textContent).toContain("Active");
  });

  it("displays a list filter chip with list name", () => {
    const ctx = makeCtx({
      hasActiveFilters: true,
      activeFilters: { ...defaultFilters, list: "work" },
    });
    renderFilterSummary(ctx);
    const chip = document.querySelector(".filter-chip__text");
    expect(chip.textContent).toContain("Work");
  });

  it("displays a tag filter chip", () => {
    const ctx = makeCtx({
      hasActiveFilters: true,
      activeFilters: { ...defaultFilters, tag: "Urgent" },
    });
    renderFilterSummary(ctx);
    const chip = document.querySelector(".filter-chip__text");
    expect(chip.textContent).toContain("Urgent");
  });

  it("displays a search filter chip", () => {
    const ctx = makeCtx({
      hasActiveFilters: true,
      activeFilters: { ...defaultFilters, search: "milk" },
    });
    renderFilterSummary(ctx);
    const chip = document.querySelector(".filter-chip__text");
    expect(chip.textContent).toContain("milk");
  });

  it("calls onStatusFilter when status chip remove is clicked", () => {
    const ctx = makeCtx({
      hasActiveFilters: true,
      activeFilters: { ...defaultFilters, status: "active" },
    });
    renderFilterSummary(ctx);
    document.querySelector(".filter-chip__remove").click();
    expect(ctx.callbacks.onStatusFilter).toHaveBeenCalledWith("all");
  });

  it("calls onListFilter when list chip remove is clicked", () => {
    const ctx = makeCtx({
      hasActiveFilters: true,
      activeFilters: { ...defaultFilters, list: "work" },
    });
    renderFilterSummary(ctx);
    document.querySelector(".filter-chip__remove").click();
    expect(ctx.callbacks.onListFilter).toHaveBeenCalledWith(null);
  });

  it("calls onClearFilters when Clear All is clicked", () => {
    const ctx = makeCtx({
      hasActiveFilters: true,
      activeFilters: { ...defaultFilters, status: "active" },
    });
    renderFilterSummary(ctx);
    document.querySelector(".filter-summary__clear").click();
    expect(ctx.callbacks.onClearFilters).toHaveBeenCalled();
  });

  it("displays multiple filter chips when several filters are active", () => {
    const ctx = makeCtx({
      hasActiveFilters: true,
      activeFilters: {
        status: "active",
        list: "work",
        tag: "Urgent",
        search: "milk",
      },
    });
    renderFilterSummary(ctx);
    const chips = document.querySelectorAll(".filter-chip");
    expect(chips.length).toBe(4);
  });
});

// ===== renderDetailPanel =====

describe("renderDetailPanel", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div class="detail-panel"></div>';
  });

  it("hides the panel when no task is selected", () => {
    renderDetailPanel(makeCtx());
    const panel = document.querySelector(".detail-panel");
    expect(panel.hidden).toBe(true);
    expect(panel.innerHTML).toBe("");
  });

  it("shows the panel when a task is selected", () => {
    const task = makeTask({ id: "x", title: "My Task" });
    renderDetailPanel(makeCtx({ selectedTask: task }));
    const panel = document.querySelector(".detail-panel");
    expect(panel.hidden).toBe(false);
  });

  it("sets taskId on the panel", () => {
    const task = makeTask({ id: "x" });
    renderDetailPanel(makeCtx({ selectedTask: task }));
    expect(document.querySelector(".detail-panel").dataset.taskId).toBe("x");
  });

  it("populates the title input", () => {
    const task = makeTask({ title: "Buy groceries" });
    renderDetailPanel(makeCtx({ selectedTask: task }));
    const input = document.querySelector(".detail-panel__title-input");
    expect(input.value).toBe("Buy groceries");
  });

  it("shows the due date input when task has a dueDate", () => {
    const task = makeTask({ dueDate: "2026-07-20" });
    renderDetailPanel(makeCtx({ selectedTask: task }));
    const dateInput = document.querySelector(".detail-panel__date-input");
    expect(dateInput).not.toBeNull();
    expect(dateInput.value).toBe("2026-07-20");
  });

  it("shows a list select with all lists", () => {
    const task = makeTask();
    renderDetailPanel(makeCtx({ selectedTask: task }));
    const select = document.querySelector(".detail-panel__list-select");
    expect(select).not.toBeNull();
    const options = select.querySelectorAll("option");
    expect(options.length).toBe(3); // None + Personal + Work
  });

  it("selects the correct list in the dropdown", () => {
    const task = makeTask({ listId: "work" });
    renderDetailPanel(makeCtx({ selectedTask: task }));
    const select = document.querySelector(".detail-panel__list-select");
    expect(select.value).toBe("work");
  });

  it("shows tag chips with remove buttons", () => {
    const task = makeTask({ tags: ["Work", "Urgent"] });
    renderDetailPanel(makeCtx({ selectedTask: task }));
    const chips = document.querySelectorAll(".tag-chip__remove");
    expect(chips.length).toBe(2);
  });

  it("calls onRemoveTag when a tag remove button is clicked", () => {
    const ctx = makeCtx({ selectedTask: makeTask({ tags: ["Work"] }) });
    renderDetailPanel(ctx);
    document.querySelector(".tag-chip__remove").click();
    expect(ctx.callbacks.onRemoveTag).toHaveBeenCalledWith("Work");
  });

  it("calls onUpdateTitle on Enter in title input", () => {
    const ctx = makeCtx({ selectedTask: makeTask({ title: "Old" }) });
    renderDetailPanel(ctx);
    const input = document.querySelector(".detail-panel__title-input");
    input.value = "New Title";
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    expect(ctx.callbacks.onUpdateTitle).toHaveBeenCalledWith("New Title");
  });

  it("calls onUpdateList on select change", () => {
    const ctx = makeCtx({ selectedTask: makeTask() });
    renderDetailPanel(ctx);
    const select = document.querySelector(".detail-panel__list-select");
    select.value = "work";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    expect(ctx.callbacks.onUpdateList).toHaveBeenCalledWith("work");
  });

  it("calls onClosePanel when close button is clicked", () => {
    const ctx = makeCtx({ selectedTask: makeTask() });
    renderDetailPanel(ctx);
    document.querySelector(".detail-panel__close").click();
    expect(ctx.callbacks.onClosePanel).toHaveBeenCalled();
  });

  it("shows subtask count when subtasks exist", () => {
    const task = makeTask({ subtasks: [{ title: "A" }, { title: "B" }] });
    renderDetailPanel(makeCtx({ selectedTask: task }));
    const fields = document.querySelectorAll(".detail-panel__field");
    const subtaskField = Array.from(fields).find(
      (f) => f.querySelector(".detail-panel__label").textContent === "Subtasks",
    );
    expect(subtaskField).not.toBeNull();
    expect(subtaskField.querySelector(".detail-panel__value").textContent).toBe(
      "2 subtasks",
    );
  });

  it("removes taskId when panel is hidden", () => {
    renderDetailPanel(makeCtx({ selectedTask: makeTask({ id: "x" }) }));
    renderDetailPanel(makeCtx({ selectedTask: null }));
    expect(
      document.querySelector(".detail-panel").dataset.taskId,
    ).toBeUndefined();
  });

  it("shows Add Tag button", () => {
    renderDetailPanel(makeCtx({ selectedTask: makeTask() }));
    expect(document.querySelector(".detail-panel__tag-add")).not.toBeNull();
  });
});
