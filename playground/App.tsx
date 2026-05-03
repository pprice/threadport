import {
  memo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import {
  ChatViewportFrame,
  ChatViewportOverlay,
  ChatVirtualViewport,
  easeOutCubic,
  easeOutQuart,
  type ChatItemKey,
  type ChatViewportState,
  type ChatVirtualViewportHandle,
} from '../src'

type ExampleId = 'chatgpt' | 'mobile' | 'history'
type MessageRole = 'assistant' | 'system' | 'user'
type MessageVariant = 'code' | 'mixed' | 'text' | 'visual'

type DemoMessage = {
  body: string
  estimate: number
  id: string
  role: MessageRole
  title?: string
  variant: MessageVariant
}

type ExampleConfig = {
  description: string
  headReserve: number
  id: ExampleId
  label: string
}

const examples: ExampleConfig[] = [
  {
    id: 'chatgpt',
    label: 'ChatGPT flow',
    description: 'Prompt scrolls to top, response streams underneath.',
    headReserve: 0,
  },
  {
    id: 'mobile',
    label: 'Mobile shell',
    description: 'Same headless viewport inside a phone-sized surface.',
    headReserve: 0,
  },
  {
    id: 'history',
    label: 'History lab',
    description: 'Large transcript, mixed heights, and prepend preservation.',
    headReserve: 1800,
  },
]

const CONTROL_SCROLL_ANIMATION = easeOutCubic(420)
const MESSAGE_IN_ANIMATION = easeOutQuart(560)
const TAIL_FOLLOW_ANIMATION = easeOutCubic(360)

const assistantBodies = [
  'The simplest reliable chat scroller keeps virtualization separate from the composer. The viewport exposes scroll commands and state. The shell decides when to show controls.',
  'For variable content, every row is measured after paint. Estimates only get us close enough to place the item before the real height is known.',
  'When older messages are inserted above the viewport, anchor the first visible item and restore its offset after the list changes. That avoids the familiar jump.',
  'Streaming content should be allowed to grow naturally. If the user jumps to the current bottom, treat that as a one-time command, not a subscription to every future token.',
  'The bottom button belongs outside the scroll primitive. It is layout, not mechanics. Keeping that boundary firm prevents the component from becoming a product shell.',
]

const humanBodies = [
  'Can you make this work like ChatGPT without turning the component into a framework?',
  'I need dynamic heights, code blocks, cards, and long assistant responses.',
  'When I submit a prompt, move that prompt to the top with easing.',
  'Older history should load above me without losing my place.',
  'The jump-to-bottom button needs to be my UI, not the virtual list UI.',
]

const streamChunks = [
  ' I would keep the default behavior boring:',
  ' measure rows, preserve prepend anchors, and expose scroll commands.',
  ' The parent owns product decisions like whether a jump button appears.',
  ' That split is what keeps the component shareable.',
  '\n\nFor the streaming case, do not chase every token. Append naturally. If the user asks for the bottom, animate to the current bottom once.',
]

const longStreamChunks = [
  '\n\nHere is the long case. The active tail starts with a viewport-sized reserve, but that reserve is just a CSS minimum on the tail item.',
  '\n\nAs content streams in, the message consumes the reserved space naturally. There is no decrementing counter, no synthetic spacer, and no special virtualizer row.',
  '\n\nOnce the real response height exceeds the minimum, the item simply becomes taller than the viewport. At that point the reserve is fully eaten and normal scrolling takes over.',
  '\n\nThis is the behavior we want for arbitrary assistant content: text can stream, visuals can mount, code blocks can expand, and the virtualizer only has to measure the resulting row height.',
  '\n\nThe component remains headless because product policy is expressed through props. The viewport owns mechanics: measuring, virtualization, scroll commands, append detection, and the optional tail reserve wrapper.',
  '\n\nThe host still owns the transcript data and the message renderer. It does not need to compute a tail min-height or wrap messages just to get the ChatGPT-style empty area below a newly submitted prompt.',
  '\n\nIf this response keeps growing past the screen, that is fine. The scroll range grows with it. The viewport should not chase the tail while streaming unless the host explicitly calls scrollToTail.',
  '\n\nThis paragraph is intentionally verbose so the row becomes taller than the temporary reserve. The important test is that the prompt moves to the top, the answer fills the available area, and then content continues below without jumpy repositioning.',
  '\n\nAnother block: dynamic measurement should absorb this growth. TanStack Virtual sees the tail wrapper height change and updates the total size. Because this is the active tail, there is no need to preserve an anchor above it.',
  '\n\nFinal block: after the response is taller than the viewport reserve, there should be no fake blank space left underneath it except for the permanent composer clearance.',
  '\n\nSecond pass: the answer keeps going so the jump-to-bottom affordance has a meaningful distance to travel. This should feel like moving to the current bottom once, not subscribing to future streamed height.',
  '\n\nThe active tail row is now well past its minimum height. At this point the min-height reserve is irrelevant; the natural content height controls the scroll range.',
  '\n\nIf you scroll up during this section, the viewport should not fight you. The streaming row can keep growing, but the user position should remain stable unless a control explicitly scrolls.',
  '\n\nA jump-to-bottom action should animate to the bottom as measured at that moment. If more chunks arrive after the jump, they append below without continuous following.',
  '\n\nThis paragraph is intentionally repetitive and long enough to create more measurable height. We want dynamic row measurement, scroll range expansion, and the external floating jump control to all work together without hidden product UI inside the virtualizer.',
  '\n\nLarge assistant responses often include mixed content. Imagine this section as tables, images, tool cards, code output, and markdown. The virtualized viewport should treat it as one arbitrary measured item.',
  '\n\nMore content after the reserve is eaten. This is the critical stress path: the viewport started with a friendly empty area, consumed it, exceeded it, and now behaves like a normal transcript.',
  '\n\nWhen testing, submit long, wait until this lower half streams in, scroll a bit away from the bottom, then press the centered jump control above the composer.',
  '\n\nThe button is outside the headless component. The component only reports whether it is near the tail and exposes scrollToTail with easing.',
  '\n\nEnd of the extended long response. There should be enough height now to validate jump-to-bottom animation, bottom detection, and non-following stream behavior.',
]

let idCounter = 0

function nextId(prefix: string) {
  idCounter += 1

  return `${prefix}-${idCounter}`
}

function estimateForVariant(variant: MessageVariant, body: string) {
  const lineEstimate = Math.ceil(body.length / 72) * 24

  if (variant === 'code') {
    return 260
  }

  if (variant === 'visual') {
    return 340
  }

  if (variant === 'mixed') {
    return 230 + lineEstimate
  }

  return 110 + lineEstimate
}

function createMessage(
  role: MessageRole,
  body: string,
  variant: MessageVariant = 'text',
  title?: string,
): DemoMessage {
  return {
    body,
    estimate: estimateForVariant(variant, body),
    id: nextId(role),
    role,
    title,
    variant,
  }
}

function createTranscript(example: ExampleId) {
  const count = example === 'history' ? 420 : example === 'mobile' ? 80 : 120
  const messages: DemoMessage[] = [
    createMessage(
      'system',
      'This transcript is rendered through a headless virtualized viewport. Controls and composer are composed outside of it.',
      'mixed',
      'Architecture boundary',
    ),
  ]

  for (let index = 0; index < count; index += 1) {
    const isHuman = index % 3 === 0
    const bodySource = isHuman ? humanBodies : assistantBodies
    const body = bodySource[index % bodySource.length]
    const longTail =
      index % 7 === 0
        ? ' '.repeat(1) +
          'This item intentionally has extra copy so row heights vary after measurement. It helps prove the virtual list is not assuming fixed message height.'
        : ''
    const variant: MessageVariant =
      !isHuman && index % 11 === 0
        ? 'visual'
        : !isHuman && index % 9 === 0
          ? 'code'
          : !isHuman && index % 5 === 0
            ? 'mixed'
            : 'text'

    messages.push(
      createMessage(
        isHuman ? 'user' : 'assistant',
        `${body}${longTail}`,
        variant,
        variant === 'visual'
          ? 'Arbitrary visual response'
          : variant === 'code'
            ? 'Measured code block'
            : undefined,
      ),
    )
  }

  return messages
}

function createOlderBatch(seed: number) {
  return Array.from({ length: 18 }, (_, index) => {
    const role: MessageRole = index % 4 === 0 ? 'user' : 'assistant'
    const variant: MessageVariant =
      index % 8 === 0 ? 'visual' : index % 5 === 0 ? 'code' : 'text'

    return createMessage(
      role,
      `Older message ${seed + index + 1}. This batch is inserted before the current transcript while preserving the viewport anchor.`,
      variant,
      variant === 'visual' ? 'Older visual payload' : undefined,
    )
  })
}

function initialHeadReserve(example: ExampleId) {
  return examples.find((item) => item.id === example)?.headReserve ?? 0
}

function getDemoMessageKey(message: DemoMessage) {
  return message.id
}

function estimateDemoMessageSize(message: DemoMessage) {
  return message.estimate
}

const DemoMessageView = memo(function DemoMessageView({
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
    >
      {!isUser && <div className="avatar">{message.role === 'system' ? 'S' : 'A'}</div>}
      <div className="messageBody">
        {message.title && <p className="messageTitle">{message.title}</p>}
        <p>{message.body}</p>
        {message.variant === 'code' && (
          <pre className="codeBlock">
            <code>{`function scrollPolicy(event) {
  if (event.type === 'human-message') {
    viewport.scrollToItem(event.id, {
      align: 'head',
      animation: easeOutQuart(560),
    })
  }
}`}</code>
          </pre>
        )}
        {message.variant === 'visual' && (
          <div className="visualGrid" aria-label="Example visual response">
            <span />
            <span />
            <span />
          </div>
        )}
        {message.variant === 'mixed' && (
          <div className="factRow" aria-label="Viewport facts">
            <span>measured</span>
            <span>virtualized</span>
            <span>headless</span>
          </div>
        )}
      </div>
    </article>
  )
})

export function App() {
  const viewportRef = useRef<ChatVirtualViewportHandle | null>(null)
  const streamTimerRef = useRef<number | null>(null)
  const olderSeedRef = useRef(0)
  const [example, setExample] = useState<ExampleId>('chatgpt')
  const [messages, setMessages] = useState(() => createTranscript('chatgpt'))
  const [headReserve, setHeadReserve] = useState(() =>
    initialHeadReserve('chatgpt'),
  )
  const [viewportState, setViewportState] = useState<ChatViewportState | null>(
    null,
  )
  const [pendingScrollKey, setPendingScrollKey] = useState<ChatItemKey | null>(
    null,
  )
  const [input, setInput] = useState(
    'Build the simplest virtualized chat control that still feels smooth.',
  )

  function clearStreamTimer() {
    if (streamTimerRef.current !== null) {
      window.clearInterval(streamTimerRef.current)
      streamTimerRef.current = null
    }
  }

  function startStreamingResponse(messageId: string, long = false) {
    clearStreamTimer()

    let chunkIndex = 0
    const chunks = long ? longStreamChunks : streamChunks
    streamTimerRef.current = window.setInterval(() => {
      const nextChunk = chunks[chunkIndex]

      if (nextChunk === undefined) {
        clearStreamTimer()
        return
      }

      setMessages((current) =>
        current.map((message) =>
          message.id === messageId
            ? {
                ...message,
                body: `${message.body}${nextChunk}`,
                estimate: estimateForVariant(
                  message.variant,
                  `${message.body}${nextChunk}`,
                ),
              }
            : message,
        ),
      )

      chunkIndex += 1
    }, long ? 150 : 300)
  }

  function sendHumanMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()

    const text =
      input.trim() || humanBodies[messages.length % humanBodies.length]
    const wantsLongResponse = text.toLowerCase() === 'long'

    const userMessage = createMessage('user', text)
    const assistantMessage = createMessage(
      'assistant',
      wantsLongResponse
        ? 'Starting a long streamed response.'
        : 'Working through the scroll mechanics.',
      'mixed',
      wantsLongResponse ? 'Long streaming response' : 'Streaming response',
    )

    setMessages((current) => [...current, userMessage, assistantMessage])
    setPendingScrollKey(userMessage.id)
    setInput('')
    startStreamingResponse(assistantMessage.id, wantsLongResponse)
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
      return
    }

    event.preventDefault()
    sendHumanMessage()
  }

  function addVisualAnswer() {
    const message = createMessage(
      'assistant',
      'This simulates arbitrary assistant content: cards, charts, previews, and media-sized blocks. The row measures after render.',
      'visual',
      'Arbitrary content',
    )

    setMessages((current) => [...current, message])

    if (viewportState?.isAtTail) {
      requestAnimationFrame(() => {
        viewportRef.current?.scrollToTail(TAIL_FOLLOW_ANIMATION)
      })
    }
  }

  function prependOlderMessages() {
    const batch = createOlderBatch(olderSeedRef.current)
    const loadedEstimate = batch.reduce(
      (total, message) => total + message.estimate,
      0,
    )

    olderSeedRef.current += batch.length
    setMessages((current) => [...batch, ...current])
    setHeadReserve((current) => Math.max(0, current - loadedEstimate))
  }

  function switchExample(nextExample: ExampleId) {
    clearStreamTimer()
    olderSeedRef.current = 0
    setExample(nextExample)
    setMessages(createTranscript(nextExample))
    setHeadReserve(initialHeadReserve(nextExample))
    setViewportState(null)

    requestAnimationFrame(() => {
      viewportRef.current?.scrollToTail({ duration: 0 })
    })
  }

  useLayoutEffect(() => {
    if (pendingScrollKey === null) {
      return
    }

    const frame = requestAnimationFrame(() => {
      viewportRef.current?.scrollToItem(pendingScrollKey, {
        align: 'head',
        animation: MESSAGE_IN_ANIMATION,
      })
      setPendingScrollKey(null)
    })

    return () => cancelAnimationFrame(frame)
  }, [messages, pendingScrollKey])

  useEffect(() => {
    return () => clearStreamTimer()
  }, [])

  const activeExample = examples.find((item) => item.id === example) ?? examples[0]
  const tailInset = example === 'mobile' ? 168 : 188
  const headInset = example === 'mobile' ? 76 : 24
  const atTailThreshold = example === 'mobile' ? 64 : 48
  const showJumpToBottom = viewportState ? !viewportState.isAtTail : false

  return (
    <main className="appShell">
      <aside className="controlPanel" aria-label="Examples and controls">
        <div>
          <p className="eyebrow">Headless primitive</p>
          <h1>Virtual chat control</h1>
          <p className="lede">
            A shareable viewport for variable-height chat items. Product UI is
            composed outside the component.
          </p>
        </div>

        <div className="exampleList" aria-label="Example picker">
          {examples.map((item) => (
            <button
              key={item.id}
              className={item.id === example ? 'exampleButton active' : 'exampleButton'}
              data-testid={`example-${item.id}`}
              type="button"
              onClick={() => switchExample(item.id)}
            >
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </button>
          ))}
        </div>

        <div className="controls">
          <button
            data-testid="send-prompt"
            type="button"
            onClick={() => sendHumanMessage()}
          >
            Send prompt
          </button>
          <button data-testid="add-visual-answer" type="button" onClick={addVisualAnswer}>
            Add visual answer
          </button>
          <button data-testid="prepend-older" type="button" onClick={prependOlderMessages}>
            Prepend older
          </button>
          <button
            data-testid="scroll-to-top"
            type="button"
            onClick={() => viewportRef.current?.scrollToHead()}
          >
            Scroll to top
          </button>
        </div>

        <dl className="metrics">
          <div>
            <dt>items</dt>
            <dd data-testid="metric-items">{messages.length}</dd>
          </div>
          <div>
            <dt>rendered</dt>
            <dd data-testid="metric-rendered">
              {viewportState?.virtualItems ?? 'pending'}
            </dd>
          </div>
          <div>
            <dt>head reserve</dt>
            <dd data-testid="metric-head-reserve">{Math.round(headReserve)}px</dd>
          </div>
          <div>
            <dt>tail reserve</dt>
            <dd data-testid="metric-tail-reserve">viewport</dd>
          </div>
          <div>
            <dt>tail</dt>
            <dd data-testid="metric-tail">
              {viewportState
                ? `${Math.round(viewportState.distanceFromTail)}px`
                : 'pending'}
            </dd>
          </div>
        </dl>

        <pre className="apiSnippet">
          <code>{`<ChatViewportFrame>
  <ChatVirtualViewport
    ref={viewportRef}
    items={messages}
    tailInset={composerHeight}
    headInset={headerOverlap}
    tailReserve
    renderItem={renderMessage}
  />
  <ChatViewportOverlay placement="tail">
    <Composer />
  </ChatViewportOverlay>
  <ChatViewportOverlay placement="tail">
    <JumpToBottom />
  </ChatViewportOverlay>
</ChatViewportFrame>`}</code>
        </pre>
      </aside>

      <section
        className={example === 'mobile' ? 'chatShell phoneShell' : 'chatShell'}
        aria-label={activeExample.label}
      >
        <header className="chatHeader">
          <div>
            <p className="eyebrow">Example</p>
            <h2>{activeExample.label}</h2>
          </div>
          <button
            data-testid="header-jump-bottom"
            type="button"
            onClick={() => viewportRef.current?.scrollToTail()}
          >
            Jump bottom
          </button>
        </header>

        <ChatViewportFrame className="chatSurface">
          {example === 'mobile' && (
            <div
              className="mobileHeadOverlay"
              data-testid="mobile-head-overlay"
              aria-hidden="true"
            >
              <span>ChatScroll</span>
              <span>Menu</span>
            </div>
          )}

          <ChatVirtualViewport
            ref={viewportRef}
            ariaLabel="Virtualized chat transcript"
            atTailThreshold={atTailThreshold}
            className="chatViewport"
            contentClassName="chatContent"
            estimateSize={estimateDemoMessageSize}
            getItemKey={getDemoMessageKey}
            headInset={headInset}
            headReserve={headReserve}
            initialAnchor="tail"
            itemClassName="chatVirtualRow"
            itemGap={2}
            items={messages}
            onStateChange={setViewportState}
            overscan={12}
            renderItem={({ item }) => <DemoMessageView message={item} />}
            role="log"
            scrollAnimation={CONTROL_SCROLL_ANIMATION}
            tailInset={tailInset}
            tailReserve={{ className: 'tailReserve' }}
          />

          <ChatViewportOverlay className="composerDock" placement="tail">
            <form
              className="composer"
              data-testid="composer"
              onSubmit={sendHumanMessage}
            >
              <textarea
                aria-label="Message"
                onKeyDown={handleComposerKeyDown}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Message ChatScroll"
                rows={1}
                value={input}
              />
              <button type="submit" aria-label="Send message">
                ↑
              </button>
            </form>
          </ChatViewportOverlay>

          <ChatViewportOverlay className="jumpDock" placement="tail">
            {showJumpToBottom && (
              <button
                className="floatingJump"
                data-testid="jump-to-bottom"
                type="button"
                onClick={() => viewportRef.current?.scrollToTail()}
              >
                Jump to bottom
              </button>
            )}
          </ChatViewportOverlay>
        </ChatViewportFrame>
      </section>
    </main>
  )
}
