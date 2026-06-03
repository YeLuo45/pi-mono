/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { createRequire, builtinModules } from 'node:module'

const require = createRequire(import.meta.url)

const isGitHubPages = !!process.env.GITHUB_PAGES

const externalBuiltins = ['electron', ...builtinModules, ...builtinModules.map(m => `node:${m}`)]

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
          rolldownOptions: {
            platform: 'node',
            external: externalBuiltins,
          },
          rollupOptions: {
            external: externalBuiltins,
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
          rolldownOptions: {
            platform: 'node',
            external: externalBuiltins,
          },
          rollupOptions: {
            external: externalBuiltins,
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
    react({
      jsxImportSource: '@emotion/react',
    }),
    ...electronPlugin,
  ],
  oxc: {
    jsx: {
      importSource: '@emotion/react',
    },
  },
  optimizeDeps: {
    exclude: ['discord.js', 'node-telegram-bot-api'],
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      // V172: Externalize node-telegram-bot-api and discord.js for GitHub Pages builds
      // These packages require Node.js APIs and cannot run in browser environment
      // They are loaded via dynamic import() at runtime and should not be bundled
      external: isGitHubPages ? ['discord.js', 'node-telegram-bot-api'] : [],
    },
  },
  resolve: {
    alias: [
      { find: /^@mui\/icons-material\/.+$/, replacement: path.resolve(__dirname, './src/components/ui/muiIconsShim.tsx') },
      { find: '@mui/icons-material', replacement: path.resolve(__dirname, './src/components/ui/muiIconsShim.tsx') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
      // Node-only channel SDKs — stub in dev/renderer; externalized in GitHub Pages build
      ...(isGitHubPages ? [] : [
        { find: 'discord.js', replacement: path.resolve(__dirname, './src/stubs/discord-js.stub.ts') },
        { find: 'node-telegram-bot-api', replacement: path.resolve(__dirname, './src/stubs/node-telegram-bot-api.stub.ts') },
      ]),
    ],
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  base: isGitHubPages ? '/pixel-pal-web/' : './',
})
