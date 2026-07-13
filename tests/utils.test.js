import { describe, it, expect, vi, afterEach } from 'vitest';
import { validateTitle, removeDuplicate, resolveDueDate } from '../js/utils.js';

// ===== validateTitle =====

describe('validateTitle', () => {
  it('returns true for a valid title', () => {
    expect(validateTitle('Buy milk')).toBe(true);
  });

  it('trims whitespace and returns true', () => {
    expect(validateTitle('   Buy milk   ')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(validateTitle('')).toBe(false);
  });

  it('returns false for whitespace-only string', () => {
    expect(validateTitle('     ')).toBe(false);
  });
});

// ===== removeDuplicate =====

describe('removeDuplicate', () => {
  it('removes tags that already exist in the existing list', () => {
    expect(removeDuplicate(['Work'], ['Work'])).toEqual([]);
  });

  it('compares case-insensitively against existing tags', () => {
    expect(removeDuplicate(['work'], ['Work'])).toEqual([]);
    expect(removeDuplicate(['WORK'], ['work'])).toEqual([]);
  });

  it('removes duplicates within the incoming array', () => {
    expect(removeDuplicate(['Work', 'Work', 'Meeting'], [])).toEqual(['Work', 'Meeting']);
  });

  it('removes case-insensitive duplicates within the incoming array', () => {
    expect(removeDuplicate(['Work', 'work', 'Meeting'], [])).toEqual(['Work', 'Meeting']);
  });

  it('preserves unique tags', () => {
    expect(removeDuplicate(['Work', 'Meeting'], [])).toEqual(['Work', 'Meeting']);
  });

  it('handles both existing and incoming duplicates together', () => {
    expect(removeDuplicate(['Work', 'Meeting', 'work', 'meeting'], ['Work'])).toEqual(['Meeting']);
  });

  it('returns empty array when all incoming tags are duplicates', () => {
    expect(removeDuplicate(['Work', 'Work'], ['Work'])).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(removeDuplicate([], ['Work'])).toEqual([]);
  });
});

// ===== resolveDueDate =====

describe('resolveDueDate', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns today for "today"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T12:00:00'));
    expect(resolveDueDate('today')).toBe('2026-07-15');
  });

  it('returns tomorrow for "tomorrow"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T12:00:00'));
    expect(resolveDueDate('tomorrow')).toBe('2026-07-16');
  });

  it('returns end of week (Sunday) for "thisWeek"', () => {
    // Wednesday July 15 → Sunday July 19 (daysUntilSunday = 7 - 3 = 4)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T12:00:00'));
    expect(resolveDueDate('thisWeek')).toBe('2026-07-19');
  });

  it('defaults to today for invalid group key', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T12:00:00'));
    expect(resolveDueDate('invalid')).toBe('2026-07-15');
  });
});