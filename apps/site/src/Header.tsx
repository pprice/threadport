import { useState } from 'react'
import { BrandMark } from './lib/BrandMark'
import { THREADPORT_VERSION } from './version'

const INSTALL_COMMAND = 'npm i @phipri/react-threadport'
export const REPO_URL = 'https://github.com/pprice/threadport'

function InstallCopy() {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      return
    }

    navigator.clipboard
      .writeText(INSTALL_COMMAND)
      .then(() => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1400)
      })
      .catch(() => {})
  }

  return (
    <button
      aria-label={copied ? 'Copied install command' : 'Copy install command'}
      className="installCopy"
      onClick={handleCopy}
      type="button"
    >
      <code>{INSTALL_COMMAND}</code>
      <span aria-hidden="true" className="installCopyHint">
        {copied ? 'Copied' : 'Copy'}
      </span>
    </button>
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

export function SiteHeader() {
  return (
    <header className="siteHeader">
      <div className="siteHeaderInner">
        <a className="brand" href="/">
          <BrandMark />
          <span>react-threadport</span>
          <span className="versionBadge">v{THREADPORT_VERSION}</span>
        </a>
        <span aria-hidden="true" />
        <div className="headerActions">
          <a
            className="iconLink"
            href={REPO_URL}
            rel="noreferrer"
            target="_blank"
          >
            <GithubIcon />
            <span className="srOnly">View on GitHub</span>
          </a>
          <InstallCopy />
        </div>
      </div>
    </header>
  )
}
