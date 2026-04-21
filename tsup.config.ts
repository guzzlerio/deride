import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    clock: 'src/clock.ts',
    vitest: 'src/vitest.ts',
    jest: 'src/jest.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: ['vitest', '@jest/globals', 'jest'],
})
