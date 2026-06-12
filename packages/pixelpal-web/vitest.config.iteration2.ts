import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config.test.ts';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    setupFiles: ['./src/vitest.setup.ts'],
  },
});