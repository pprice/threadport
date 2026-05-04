import type { ReactNode } from 'react'
import { examples } from './examples-meta'

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

  const panelContent = (
    <>
      <h1 id={`${activeId}-title`}>{title}</h1>
      <p className="lede">{summary}</p>
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

  return <div className="exampleLayout">{layoutContent}</div>
}
