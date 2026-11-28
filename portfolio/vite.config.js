import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// User/org GitHub Pages site (ansarbuilds.github.io) is served from
// the domain root, so base stays "/".
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          // Framer Motion has no group of its own on purpose: only the older
          // write-ups (lazy) use it, and a named group pulled React's JSX
          // runtime in with it, which put it in every page's first load.
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/') || id.includes('/node_modules/scheduler/')) return 'react'
          if (id.includes('/lucide-react/')) return 'icons'
          if (id.includes('/framer-motion/') || id.includes('/motion-dom/') || id.includes('/motion-utils/')) return undefined
          return 'vendor'
        },
      },
    },
  },
})
