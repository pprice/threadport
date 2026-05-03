import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        dataLoading: 'examples/data-loading/index.html',
        insets: 'examples/insets/index.html',
        index: 'index.html',
        jumpToBottom: 'examples/jump-to-bottom/index.html',
        mobile: 'examples/mobile/index.html',
        prepend: 'examples/prepend/index.html',
        standard: 'examples/standard/index.html',
      },
    },
  },
  plugins: [react()],
})
