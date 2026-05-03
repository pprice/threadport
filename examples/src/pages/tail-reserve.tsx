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

function TailReserveExample() {
  const viewportRef = useRef<ThreadPort.ViewportHandle | null>(null)
  const reducedMotion = useReducedMotion()
  const [messages, setMessages] = useState<DemoMessage[]>(() =>
    createTranscript(16),
  )
  const [state, setState] = useState<ThreadPort.ViewportState | null>(null)

  function appendWithReserve(value = 'Show the active tail reserve.') {
    const userMessage = createMessage('user', value)
    const assistantMessage = createMessage(
      'assistant',
      'The newest assistant row starts with temporary space beneath it.',
      'note',
      'Reserved tail',
    )

    setMessages((current) => [...current, userMessage, assistantMessage])
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
      activeId="tail-reserve"
      title="Tail reserve"
      summary="Give the active appended tail row a viewport-sized minimum without adding synthetic spacer items."
      notes={[
        'Only the active appended tail row gets a reserve wrapper.',
        'As content grows, it burns through the minimum naturally.',
        'Permanent composer space still belongs to tailInset.',
      ]}
      aside={
        <>
          <button type="button" onClick={() => appendWithReserve()}>
            Append reserved tail
          </button>
          <Metrics state={state} />
        </>
      }
    >
      <ThreadPort.Root className="demoFrame">
        <ThreadPort.Viewport
          ref={viewportRef}
          ariaLabel="Tail reserve transcript"
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
          tailReserve={{ className: 'tailReserve' }}
          virtualizerOptions={{ overscan: 8 }}
        />
        <ThreadPort.Overlay className="composerDock" placement="tail">
          <Composer onSubmit={appendWithReserve} />
        </ThreadPort.Overlay>
      </ThreadPort.Root>
    </ExamplePage>
  )
}

mountPage(<TailReserveExample />)
