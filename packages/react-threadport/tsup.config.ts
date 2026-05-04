import { defineConfig } from 'tsup'

export default defineConfig({
  clean: true,
  dts: true,
  entry: ['src/index.ts'],
  external: ['@tanstack/react-virtual', 'react', 'react/jsx-runtime'],
  format: ['esm'],
  sourcemap: true,
  target: 'es2020',
})
