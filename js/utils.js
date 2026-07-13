// utils.js — Pure helper functions (no DOM, no state, no side effects)

// ===== DATE HELPERS =====

export function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDateBoundaries() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const endOfWeek = new Date(today);
  const daysUntilSunday = today.getDay() === 0 ? 0 : 7 - today.getDay();
  endOfWeek.setDate(endOfWeek.getDate() + daysUntilSunday);

  return { today, tomorrow, endOfWeek };
}

// ===== TASK DATA =====

export function resolveDueDate(groupKey) {
  const { today, tomorrow, endOfWeek } = getDateBoundaries();

  if (groupKey === 'today') return toDateStr(today);
  if (groupKey === 'tomorrow') return toDateStr(tomorrow);
  if (groupKey === 'thisWeek') return toDateStr(endOfWeek);
  return toDateStr(today);
}

export function validateTitle(title) {
  return title.trim().length > 0;
}

export function removeDuplicate(newTags, existingTags) {
  const seen = existingTags.map((t) => t.toLowerCase());
  return newTags.filter((tag) => {
    const lower = tag.toLowerCase();
    if (seen.includes(lower)) return false;
    seen.push(lower);
    return true;
  });
}