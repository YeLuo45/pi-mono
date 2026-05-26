import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/__tests__/**/*.test.tsx', 'src/components/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporters: ['text', 'html'],
      reportOnFailure: true,
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/__tests__/**',
        '**/mocks/**',
        'src/**/index.ts',
        'src/store/**',
        'src/contexts/**',
        'src/App.tsx',
        'src/main.tsx',
        'src/index.css',
        'src/services/orchestrator/**',
        'src/services/agentBuilder/**',
        'electron/**',
        'public/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});