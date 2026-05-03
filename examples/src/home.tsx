import {
  createTranscript,
  estimateMessageSize,
  examples,
  getMessageKey,
  MessageView,
  mountPage,
  SiteHeader,
  ThreadPort,
} from './shared'

function Home() {
  const previewMessages = createTranscript(6)

  return (
    <div className="siteRoot">
      <SiteHeader />
      <main className="homeMain">
        <section className="homeHero">
          <div>
            <p className="eyebrow">Headless React primitive</p>
            <h1>Chat viewports without product opinions.</h1>
            <p className="lede">
              Threadport gives React apps the scroll mechanics behind modern
              chat surfaces: dynamic measurement, prepend anchoring, overlays,
              imperative scroll commands, and optional tail reserve. Your app
              keeps the messages, composer, buttons, styling, and layout.
            </p>
            <div className="homeActions">
              <a className="button primary" href="/examples/basic/">
                Open basic example
              </a>
              <a className="button" href="/examples/empty/">
                See empty state
              </a>
            </div>
          </div>

          <ThreadPort.Root className="previewFrame">
            <ThreadPort.Viewport
              ariaLabel="Threadport preview transcript"
              className="exampleViewport"
              contentClassName="exampleContent"
              estimateSize={estimateMessageSize}
              getItemKey={getMessageKey}
              headInset={28}
              initialAnchor="tail"
              itemClassName="exampleRow"
              items={previewMessages}
              renderItem={({ item }) => <MessageView message={item} />}
              role="log"
              tailInset={32}
              virtualizerOptions={{ overscan: 4 }}
            />
          </ThreadPort.Root>
        </section>

        <section className="sectionHeader">
          <p className="eyebrow">Examples</p>
          <h2>Small pages for focused behavior</h2>
          <p className="lede">
            Each example is its own page. No scenario switcher, no hidden test
            route, no shared app state that makes the integration harder to
            read.
          </p>
        </section>

        <section className="exampleDirectory" aria-label="Example directory">
          {examples.map((example) => (
            <a className="exampleLink" href={example.href} key={example.id}>
              <strong>{example.label}</strong>
              <span>{example.description}</span>
            </a>
          ))}
        </section>

        <section className="principles" aria-label="Threadport principles">
          <div>
            <h3>Headless by default</h3>
            <p>
              The viewport owns scroll behavior. The integrator owns product UI,
              message rendering, and empty states.
            </p>
          </div>
          <div>
            <h3>Variable height first</h3>
            <p>
              Rows are estimated and measured so chat content can include text,
              code, previews, controls, and arbitrary response blocks.
            </p>
          </div>
          <div>
            <h3>Stable under change</h3>
            <p>
              Prepends preserve the visible anchor, appends can reserve active
              tail space, and imperative commands stay explicit.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}

mountPage(<Home />)
