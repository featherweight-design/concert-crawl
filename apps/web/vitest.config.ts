import { defineConfig } from 'vitest/config'
import { availableParallelism } from 'node:os'
import path from 'path'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    // Vitest sizes its fork pool at `availableParallelism() - 1`, which is 1 on
    // GitHub's 2-core runners — the whole suite then runs in a single process.
    poolOptions: { forks: { maxForks: availableParallelism() } },
  },
})
