import { type ReactElement, useEffect, useState } from 'react'
import { Link, Route, Router, Switch, useLocation } from 'wouter'
import DataLoadingExample from './pages/data-loading'
import FullscreenExample from './pages/fullscreen'
import InsetsExample from './pages/insets'
import JumpToBottomExample from './pages/jump-to-bottom'
import LongResponseExample from './pages/long-response'
import MobileExample from './pages/mobile'
import PrependExample from './pages/prepend'
import StandardExample from './pages/standard'
import VariableHeightExample from './pages/variable-height'
import { examples, mountPage, REPO_URL } from './shared'

const ROUTE_COMPONENTS: Record<string, () => ReactElement> = {
  'data-loading': DataLoadingExample,
  fullscreen: FullscreenExample,
  insets: InsetsExample,
  'jump-to-bottom': JumpToBottomExample,
  'long-response': LongResponseExample,
  mobile: MobileExample,
  prepend: PrependExample,
  standard: StandardExample,
  'variable-height': VariableHeightExample,
}

function HamburgerIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.6"
      viewBox="0 0 20 20"
      width="20"
    >
      <path d="M3 6h14M3 10h14M3 14h14" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="18"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.6"
      viewBox="0 0 18 18"
      width="18"
    >
      <path d="M4 4l10 10M14 4L4 14" />
    </svg>
  )
}

function GithubIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      height="16"
      viewBox="0 0 16 16"
      width="16"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

function ExamplesRail({ onNavigate }: { onNavigate: () => void }) {
  const [location] = useLocation()
  const activeId = location.replace(/^\//, '') || 'standard'

  return (
    <nav className="examplesRail" aria-label="Examples">
      <a className="brand" href="/" onClick={onNavigate}>
        <span className="brandMark" aria-hidden="true" />
        Threadport
      </a>
      <ul className="railList">
        {examples.map((example) => (
          <li key={example.id}>
            <Link
              aria-current={activeId === example.id ? 'page' : undefined}
              href={`/${example.id}`}
              onClick={onNavigate}
            >
              {example.label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="railFooter">
        <a
          className="iconLink"
          href={REPO_URL}
          rel="noreferrer"
          target="_blank"
        >
          <GithubIcon />
          <span className="srOnly">View on GitHub</span>
        </a>
      </div>
    </nav>
  )
}

function App() {
  const [railOpen, setRailOpen] = useState(false)
  const [location] = useLocation()

  useEffect(() => {
    setRailOpen(false)
  }, [location])

  useEffect(() => {
    if (!railOpen) {
      return
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setRailOpen(false)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [railOpen])

  return (
    <div className="examplesShell" data-rail-open={railOpen ? 'true' : 'false'}>
      <ExamplesRail onNavigate={() => setRailOpen(false)} />
      <button
        aria-controls="examples-rail"
        aria-expanded={railOpen}
        aria-label={railOpen ? 'Close navigation' : 'Open navigation'}
        className="railHamburger"
        onClick={() => setRailOpen((current) => !current)}
        type="button"
      >
        {railOpen ? <CloseIcon /> : <HamburgerIcon />}
      </button>
      <button
        aria-hidden="true"
        className="railScrim"
        onClick={() => setRailOpen(false)}
        tabIndex={-1}
        type="button"
      />
      <main className="examplesMain">
        <Switch>
          {Object.entries(ROUTE_COMPONENTS).map(([id, Component]) => (
            <Route key={id} path={`/${id}`} component={Component} />
          ))}
          <Route>
            <RedirectToDefault />
          </Route>
        </Switch>
      </main>
    </div>
  )
}

function RedirectToDefault() {
  const [, setLocation] = useLocation()

  useEffect(() => {
    setLocation('/standard', { replace: true })
  }, [setLocation])

  return null
}

mountPage(
  <Router base="/examples">
    <App />
  </Router>,
)
