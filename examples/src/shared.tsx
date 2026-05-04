import {
  type Dispatch,
  type FormEvent,
  type KeyboardEvent,
  memo,
  type ReactNode,
  type RefObject,
  type SetStateAction,
  StrictMode,
  useEffect,
  useState,
} from 'react'
import { createRoot } from 'react-dom/client'
import * as ThreadPort from '../../src'
import './styles.css'

export { ThreadPort }

export const DATA_LOADING_HEAD_RESERVE = 24_000
export const EXAMPLE_ITEM_GAP = 28

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
    id: 'standard',
    label: 'Standard',
    description: 'A GPT-style transcript with submitted prompts aligned high.',
    href: '/examples/standard/',
    integration: [
      'items',
      'estimateSize',
      'getItemKey',
      'renderItem',
      'scrollToItem',
      'tailReserve',
    ],
    ownedBy: 'host',
    scope: 'Baseline',
    sourcePath: 'examples/src/pages/standard.tsx',
  },
  {
    id: 'insets',
    label: 'Insets',
    description: 'Visible head and tail insets for app chrome.',
    href: '/examples/insets/',
    integration: [
      'headInset',
      'tailInset',
      'Overlay head',
      'Overlay tail',
      'scrollToItem',
    ],
    ownedBy: 'viewport',
    scope: 'Chrome',
    sourcePath: 'examples/src/pages/insets.tsx',
  },
  {
    id: 'long-response',
    label: 'Long response',
    description: 'Tail reserve with a deliberately long assistant answer.',
    href: '/examples/long-response/',
    integration: [
      'tailReserve',
      'minHeight',
      'scrollToItem',
      'estimateSize',
      'measureElement',
    ],
    ownedBy: 'viewport',
    scope: 'Tail reserve',
    sourcePath: 'examples/src/pages/long-response.tsx',
  },
  {
    id: 'jump-to-bottom',
    label: 'Jump to bottom',
    description: 'Expose a jump control when the reader leaves the tail.',
    href: '/examples/jump-to-bottom/',
    integration: [
      'ViewportHandle',
      'scrollToTail',
      'onStateChange',
      'Overlay fill',
      'useReducedMotion',
    ],
    ownedBy: 'host',
    scope: 'Policy',
    sourcePath: 'examples/src/pages/jump-to-bottom.tsx',
  },
  {
    id: 'mobile',
    label: 'Mobile',
    description: 'A phone-sized GPT shell with frame-relative overlays.',
    href: '/examples/mobile/',
    integration: ['headInset', 'tailInset', 'Overlay', 'Root', 'Viewport'],
    ownedBy: 'host',
    scope: 'Responsive',
    sourcePath: 'examples/src/pages/mobile.tsx',
  },
  {
    id: 'prepend',
    label: 'Prepend',
    description: 'Load older messages above while preserving the anchor.',
    href: '/examples/prepend/',
    integration: ['preserveScrollOnPrepend', 'estimateSize', 'initialAnchor'],
    ownedBy: 'viewport',
    scope: 'History',
    sourcePath: 'examples/src/pages/prepend.tsx',
  },
  {
    id: 'data-loading',
    label: 'Data loading',
    description: 'Fetch older pages as the reader scrolls backward.',
    href: '/examples/data-loading/',
    integration: [
      'onStateChange',
      'scrollOffset',
      'auto load threshold',
      'preserveScrollOnPrepend',
      'headReserve',
      'loading state',
    ],
    ownedBy: 'host',
    scope: 'Loading',
    sourcePath: 'examples/src/pages/data-loading.tsx',
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

function estimateBodySize(body: string, variant?: DemoMessage['variant']) {
  const lineEstimate = Math.ceil(body.length / 74) * 24

  return variant === 'visual'
    ? 340
    : variant === 'code'
      ? 260
      : 96 + lineEstimate
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
  return {
    body,
    estimate: estimateBodySize(body, variant),
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

export function estimateVirtualBatchSize(
  messages: readonly DemoMessage[],
  itemGap = EXAMPLE_ITEM_GAP,
) {
  return (
    messages.reduce((total, message) => total + message.estimate, 0) +
    messages.length * itemGap
  )
}

export function createGptExchange(value: string, assistantBody?: string) {
  const userMessage = createMessage('user', value)
  const assistantMessage = createMessage(
    'assistant',
    assistantBody ??
      'This assistant row is ordinary React content. Threadport only keeps the submitted prompt aligned and the viewport measured.',
  )

  return { assistantMessage, userMessage }
}

export function streamMessageChunks({
  chunks,
  interval = 110,
  messageId,
  setMessages,
}: {
  chunks: readonly string[]
  interval?: number
  messageId: string
  setMessages: Dispatch<SetStateAction<DemoMessage[]>>
}) {
  let chunkIndex = 0

  const timer = window.setInterval(() => {
    const chunk = chunks[chunkIndex]

    if (chunk === undefined) {
      window.clearInterval(timer)
      return
    }

    setMessages((current) =>
      current.map((message) => {
        if (message.id !== messageId) {
          return message
        }

        const body = `${message.body}${chunk}`

        return {
          ...message,
          body,
          estimate: estimateBodySize(body, message.variant),
        }
      }),
    )
    chunkIndex += 1
  }, interval)

  return () => window.clearInterval(timer)
}

export function scrollPromptToHead(
  viewportRef: RefObject<ThreadPort.ViewportHandle | null>,
  messageId: string,
  reducedMotion: boolean,
  duration = 420,
) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      viewportRef.current?.scrollToItem(messageId, {
        align: 'head',
        animation: reducedMotion
          ? { duration: 0 }
          : ThreadPort.Animation.easeOutQuart(duration),
      })
    })
  })
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

export function InsetOverlays({
  headInset,
  labeled = false,
  tailInset,
}: {
  headInset?: number
  labeled?: boolean
  tailInset?: number
}) {
  return (
    <>
      <ThreadPort.Overlay className="insetHeadDock" placement="head">
        {labeled && headInset !== undefined && (
          <div className="insetBand">
            <code className="insetName">headInset</code>
            <code className="insetValue">{headInset}px</code>
          </div>
        )}
      </ThreadPort.Overlay>
      <ThreadPort.Overlay className="insetTailDock" placement="tail">
        {labeled && tailInset !== undefined && (
          <div className="insetBand">
            <code className="insetName">tailInset</code>
            <code className="insetValue">{tailInset}px</code>
          </div>
        )}
      </ThreadPort.Overlay>
    </>
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
