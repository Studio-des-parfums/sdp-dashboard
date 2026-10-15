// Config de dev temporaire : sert uniquement le frontend web, sans lancer Electron.
// Utilisée pour inspecter le dashboard dans un navigateur sans le crash local du plugin
// vite-plugin-electron. Ne pas committer, ne pas utiliser pour le build de production
// (voir vite.config.ts pour la config réelle).
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react()],
})
