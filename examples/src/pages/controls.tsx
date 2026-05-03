import { useRef, useState } from 'react'
import {
  Composer,
  createMessage,
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

function ControlsExample() {
  const viewportRef = useRef<ThreadPort.ViewportHandle | null>(null)
  const reducedMotion = useReducedMotion()
  const [messages, setMessages] = useState<DemoMessage[]>(() =>
    createTranscript(64),
  )
  const [state, setState] = useState<ThreadPort.ViewportState | null>(null)

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
                animation: reducedMotion
                  ? { duration: 0 }
                  : ThreadPort.Animation.easeOutQuart(420),
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
                animation: reducedMotion
                  ? { duration: 0 }
                  : ThreadPort.Animation.easeOutCubic(420),
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
          tailInset={96}
          virtualizerOptions={{ overscan: 8 }}
        />
        <ThreadPort.Overlay className="composerDock" placement="tail">
          <Composer onSubmit={commitMessage} />
        </ThreadPort.Overlay>
      </ThreadPort.Root>
    </ExamplePage>
  )
}

mountPage(<ControlsExample />)
