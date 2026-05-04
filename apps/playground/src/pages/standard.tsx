import {
  Composer,
  createGptExchange,
  createTranscript,
  type DemoMessage,
  EXAMPLE_ITEM_GAP,
  estimateMessageSize,
  getMessageKey,
  InsetOverlays,
  MessageView,
  Metrics,
  SettledViewportRoot,
  scrollPromptToHead,
  ThreadPort,
  useInitialViewportSettled,
  useReducedMotion,
} from '@phipri/react-threadport-demo-shared'
import { useRef, useState } from 'react'
import { ExamplePage } from '../ExamplePage'

export default function StandardExample() {
  const viewportRef = useRef<ThreadPort.ViewportHandle | null>(null)
  const reducedMotion = useReducedMotion()
  const [messages, setMessages] = useState<DemoMessage[]>(() =>
    createTranscript(36),
  )
  const [state, setState] = useState<ThreadPort.ViewportState | null>(null)
  const viewportSettled = useInitialViewportSettled(state)

  function commitMessage(value: string) {
    const { assistantMessage, userMessage } = createGptExchange(
      value,
      'The prompt is aligned below the head inset, then the assistant response starts in the open space beneath it.',
    )

    setMessages((current) => [...current, userMessage, assistantMessage])
    scrollPromptToHead(viewportRef, userMessage.id, reducedMotion)
  }

  return (
    <ExamplePage
      activeId="standard"
      title="Standard"
      summary="A GPT-style transcript: submit a prompt, align it high, and let the response begin with room below."
      notes={[
        'The host app appends both the user prompt and assistant row.',
        'scrollToItem aligns the submitted prompt to the head.',
        'tailReserve gives the newest response a natural starting space.',
      ]}
      aside={<Metrics state={viewportSettled ? state : null} />}
    >
      <SettledViewportRoot settled={viewportSettled}>
        <ThreadPort.Viewport
          ref={viewportRef}
          ariaLabel="Standard GPT-style transcript"
          className="exampleViewport"
          contentClassName="exampleContent"
          estimateSize={estimateMessageSize}
          getItemKey={getMessageKey}
          headInset={28}
          initialAnchor="tail"
          itemGap={EXAMPLE_ITEM_GAP}
          itemClassName="exampleRow"
          items={messages}
          onStateChange={setState}
          renderItem={({ item }) => <MessageView message={item} />}
          role="log"
          tailInset={108}
          tailReserve={{ className: 'tailReserve gptTailReserve' }}
          virtualizerOptions={{ overscan: 8 }}
        />
        <InsetOverlays />
        <ThreadPort.Overlay className="composerDock" placement="tail">
          <Composer onSubmit={commitMessage} />
        </ThreadPort.Overlay>
      </SettledViewportRoot>
    </ExamplePage>
  )
}
