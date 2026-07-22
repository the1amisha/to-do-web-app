// filters.js — Pure filter logic (no state, no DOM, no side effects)

export const VALID_STATUSES = ["all", "active", "completed"];

export function hasActiveFilters(filters) {
  return (
    filters.status !== "all" ||
    filters.list !== null ||
    filters.tag !== null ||
    filters.search !== ""
  );
}

export function getFilteredTasks(tasks, filters) {
  let visible = [...tasks];

  if (filters.status === "active") {
    visible = visible.filter((t) => !t.completed);
  } else if (filters.status === "completed") {
    visible = visible.filter((t) => t.completed);
  }

  if (filters.list) {
    visible = visible.filter((t) => t.listId === filters.list);
  }

  if (filters.tag) {
    visible = visible.filter((t) =>
      t.tags?.some((tag) => tag.toLowerCase() === filters.tag.toLowerCase()),
    );
  }

  if (filters.search) {
    visible = visible.filter((t) =>
      t.title.toLowerCase().includes(filters.search),
    );
  }

  return visible;
}
