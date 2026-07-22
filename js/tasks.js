// tasks.js — Task data operations (creation, lookup, mutation)
//
// All mutation functions accept a `tasks` array and operate on it directly.
// This keeps the module testable with plain arrays — no module-level state.

// ===== Creation =====

export function createTask(title, options = {}) {
  return {
    id: crypto.randomUUID(),
    title: title.trim(),
    completed: false,
    listId: options.listId || null,
    dueDate: options.dueDate || "",
    tags: options.tags || [],
    subtasks: options.subtasks || [],
    createdAt: Date.now(),
  };
}

// ===== Lookup =====

export function findTaskIndex(tasks, id) {
  return tasks.findIndex((t) => t.id === id);
}

export function findTask(tasks, id) {
  return tasks.find((t) => t.id === id) || null;
}

// ===== Mutation =====

export function addTask(tasks, task) {
  tasks.push(task);
}

export function deleteTask(tasks, index) {
  return tasks.splice(index, 1)[0];
}

export function toggleTask(tasks, id) {
  const task = findTask(tasks, id);
  if (task) task.completed = !task.completed;
}

export function editTask(tasks, id, updates) {
  const task = findTask(tasks, id);
  if (!task) return false;
  Object.assign(task, updates);
  return true;
}
