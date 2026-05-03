import { useRef, useState } from 'react'
import {
  Composer,
  createMessage,
  createOlderBatch,
  createTranscript,
  type DemoMessage,
  ExamplePage,
  estimateMessageSize,
  getMessageKey,
  MessageView,
  Metrics,
  mountPage,
  ThreadPort,
  useReducedMotion,
} from '../shared'

function HistoryExample() {
  const seedRef = useRef(0)
  const viewportRef = useRef<ThreadPort.ViewportHandle | null>(null)
  const reducedMotion = useReducedMotion()
  const [headReserve, setHeadReserve] = useState(1600)
  const [messages, setMessages] = useState<DemoMessage[]>(() =>
    createTranscript(120),
  )
  const [state, setState] = useState<ThreadPort.ViewportState | null>(null)

  function prependOlder() {
    const batch = createOlderBatch(seedRef.current)

    seedRef.current += batch.length
    setMessages((current) => [...batch, ...current])
    setHeadReserve((current) =>
      Math.max(
        0,
        current - batch.reduce((total, message) => total + message.estimate, 0),
      ),
    )
  }

  function commitMessage(value: string) {
    const userMessage = createMessage('user', value)

    setMessages((current) => [...current, userMessage])
    requestAnimationFrame(() => {
      viewportRef.current?.scrollToItem(userMessage.id, {
        align: 'head',
        animation: reducedMotion
          ? { duration: 0 }
          : ThreadPort.Animation.easeOutQuart(420),
      })
    })
  }

  return (
    <ExamplePage
      activeId="history"
      title="History prepend"
      summary="Load older messages above the viewport while preserving the current visible anchor."
      notes={[
        'headReserve models unloaded history before the first item.',
        'Prepending real rows consumes reserve without jumping the reader.',
        'The visible row count stays virtualized even with a long transcript.',
      ]}
      aside={
        <>
          <button type="button" onClick={prependOlder}>
            Prepend older messages
          </button>
          <Metrics state={state} />
        </>
      }
    >
      <ThreadPort.Root className="demoFrame">
        <ThreadPort.Viewport
          ref={viewportRef}
          ariaLabel="History prepend transcript"
          className="exampleViewport"
          contentClassName="exampleContent"
          estimateSize={estimateMessageSize}
          getItemKey={getMessageKey}
          headInset={28}
          headReserve={headReserve}
          initialAnchor="tail"
          itemClassName="exampleRow"
          items={messages}
          onStateChange={setState}
          preserveScrollOnPrepend
          renderItem={({ item }) => <MessageView message={item} />}
          role="log"
          tailInset={96}
          virtualizerOptions={{ overscan: 10 }}
        />
        <ThreadPort.Overlay className="composerDock" placement="tail">
          <Composer onSubmit={commitMessage} />
        </ThreadPort.Overlay>
      </ThreadPort.Root>
    </ExamplePage>
  )
}

mountPage(<HistoryExample />)
