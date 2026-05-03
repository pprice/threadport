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

function BasicExample() {
  const viewportRef = useRef<ThreadPort.ViewportHandle | null>(null)
  const reducedMotion = useReducedMotion()
  const [messages, setMessages] = useState<DemoMessage[]>(() =>
    createTranscript(44),
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
      activeId="basic"
      title="Basic transcript"
      summary="A bounded chat viewport with variable-height messages and an integrator-owned composer."
      notes={[
        'The viewport receives items, estimates, keys, and a render function.',
        'Composer and surface chrome are outside the virtualized rows.',
        'The example starts at the tail without forcing follow behavior later.',
      ]}
      aside={<Metrics state={state} />}
    >
      <ThreadPort.Root className="demoFrame">
        <ThreadPort.Viewport
          ref={viewportRef}
          ariaLabel="Basic virtualized transcript"
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

mountPage(<BasicExample />)
