import { useEffect, useRef, useState } from 'react'
import {
  createMessage,
  type DemoMessage,
  estimateMessageSize,
  examples,
  getMessageKey,
  MessageView,
  mountPage,
  SiteHeader,
  ThreadPort,
  useReducedMotion,
} from './shared'

const previewPrompt = 'Reserve space for the next answer.'
const previewChunks = [
  ' The prompt anchors near the top.',
  ' Threadport gives the new assistant row breathing room.',
  ' The host still owns this composer, copy, and visual treatment.',
]

function createPreviewSeed() {
  return [
    createMessage(
      'system',
      'This preview uses Threadport for scroll behavior. The message UI is ordinary React.',
      'note',
      'Boundary',
    ),
    createMessage(
      'assistant',
      'Variable-height rows are measured after paint, so the viewport tracks real content instead of guesses.',
    ),
    createMessage('user', 'Can a new response start with room below it?'),
  ]
}

function Home() {
  const viewportRef = useRef<ThreadPort.ViewportHandle | null>(null)
  const reducedMotion = useReducedMotion()
  const [previewMessages, setPreviewMessages] =
    useState<DemoMessage[]>(createPreviewSeed)
  const [draft, setDraft] = useState('')
  const [phase, setPhase] = useState<'typing' | 'reserved' | 'streaming'>(
    'typing',
  )

  useEffect(() => {
    const timers: number[] = []
    const schedule = (callback: () => void, delay: number) => {
      const id = window.setTimeout(callback, delay)

      timers.push(id)
    }

    function runCycle() {
      setPreviewMessages(createPreviewSeed())
      setDraft('')
      setPhase('typing')

      const characters = reducedMotion
        ? [previewPrompt]
        : previewPrompt.split('')
      const typingDelay = reducedMotion ? 0 : 34

      characters.forEach((text, index) => {
        schedule(
          () => {
            setDraft((current) => `${current}${text}`)
          },
          380 + index * typingDelay,
        )
      })

      schedule(
        () => {
          const userMessage = createMessage('user', previewPrompt)
          const assistantMessage = createMessage(
            'assistant',
            'Starting with active tail reserve.',
            'note',
            'Reserved response',
          )

          setDraft('')
          setPhase('reserved')
          setPreviewMessages((current) => [
            ...current,
            userMessage,
            assistantMessage,
          ])

          requestAnimationFrame(() => {
            viewportRef.current?.scrollToItem(userMessage.id, {
              align: 'head',
              animation: reducedMotion
                ? { duration: 0 }
                : ThreadPort.Animation.easeOutQuart(420),
            })
          })

          previewChunks.forEach((chunk, index) => {
            schedule(
              () => {
                setPhase('streaming')
                setPreviewMessages((current) =>
                  current.map((message) =>
                    message.id === assistantMessage.id
                      ? {
                          ...message,
                          body: `${message.body}${chunk}`,
                          estimate: message.estimate + 40,
                        }
                      : message,
                  ),
                )
              },
              760 + index * 520,
            )
          })
        },
        380 + characters.length * 34 + 540,
      )

      schedule(runCycle, reducedMotion ? 5200 : 7600)
    }

    runCycle()

    return () => {
      timers.forEach((timer) => {
        window.clearTimeout(timer)
      })
    }
  }, [reducedMotion])

  return (
    <div className="siteRoot">
      <SiteHeader />
      <main className="homeMain">
        <section className="homeHero">
          <div className="heroCopy">
            <p className="eyebrow">Threadport examples</p>
            <h1>The headless chat viewport for React</h1>
            <p className="lede">
              Dynamic measurement, prepend anchoring, frame overlays, imperative
              commands, and optional tail reserve for ChatGPT and Claude-style
              transcripts.
            </p>
            <div className="homeActions">
              <a className="button primary" href="/examples/basic/">
                Start with basic
              </a>
              <a className="button" href="/examples/empty/">
                Empty viewport
              </a>
            </div>
          </div>

          <div className="heroPreview">
            <div className="previewHeader">
              <span>Fake interaction</span>
              <span>{phase === 'typing' ? 'typing' : phase}</span>
            </div>
            <ThreadPort.Root className="previewFrame">
              <ThreadPort.Viewport
                ref={viewportRef}
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
                tailInset={104}
                tailReserve={{ className: 'tailReserve previewTailReserve' }}
                virtualizerOptions={{ overscan: 4 }}
              />
              <ThreadPort.Overlay
                className="previewComposerDock"
                placement="tail"
              >
                <div className="previewComposer" aria-hidden="true">
                  <span>{draft || 'Message Threadport'}</span>
                  <span className="typingCaret" />
                  <button type="button" tabIndex={-1}>
                    ↑
                  </button>
                </div>
              </ThreadPort.Overlay>
              <div
                aria-hidden="true"
                className={`previewReserveBadge ${
                  phase === 'typing' ? '' : 'isVisible'
                }`}
              >
                reserved tail space
              </div>
            </ThreadPort.Root>
          </div>
        </section>

        <section className="ownershipBand" aria-label="Responsibility split">
          <div>
            <p className="eyebrow">Threadport owns</p>
            <p>Measurement, virtualization, anchors, overlays, scroll state.</p>
          </div>
          <div>
            <p className="eyebrow">Your app owns</p>
            <p>Messages, composer, empty states, controls, styling, policy.</p>
          </div>
        </section>

        <section className="exampleSection">
          <div className="sectionHeader">
            <p className="eyebrow">Examples</p>
            <h2>Focused pages, readable integrations</h2>
            <p className="lede">
              Each behavior has its own small page. No scenario switcher, no
              hidden test route, no shared app state that obscures the
              integration.
            </p>
          </div>

          <ol className="exampleDirectory" aria-label="Example directory">
            {examples.map((example, index) => (
              <li key={example.id}>
                <a className="exampleLink" href={example.href}>
                  <span className="exampleNumber">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span>
                    <strong>{example.label}</strong>
                    <span>{example.description}</span>
                  </span>
                  <span className="exampleMeta">
                    {example.scope} / {example.ownedBy}
                  </span>
                </a>
              </li>
            ))}
          </ol>
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
