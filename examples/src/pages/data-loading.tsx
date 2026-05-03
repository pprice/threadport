import { useEffect, useRef, useState } from 'react'
import {
  Composer,
  createGptExchange,
  createOlderBatch,
  createTranscript,
  type DemoMessage,
  EXAMPLE_ITEM_GAP,
  ExamplePage,
  estimateMessageSize,
  getMessageKey,
  InsetOverlays,
  MessageView,
  Metrics,
  mountPage,
  scrollPromptToHead,
  ThreadPort,
  useReducedMotion,
} from '../shared'

function DataLoadingExample() {
  const seedRef = useRef(0)
  const timerRef = useRef<number | null>(null)
  const loadingRef = useRef(false)
  const viewportRef = useRef<ThreadPort.ViewportHandle | null>(null)
  const reducedMotion = useReducedMotion()
  const [headReserve, setHeadReserve] = useState(3600)
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<DemoMessage[]>(() =>
    createTranscript(76),
  )
  const [state, setState] = useState<ThreadPort.ViewportState | null>(null)

  function finishLoad() {
    const batch = createOlderBatch(seedRef.current)

    seedRef.current += batch.length
    setMessages((current) => [...batch, ...current])
    setHeadReserve((current) =>
      Math.max(
        0,
        current - batch.reduce((total, message) => total + message.estimate, 0),
      ),
    )
    loadingRef.current = false
    timerRef.current = null
    setLoading(false)
  }

  function loadOlder() {
    if (loadingRef.current || headReserve === 0) {
      return
    }

    loadingRef.current = true
    setLoading(true)
    timerRef.current = window.setTimeout(finishLoad, reducedMotion ? 120 : 820)
  }

  function handleStateChange(nextState: ThreadPort.ViewportState) {
    setState(nextState)

    if (
      nextState.scrollDirection === 'head' &&
      nextState.distanceFromHead < 420
    ) {
      loadOlder()
    }
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
        'The host watches distanceFromHead and scrollDirection.',
        'A loading overlay appears while older rows are fetched.',
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
          <button type="button" onClick={loadOlder}>
            Load older page
          </button>
          <Metrics state={state} />
        </>
      }
    >
      <ThreadPort.Root className="demoFrame">
        <ThreadPort.Viewport
          ref={viewportRef}
          ariaLabel="Data loading transcript"
          className="exampleViewport"
          contentClassName="exampleContent"
          estimateSize={estimateMessageSize}
          getItemKey={getMessageKey}
          headInset={78}
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
      </ThreadPort.Root>
    </ExamplePage>
  )
}

mountPage(<DataLoadingExample />)
