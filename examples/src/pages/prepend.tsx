import { useRef, useState } from 'react'
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

function PrependExample() {
  const seedRef = useRef(0)
  const viewportRef = useRef<ThreadPort.ViewportHandle | null>(null)
  const reducedMotion = useReducedMotion()
  const [headReserve, setHeadReserve] = useState(1800)
  const [messages, setMessages] = useState<DemoMessage[]>(() =>
    createTranscript(96),
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
    const { assistantMessage, userMessage } = createGptExchange(
      value,
      'Appending still behaves like the standard GPT flow, even on a transcript that supports older history above.',
    )

    setMessages((current) => [...current, userMessage, assistantMessage])
    scrollPromptToHead(viewportRef, userMessage.id, reducedMotion)
  }

  return (
    <ExamplePage
      activeId="prepend"
      title="Prepend"
      summary="Insert older messages above the viewport without moving the message the reader is looking at."
      notes={[
        'headReserve models unloaded history before the first rendered row.',
        'preserveScrollOnPrepend keeps the visible anchor stable.',
        'The same GPT-style composer still appends at the tail.',
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
          ariaLabel="Prepend transcript"
          className="exampleViewport"
          contentClassName="exampleContent"
          estimateSize={estimateMessageSize}
          getItemKey={getMessageKey}
          headInset={28}
          headReserve={headReserve}
          initialAnchor="tail"
          itemGap={EXAMPLE_ITEM_GAP}
          itemClassName="exampleRow"
          items={messages}
          onStateChange={setState}
          preserveScrollOnPrepend
          renderItem={({ item }) => <MessageView message={item} />}
          role="log"
          tailInset={108}
          tailReserve={{ className: 'tailReserve gptTailReserve' }}
          virtualizerOptions={{ overscan: 10 }}
        />
        <InsetOverlays />
        <ThreadPort.Overlay className="composerDock" placement="tail">
          <Composer onSubmit={commitMessage} />
        </ThreadPort.Overlay>
      </ThreadPort.Root>
    </ExamplePage>
  )
}

mountPage(<PrependExample />)
