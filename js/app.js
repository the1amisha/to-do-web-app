// app.js — To-Do List Application

// ===== STATE =====
let tasks = [];
let lists = [
  { id: 'personal', name: 'Personal', color: '#105666' },
  { id: 'work', name: 'Work', color: '#D3968C' }
];
const listMap = new Map(lists.map((l) => [l.id, l]));
let activeAddForm = null;
let undoState = {
  task: null,
  index: null,
  timer: null,
  toast: null
};

let activeFilters = {
  status: 'all',
  list: null,
  tag: null,
  search: ''
};

// ===== STORAGE =====
const STORAGE_KEY = 'todo_tasks';

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadTasks() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  return JSON.parse(stored).map((task) => {
    if ('list' in task && !('listId' in task)) {
      const listId = task.list
        ? lists.find((l) => l.name.toLowerCase() === task.list.toLowerCase())?.id || null
        : null;
      const { list, ...rest } = task;
      return listId ? { ...rest, listId } : rest;
    }
    return task;
  });
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

  if (task.listId) {
    const list = listMap.get(task.listId);
    if (list) {
      const listSpan = document.createElement('span');
      listSpan.className = 'task__list';
      listSpan.textContent = list.name;
      metaItems.push(listSpan);
    }
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
  if (task.completed) li.classList.add('task--completed');
  li.dataset.id = task.id;

  li.append(
    createCheckbox(task),
    createTaskContent(task),
    createDeleteButton(),
    createArrowButton()
  );

  return li;
}

// ===== EMPTY STATE =====

const GROUP_LABELS = { today: 'today', tomorrow: 'tomorrow', thisWeek: 'this week' };

function getEmptyMessage(groupKey) {
  if (activeFilters.search) {
    return { title: 'No tasks found.', hint: 'Try another keyword.' };
  }
  if (activeFilters.status === 'completed') {
    return { title: 'No completed tasks yet.', hint: '\u2713 Complete a task to see it here.' };
  }
  if (activeFilters.status === 'active') {
    return { title: 'No active tasks.', hint: 'All tasks are completed.' };
  }
  return { title: `No tasks for ${GROUP_LABELS[groupKey] || groupKey}.`, hint: null };
}

function createEmptyState(message) {
  const li = document.createElement('li');
  li.className = 'task-list-empty';
  li.setAttribute('aria-live', 'polite');

  const title = document.createElement('p');
  title.className = 'task-list-empty__title';
  title.textContent = message.title;
  li.appendChild(title);

  if (message.hint) {
    const hint = document.createElement('p');
    hint.className = 'task-list-empty__hint';
    hint.textContent = message.hint;
    li.appendChild(hint);
  }

  return li;
}

// ===== RENDERING =====

function renderSections(groups) {
  const sections = document.querySelectorAll('.content__group');
  const allEmpty = Object.values(groups).every((arr) => arr.length === 0);

  sections.forEach((section, index) => {
    const groupKey = section.dataset.group;
    if (!groupKey) return;

    const listEl = section.querySelector('.content__task-list');
    listEl.innerHTML = '';

    if (allEmpty && index > 0) {
      section.hidden = true;
      return;
    }
    section.hidden = false;

    if (groups[groupKey].length === 0) {
      listEl.appendChild(createEmptyState(getEmptyMessage(groupKey)));
    } else {
      groups[groupKey].forEach((task) => {
        listEl.appendChild(createTaskElement(task));
      });
    }
  });
}

// ===== FILTERING =====

const VALID_STATUSES = ['all', 'active', 'completed'];

function getFilteredTasks() {
  let visible = [...tasks];

  if (activeFilters.status === 'active') {
    visible = visible.filter((t) => !t.completed);
  } else if (activeFilters.status === 'completed') {
    visible = visible.filter((t) => t.completed);
  }

  if (activeFilters.list) {
    visible = visible.filter((t) => t.listId === activeFilters.list);
  }

  if (activeFilters.tag) {
    visible = visible.filter((t) => t.tags?.includes(activeFilters.tag));
  }

  if (activeFilters.search) {
    visible = visible.filter((t) => t.title.toLowerCase().includes(activeFilters.search));
  }

  return visible;
}

function setStatusFilter(status) {
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
  activeFilters.status = 'all';
  activeFilters.list = null;
  activeFilters.tag = null;
  activeFilters.search = '';
  render();
}

function render() {
  const visibleTasks = getFilteredTasks();
  const groups = groupByDate(visibleTasks);
  renderSections(groups);
  renderFilterState();
}

// ===== FILTER UI =====

function renderFilterState() {
  document.querySelectorAll('[data-filter]').forEach((item) => {
    item.classList.toggle('sidebar__item--active', item.dataset.filter === activeFilters.status);
  });

  document.querySelectorAll('[data-list]').forEach((item) => {
    item.classList.toggle('sidebar__item--active', item.dataset.list === activeFilters.list);
  });
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
    listId: options.listId || '',
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
  saveTasks();
  render();
}

// ===== UNDO TOAST UI =====

function showUndoToast() {
  clearUndoTimer();
  removeUndoToast();

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

function animateTaskRemoval(taskEl, onDone) {
  taskEl.classList.add('task--removing');

  function onTransitionEnd(event) {
    if (event.propertyName !== 'opacity') return;
    taskEl.removeEventListener('transitionend', onTransitionEnd);
    onDone();
  }

  taskEl.addEventListener('transitionend', onTransitionEnd);
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

  // Delete: animate first, then mutate state and render
  if (event.target.matches('.task__delete')) {
    const taskEl = event.target.closest('.task');
    if (!taskEl) return;
    const id = taskEl.dataset.id;
    const index = findTaskIndex(id);
    if (index === -1) return;

    animateTaskRemoval(taskEl, () => {
      const deletedTask = deleteTask(index);
      storeUndoState(deletedTask, index);
      saveTasks();
      render();
      showUndoToast();
    });
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
  // Sidebar delegation: status + list filters
  const sidebar = document.querySelector('.sidebar');
  sidebar.addEventListener('click', (event) => {
    const filterItem = event.target.closest('[data-filter]');
    if (filterItem) {
      setStatusFilter(filterItem.dataset.filter);
      return;
    }

    const listItem = event.target.closest('[data-list]');
    if (listItem) {
      event.preventDefault();
      const listId = listItem.dataset.list;
      setListFilter(activeFilters.list === listId ? null : listId);
      return;
    }
  });

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

  // Search: input event, no debounce
  const searchInput = document.querySelector('[data-search]');
  searchInput.addEventListener('input', () => {
    setSearchFilter(searchInput.value);
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