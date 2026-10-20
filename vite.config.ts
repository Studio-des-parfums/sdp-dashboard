import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
  // Electron charge l'app via file://, qui a besoin de chemins relatifs ("./assets/...").
  // Le web (Amplify) est servi sous des routes profondes (/project/polux/...) : les chemins
  // doivent rester absolus ("/assets/...") sinon le navigateur les résout par rapport à l'URL
  // courante et charge les assets au mauvais endroit (404 / mauvais type MIME).
  base: process.env.BUILD_TARGET === 'web' ? '/' : './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron', 'electron-updater'],
            },
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart(args) {
          args.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
    ]),
    renderer(),
  ],
})
