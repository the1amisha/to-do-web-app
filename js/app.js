// app.js — To-Do List Application (state, controllers, event handling)

import {
  getDateBoundaries,
  resolveDueDate,
  validateTitle,
  removeDuplicate,
} from "./utils.js";
import { hasActiveFilters, getFilteredTasks } from "./filters.js";
import {
  createTask,
  findTask,
  findTaskIndex,
  addTask,
  deleteTask,
  toggleTask,
} from "./tasks.js";
import { saveTasks, loadTasks } from "./storage.js";
import {
  renderSections,
  renderFilterSummary,
  renderDetailPanel,
} from "./render.js";

// ===== STATE =====
let tasks = [];
let lists = [
  { id: "personal", name: "Personal", color: "#105666" },
  { id: "work", name: "Work", color: "#D3968C" },
];
const listMap = new Map(lists.map((l) => [l.id, l]));
let selectedTaskId = null;
let activeAddForm = null;
let undoState = {
  task: null,
  index: null,
  timer: null,
  toast: null,
};

let activeFilters = {
  status: "all",
  list: null,
  tag: null,
  search: "",
};

// ===== STORAGE MIGRATION =====

function migrateTask(task) {
  if ("list" in task && !("listId" in task)) {
    const listId = task.list
      ? lists.find((l) => l.name.toLowerCase() === task.list.toLowerCase())
          ?.id || null
      : null;
    const { list: _list, ...rest } = task;
    return listId ? { ...rest, listId } : rest;
  }
  return task;
}

// ===== GROUPING =====
function groupByDate(taskList) {
  const { today, tomorrow, endOfWeek } = getDateBoundaries();

  const groups = {
    today: [],
    tomorrow: [],
    thisWeek: [],
  };

  taskList.forEach((task) => {
    const date = new Date(task.dueDate + "T00:00:00");

    if (date.getTime() === today.getTime()) {
      groups.today.push(task);
    } else if (date.getTime() === tomorrow.getTime()) {
      groups.tomorrow.push(task);
    } else if (date > tomorrow && date <= endOfWeek) {
      groups.thisWeek.push(task);
    }
  });

  return groups;
}

// ===== FILTERING =====

function setStatusFilter(status) {
  const VALID_STATUSES = ["all", "active", "completed"];
  if (!VALID_STATUSES.includes(status)) return;
  activeFilters.status = status;
  render();
}

function setListFilter(listId) {
  activeFilters.list = listId;
  render();
}

function setTagFilter(tag) {
  activeFilters.tag = tag;
  render();
}

function setSearchFilter(query) {
  activeFilters.search = query.trim().toLowerCase();
  render();
}

function clearFilters() {
  activeFilters.status = "all";
  activeFilters.list = null;
  activeFilters.tag = null;
  activeFilters.search = "";
  render();
}

// ===== SIDEBAR LISTS =====

function renderLists() {
  const container = document.querySelector('[data-sidebar="lists"]');
  container.innerHTML = "";

  lists.forEach((list) => {
    const li = document.createElement("li");
    li.className = "sidebar__item";
    li.dataset.list = list.id;

    const a = document.createElement("a");
    a.href = "#";
    a.textContent = list.name;

    li.appendChild(a);
    container.appendChild(li);
  });

  const addLi = document.createElement("li");
  addLi.className = "sidebar__item";
  const addA = document.createElement("a");
  addA.href = "#";
  addA.textContent = "+ Add New List";
  addLi.appendChild(addA);
  container.appendChild(addLi);
}

function renderFilterState() {
  document.querySelectorAll("[data-filter]").forEach((item) => {
    item.classList.toggle(
      "sidebar__item--active",
      item.dataset.filter === activeFilters.status,
    );
  });

  document.querySelectorAll("[data-list]").forEach((item) => {
    item.classList.toggle(
      "sidebar__item--active",
      item.dataset.list === activeFilters.list,
    );
  });
}

// ===== RENDER CONTEXT =====

function buildRenderContext() {
  return {
    selectedTaskId,
    selectedTask: findTask(tasks, selectedTaskId),
    listMap,
    lists,
    activeFilters,
    hasActiveFilters: hasActiveFilters(activeFilters),
    callbacks: {
      onTagFilter: setTagFilter,
      onStatusFilter: setStatusFilter,
      onListFilter: setListFilter,
      onSearchFilter: setSearchFilter,
      onClearFilters: clearFilters,
      onUpdateTitle: updateTaskTitle,
      onUpdateDueDate: updateTaskDueDate,
      onUpdateList: updateTaskList,
      onRemoveTag: removeTag,
      onAddTag: addTag,
      onClosePanel: clearSelectedTask,
    },
  };
}

function render() {
  const ctx = buildRenderContext();
  renderFilterSummary(ctx);
  const visibleTasks = getFilteredTasks(tasks, activeFilters);
  const groups = groupByDate(visibleTasks);
  renderSections(groups, ctx);
  renderFilterState();
  renderDetailPanel(ctx);
}

// ===== SELECTION =====

function setSelectedTask(id) {
  if (findTaskIndex(tasks, id) === -1) return;
  selectedTaskId = id;
  render();
  const titleInput = document.querySelector(".detail-panel__title-input");
  if (titleInput) titleInput.focus();
}

function clearSelectedTask() {
  selectedTaskId = null;
  render();
}

function getSelectedTask() {
  return findTask(tasks, selectedTaskId);
}

// ===== TASK MUTATION =====

function updateTaskTitle(newTitle) {
  const task = getSelectedTask();
  if (!task || !validateTitle(newTitle)) return false;
  task.title = newTitle;
  saveTasks(tasks);
  render();
  return true;
}

function updateTaskDueDate(newDueDate) {
  const task = getSelectedTask();
  if (!task || !newDueDate) return false;
  task.dueDate = newDueDate;
  saveTasks(tasks);
  render();
  return true;
}

function updateTaskList(newListId) {
  const task = getSelectedTask();
  if (!task) return false;
  task.listId = newListId || null;
  saveTasks(tasks);
  render();
  return true;
}

function addTag(rawInput) {
  const task = getSelectedTask();
  if (!task) return [];

  if (!task.tags) task.tags = [];

  const candidates = rawInput
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  if (candidates.length === 0) return [];

  const newTags = removeDuplicate(candidates, task.tags);
  if (newTags.length === 0) return [];

  task.tags.push(...newTags);
  saveTasks(tasks);
  render();
  return newTags;
}

function removeTag(tagName) {
  const task = getSelectedTask();
  if (!task || !task.tags) return false;
  const index = task.tags.findIndex(
    (t) => t.toLowerCase() === tagName.toLowerCase(),
  );
  if (index === -1) return false;
  task.tags.splice(index, 1);
  saveTasks(tasks);
  render();
  return true;
}

// ===== DELETE STATE MANAGEMENT =====

function clearUndoTimer() {
  if (undoState.timer) {
    clearTimeout(undoState.timer);
    undoState.timer = null;
  }
}

function removeUndoToast() {
  if (undoState.toast) {
    undoState.toast.remove();
    undoState.toast = null;
  }
}

function clearUndoState() {
  clearUndoTimer();
  removeUndoToast();
  undoState.task = null;
  undoState.index = null;
}

function storeUndoState(task, index) {
  undoState.task = task;
  undoState.index = index;
}

function undoDelete() {
  if (!undoState.task) return;
  tasks.splice(undoState.index, 0, undoState.task);
  clearUndoState();
  saveTasks(tasks);
  render();
}

// ===== UNDO TOAST UI =====

function showUndoToast() {
  clearUndoTimer();
  removeUndoToast();

  const toast = document.createElement("div");
  toast.className = "undo-toast";
  toast.setAttribute("role", "status");

  const message = document.createElement("p");
  message.className = "undo-toast__message";
  message.textContent = "Task deleted";

  const undoBtn = document.createElement("button");
  undoBtn.className = "undo-toast__btn";
  undoBtn.type = "button";
  undoBtn.textContent = "Undo";
  undoBtn.addEventListener("click", undoDelete);

  toast.append(message, undoBtn);
  document.querySelector(".content").appendChild(toast);

  undoState.toast = toast;
  undoState.timer = setTimeout(clearUndoState, 5000);
}

// ===== DELETE ANIMATION =====

function animateTaskRemoval(taskEl, onDone) {
  taskEl.classList.add("task--removing");

  function onTransitionEnd(event) {
    if (event.propertyName !== "opacity") return;
    taskEl.removeEventListener("transitionend", onTransitionEnd);
    onDone();
  }

  taskEl.addEventListener("transitionend", onTransitionEnd);
}

// ===== TASK LIST HANDLER (delegated: toggle + delete) =====

function handleTaskListClick(event) {
  // Toggle: checkbox change
  if (event.target.matches(".task__checkbox")) {
    const taskEl = event.target.closest(".task");
    if (!taskEl) return;
    toggleTask(tasks, taskEl.dataset.id);
    saveTasks(tasks);
    render();
    return;
  }

  // Delete: animate first, then mutate state and render
  if (event.target.matches(".task__delete")) {
    const taskEl = event.target.closest(".task");
    if (!taskEl) return;
    const id = taskEl.dataset.id;
    const index = findTaskIndex(tasks, id);
    if (index === -1) return;

    animateTaskRemoval(taskEl, () => {
      if (id === selectedTaskId) selectedTaskId = null;
      const deletedTask = deleteTask(tasks, index);
      storeUndoState(deletedTask, index);
      saveTasks(tasks);
      render();
      showUndoToast();
    });
    return;
  }

  // Select: click anywhere else on the task row
  const taskEl = event.target.closest(".task");
  if (taskEl) {
    closeAddInput();
    setSelectedTask(taskEl.dataset.id);
  }
}

// ===== ADD TASK HANDLER =====

function handleAddTask(title, groupKey) {
  if (!validateTitle(title)) return false;

  const dueDate = resolveDueDate(groupKey);
  const task = createTask(title, { dueDate });
  addTask(tasks, task);
  saveTasks(tasks);
  render();
  return true;
}

// ===== ADD TASK UI =====

function closeAddInput() {
  if (!activeAddForm) return;

  const { form, button, onClickOutside } = activeAddForm;
  const header = form.parentElement;
  header.replaceChild(button, form);

  document.removeEventListener("click", onClickOutside);
  activeAddForm = null;
}

function showAddInput(section) {
  closeAddInput();

  const groupKey = section.dataset.group;
  const header = section.querySelector(".content__group-header");

  const button = header.querySelector(".content__group-add");
  const form = document.createElement("form");
  form.className = "content__group-form";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "content__group-input";
  input.placeholder = "What needs to be done?";
  input.setAttribute("aria-label", "New task title");

  form.appendChild(input);
  header.replaceChild(form, button);
  input.focus();

  function handleSubmit(e) {
    e.preventDefault();
    const title = input.value;
    if (handleAddTask(title, groupKey)) {
      closeAddInput();
    } else {
      input.select();
    }
  }

  function onClickOutside(e) {
    if (!form.contains(e.target)) {
      closeAddInput();
    }
  }

  form.addEventListener("submit", handleSubmit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      closeAddInput();
    }
  });

  setTimeout(() => document.addEventListener("click", onClickOutside), 0);

  activeAddForm = { form, button, onClickOutside };
}

// ===== SIDEBAR HANDLER =====

function handleSidebarClick(event) {
  event.preventDefault();

  const filterItem = event.target.closest("[data-filter]");
  if (filterItem) {
    setStatusFilter(filterItem.dataset.filter);
    return;
  }

  const listItem = event.target.closest("[data-list]");
  if (listItem) {
    setListFilter(listItem.dataset.list);
    return;
  }

  const addListItem = event.target.closest(".sidebar__item");
  if (addListItem && event.target.textContent === "+ Add New List") {
    const name = prompt("Enter list name:");
    if (!name) return;
    const id = name.toLowerCase().replace(/\s+/g, "-");
    lists.push({
      id,
      name,
      color:
        "#" +
        Math.floor(Math.random() * 16777215)
          .toString(16)
          .padStart(6, "0"),
    });
    renderLists();
    return;
  }
}

// ===== SEARCH HANDLER =====

function handleSearch(event) {
  setSearchFilter(event.target.value);
}

// ===== KEYBOARD HANDLER =====

function handleKeyboard(event) {
  if (event.key === "Escape") {
    clearSelectedTask();
  }
}

// ===== EVENT LISTENERS =====

function attachEventListeners() {
  const taskListEl = document.querySelector(".content__task-lists");
  taskListEl.addEventListener("click", handleTaskListClick);

  const sidebarEl = document.querySelector("[data-sidebar]");
  sidebarEl.addEventListener("click", handleSidebarClick);

  const searchInput = document.querySelector("[data-search]");
  searchInput.addEventListener("input", handleSearch);

  document.addEventListener("keydown", handleKeyboard);

  document.querySelectorAll(".content__group-add").forEach((btn) => {
    const section = btn.closest(".content__group");
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      showAddInput(section);
    });
  });
}

// ===== INITIALIZATION =====
function init() {
  tasks = loadTasks(migrateTask);
  attachEventListeners();
  renderLists();
  render();
}

// Start the application
init();
