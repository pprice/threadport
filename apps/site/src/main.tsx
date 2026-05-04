import './lib/styles.css'
import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { Route, Router, Switch, useLocation } from 'wouter'
import { ExamplesApp } from './examples/ExamplesApp'
import { Home } from './home'

function NotFoundRedirect() {
  const [, setLocation] = useLocation()

  useEffect(() => {
    setLocation('/', { replace: true })
  }, [setLocation])

  return null
}

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/examples/:rest*" component={ExamplesApp} />
        <Route>
          <NotFoundRedirect />
        </Route>
      </Switch>
    </Router>
  )
}

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
