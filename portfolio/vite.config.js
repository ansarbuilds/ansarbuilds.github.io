import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// User/org GitHub Pages site (ansarbuilds.github.io) is served from
// the domain root, so base stays "/".
export default defineConfig({
  plugins: [react()],
  base: '/',
  // The 3D views import these lazily. Listed here so the dev server
  // prepares them at start, instead of finding them on first use and
  // reloading every open page (which also made browser tests flaky).
  optimizeDeps: {
    include: [
      'three',
      'lenis',
      '@react-three/fiber',
      'three/examples/jsm/postprocessing/EffectComposer.js',
      'three/examples/jsm/postprocessing/RenderPass.js',
      'three/examples/jsm/postprocessing/UnrealBloomPass.js',
      'three/examples/jsm/postprocessing/ShaderPass.js',
      'three/examples/jsm/postprocessing/OutputPass.js',
      'three/examples/jsm/geometries/RoundedBoxGeometry.js',
      'three/examples/jsm/environments/RoomEnvironment.js',
    ],
  },
  build: {
    outDir: 'dist',
    // Three.js is intentionally isolated below; its minified core is about
    // 650 kB, while the app entry is now split well under the default limit.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('/three/')) return 'three'
          if (id.includes('/framer-motion/') || id.includes('/motion-dom/') || id.includes('/motion-utils/')) return 'motion'
          if (id.includes('/lucide-react/')) return 'icons'
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'react'
          return 'vendor'
        },
      },
    },
  },
})
