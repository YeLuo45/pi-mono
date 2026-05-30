/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

const isGitHubPages = !!process.env.GITHUB_PAGES

// Electron plugin — only available in non-GitHub Pages builds
const electronPlugin = isGitHubPages ? [] : (() => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const electron = require('vite-plugin-electron');
  return electron.default([
    {
      entry: 'electron/main.ts',
      onstart(args) {
        args.startup();
      },
      vite: {
        build: {
          outDir: 'dist/main',
          rollupOptions: {
            external: ['electron'],
          },
        },
      },
    },
    {
      entry: 'electron/preload.ts',
      onstart(args) {
        args.reload();
      },
      vite: {
        build: {
          outDir: 'dist/main',
          rollupOptions: {
            external: ['electron'],
          },
        },
      },
    },
  ]);
})();

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
  define: {
    '__APP_VERSION__': JSON.stringify(process.env.npm_package_version || '1.0.0'),
    '__BUILD_HASH__': JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) || 'local'),
    '__BUILD_TIME__': JSON.stringify(new Date().toISOString()),
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version || '0.0.0'),
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    ...electronPlugin,
  ],
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: [
      { find: /^@mui\/icons-material\/.+$/, replacement: path.resolve(__dirname, './src/components/ui/muiIconsShim.tsx') },
      { find: '@mui/icons-material', replacement: path.resolve(__dirname, './src/components/ui/muiIconsShim.tsx') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  base: isGitHubPages ? '/pixel-pal-web/' : './',
})
