import { defineConfig } from 'vitest/config'


export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ["tests/**/*.test.ts"],
    // mongodb-memory-server downloads and boots a real mongod on first run.
    hookTimeout: 120_000,
    testTimeout: 30_000,
    // Each file gets its own process so Mongoose's global model registry and
    // the transaction-support probe cannot leak between suites.
    pool: 'forks',
    setupFiles: ['tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
})
