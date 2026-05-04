import { useRef, useState } from 'react'
import {
  Composer,
  createGptExchange,
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
  ThreadPort,
  useInitialViewportSettled,
  useReducedMotion,
} from '../../lib/demo'
import { ExamplePage } from '../ExamplePage'

export default function JumpToBottomExample() {
  const viewportRef = useRef<ThreadPort.ViewportHandle | null>(null)
  const reducedMotion = useReducedMotion()
  const [messages, setMessages] = useState<DemoMessage[]>(() =>
    createTranscript(52),
  )
  const [state, setState] = useState<ThreadPort.ViewportState | null>(null)
  const viewportSettled = useInitialViewportSettled(state)
  const showJump = Boolean(state && state.distanceFromTail > 140)

  function tailAnimation(duration = 360) {
    return reducedMotion
      ? { duration: 0 }
      : ThreadPort.Animation.easeOutCubic(duration)
  }

  function commitMessage(value: string) {
    const { assistantMessage, userMessage } = createGptExchange(
      value,
      'Submitted prompts still jump to the top. The jump control is reserved for returning to unread tail content.',
    )

    setMessages((current) => [...current, userMessage, assistantMessage])
    scrollPromptToHead(viewportRef, userMessage.id, reducedMotion)
  }

  function appendRemoteReply() {
    const shouldFollow = (state?.distanceFromTail ?? 0) < 96
    const reply = createMessage(
      'assistant',
      'A new assistant message arrived below the reader. The host can reveal a jump control instead of stealing scroll.',
      'note',
      'New at tail',
    )

    setMessages((current) => [...current, reply])

    if (shouldFollow) {
      requestAnimationFrame(() => {
        viewportRef.current?.scrollToTail(tailAnimation())
      })
    }
  }

  return (
    <ExamplePage
      activeId="jump-to-bottom"
      title="Jump to bottom"
      summary="Keep the reader in place when they scroll away from the tail, then expose an explicit return control."
      notes={[
        'The viewport reports distanceFromTail through onStateChange.',
        'The host decides when the jump control should appear.',
        'Remote appends do not need to steal the reader position.',
      ]}
      aside={
        <>
          <button
            type="button"
            onClick={() =>
              viewportRef.current?.scrollToIndex(18, {
                align: 'head',
                animation: tailAnimation(420),
              })
            }
          >
            Read earlier
          </button>
          <button type="button" onClick={appendRemoteReply}>
            Append reply below
          </button>
          <Metrics state={viewportSettled ? state : null} />
        </>
      }
    >
      <SettledViewportRoot settled={viewportSettled}>
        <ThreadPort.Viewport
          ref={viewportRef}
          ariaLabel="Jump to bottom transcript"
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
        {showJump && (
          <ThreadPort.Overlay className="jumpOverlay" placement="fill">
            <button
              className="floatingJump"
              type="button"
              onClick={() => viewportRef.current?.scrollToTail(tailAnimation())}
            >
              Jump to bottom
            </button>
          </ThreadPort.Overlay>
        )}
        <ThreadPort.Overlay className="composerDock" placement="tail">
          <Composer onSubmit={commitMessage} />
        </ThreadPort.Overlay>
      </SettledViewportRoot>
    </ExamplePage>
  )
}
