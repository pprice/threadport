import { useRef, useState } from 'react'
import {
  Composer,
  createGptExchange,
  createTranscript,
  type DemoMessage,
  ExamplePage,
  estimateMessageSize,
  getMessageKey,
  MessageView,
  Metrics,
  mountPage,
  scrollPromptToHead,
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
    const { assistantMessage, userMessage } = createGptExchange(
      value,
      'The mobile frame uses the same submit policy: align the prompt high and let the answer start beneath it.',
    )

    setMessages((current) => [...current, userMessage, assistantMessage])
    scrollPromptToHead(viewportRef, userMessage.id, reducedMotion)
  }

  return (
    <ExamplePage
      activeId="mobile"
      title="Mobile"
      summary="A phone-sized GPT shell with fixed chrome, a composer overlay, and the same prompt-to-top submit behavior."
      notes={[
        'The top overlay is not a row.',
        'Wheel and touch scrolling stay attached to the viewport.',
        'Submitted prompts align below the mobile head inset.',
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
            tailReserve={{ className: 'tailReserve gptTailReserve' }}
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
