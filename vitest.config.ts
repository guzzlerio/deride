import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    reporters: ['verbose'],
    coverage: {
      provider: 'istanbul',
      all: true, // include files never imported by tests
      reportsDirectory: './reports',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['.yarn/**', '**/*.spec.ts', 'dist/**', 'test/**'],
      thresholds: {
        lines: 90,
        branches: 85,
        functions: 90,
        statements: 90,
      },
    },
  },
})
