import { describe, it, expect } from 'vitest';
import { VALID_STATUSES, hasActiveFilters, getFilteredTasks } from '../js/filters.js';

// ===== Fixtures =====

const DEFAULT_FILTERS = { status: 'all', list: null, tag: null, search: '' };

function makeTask(overrides = {}) {
  return {
    id: '1',
    title: 'Buy milk',
    completed: false,
    listId: 'personal',
    tags: ['Work'],
    dueDate: '2026-07-15',
    ...overrides,
  };
}

// ===== VALID_STATUSES =====

describe('VALID_STATUSES', () => {
  it('contains all three status values', () => {
    expect(VALID_STATUSES).toEqual(['all', 'active', 'completed']);
  });
});

// ===== hasActiveFilters =====

describe('hasActiveFilters', () => {
  it('returns false when all filters are at default values', () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
  });

  it('returns true when status is active', () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, status: 'active' })).toBe(true);
  });

  it('returns true when status is completed', () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, status: 'completed' })).toBe(true);
  });

  it('returns false when status is all', () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, status: 'all' })).toBe(false);
  });

  it('returns true when a list is set', () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, list: 'work' })).toBe(true);
  });

  it('returns true when a tag is set', () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, tag: 'Work' })).toBe(true);
  });

  it('returns true when search is non-empty', () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, search: 'milk' })).toBe(true);
  });

  it('returns false when search is empty string', () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, search: '' })).toBe(false);
  });

  it('returns true with multiple filters active', () => {
    const filters = { status: 'active', list: 'work', tag: 'Meeting', search: 'report' };
    expect(hasActiveFilters(filters)).toBe(true);
  });
});

// ===== getFilteredTasks =====

describe('getFilteredTasks', () => {
  const tasks = [
    makeTask({ id: '1', title: 'Buy milk', completed: false, listId: 'personal', tags: ['Work'] }),
    makeTask({ id: '2', title: 'Read book', completed: true, listId: 'work', tags: ['Meeting'] }),
    makeTask({ id: '3', title: 'Walk dog', completed: false, listId: null, tags: [] }),
  ];

  // --- immutability ---

  it('does not mutate the original tasks array', () => {
    const original = JSON.parse(JSON.stringify(tasks));
    getFilteredTasks(tasks, DEFAULT_FILTERS);
    expect(tasks).toEqual(original);
  });

  it('does not mutate tasks when filtering by status', () => {
    const original = JSON.parse(JSON.stringify(tasks));
    getFilteredTasks(tasks, { ...DEFAULT_FILTERS, status: 'active' });
    expect(tasks).toEqual(original);
  });

  // --- status filtering ---

  it('returns only active tasks when status is "active"', () => {
    const result = getFilteredTasks(tasks, { ...DEFAULT_FILTERS, status: 'active' });
    expect(result).toHaveLength(2);
    expect(result.every((t) => !t.completed)).toBe(true);
  });

  it('returns only completed tasks when status is "completed"', () => {
    const result = getFilteredTasks(tasks, { ...DEFAULT_FILTERS, status: 'completed' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('returns all tasks when status is "all"', () => {
    const result = getFilteredTasks(tasks, DEFAULT_FILTERS);
    expect(result).toHaveLength(3);
  });

  // --- list filtering ---

  it('filters by list id', () => {
    const result = getFilteredTasks(tasks, { ...DEFAULT_FILTERS, list: 'personal' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('excludes tasks with null listId when filtering by list', () => {
    const result = getFilteredTasks(tasks, { ...DEFAULT_FILTERS, list: 'work' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  // --- tag filtering ---

  it('filters by tag (case-insensitive)', () => {
    const result = getFilteredTasks(tasks, { ...DEFAULT_FILTERS, tag: 'work' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by tag regardless of case in the filter', () => {
    const result = getFilteredTasks(tasks, { ...DEFAULT_FILTERS, tag: 'MEETING' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('excludes tasks without tags property when filtering by tag', () => {
    const tasksNoTags = [makeTask({ id: '1', tags: undefined })];
    const result = getFilteredTasks(tasksNoTags, { ...DEFAULT_FILTERS, tag: 'Work' });
    expect(result).toHaveLength(0);
  });

  it('excludes tasks with empty tags array when filtering by tag', () => {
    const result = getFilteredTasks(tasks, { ...DEFAULT_FILTERS, tag: 'Work' });
    expect(result.find((t) => t.id === '3')).toBeUndefined();
  });

  // --- search filtering ---

  it('filters by search substring (case-insensitive)', () => {
    const result = getFilteredTasks(tasks, { ...DEFAULT_FILTERS, search: 'milk' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('search compares against lowercase title', () => {
    const result = getFilteredTasks(tasks, { ...DEFAULT_FILTERS, search: 'buy' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('search matches partial title', () => {
    const result = getFilteredTasks(tasks, { ...DEFAULT_FILTERS, search: 'bu' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  // --- stacked filters ---

  it('applies status and list filters together', () => {
    const result = getFilteredTasks(tasks, {
      ...DEFAULT_FILTERS,
      status: 'active',
      list: 'personal',
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('applies all four filters together', () => {
    const result = getFilteredTasks(tasks, {
      status: 'active',
      list: 'personal',
      tag: 'work',
      search: 'milk',
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('returns empty when stacked filters eliminate everything', () => {
    const result = getFilteredTasks(tasks, {
      status: 'completed',
      list: 'personal',
      tag: 'Meeting',
      search: 'milk',
    });
    expect(result).toHaveLength(0);
  });

  // --- edge cases ---

  it('returns empty array for empty input', () => {
    const result = getFilteredTasks([], DEFAULT_FILTERS);
    expect(result).toEqual([]);
  });

  it('returns empty array when no tasks match', () => {
    const result = getFilteredTasks(tasks, { ...DEFAULT_FILTERS, search: 'nonexistent' });
    expect(result).toHaveLength(0);
  });
});