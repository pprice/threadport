import '@phipri/react-threadport-demo-shared/styles.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Home } from './home'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <Home />
  </StrictMode>,
)
