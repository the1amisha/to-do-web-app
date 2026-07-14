// storage.js — Persistence layer (localStorage serialization/deserialization)
//
// Only this module knows about localStorage.
// All invalid/malformed data is handled gracefully.

const TASKS_KEY = 'todo_tasks';
const LISTS_KEY = 'todo_lists';

// ===== Tasks =====

export function saveTasks(tasks) {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save tasks:', e);
  }
}

export function loadTasks(migrate) {
  try {
    const stored = localStorage.getItem(TASKS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return typeof migrate === 'function' ? parsed.map(migrate) : parsed;
  } catch (e) {
    console.error('Failed to load tasks:', e);
    return [];
  }
}

// ===== Lists =====

export function saveLists(lists) {
  try {
    localStorage.setItem(LISTS_KEY, JSON.stringify(lists));
  } catch (e) {
    console.error('Failed to save lists:', e);
  }
}

export function loadLists() {
  try {
    const stored = localStorage.getItem(LISTS_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch (e) {
    console.error('Failed to load lists:', e);
    return null;
  }
}