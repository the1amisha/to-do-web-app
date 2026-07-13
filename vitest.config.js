import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // No jsdom for now — pure function tests only
  },
});