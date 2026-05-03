import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        basic: 'examples/basic/index.html',
        controls: 'examples/controls/index.html',
        empty: 'examples/empty/index.html',
        history: 'examples/history/index.html',
        index: 'index.html',
        mobile: 'examples/mobile/index.html',
        streaming: 'examples/streaming/index.html',
        tailReserve: 'examples/tail-reserve/index.html',
      },
    },
  },
  plugins: [react()],
})
