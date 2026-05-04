import { useRef, useState } from 'react'
import {
  Composer,
  createGptExchange,
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
  SettledViewportRoot,
  scrollPromptToHead,
  ThreadPort,
  useInitialViewportSettled,
  useReducedMotion,
} from '../shared'

const headInset = 84
const tailInset = 140

function InsetsExample() {
  const viewportRef = useRef<ThreadPort.ViewportHandle | null>(null)
  const reducedMotion = useReducedMotion()
  const [messages, setMessages] = useState<DemoMessage[]>(() =>
    createTranscript(34),
  )
  const [state, setState] = useState<ThreadPort.ViewportState | null>(null)
  const viewportSettled = useInitialViewportSettled(state)

  function commitMessage(value: string) {
    const { assistantMessage, userMessage } = createGptExchange(
      value,
      'The rendered inset bands are overlays, not rows. They reserve space while the transcript remains virtualized.',
    )

    setMessages((current) => [...current, userMessage, assistantMessage])
    scrollPromptToHead(viewportRef, userMessage.id, reducedMotion)
  }

  return (
    <ExamplePage
      activeId="insets"
      title="Insets"
      summary="Render the head and tail insets so the reserved chrome space is visible while messages keep their GPT-style flow."
      notes={[
        'headInset reserves room for frame chrome above the transcript.',
        'tailInset reserves room for the composer below the transcript.',
        'Both visible bands are host-owned overlays.',
      ]}
      aside={<Metrics state={viewportSettled ? state : null} />}
    >
      <SettledViewportRoot settled={viewportSettled}>
        <ThreadPort.Viewport
          ref={viewportRef}
          ariaLabel="Inset transcript"
          className="exampleViewport"
          contentClassName="exampleContent"
          estimateSize={estimateMessageSize}
          getItemKey={getMessageKey}
          headInset={headInset}
          initialAnchor="tail"
          itemGap={EXAMPLE_ITEM_GAP}
          itemClassName="exampleRow"
          items={messages}
          onStateChange={setState}
          renderItem={({ item }) => <MessageView message={item} />}
          role="log"
          tailInset={tailInset}
          tailReserve={{ className: 'tailReserve gptTailReserve' }}
          virtualizerOptions={{ overscan: 8 }}
        />
        <InsetOverlays headInset={headInset} labeled tailInset={tailInset} />
        <ThreadPort.Overlay className="composerDock" placement="tail">
          <Composer onSubmit={commitMessage} />
        </ThreadPort.Overlay>
      </SettledViewportRoot>
    </ExamplePage>
  )
}

mountPage(<InsetsExample />)
