// Sprint 13 PR #1 — Verify testing infrastructure works

import { describe, it, expect } from 'vitest';

describe('infrastructure', () => {
  it('vitest runs', () => {
    expect(1 + 1).toBe(2);
  });
});