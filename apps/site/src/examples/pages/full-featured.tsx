import {
  ArrowDown,
  ArrowUp,
  Clipboard,
  RefreshCcw,
  Search,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import {
  type FormEvent,
  type KeyboardEvent,
  memo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  EXAMPLE_ITEM_GAP,
  Metrics,
  SettledViewportRoot,
  scrollPromptToHead,
  ThreadPort,
  useInitialViewportSettled,
  useReducedMotion,
} from '../../lib/demo'
import { ExamplePage } from '../ExamplePage'
import {
  type FullFeatureTranscriptTurn,
  fullFeatureTranscript,
} from '../transcripts/full-featured'

type FullFeatureItem = {
  body: string
  createdAt: number
  id: string
  kind: 'message'
  role: 'assistant' | 'user'
  state?: 'complete' | 'loading' | 'searching' | 'streaming'
}

type FullFeatureMessageItem = Extract<FullFeatureItem, { kind: 'message' }>

const MARKDOWN_REMARK_PLUGINS = [remarkGfm]

let fullFeatureId = 0

function nextFullFeatureId(prefix: string) {
  fullFeatureId += 1

  return `${prefix}-${fullFeatureId}`
}

function estimateFullFeatureItem(item: FullFeatureItem) {
  if (item.state === 'loading' || item.state === 'searching') {
    return 72
  }

  const base = item.role === 'user' ? 84 : 138
  const markdownBlocks = item.body.split('\n').length * 8

  return base + Math.ceil(item.body.length / 78) * 23 + markdownBlocks
}

function getFullFeatureKey(item: FullFeatureItem) {
  return item.id
}

function chunkMarkdown(markdown: string, wordsPerChunk: number) {
  const tokens = markdown.split(/(\s+)/).filter(Boolean)
  const chunks: string[] = []
  let buffer = ''
  let words = 0

  for (const token of tokens) {
    buffer = `${buffer}${token}`

    if (token.trim().length > 0) {
      words += 1
    }

    if (words >= wordsPerChunk || token.includes('\n\n')) {
      chunks.push(buffer)
      buffer = ''
      words = 0
    }
  }

  if (buffer.length > 0) {
    chunks.push(buffer)
  }

  return chunks
}

function upsertBody(
  items: readonly FullFeatureItem[],
  messageId: string,
  body: string,
  state: 'streaming' | 'complete',
) {
  return items.map((item) =>
    item.kind === 'message' && item.id === messageId
      ? { ...item, body, state }
      : item,
  )
}

function setMessageState(
  items: readonly FullFeatureItem[],
  messageId: string,
  state: FullFeatureMessageItem['state'],
) {
  return items.map((item) =>
    item.kind === 'message' && item.id === messageId
      ? { ...item, state }
      : item,
  )
}

const FeedbackRow = memo(function FeedbackRow() {
  return (
    <div className="feedbackRow">
      <button type="button" aria-label="Copy response">
        <Clipboard size={15} />
      </button>
      <button type="button" aria-label="Good response">
        <ThumbsUp size={15} />
      </button>
      <button type="button" aria-label="Bad response">
        <ThumbsDown size={15} />
      </button>
      <button type="button" aria-label="Regenerate response">
        <RefreshCcw size={15} />
      </button>
    </div>
  )
})

const LoadingPulsar = memo(function LoadingPulsar() {
  return (
    <div
      className="loadingPulsar"
      role="status"
      aria-label="Assistant is thinking"
    >
      <span />
      <span />
      <span />
    </div>
  )
})

const SearchStatus = memo(function SearchStatus({
  complete,
}: {
  complete?: boolean
}) {
  return (
    <div className="searchStatus" role="status">
      <Search aria-hidden="true" size={16} />
      <span>{complete ? 'Searched the web' : 'Search the web'}</span>
    </div>
  )
})

const MarkdownResponse = memo(function MarkdownResponse({
  body,
}: {
  body: string
}) {
  return (
    <div className="markdownResponse">
      <ReactMarkdown remarkPlugins={MARKDOWN_REMARK_PLUGINS}>
        {body}
      </ReactMarkdown>
    </div>
  )
})

const MessageRow = memo(function MessageRow({
  item,
}: {
  item: FullFeatureMessageItem
}) {
  const isUser = item.role === 'user'

  return (
    <article
      className={`fullMessage fullMessage-${item.role}`}
      data-message-id={item.id}
      data-message-role={item.role}
      data-message-state={item.state}
    >
      <div className="fullMessageBody">
        {item.state === 'loading' ? (
          <LoadingPulsar />
        ) : item.state === 'searching' ? (
          <SearchStatus />
        ) : isUser ? (
          <p>{item.body}</p>
        ) : (
          <>
            <SearchStatus complete />
            <MarkdownResponse body={item.body} />
          </>
        )}
        {!isUser && item.state === 'complete' && <FeedbackRow />}
      </div>
    </article>
  )
})

const FullFeatureRow = memo(function FullFeatureRow({
  item,
}: {
  item: FullFeatureItem
}) {
  return <MessageRow item={item} />
})

function FullFeatureComposer({
  disabled,
  onSubmit,
}: {
  disabled?: boolean
  onSubmit: (value: string) => void
}) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useLayoutEffect(() => {
    const textarea = textareaRef.current

    if (!textarea) {
      return
    }

    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 164)}px`
  }, [value])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const text = value.trim()

    if (!text || disabled) {
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
    <form className="fullFeatureComposer" onSubmit={submit}>
      <textarea
        ref={textareaRef}
        aria-label="Message"
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message Threadport"
        rows={1}
        value={value}
      />
      <button type="submit" aria-label="Send message" disabled={disabled}>
        <ArrowUp size={18} />
      </button>
    </form>
  )
}

export default function FullFeaturedExample() {
  const viewportRef = useRef<ThreadPort.ViewportHandle | null>(null)
  const streamTimerRef = useRef<number | null>(null)
  const searchStartTimerRef = useRef<number | null>(null)
  const streamStartTimerRef = useRef<number | null>(null)
  const responseBodyRef = useRef('')
  const turnIndexRef = useRef(0)
  const reducedMotion = useReducedMotion()
  const [items, setItems] = useState<FullFeatureItem[]>([])
  const [state, setState] = useState<ThreadPort.ViewportState | null>(null)
  const viewportSettled = useInitialViewportSettled(state)
  const hasMessages = items.length > 0
  const isResponding = items.some(
    (item) =>
      item.kind === 'message' &&
      (item.state === 'loading' ||
        item.state === 'searching' ||
        item.state === 'streaming'),
  )
  const showJump = Boolean(state && state.distanceFromTail > 150 && hasMessages)

  function getNextTurn() {
    const turn =
      fullFeatureTranscript[turnIndexRef.current % fullFeatureTranscript.length]

    turnIndexRef.current += 1

    return turn
  }

  function getTurnForPrompt(prompt: string) {
    const normalized = prompt.toLowerCase()
    const matchingTurn = fullFeatureTranscript.find((turn) => {
      const candidate = turn.prompt.toLowerCase()

      return (
        (normalized.includes('handle') && candidate.includes('handle')) ||
        (normalized.includes('compare') && candidate.includes('compare')) ||
        (normalized.includes('react-window') &&
          candidate.includes('react-window')) ||
        (normalized.includes('follow') && candidate.includes('follow'))
      )
    })

    return matchingTurn ?? getNextTurn()
  }

  function clearTimers() {
    if (searchStartTimerRef.current !== null) {
      window.clearTimeout(searchStartTimerRef.current)
      searchStartTimerRef.current = null
    }

    if (streamStartTimerRef.current !== null) {
      window.clearTimeout(streamStartTimerRef.current)
      streamStartTimerRef.current = null
    }

    if (streamTimerRef.current !== null) {
      window.clearInterval(streamTimerRef.current)
      streamTimerRef.current = null
    }
  }

  function completeResponse(assistantId: string) {
    setItems((current) =>
      upsertBody(current, assistantId, responseBodyRef.current, 'complete'),
    )
  }

  function startStreaming(
    assistantId: string,
    turn: FullFeatureTranscriptTurn,
  ) {
    const chunks = chunkMarkdown(turn.response, turn.streamWordsPerChunk)
    let chunkIndex = 0

    if (reducedMotion) {
      responseBodyRef.current = turn.response
      completeResponse(assistantId)
      return
    }

    streamTimerRef.current = window.setInterval(() => {
      const chunk = chunks[chunkIndex]

      if (chunk === undefined) {
        if (streamTimerRef.current !== null) {
          window.clearInterval(streamTimerRef.current)
          streamTimerRef.current = null
        }

        completeResponse(assistantId)
        return
      }

      responseBodyRef.current = `${responseBodyRef.current}${chunk}`
      setItems((current) =>
        upsertBody(current, assistantId, responseBodyRef.current, 'streaming'),
      )
      chunkIndex += 1
    }, 118)
  }

  function runPrompt(prompt: string, scriptedTurn?: FullFeatureTranscriptTurn) {
    clearTimers()

    const turn = scriptedTurn ?? getTurnForPrompt(prompt)
    const userId = nextFullFeatureId('user')
    const assistantId = nextFullFeatureId('assistant')
    const userItem: FullFeatureItem = {
      body: prompt,
      createdAt: Date.now(),
      id: userId,
      kind: 'message',
      role: 'user',
    }
    const loadingAssistantItem: FullFeatureItem = {
      body: '',
      createdAt: Date.now(),
      id: assistantId,
      kind: 'message',
      role: 'assistant',
      state: 'loading',
    }

    responseBodyRef.current = ''
    setItems((current) => [...current, userItem, loadingAssistantItem])
    scrollPromptToHead(viewportRef, userId, reducedMotion)

    searchStartTimerRef.current = window.setTimeout(
      () => {
        searchStartTimerRef.current = null
        setItems((current) =>
          setMessageState(current, assistantId, 'searching'),
        )

        streamStartTimerRef.current = window.setTimeout(
          () => {
            streamStartTimerRef.current = null
            setItems((current) =>
              upsertBody(current, assistantId, '', 'streaming'),
            )
            startStreaming(assistantId, turn)
          },
          reducedMotion ? 0 : turn.searchDelayMs,
        )
      },
      reducedMotion ? 0 : turn.thinkingDelayMs,
    )
  }

  useEffect(() => clearTimers, [])

  return (
    <ExamplePage
      activeId="full-featured"
      title="Full featured"
      summary="A ChatGPT-style transcript with empty state, staged assistant states, streaming Markdown, feedback controls, and host-owned tail policy."
      notes={[
        'The scroll element is marked with scrollElementProps for gesture systems.',
        'The assistant response keeps one stable row key across loading, search, stream, and complete phases.',
        'The host decides whether to follow live output or show a jump affordance.',
      ]}
      aside={
        <>
          <button
            type="button"
            disabled={isResponding}
            onClick={() => {
              const turn = getNextTurn()

              runPrompt(turn.prompt, turn)
            }}
          >
            Run sample prompt
          </button>
          <Metrics state={viewportSettled ? state : null} />
        </>
      }
    >
      <SettledViewportRoot
        className={`demoFrame fullFeatureFrame ${
          hasMessages ? 'hasMessages' : 'isEmpty'
        }`}
        settled={viewportSettled}
      >
        <ThreadPort.Viewport
          ref={viewportRef}
          ariaLabel="Full featured chat transcript"
          className="exampleViewport fullFeatureViewport"
          contentClassName="exampleContent fullFeatureContent"
          estimateSize={estimateFullFeatureItem}
          getItemKey={getFullFeatureKey}
          headInset={24}
          initialAnchor="tail"
          itemGap={EXAMPLE_ITEM_GAP}
          itemClassName="exampleRow fullFeatureRow"
          items={items}
          onStateChange={setState}
          renderItem={({ item }) => <FullFeatureRow item={item} />}
          role="log"
          scrollElementProps={{
            'data-gesture-root': 'full-featured-chat',
          }}
          tailInset={126}
          tailReserve={{ className: 'tailReserve gptTailReserve' }}
          virtualizerOptions={{ overscan: 10 }}
        />
        {showJump && (
          <ThreadPort.Overlay className="fullFeatureJumpLayer" placement="fill">
            <button
              type="button"
              aria-label="Jump to bottom"
              onClick={() =>
                viewportRef.current?.scrollToTail(
                  reducedMotion
                    ? { duration: 0 }
                    : ThreadPort.Animation.easeOutCubic(360),
                )
              }
            >
              <ArrowDown size={18} />
            </button>
          </ThreadPort.Overlay>
        )}
        <ThreadPort.Overlay
          className="fullFeatureComposerLayer"
          placement="fill"
        >
          <div className="fullFeatureEmptyState" aria-hidden={hasMessages}>
            <h2>Send a prompt. The tail holds.</h2>
            <p>
              Streamed rows land in the reserved tail below. The composer
              lifts when empty, then docks once a reply begins.
            </p>
          </div>
          <div className="fullFeatureComposerCard">
            <FullFeatureComposer disabled={isResponding} onSubmit={runPrompt} />
          </div>
        </ThreadPort.Overlay>
      </SettledViewportRoot>
    </ExamplePage>
  )
}
