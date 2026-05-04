import '@phipri/react-threadport-demo-shared/styles.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PlaygroundApp } from './app'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <PlaygroundApp />
  </StrictMode>,
)
