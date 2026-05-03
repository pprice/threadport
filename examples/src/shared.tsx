import {
  type FormEvent,
  type KeyboardEvent,
  memo,
  type ReactNode,
  StrictMode,
  useEffect,
  useState,
} from 'react'
import { createRoot } from 'react-dom/client'
import * as ThreadPort from '../../src'
import './styles.css'

export { ThreadPort }

export type DemoMessage = {
  body: string
  estimate: number
  id: string
  role: 'assistant' | 'system' | 'user'
  title?: string
  variant?: 'code' | 'note' | 'visual'
}

type ExampleMeta = {
  description: string
  href: string
  id: string
  integration: string[]
  label: string
  ownedBy: 'host' | 'viewport'
  scope: string
  sourcePath: string
}

export const examples: ExampleMeta[] = [
  {
    id: 'basic',
    label: 'Basic transcript',
    description: 'A bounded viewport with variable-height messages.',
    href: '/examples/basic/',
    integration: [
      'items',
      'estimateSize',
      'getItemKey',
      'renderItem',
      'tailInset',
    ],
    ownedBy: 'viewport',
    scope: 'Rendering',
    sourcePath: 'examples/src/pages/basic.tsx',
  },
  {
    id: 'streaming',
    label: 'Streaming response',
    description: 'Append content without forcing tail-follow behavior.',
    href: '/examples/streaming/',
    integration: [
      'ViewportHandle',
      'scrollToItem',
      'scrollToTail',
      'onStateChange',
      'useReducedMotion',
    ],
    ownedBy: 'host',
    scope: 'Policy',
    sourcePath: 'examples/src/pages/streaming.tsx',
  },
  {
    id: 'tail-reserve',
    label: 'Tail reserve',
    description: 'Start a new response with a screen of active space.',
    href: '/examples/tail-reserve/',
    integration: [
      'tailReserve',
      'tailInset',
      'scrollToItem',
      'Overlay',
      'Composer',
    ],
    ownedBy: 'viewport',
    scope: 'Append',
    sourcePath: 'examples/src/pages/tail-reserve.tsx',
  },
  {
    id: 'history',
    label: 'History prepend',
    description: 'Load older messages above while preserving the anchor.',
    href: '/examples/history/',
    integration: [
      'headReserve',
      'preserveScrollOnPrepend',
      'estimateSize',
      'initialAnchor',
    ],
    ownedBy: 'viewport',
    scope: 'History',
    sourcePath: 'examples/src/pages/history.tsx',
  },
  {
    id: 'mobile',
    label: 'Mobile shell',
    description: 'Insets and overlays inside a phone-sized frame.',
    href: '/examples/mobile/',
    integration: ['headInset', 'tailInset', 'Overlay', 'Root', 'Viewport'],
    ownedBy: 'host',
    scope: 'Chrome',
    sourcePath: 'examples/src/pages/mobile.tsx',
  },
  {
    id: 'empty',
    label: 'No content',
    description: 'An empty viewport with integrator-owned empty state.',
    href: '/examples/empty/',
    integration: ['items={[]}', 'Overlay fill', 'tailInset', 'renderItem'],
    ownedBy: 'host',
    scope: 'Empty',
    sourcePath: 'examples/src/pages/empty.tsx',
  },
  {
    id: 'controls',
    label: 'Imperative controls',
    description: 'Scroll by head, tail, index, and item key.',
    href: '/examples/controls/',
    integration: [
      'ViewportHandle',
      'scrollToHead',
      'scrollToTail',
      'scrollToIndex',
      'scrollToItem',
    ],
    ownedBy: 'host',
    scope: 'API',
    sourcePath: 'examples/src/pages/controls.tsx',
  },
]

const assistantBodies = [
  'Threadport keeps the scroll mechanics separate from your transcript UI. The host owns message chrome, composer placement, and product decisions.',
  'Rows can be dynamic. The virtualizer estimates first, measures after paint, and keeps the scroll range aligned with real content.',
  'A prepended history batch should not move the message a reader is looking at. Anchor preservation is the behavior that makes old-message loading feel quiet.',
  'Tail reserve is optional. Use it when a newly appended response should begin with open space beneath it.',
  'Overlays are frame-relative, so composers and floating controls can live outside the virtualized row tree.',
]

const userBodies = [
  'Can this feel like a modern chat surface without owning my product UI?',
  'I need variable heights, custom message components, and a fixed composer.',
  'When older history loads, do not lose the current reading position.',
  'If a response streams for a long time, let the user decide when to jump down.',
  'I want a headless primitive, not a full chat framework.',
]

let idCounter = 0

function nextId(prefix: string) {
  idCounter += 1

  return `${prefix}-${idCounter}`
}

export function estimateMessageSize(message: DemoMessage) {
  return message.estimate
}

export function getMessageKey(message: DemoMessage) {
  return message.id
}

export function createMessage(
  role: DemoMessage['role'],
  body: string,
  variant?: DemoMessage['variant'],
  title?: string,
): DemoMessage {
  const lineEstimate = Math.ceil(body.length / 74) * 24

  return {
    body,
    estimate:
      variant === 'visual' ? 340 : variant === 'code' ? 260 : 96 + lineEstimate,
    id: nextId(role),
    role,
    title,
    variant,
  }
}

export function createTranscript(count = 36) {
  const messages: DemoMessage[] = [
    createMessage(
      'system',
      'This viewport is headless. Everything visible around it belongs to the integrator.',
      'note',
      'Boundary',
    ),
  ]

  for (let index = 0; index < count; index += 1) {
    const isUser = index % 3 === 0
    const body = isUser
      ? userBodies[index % userBodies.length]
      : assistantBodies[index % assistantBodies.length]
    const variant: DemoMessage['variant'] =
      !isUser && index % 11 === 0
        ? 'visual'
        : !isUser && index % 7 === 0
          ? 'code'
          : undefined

    messages.push(
      createMessage(
        isUser ? 'user' : 'assistant',
        `${body}${index % 6 === 0 ? ' This row has extra copy so measurement has real work to do.' : ''}`,
        variant,
        variant === 'visual'
          ? 'Arbitrary content'
          : variant === 'code'
            ? 'Measured block'
            : undefined,
      ),
    )
  }

  return messages
}

export function createOlderBatch(seed: number) {
  return Array.from({ length: 16 }, (_, index) =>
    createMessage(
      index % 4 === 0 ? 'user' : 'assistant',
      `Older message ${seed + index + 1}. This batch is inserted above the viewport without changing the visible anchor.`,
      index % 8 === 0 ? 'code' : undefined,
      index % 8 === 0 ? 'Older measured block' : undefined,
    ),
  )
}

export const MessageView = memo(function MessageView({
  message,
}: {
  message: DemoMessage
}) {
  const isUser = message.role === 'user'

  return (
    <article
      className={`message message-${message.role}`}
      data-message-id={message.id}
      data-message-role={message.role}
      data-message-variant={message.variant}
    >
      {!isUser && (
        <div className="avatar">{message.role === 'system' ? 'S' : 'T'}</div>
      )}
      <div className="messageBody">
        {message.title && <p className="messageTitle">{message.title}</p>}
        <p>{message.body}</p>
        {message.variant === 'code' && (
          <pre className="codeBlock">
            <code>{`viewport.scrollToItem(message.id, {
  align: 'head',
  animation: ThreadPort.Animation.easeOutQuart(420),
})`}</code>
          </pre>
        )}
        {message.variant === 'visual' && (
          <div
            className="visualResponse"
            role="img"
            aria-label="Example custom response block"
          >
            <span />
            <span />
            <span />
          </div>
        )}
      </div>
    </article>
  )
})

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

  return (
    <div className="siteRoot">
      <SiteHeader activeId={activeId} />
      <main className="exampleLayout">
        <section className="examplePanel" aria-labelledby={`${activeId}-title`}>
          <a className="backLink" href="/">
            Index
          </a>
          <p className="eyebrow">{activeExample?.scope ?? 'Example'}</p>
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
                <code>{activeExample.sourcePath}</code>
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
        </section>
        <section className="demoStage" aria-label={`${title} demo`}>
          {children}
        </section>
      </main>
    </div>
  )
}

export function SiteHeader({ activeId }: { activeId?: string }) {
  return (
    <header className="siteHeader">
      <a className="brand" href="/">
        <span className="brandMark" aria-hidden="true" />
        Threadport
      </a>
      <nav aria-label="Examples">
        {examples.map((example) => (
          <a
            key={example.id}
            aria-current={activeId === example.id ? 'page' : undefined}
            href={example.href}
          >
            {example.label}
          </a>
        ))}
      </nav>
      <code>npm i threadport</code>
    </header>
  )
}

export function Metrics({ state }: { state: ThreadPort.ViewportState | null }) {
  return (
    <dl className="metricList">
      <div>
        <dt>Items</dt>
        <dd>{state?.totalItems ?? 0}</dd>
      </div>
      <div>
        <dt>Rendered</dt>
        <dd>{state?.virtualItems ?? 'pending'}</dd>
      </div>
      <div>
        <dt>Tail</dt>
        <dd>{state ? `${Math.round(state.distanceFromTail)}px` : 'pending'}</dd>
      </div>
    </dl>
  )
}

export function Composer({
  disabled,
  onSubmit,
  placeholder = 'Message Threadport',
}: {
  disabled?: boolean
  onSubmit?: (value: string) => void
  placeholder?: string
}) {
  const [value, setValue] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const text = value.trim()

    if (!text || !onSubmit) {
      return
    }

    onSubmit(text)
    setValue('')
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key !== 'Enter' ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return
    }

    event.preventDefault()
    event.currentTarget.form?.requestSubmit()
  }

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <textarea
        aria-label="Message"
        disabled={disabled}
        onKeyDown={handleKeyDown}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        rows={1}
        value={value}
      />
      <button type="submit" aria-label="Send message" disabled={disabled}>
        ↑
      </button>
    </form>
  )
}

export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')

    setReducedMotion(query.matches)

    function handleChange() {
      setReducedMotion(query.matches)
    }

    query.addEventListener('change', handleChange)

    return () => query.removeEventListener('change', handleChange)
  }, [])

  return reducedMotion
}

export function mountPage(children: ReactNode) {
  const rootElement = document.getElementById('root')

  if (!rootElement) {
    throw new Error('Root element not found')
  }

  createRoot(rootElement).render(<StrictMode>{children}</StrictMode>)
}
