import { useEffect, useRef, useState } from 'react'
import {
  ComposerDock,
  createOlderBatch,
  createTranscript,
  DATA_LOADING_HEAD_RESERVE,
  type DemoMessage,
  EXAMPLE_GPT_VIEWPORT_DEFAULTS,
  estimateVirtualBatchSize,
  Metrics,
  SettledViewportRoot,
  ThreadPort,
  useGptCommitMessage,
  useInitialViewportSettled,
  useReducedMotion,
} from '../../lib/demo'
import { ExamplePage } from '../ExamplePage'

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
  const commitMessage = useGptCommitMessage(
    viewportRef,
    setMessages,
    'Loading older data is independent from the GPT-style submit behavior at the tail.',
  )

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
          {...EXAMPLE_GPT_VIEWPORT_DEFAULTS}
          ref={viewportRef}
          ariaLabel="Data loading transcript"
          headInset={DATA_LOADING_HEAD_INSET}
          headReserve={headReserve}
          items={messages}
          onStateChange={handleStateChange}
          preserveScrollOnPrepend
          virtualizerOptions={{ overscan: 10 }}
        />
        <ThreadPort.Overlay className="dataLoadingDock" placement="head">
          {loading && <div className="loadingChip">Loading older messages</div>}
        </ThreadPort.Overlay>
        <ComposerDock onSubmit={commitMessage} />
      </SettledViewportRoot>
    </ExamplePage>
  )
}
