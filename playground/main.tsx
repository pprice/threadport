import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ApiHarness } from './ApiHarness'
import { App } from './App'
import './styles.css'

const isApiHarness = new URLSearchParams(window.location.search).get('fixture') === 'api'
const Root = isApiHarness ? ApiHarness : App

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
