// app.js — To-Do List Application

// ===== STATE =====
let tasks = [];

// ===== STORAGE =====
const STORAGE_KEY = 'todo_tasks';

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadTasks() {
  const stored = localStorage.getItem(STORAGE_KEY);
  tasks = stored ? JSON.parse(stored) : [];
}

// ===== DATE HELPERS =====
function getDateBoundaries() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const endOfWeek = new Date(today);
  const daysUntilSunday = today.getDay() === 0 ? 0 : 7 - today.getDay();
  endOfWeek.setDate(endOfWeek.getDate() + daysUntilSunday);

  return { today, tomorrow, endOfWeek };
}

function formatDateLabel(dateStr) {
  const { today, tomorrow, endOfWeek } = getDateBoundaries();
  const date = new Date(dateStr + 'T00:00:00');

  if (date.getTime() === today.getTime()) return 'Today';
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';
  if (date > tomorrow && date <= endOfWeek) return 'This Week';

  return dateStr;
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
    const date = new Date(task.dueDate + 'T00:00:00');

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

// ===== DOM BUILDERS =====

function createCheckbox(task) {
  const label = document.createElement('label');
  label.className = 'task__check';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'task__checkbox';
  checkbox.checked = task.completed;

  const checkmark = document.createElement('span');
  checkmark.className = 'task__checkmark';

  label.append(checkbox, checkmark);
  return label;
}

function createMetadata(task) {
  const metaItems = [];

  if (task.dueDate) {
    const dateSpan = document.createElement('span');
    dateSpan.className = 'task__date';
    dateSpan.textContent = formatDateLabel(task.dueDate);
    metaItems.push(dateSpan);
  }

  if (task.subtasks && task.subtasks.length > 0) {
    const subtaskSpan = document.createElement('span');
    subtaskSpan.className = 'task__subtasks';
    subtaskSpan.textContent = task.subtasks.length + ' Subtasks';
    metaItems.push(subtaskSpan);
  }

  if (task.list) {
    const listSpan = document.createElement('span');
    listSpan.className = 'task__list';
    listSpan.textContent = task.list;
    metaItems.push(listSpan);
  }

  if (metaItems.length === 0) return null;

  const meta = document.createElement('div');
  meta.className = 'task__meta';
  meta.append(...metaItems);
  return meta;
}

function createTaskContent(task) {
  const content = document.createElement('div');
  content.className = 'task__content';

  const title = document.createElement('p');
  title.className = 'task__title';
  title.textContent = task.title;
  content.appendChild(title);

  const meta = createMetadata(task);
  if (meta) content.appendChild(meta);

  return content;
}

function createArrowButton() {
  const arrow = document.createElement('button');
  arrow.className = 'task__arrow';
  arrow.type = 'button';
  arrow.textContent = '›';
  return arrow;
}

function createTaskElement(task) {
  const li = document.createElement('li');
  li.className = 'task';
  li.dataset.id = task.id;

  li.append(
    createCheckbox(task),
    createTaskContent(task),
    createArrowButton()
  );

  return li;
}

function renderSections(groups) {
  const sections = document.querySelectorAll('.content__group');

  sections.forEach((section) => {
    const groupKey = section.dataset.group;
    if (!groupKey) return;

    const listEl = section.querySelector('.content__task-list');
    listEl.innerHTML = '';

    groups[groupKey].forEach((task) => {
      listEl.appendChild(createTaskElement(task));
    });
  });
}

function getFilteredTasks() {
  return tasks;
}

function render() {
  const visibleTasks = getFilteredTasks();
  const groups = groupByDate(visibleTasks);
  renderSections(groups);
}

// ===== INITIALIZATION =====
function init() {
  loadTasks();
  render();
}

// Start the application
init();