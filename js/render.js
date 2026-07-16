// render.js — DOM construction and rendering (no state, no persistence, no event handling logic)
//
// Every function either creates DOM, returns DOM, or appends DOM.
// State and callbacks are received via a context object (ctx).

import { getDateBoundaries } from './utils.js';

// ===== HELPERS (private) =====

function formatDateLabel(dateStr) {
  const { today, tomorrow, endOfWeek } = getDateBoundaries();
  const date = new Date(dateStr + 'T00:00:00');

  if (date.getTime() === today.getTime()) return 'Today';
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';
  if (date > tomorrow && date <= endOfWeek) return 'This Week';

  return dateStr;
}

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

function createDeleteButton() {
  const btn = document.createElement('button');
  btn.className = 'task__delete';
  btn.type = 'button';
  btn.textContent = '\u00d7';
  btn.setAttribute('aria-label', 'Delete task');
  return btn;
}

function createArrowButton() {
  const arrow = document.createElement('button');
  arrow.className = 'task__arrow';
  arrow.type = 'button';
  arrow.textContent = '\u203A';
  arrow.setAttribute('aria-label', 'View task details');
  return arrow;
}

function createDetailField(label, value) {
  const div = document.createElement('div');
  div.className = 'detail-panel__field';

  const dt = document.createElement('dt');
  dt.className = 'detail-panel__label';
  dt.textContent = label;

  const dd = document.createElement('dd');
  dd.className = 'detail-panel__value';
  dd.textContent = value;

  div.append(dt, dd);
  return div;
}

// ===== DOM BUILDERS =====

function createTagChip(tag, options = {}) {
  const span = document.createElement('span');
  span.className = 'tag-chip';
  span.textContent = tag;

  if (options.active) {
    span.classList.add('tag-chip--active');
  }

  if (options.removable) {
    const removeBtn = document.createElement('button');
    removeBtn.className = 'tag-chip__remove';
    removeBtn.type = 'button';
    removeBtn.textContent = '\u00d7';
    removeBtn.setAttribute('aria-label', 'Remove tag ' + tag);
    span.appendChild(removeBtn);
  }

  return span;
}

function createFilterChip(label, icon, options = {}) {
  const span = document.createElement('span');
  span.className = 'filter-chip';

  const text = document.createElement('span');
  text.className = 'filter-chip__text';
  text.textContent = icon + ' ' + label;
  span.appendChild(text);

  if (options.removable) {
    const removeBtn = document.createElement('button');
    removeBtn.className = 'filter-chip__remove';
    removeBtn.type = 'button';
    removeBtn.textContent = '\u00d7';
    removeBtn.setAttribute('aria-label', 'Remove ' + label + ' filter');
    span.appendChild(removeBtn);
  }

  return span;
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

function createMetadata(task, ctx) {
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
    const list = ctx.listMap.get(task.listId);
    if (list) {
      const listSpan = document.createElement('span');
      listSpan.className = 'task__list';
      listSpan.textContent = list.name;
      metaItems.push(listSpan);
    }
  }

  if (task.tags && task.tags.length > 0) {
    const MAX_VISIBLE_TAGS = 2;
    const tagContainer = document.createElement('span');
    tagContainer.className = 'task__tags';
    task.tags.slice(0, MAX_VISIBLE_TAGS).forEach((tag) => {
      const isActive = ctx.activeFilters.tag && tag.toLowerCase() === ctx.activeFilters.tag.toLowerCase();
      const chip = createTagChip(tag, { active: isActive });
      chip.addEventListener('click', () => {
        ctx.callbacks.onTagFilter(ctx.activeFilters.tag === tag ? null : tag);
      });
      tagContainer.appendChild(chip);
    });
    if (task.tags.length > MAX_VISIBLE_TAGS) {
      const overflow = document.createElement('span');
      overflow.className = 'tag-chip tag-chip--overflow';
      overflow.textContent = '+' + (task.tags.length - MAX_VISIBLE_TAGS);
      tagContainer.appendChild(overflow);
    }
    metaItems.push(tagContainer);
  }

  if (metaItems.length === 0) return null;

  const meta = document.createElement('div');
  meta.className = 'task__meta';
  meta.append(...metaItems);
  return meta;
}

function createTaskContent(task, ctx) {
  const content = document.createElement('div');
  content.className = 'task__content';

  const title = document.createElement('p');
  title.className = 'task__title';
  title.textContent = task.title;
  content.appendChild(title);

  const meta = createMetadata(task, ctx);
  if (meta) content.appendChild(meta);

  return content;
}

export function createTaskElement(task, ctx) {
  const li = document.createElement('li');
  li.className = 'task';
  if (task.completed) li.classList.add('task--completed');
  if (task.id === ctx.selectedTaskId) li.classList.add('task--selected');
  li.dataset.id = task.id;

  li.append(
    createCheckbox(task),
    createTaskContent(task, ctx),
    createDeleteButton(),
    createArrowButton()
  );

  return li;
}

// ===== RENDERERS =====

const GROUP_LABELS = { today: 'today', tomorrow: 'tomorrow', thisWeek: 'this week' };

function getEmptyMessage(groupKey, hasFilters) {
  if (hasFilters) {
    return { title: 'No tasks match your filters.', hint: 'Try removing one or more filters above.' };
  }
  return { title: `No tasks for ${GROUP_LABELS[groupKey] || groupKey}.`, hint: null };
}

export function renderSections(groups, ctx) {
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
      listEl.appendChild(createEmptyState(getEmptyMessage(groupKey, ctx.hasActiveFilters)));
    } else {
      groups[groupKey].forEach((task) => {
        listEl.appendChild(createTaskElement(task, ctx));
      });
    }
  });
}

export function renderFilterSummary(ctx) {
  const container = document.querySelector('[data-filter-summary]');

  if (!ctx.hasActiveFilters) {
    container.hidden = true;
    container.innerHTML = '';
    return;
  }

  container.hidden = false;
  container.innerHTML = '';

  const label = document.createElement('span');
  label.className = 'filter-summary__label';
  label.textContent = 'Showing';
  container.appendChild(label);

  const chips = document.createElement('div');
  chips.className = 'filter-summary__chips';

  if (ctx.activeFilters.status !== 'all') {
    const statusLabel = ctx.activeFilters.status === 'active' ? 'Active' : 'Completed';
    const chip = createFilterChip(statusLabel, '\u2713', { removable: true });
    chip.querySelector('.filter-chip__remove')
        .addEventListener('click', () => ctx.callbacks.onStatusFilter('all'));
    chips.appendChild(chip);
  }

  if (ctx.activeFilters.list) {
    const list = ctx.listMap.get(ctx.activeFilters.list);
    const listLabel = list ? list.name : ctx.activeFilters.list;
    const chip = createFilterChip(listLabel, '\u2B24', { removable: true });
    chip.querySelector('.filter-chip__remove')
        .addEventListener('click', () => ctx.callbacks.onListFilter(null));
    chips.appendChild(chip);
  }

  if (ctx.activeFilters.tag) {
    const chip = createFilterChip(ctx.activeFilters.tag, '#', { removable: true });
    chip.querySelector('.filter-chip__remove')
        .addEventListener('click', () => ctx.callbacks.onTagFilter(null));
    chips.appendChild(chip);
  }

  if (ctx.activeFilters.search) {
    const chip = createFilterChip(ctx.activeFilters.search, '\u223C', { removable: true });
    chip.querySelector('.filter-chip__remove')
        .addEventListener('click', () => ctx.callbacks.onSearchFilter(''));
    chips.appendChild(chip);
  }

  container.appendChild(chips);

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'filter-summary__clear';
  clearBtn.textContent = 'Clear All';
  clearBtn.addEventListener('click', ctx.callbacks.onClearFilters);
  container.appendChild(clearBtn);
}

export function renderDetailPanel(ctx) {
  const panel = document.querySelector('.detail-panel');
  const task = ctx.selectedTask;

  if (!task) {
    panel.hidden = true;
    panel.innerHTML = '';
    delete panel.dataset.taskId;
    return;
  }

  // Skip rebuild if same task AND panel holds focus.
  if (panel.dataset.taskId === task.id && panel.contains(document.activeElement)) return;

  panel.hidden = false;
  panel.innerHTML = '';
  panel.dataset.taskId = task.id;

  const header = document.createElement('header');
  header.className = 'detail-panel__header';

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.className = 'detail-panel__title-input';
  titleInput.value = task.title;
  titleInput.setAttribute('aria-label', 'Task title');

  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!ctx.callbacks.onUpdateTitle(titleInput.value)) {
        titleInput.select();
      }
    }
  });

  const closeBtn = document.createElement('button');
  closeBtn.className = 'detail-panel__close';
  closeBtn.type = 'button';
  closeBtn.textContent = '\u00d7';
  closeBtn.setAttribute('aria-label', 'Close panel');
  closeBtn.addEventListener('click', ctx.callbacks.onClosePanel);

  header.append(titleInput, closeBtn);
  panel.appendChild(header);

  const body = document.createElement('dl');
  body.className = 'detail-panel__body';

  if (task.dueDate) {
    const field = document.createElement('div');
    field.className = 'detail-panel__field';

    const dt = document.createElement('dt');
    dt.className = 'detail-panel__label';
    dt.textContent = 'Due Date';

    const dd = document.createElement('dd');
    dd.className = 'detail-panel__value';

    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.className = 'detail-panel__date-input';
    dateInput.value = task.dueDate;
    dateInput.setAttribute('aria-label', 'Due date');

    dateInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!ctx.callbacks.onUpdateDueDate(dateInput.value)) {
          dateInput.focus();
        }
      }
    });

    dd.appendChild(dateInput);
    field.append(dt, dd);
    body.appendChild(field);
  }

  const listField = document.createElement('div');
  listField.className = 'detail-panel__field';

  const listDt = document.createElement('dt');
  listDt.className = 'detail-panel__label';
  listDt.textContent = 'List';

  const listDd = document.createElement('dd');
  listDd.className = 'detail-panel__value';

  const select = document.createElement('select');
  select.className = 'detail-panel__list-select';
  select.setAttribute('aria-label', 'Task list');

  const noneOpt = document.createElement('option');
  noneOpt.value = '';
  noneOpt.textContent = 'None';
  if (!task.listId) noneOpt.selected = true;
  select.appendChild(noneOpt);

  ctx.lists.forEach((list) => {
    const opt = document.createElement('option');
    opt.value = list.id;
    opt.textContent = list.name;
    if (task.listId === list.id) opt.selected = true;
    select.appendChild(opt);
  });

  select.addEventListener('change', () => {
    ctx.callbacks.onUpdateList(select.value);
  });

  listDd.appendChild(select);
  listField.append(listDt, listDd);
  body.appendChild(listField);

  // Tags
  const tagsField = document.createElement('div');
  tagsField.className = 'detail-panel__field';

  const tagsDt = document.createElement('dt');
  tagsDt.className = 'detail-panel__label';
  tagsDt.textContent = 'Tags';

  const tagsDd = document.createElement('dd');
  tagsDd.className = 'detail-panel__value';

  const tagsContainer = document.createElement('div');
  tagsContainer.className = 'detail-panel__tags';

  if (task.tags) {
    task.tags.forEach((tag) => {
      const isActive = ctx.activeFilters.tag && tag.toLowerCase() === ctx.activeFilters.tag.toLowerCase();
      const chip = createTagChip(tag, { removable: true, active: isActive });
      chip.querySelector('.tag-chip__remove')
          .addEventListener('click', () => ctx.callbacks.onRemoveTag(tag));
      tagsContainer.appendChild(chip);
    });
  }

  tagsDd.appendChild(tagsContainer);

  const addTagBtn = document.createElement('button');
  addTagBtn.className = 'detail-panel__tag-add';
  addTagBtn.type = 'button';
  addTagBtn.textContent = '+ Add Tag';

  function showTagInput() {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'detail-panel__tag-input';
    input.placeholder = 'Add tag...';
    input.setAttribute('aria-label', 'Add tag');

    tagsDd.replaceChild(input, addTagBtn);
    input.focus();

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const added = ctx.callbacks.onAddTag(input.value);
        if (added.length > 0) {
          input.value = '';
        } else {
          input.select();
        }
      }
      if (e.key === 'Escape') {
        e.stopPropagation();
        tagsDd.replaceChild(addTagBtn, input);
      }
    });
  }

  addTagBtn.addEventListener('click', showTagInput);
  tagsDd.appendChild(addTagBtn);

  tagsField.append(tagsDt, tagsDd);
  body.appendChild(tagsField);

  if (task.subtasks && task.subtasks.length > 0) {
    body.appendChild(createDetailField('Subtasks', task.subtasks.length + ' subtasks'));
  }

  panel.appendChild(body);
}