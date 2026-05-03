import { useEffect, useRef, useState } from 'react'
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

const streamChunks = [
  ' The viewport does not chase every token.',
  ' The host can stream content into the current row, and measurement absorbs the height change.',
  ' If the user wants the bottom, the host calls scrollToTail once.',
  ' That policy stays explicit.',
]

function StreamingExample() {
  const viewportRef = useRef<ThreadPort.ViewportHandle | null>(null)
  const timerRef = useRef<number | null>(null)
  const reducedMotion = useReducedMotion()
  const [messages, setMessages] = useState<DemoMessage[]>(() =>
    createTranscript(18),
  )
  const [state, setState] = useState<ThreadPort.ViewportState | null>(null)

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  function startStream(value: string) {
    clearTimer()

    const userMessage = createMessage('user', value)
    const assistantMessage = createMessage(
      'assistant',
      'Starting a streamed response.',
      'note',
      'Streaming response',
    )
    let chunkIndex = 0

    setMessages((current) => [...current, userMessage, assistantMessage])
    requestAnimationFrame(() => {
      viewportRef.current?.scrollToItem(userMessage.id, {
        align: 'head',
        animation: reducedMotion
          ? { duration: 0 }
          : ThreadPort.Animation.easeOutQuart(460),
      })
    })

    timerRef.current = window.setInterval(() => {
      const chunk = streamChunks[chunkIndex]

      if (!chunk) {
        clearTimer()
        return
      }

      setMessages((current) =>
        current.map((message) =>
          message.id === assistantMessage.id
            ? {
                ...message,
                body: `${message.body}${chunk}`,
                estimate: message.estimate + 44,
              }
            : message,
        ),
      )
      chunkIndex += 1
    }, 520)
  }

  useEffect(() => clearTimer, [])

  return (
    <ExamplePage
      activeId="streaming"
      title="Streaming response"
      summary="Append a prompt, stream an assistant row, and keep tail-follow policy in the host."
      notes={[
        'Streaming updates mutate normal row content.',
        'Threadport measures height changes without owning streaming state.',
        'Reduced motion switches the prompt scroll to an instant jump.',
      ]}
      aside={
        <>
          <button
            type="button"
            onClick={() => startStream('Stream a concise answer.')}
          >
            Start stream
          </button>
          <button
            type="button"
            onClick={() =>
              viewportRef.current?.scrollToTail(
                reducedMotion
                  ? { duration: 0 }
                  : ThreadPort.Animation.easeOutCubic(360),
              )
            }
          >
            Scroll to tail
          </button>
          <Metrics state={state} />
        </>
      }
    >
      <ThreadPort.Root className="demoFrame">
        <ThreadPort.Viewport
          ref={viewportRef}
          ariaLabel="Streaming virtualized transcript"
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
          <Composer onSubmit={startStream} />
        </ThreadPort.Overlay>
      </ThreadPort.Root>
    </ExamplePage>
  )
}

mountPage(<StreamingExample />)
