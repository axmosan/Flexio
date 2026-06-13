import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  // CEP uses file:// protocol — all asset URLs must be relative
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Rollup externals: Node built-ins are provided by CEP runtime, not bundled
    rollupOptions: {
      input: {
        panel: resolve(__dirname, 'src/panel/index.html'),
        settings: resolve(__dirname, 'src/settings/index.html'),
      },
      output: {
        // Keep panel.html and settings.html in their own subdir
        // so relative CSS/JS refs work from CEP's file:// context
        entryFileNames: (chunk) => `${chunk.name}/[name].js`,
        chunkFileNames: 'shared/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  // Allow SVG imports as raw strings (?raw) or URLs (default)
  assetsInclude: ['**/*.svg'],
})
