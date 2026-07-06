// app.js — To-Do List Application

// ===== STATE =====
let tasks = [];
let activeAddForm = null;
let undoState = {
  task: null,
  index: null,
  timer: null,
  toast: null
};

// ===== STORAGE =====
const STORAGE_KEY = 'todo_tasks';

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadTasks() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

// ===== DATE HELPERS =====
function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

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

function createDeleteButton() {
  const btn = document.createElement('button');
  btn.className = 'task__delete';
  btn.type = 'button';
  btn.textContent = '×';
  btn.setAttribute('aria-label', 'Delete task');
  return btn;
}

function createTaskElement(task) {
  const li = document.createElement('li');
  li.className = 'task';
  li.dataset.id = task.id;

  li.append(
    createCheckbox(task),
    createTaskContent(task),
    createDeleteButton(),
    createArrowButton()
  );

  return li;
}

// ===== RENDERING =====

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

// ===== TASK DATA =====

function resolveDueDate(groupKey) {
  const { today, tomorrow, endOfWeek } = getDateBoundaries();

  if (groupKey === 'today') return toDateStr(today);
  if (groupKey === 'tomorrow') return toDateStr(tomorrow);
  if (groupKey === 'thisWeek') return toDateStr(endOfWeek);
  return toDateStr(today);
}

function validateTitle(title) {
  return title.trim().length > 0;
}

function createTask(title, options = {}) {
  return {
    id: crypto.randomUUID(),
    title: title.trim(),
    completed: false,
    list: options.list || '',
    dueDate: options.dueDate || '',
    tags: options.tags || [],
    subtasks: options.subtasks || [],
    createdAt: Date.now(),
  };
}

function addTask(task) {
  tasks.push(task);
}

function findTaskIndex(id) {
  return tasks.findIndex((t) => t.id === id);
}

function deleteTask(index) {
  return tasks.splice(index, 1)[0];
}

function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) task.completed = !task.completed;
}

// ===== DELETE STATE MANAGEMENT =====

function clearUndoState() {
  if (undoState.timer) {
    clearTimeout(undoState.timer);
  }
  if (undoState.toast) {
    undoState.toast.remove();
  }
  undoState.task = null;
  undoState.index = null;
  undoState.timer = null;
  undoState.toast = null;
}

function storeUndoState(task, index) {
  undoState.task = task;
  undoState.index = index;
}

function undoDelete() {
  if (!undoState.task) return;
  tasks.splice(undoState.index, 0, undoState.task);
  clearUndoState();
  saveTasks();
  render();
}

// ===== UNDO TOAST UI =====

function showUndoToast(task) {
  clearUndoState();

  const toast = document.createElement('div');
  toast.className = 'undo-toast';
  toast.setAttribute('role', 'status');

  const message = document.createElement('p');
  message.className = 'undo-toast__message';
  message.textContent = 'Task deleted';

  const undoBtn = document.createElement('button');
  undoBtn.className = 'undo-toast__btn';
  undoBtn.type = 'button';
  undoBtn.textContent = 'Undo';
  undoBtn.addEventListener('click', undoDelete);

  toast.append(message, undoBtn);
  document.querySelector('.content').appendChild(toast);

  undoState.toast = toast;
  undoState.timer = setTimeout(clearUndoState, 5000);
}

// ===== DELETE ANIMATION =====

function animateTaskRemoval(taskEl) {
  taskEl.style.transition = 'opacity 0.15s ease';
  taskEl.style.opacity = '0';

  taskEl.addEventListener('transitionend', () => {
    taskEl.style.transition = 'height 0.15s ease, margin 0.15s ease, padding 0.15s ease';
    taskEl.style.height = '0';
    taskEl.style.marginTop = '0';
    taskEl.style.marginBottom = '0';
    taskEl.style.paddingTop = '0';
    taskEl.style.paddingBottom = '0';
    taskEl.style.overflow = 'hidden';

    taskEl.addEventListener('transitionend', () => {
      taskEl.remove();
    }, { once: true });
  }, { once: true });
}

// ===== TASK LIST HANDLER (delegated: toggle + delete) =====

function handleTaskListClick(event) {
  // Toggle: checkbox change
  if (event.target.matches('.task__checkbox')) {
    const taskEl = event.target.closest('.task');
    if (!taskEl) return;
    toggleTask(taskEl.dataset.id);
    saveTasks();
    render();
    return;
  }

  // Delete: delete button click
  if (event.target.matches('.task__delete')) {
    const taskEl = event.target.closest('.task');
    if (!taskEl) return;
    const id = taskEl.dataset.id;
    const index = findTaskIndex(id);
    if (index === -1) return;
    const deletedTask = deleteTask(index);
    storeUndoState(deletedTask, index);
    saveTasks();
    animateTaskRemoval(taskEl);
    showUndoToast(deletedTask);
    return;
  }
}

// ===== ADD TASK HANDLER =====

function handleAddTask(title, groupKey) {
  if (!validateTitle(title)) return false;

  const dueDate = resolveDueDate(groupKey);
  const task = createTask(title, { dueDate });
  addTask(task);
  saveTasks();
  render();
  return true;
}

// ===== ADD TASK UI =====

function closeAddInput() {
  if (!activeAddForm) return;

  const { form, button, onClickOutside } = activeAddForm;
  const header = form.parentElement;
  header.replaceChild(button, form);

  document.removeEventListener('click', onClickOutside);
  activeAddForm = null;
}

function showAddInput(section) {
  closeAddInput();

  const groupKey = section.dataset.group;
  const header = section.querySelector('.content__group-header');
  const btn = header.querySelector('.content__add-btn');

  const form = document.createElement('form');
  form.className = 'task-add-form';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'task-add-input';
  input.placeholder = 'Task title...';

  form.appendChild(input);
  header.replaceChild(form, btn);
  input.focus();

  // Escape closes the form
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAddInput();
  });

  // Click outside closes the form
  // Deferred with setTimeout(0) so the button click that opened this form
  // doesn't immediately trigger the outside-click handler
  function onClickOutside(e) {
    if (!form.contains(e.target)) {
      closeAddInput();
    }
  }
  setTimeout(() => {
    document.addEventListener('click', onClickOutside);
  }, 0);

  activeAddForm = { form, button: btn, onClickOutside };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const added = handleAddTask(input.value, groupKey);
    if (added) {
      clearUndoState();
      closeAddInput();
    }
  });
}

// ===== EVENT LISTENERS =====

function attachEventListeners() {
  const addBtns = document.querySelectorAll('.content__add-btn');
  addBtns.forEach((btn) => {
    const section = btn.closest('.content__group');
    btn.addEventListener('click', () => {
      showAddInput(section);
    });
  });

  const taskLists = document.querySelectorAll('.content__task-list');
  taskLists.forEach((list) => {
    list.addEventListener('click', handleTaskListClick);
  });
}

// ===== INITIALIZATION =====
function init() {
  tasks = loadTasks();
  attachEventListeners();
  render();
}

// Start the application
init();