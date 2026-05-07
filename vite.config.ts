import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import path from 'node:path'

const isGitHubPages = !!process.env.GITHUB_PAGES

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version || '0.0.0'),
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    ...(isGitHubPages ? [] : [
      electron([
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
      ]),
    ]),
  ],
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  base: isGitHubPages ? '/pixel-pal-web/' : './',
})
