import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['unit/**/*.test.js', 'integration/**/*.test.js'],
    testTimeout: 20000,
    hookTimeout: 20000
  }
});
