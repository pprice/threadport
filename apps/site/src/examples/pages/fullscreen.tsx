import { useRef, useState } from 'react'
import {
  Composer,
  createGptExchange,
  createTranscript,
  type DemoMessage,
  EXAMPLE_ITEM_GAP,
  estimateMessageSize,
  getMessageKey,
  MessageView,
  Metrics,
  scrollPromptToHead,
  ThreadPort,
  useInitialViewportSettled,
  useReducedMotion,
} from '../../lib/demo'
import { ExamplePage } from '../ExamplePage'

export default function FullscreenExample() {
  const viewportRef = useRef<ThreadPort.ViewportHandle | null>(null)
  const reducedMotion = useReducedMotion()
  const [messages, setMessages] = useState<DemoMessage[]>(() =>
    createTranscript(28),
  )
  const [state, setState] = useState<ThreadPort.ViewportState | null>(null)
  const viewportSettled = useInitialViewportSettled(state)

  function commitMessage(value: string) {
    const { assistantMessage, userMessage } = createGptExchange(
      value,
      'The viewport fills 100% of the host container. Resize the browser: it tracks the available height with no fixed pixels in the chain.',
    )

    setMessages((current) => [...current, userMessage, assistantMessage])
    scrollPromptToHead(viewportRef, userMessage.id, reducedMotion)
  }

  return (
    <ExamplePage
      activeId="fullscreen"
      title="Fullscreen"
      summary="Drop the viewport into a 100dvh shell with a header and composer flanking it. No fixed heights anywhere."
      notes={[
        'The shell is a flex column at 100dvh.',
        'Root and Viewport ship sensible flex defaults — no min-height: 0 needed by the host.',
        'Resize the window: the viewport tracks the available height and scrolls internally.',
      ]}
      aside={<Metrics state={viewportSettled ? state : null} />}
    >
      <div className="fullscreenStage">
        <div className="fullscreenShell">
          <header className="fullscreenHeader">
            <div className="fullscreenTitle">Threadport</div>
            <div className="fullscreenStatus">Online</div>
          </header>
          <ThreadPort.Root
            className={`fullscreenFrame ${
              viewportSettled ? 'viewportSettled' : 'viewportSettling'
            }`}
          >
            <ThreadPort.Viewport
              ref={viewportRef}
              ariaLabel="Fullscreen transcript"
              className="exampleViewport"
              contentClassName="exampleContent"
              estimateSize={estimateMessageSize}
              getItemKey={getMessageKey}
              headInset={20}
              initialAnchor="tail"
              itemGap={EXAMPLE_ITEM_GAP}
              itemClassName="exampleRow"
              items={messages}
              onStateChange={setState}
              renderItem={({ item }) => <MessageView message={item} />}
              role="log"
              tailInset={96}
              tailReserve={{ className: 'tailReserve gptTailReserve' }}
              virtualizerOptions={{ overscan: 8 }}
            />
            <ThreadPort.Overlay className="composerDock" placement="tail">
              <Composer onSubmit={commitMessage} />
            </ThreadPort.Overlay>
          </ThreadPort.Root>
        </div>
      </div>
    </ExamplePage>
  )
}
