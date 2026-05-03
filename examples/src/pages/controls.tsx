import { useMemo, useRef, useState } from 'react'
import {
  createTranscript,
  ExamplePage,
  estimateMessageSize,
  getMessageKey,
  MessageView,
  Metrics,
  mountPage,
  ThreadPort,
} from '../shared'

function ControlsExample() {
  const viewportRef = useRef<ThreadPort.ViewportHandle | null>(null)
  const messages = useMemo(() => createTranscript(64), [])
  const [state, setState] = useState<ThreadPort.ViewportState | null>(null)

  return (
    <ExamplePage
      activeId="controls"
      title="Imperative controls"
      summary="Use the handle for explicit scroll commands while the viewport continues to report state."
      notes={[
        'scrollToHead and scrollToTail target the transcript edges.',
        'scrollToIndex and scrollToItem support app-owned navigation.',
        'The handle also exposes measure, getState, and animation cancellation.',
      ]}
      aside={
        <>
          <button
            type="button"
            onClick={() => viewportRef.current?.scrollToHead()}
          >
            Scroll to head
          </button>
          <button
            type="button"
            onClick={() => viewportRef.current?.scrollToTail()}
          >
            Scroll to tail
          </button>
          <button
            type="button"
            onClick={() =>
              viewportRef.current?.scrollToIndex(24, {
                align: 'head',
                animation: ThreadPort.Animation.easeOutQuart(420),
              })
            }
          >
            Scroll to index 24
          </button>
          <button
            type="button"
            onClick={() =>
              viewportRef.current?.scrollToItem(messages[36]?.id ?? '', {
                align: 'center',
                animation: ThreadPort.Animation.easeOutCubic(420),
              })
            }
          >
            Scroll to item key
          </button>
          <Metrics state={state} />
        </>
      }
    >
      <ThreadPort.Root className="demoFrame">
        <ThreadPort.Viewport
          ref={viewportRef}
          ariaLabel="Imperative controls transcript"
          className="exampleViewport"
          contentClassName="exampleContent"
          estimateSize={estimateMessageSize}
          getItemKey={getMessageKey}
          headInset={28}
          initialAnchor="tail"
          itemClassName="exampleRow"
          items={messages}
          onStateChange={setState}
          renderItem={({ item }) => <MessageView message={item} />}
          role="log"
          tailInset={32}
          virtualizerOptions={{ overscan: 8 }}
        />
      </ThreadPort.Root>
    </ExamplePage>
  )
}

mountPage(<ControlsExample />)
