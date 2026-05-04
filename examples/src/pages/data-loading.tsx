import { useEffect, useRef, useState } from 'react'
import {
  Composer,
  createGptExchange,
  createOlderBatch,
  createTranscript,
  DATA_LOADING_HEAD_RESERVE,
  type DemoMessage,
  EXAMPLE_ITEM_GAP,
  ExamplePage,
  estimateMessageSize,
  estimateVirtualBatchSize,
  getMessageKey,
  InsetOverlays,
  MessageView,
  Metrics,
  SettledViewportRoot,
  scrollPromptToHead,
  ThreadPort,
  useInitialViewportSettled,
  useReducedMotion,
} from '../shared'

const DATA_LOADING_HEAD_INSET = 78
const AUTO_LOAD_OLDER_THRESHOLD = 1_800
const AUTO_LOAD_HEAD_FALLBACK = 96

export default function DataLoadingExample() {
  const seedRef = useRef(0)
  const timerRef = useRef<number | null>(null)
  const loadingRef = useRef(false)
  const lastAutoLoadOffsetRef = useRef<number | null>(null)
  const viewportRef = useRef<ThreadPort.ViewportHandle | null>(null)
  const reducedMotion = useReducedMotion()
  const [headReserve, setHeadReserve] = useState(DATA_LOADING_HEAD_RESERVE)
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<DemoMessage[]>(() =>
    createTranscript(76),
  )
  const [state, setState] = useState<ThreadPort.ViewportState | null>(null)
  const viewportSettled = useInitialViewportSettled(state)

  function finishLoad() {
    const batch = createOlderBatch(seedRef.current)

    seedRef.current += batch.length
    setMessages((current) => [...batch, ...current])
    setHeadReserve((current) =>
      Math.max(0, current - estimateVirtualBatchSize(batch)),
    )
    loadingRef.current = false
    timerRef.current = null
    setLoading(false)
  }

  function loadOlder() {
    if (loadingRef.current || headReserve === 0) {
      return false
    }

    loadingRef.current = true
    setLoading(true)
    timerRef.current = window.setTimeout(finishLoad, reducedMotion ? 120 : 820)

    return true
  }

  function maybeLoadOlder(nextState: ThreadPort.ViewportState) {
    if (nextState.scrollDirection !== 'head') {
      return
    }

    const distanceToOldestLoaded =
      headReserve + DATA_LOADING_HEAD_INSET - nextState.scrollOffset
    const isNearOldestLoaded =
      Math.abs(distanceToOldestLoaded) <= AUTO_LOAD_OLDER_THRESHOLD
    const isAtReserveHead =
      nextState.distanceFromHead <= AUTO_LOAD_HEAD_FALLBACK

    if (!isNearOldestLoaded && !isAtReserveHead) {
      return
    }

    if (
      lastAutoLoadOffsetRef.current !== null &&
      Math.abs(lastAutoLoadOffsetRef.current - nextState.scrollOffset) < 8
    ) {
      return
    }

    if (loadOlder()) {
      lastAutoLoadOffsetRef.current = nextState.scrollOffset
    }
  }

  function handleStateChange(nextState: ThreadPort.ViewportState) {
    setState(nextState)
    maybeLoadOlder(nextState)
  }

  function commitMessage(value: string) {
    const { assistantMessage, userMessage } = createGptExchange(
      value,
      'Loading older data is independent from the GPT-style submit behavior at the tail.',
    )

    setMessages((current) => [...current, userMessage, assistantMessage])
    scrollPromptToHead(viewportRef, userMessage.id, reducedMotion)
  }

  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
      }
    },
    [],
  )

  return (
    <ExamplePage
      activeId="data-loading"
      title="Data loading"
      summary="Mimic fetching older pages when the reader scrolls backward toward unloaded history."
      notes={[
        'The host watches the distance from the oldest loaded row.',
        'Older pages load automatically before the reserve is exhausted.',
        'When data arrives, preserveScrollOnPrepend keeps the anchor steady.',
      ]}
      aside={
        <>
          <button
            type="button"
            onClick={() =>
              viewportRef.current?.scrollToHead(
                reducedMotion
                  ? { duration: 0 }
                  : ThreadPort.Animation.easeOutQuart(520),
              )
            }
          >
            Scroll backward
          </button>
          <Metrics state={viewportSettled ? state : null} />
        </>
      }
    >
      <SettledViewportRoot settled={viewportSettled}>
        <ThreadPort.Viewport
          ref={viewportRef}
          ariaLabel="Data loading transcript"
          className="exampleViewport"
          contentClassName="exampleContent"
          estimateSize={estimateMessageSize}
          getItemKey={getMessageKey}
          headInset={DATA_LOADING_HEAD_INSET}
          headReserve={headReserve}
          initialAnchor="tail"
          itemGap={EXAMPLE_ITEM_GAP}
          itemClassName="exampleRow"
          items={messages}
          onStateChange={handleStateChange}
          preserveScrollOnPrepend
          renderItem={({ item }) => <MessageView message={item} />}
          role="log"
          tailInset={108}
          tailReserve={{ className: 'tailReserve gptTailReserve' }}
          virtualizerOptions={{ overscan: 10 }}
        />
        <InsetOverlays />
        <ThreadPort.Overlay className="dataLoadingDock" placement="head">
          {loading && <div className="loadingChip">Loading older messages</div>}
        </ThreadPort.Overlay>
        <ThreadPort.Overlay className="composerDock" placement="tail">
          <Composer onSubmit={commitMessage} />
        </ThreadPort.Overlay>
      </SettledViewportRoot>
    </ExamplePage>
  )
}
