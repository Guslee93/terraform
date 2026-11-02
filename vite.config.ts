import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'

/** App version for export provenance (ADR-0011 §2), from package.json so it never drifts. */
export const appVersion = (JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }).version

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { __APP_VERSION__: JSON.stringify(appVersion) },
  build: {
    target: 'es2022',
    sourcemap: true,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              // three / @react-three/fiber / @react-three/drei form one vendor
              // chunk that only the lazy studio route imports, so the landing
              // chunk never loads the 3D runtime. Dependency inclusion stays
              // off: a recursive pull would also absorb three's peers (and
              // react/react-dom/zustand via drei), duplicating React between
              // the landing and studio chunks.
              name: 'three-vendor',
              test: /node_modules[\\/](?:three|@react-three)(?:[\\/]|$)/,
              includeDependenciesRecursively: false,
            },
          ],
        },
      },
    },
  },
})
