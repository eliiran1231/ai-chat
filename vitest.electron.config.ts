import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/electron/**/*.spec.ts'],
    clearMocks: true,
  },
});
