import { useEffect, useRef, useState } from 'react'
import {
  Composer,
  createMessage,
  createTranscript,
  type DemoMessage,
  EXAMPLE_ITEM_GAP,
  estimateMessageSize,
  getMessageKey,
  MessageView,
  Metrics,
  SettledViewportRoot,
  scrollPromptToHead,
  streamMessageChunks,
  ThreadPort,
  useInitialViewportSettled,
  useReducedMotion,
} from '../../lib/demo'
import { ExamplePage } from '../ExamplePage'

const longResponseChunks = [
  ' Tail reserve is most useful when a new assistant answer begins with a lot of room below it, then gradually consumes that room as real content fills in.',
  '\n\nThe host still appends ordinary rows. The viewport marks the latest tail row as active, measures its rendered content, and subtracts the consumed height from the extra tail space. There is no fake spacer item in the transcript.',
  '\n\nThat distinction matters for long answers. A synthetic spacer tends to become a second thing the app has to coordinate with streaming, selection, keyboard focus, and copy controls. Tail reserve keeps the behavior attached to the row that actually owns the response.',
  '\n\nWhen the answer is short, the reserved space remains visible and the reply can start high in the frame. When the answer is long, the response naturally burns through the reserve and continues like any other measured message.',
  '\n\nThe same submit policy still applies here: the human prompt scrolls to the head with easing, then the assistant response begins beneath it. The long row can include paragraphs, code, controls, or custom blocks because rendering stays app-owned React.',
  '\n\nResize, font changes, and post-paint measurement can all change the row height. Threadport responds to the measured result rather than assuming the estimate was right.',
  '\n\nThis example streams a large response so the tail reserve behavior is visible while the row grows. The row is still just one assistant item, and the reserve burns down as that item becomes taller.',
  '\n\nA real assistant response usually changes shape after the first paint. Markdown resolves, syntax blocks appear, citations arrive, images load, and controls mount. The virtualizer should not require the host to predict that exact height ahead of time.',
  '\n\nThe important integration detail is that streaming remains host policy. Threadport does not know about tokens, models, or network requests. It only receives a larger item, measures the row, and keeps scroll math coherent.',
  '\n\nIf the user has scrolled away, the host can decide whether to preserve their position or show a jump affordance. If the user just submitted a prompt, the host can align that prompt high and let the response grow below it.',
  '\n\nThe reserve also keeps the composer from feeling like it is crowding the answer. The new response has a calm starting position, then the transcript becomes dense only when the answer actually earns that space.',
  '\n\nLong answers make bad approximations obvious. If the app uses an external spacer, the spacer can outlive the row, conflict with selection, or produce odd gaps after content finishes. Attached reserve avoids that bookkeeping.',
  '\n\nThis is also why measurement is the central contract. Estimates are useful for first layout, but rendered content wins. As chunks append, the measured height becomes the source of truth.',
  '\n\nThe final result is mundane in the best way: a long GPT-style answer streams in, the prompt remains anchored near the top, and the tail reserve disappears because real content consumed it.',
]

const completedLongResponse = longResponseChunks.join('').trim()

export default function LongResponseExample() {
  const viewportRef = useRef<ThreadPort.ViewportHandle | null>(null)
  const stopStreamRef = useRef<(() => void) | null>(null)
  const reducedMotion = useReducedMotion()
  const [messages, setMessages] = useState<DemoMessage[]>(() =>
    createTranscript(24),
  )
  const [state, setState] = useState<ThreadPort.ViewportState | null>(null)
  const viewportSettled = useInitialViewportSettled(state)

  function stopStream() {
    stopStreamRef.current?.()
    stopStreamRef.current = null
  }

  function commitMessage(value: string) {
    stopStream()

    const userMessage = createMessage('user', value)
    const assistantMessage = createMessage(
      'assistant',
      reducedMotion ? completedLongResponse : 'Starting a long response.',
      undefined,
      'Long response',
    )

    setMessages((current) => [...current, userMessage, assistantMessage])
    scrollPromptToHead(viewportRef, userMessage.id, reducedMotion)

    if (!reducedMotion) {
      stopStreamRef.current = streamMessageChunks({
        chunks: longResponseChunks,
        interval: 145,
        messageId: assistantMessage.id,
        setMessages,
      })
    }
  }

  useEffect(() => stopStream, [])

  return (
    <ExamplePage
      activeId="long-response"
      title="Long response"
      summary="A tail-reserve example where the newest assistant row is long enough to consume the reserved space."
      notes={[
        'The newest tail row gets a viewport-sized reserve.',
        'The long response burns through that reserve as measured content.',
        'The prompt still scrolls to the head using the shared easing policy.',
      ]}
      aside={
        <>
          <button
            type="button"
            onClick={() => commitMessage('Write the detailed version.')}
          >
            Append long response
          </button>
          <Metrics state={viewportSettled ? state : null} />
        </>
      }
    >
      <SettledViewportRoot settled={viewportSettled}>
        <ThreadPort.Viewport
          ref={viewportRef}
          ariaLabel="Long response tail reserve transcript"
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
          tailReserve={{ className: 'tailReserve longTailReserve' }}
          virtualizerOptions={{ overscan: 8 }}
        />
        <ThreadPort.Overlay className="composerDock" placement="tail">
          <Composer onSubmit={commitMessage} />
        </ThreadPort.Overlay>
      </SettledViewportRoot>
    </ExamplePage>
  )
}
