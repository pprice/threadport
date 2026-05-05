import { type ReactNode, useEffect, useState } from 'react'
import { examples } from './examples-meta'

const WEB_DETAILS_QUERY = '(min-width: 761px)'

function matchesWebDetails() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia(WEB_DETAILS_QUERY).matches
  )
}

export function ExamplePage({
  activeId,
  aside,
  children,
  notes,
  summary,
  title,
}: {
  activeId: string
  aside?: ReactNode
  children: ReactNode
  notes: string[]
  summary: string
  title: string
}) {
  const activeExample = examples.find((example) => example.id === activeId)
  const [detailsOpen, setDetailsOpen] = useState(matchesWebDetails)

  useEffect(() => {
    const media = window.matchMedia(WEB_DETAILS_QUERY)
    const syncDetailsState = () => setDetailsOpen(media.matches)

    syncDetailsState()
    media.addEventListener('change', syncDetailsState)

    return () => media.removeEventListener('change', syncDetailsState)
  }, [activeId])

  const panelContent = (
    <>
      <h1 id={`${activeId}-title`}>{title}</h1>
      <p className="lede">{summary}</p>
      {(activeExample || aside) && (
        <details
          className="exampleDisclosure"
          onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
          open={detailsOpen}
        >
          <summary aria-label="Details: notes, source, controls">
            <span className="exampleDisclosureText">
              <span className="exampleDisclosureLabel">Details</span>
              <span className="exampleDisclosureHint">
                Notes, source, controls
              </span>
            </span>
          </summary>
          <div className="exampleDisclosureBody">
            <ul className="noteList">
              {notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
            {activeExample && (
              <section className="integrationPanel" aria-label="Integration">
                <div className="integrationHeader">
                  <span>Source</span>
                  <a
                    className="sourceLink"
                    href={`https://github.com/pprice/threadport/blob/main/${activeExample.sourcePath}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {activeExample.sourcePath}
                  </a>
                </div>
                <div>
                  <p>Inspect</p>
                  <ul className="integrationList">
                    {activeExample.integration.map((item) => (
                      <li key={item}>
                        <code>{item}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
            {aside && (
              <aside className="demoAside" aria-label={`${title} controls`}>
                {aside}
              </aside>
            )}
          </div>
        </details>
      )}
    </>
  )

  const layoutContent = (
    <>
      <section className="examplePanel" aria-labelledby={`${activeId}-title`}>
        {panelContent}
      </section>
      <section className="demoStage" aria-label={`${title} demo`}>
        {children}
      </section>
    </>
  )

  return (
    <div className="exampleLayout" data-example-id={activeId}>
      {layoutContent}
    </div>
  )
}
