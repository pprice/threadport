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

function MobileExample() {
  const viewportRef = useRef<ThreadPort.ViewportHandle | null>(null)
  const reducedMotion = useReducedMotion()
  const [messages, setMessages] = useState<DemoMessage[]>(() =>
    createTranscript(30),
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
      activeId="mobile"
      title="Mobile shell"
      summary="Insets and frame-relative overlays keep phone chrome outside the virtualized list."
      notes={[
        'The top overlay is not a row.',
        'Wheel and touch scrolling stay attached to the viewport.',
        'The composer is outside the measured message tree.',
      ]}
      aside={<Metrics state={state} />}
    >
      <div className="phoneStage">
        <ThreadPort.Root className="phoneFrame">
          <div className="mobileHead" aria-hidden="true">
            <span>Threadport</span>
            <span>Menu</span>
          </div>
          <ThreadPort.Viewport
            ref={viewportRef}
            ariaLabel="Mobile virtualized transcript"
            className="exampleViewport"
            contentClassName="exampleContent"
            estimateSize={estimateMessageSize}
            getItemKey={getMessageKey}
            headInset={76}
            initialAnchor="tail"
            itemClassName="exampleRow"
            items={messages}
            onStateChange={setState}
            renderItem={({ item }) => <MessageView message={item} />}
            role="log"
            tailInset={150}
            virtualizerOptions={{ overscan: 8 }}
          />
          <ThreadPort.Overlay className="composerDock" placement="tail">
            <Composer onSubmit={commitMessage} />
          </ThreadPort.Overlay>
        </ThreadPort.Root>
      </div>
    </ExamplePage>
  )
}

mountPage(<MobileExample />)
