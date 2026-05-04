import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['tests/react/**/*.test.tsx'],
    setupFiles: ['./tests/react/setup.ts'],
  },
})
