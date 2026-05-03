import { useRef, useState } from 'react'
import {
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
} from '../shared'

function HistoryExample() {
  const seedRef = useRef(0)
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
          tailInset={32}
          virtualizerOptions={{ overscan: 10 }}
        />
      </ThreadPort.Root>
    </ExamplePage>
  )
}

mountPage(<HistoryExample />)
