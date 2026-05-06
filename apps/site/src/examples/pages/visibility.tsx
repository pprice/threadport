import { Eye, EyeOff } from 'lucide-react'
import { memo, useRef, useState } from 'react'
import {
  createTranscript,
  type DemoMessage,
  EXAMPLE_VIEWPORT_BASE,
  getMessageKey,
  MessageView,
  Metrics,
  SettledViewportRoot,
  ThreadPort,
  useInitialViewportSettled,
  useReducedMotion,
} from '../../lib/demo'
import { ExamplePage } from '../ExamplePage'

export default function VisibilityExample() {
  const viewportRef = useRef<ThreadPort.ViewportHandle | null>(null)
  const reducedMotion = useReducedMotion()
  const [messages] = useState<DemoMessage[]>(() => createTranscript(25))
  const [readKeys, setReadKeys] = useState<Set<ThreadPort.ItemKey>>(
    () => new Set(),
  )
  const [state, setState] = useState<ThreadPort.ViewportState | null>(null)
  const viewportSettled = useInitialViewportSettled(state)

  const unread = messages.length - readKeys.size

  function reset() {
    setReadKeys(new Set())
    viewportRef.current?.scrollToHead(
      reducedMotion ? { duration: 0 } : ThreadPort.Animation.easeOutCubic(360),
    )
  }

  return (
    <ExamplePage
      activeId="visibility"
      title="Visibility tracking"
      summary="Mark items as read when they scroll into view. onVisibilityChange fires when the in-rect set changes; the entered array drives a Set of read keys."
      notes={[
        'onVisibilityChange fires only on set changes, not on every scroll frame.',
        'entered is the natural input for mark-as-read; exited fits cleanup work like releasing embeds.',
        'visible carries the current full set in DOM order, so analytics-style consumers do not need to maintain it.',
      ]}
      aside={
        <>
          <button type="button" disabled={readKeys.size === 0} onClick={reset}>
            Reset to unread
          </button>
          <Metrics state={viewportSettled ? state : null} />
        </>
      }
    >
      <SettledViewportRoot settled={viewportSettled}>
        <ThreadPort.Viewport
          {...EXAMPLE_VIEWPORT_BASE}
          ref={viewportRef}
          ariaLabel="Visibility tracking transcript"
          headInset={56}
          initialAnchor="head"
          items={messages}
          onStateChange={setState}
          onVisibilityChange={({ entered }) => {
            if (entered.length === 0) {
              return
            }

            setReadKeys((previous) => {
              const next = new Set(previous)

              for (const key of entered) {
                next.add(key)
              }

              return next
            })
          }}
          renderItem={({ item }) => (
            <VisibilityRow
              message={item}
              read={readKeys.has(getMessageKey(item))}
            />
          )}
          virtualizerOptions={{ overscan: 6 }}
        />
        <ThreadPort.Overlay className="visibilityCounterLayer" placement="head">
          <div
            aria-live="polite"
            className="visibilityCounter"
            data-state={unread === 0 ? 'caught-up' : 'unread'}
          >
            {unread === 0 ? (
              <>
                <Eye aria-hidden="true" size={14} />
                <span>All caught up</span>
              </>
            ) : (
              <>
                <EyeOff aria-hidden="true" size={14} />
                <span>{unread} unread</span>
              </>
            )}
          </div>
        </ThreadPort.Overlay>
      </SettledViewportRoot>
    </ExamplePage>
  )
}

const VisibilityRow = memo(function VisibilityRow({
  message,
  read,
}: {
  message: DemoMessage
  read: boolean
}) {
  return (
    <div
      className={read ? 'visibilityRow visibilityRow-read' : 'visibilityRow'}
      data-message-id={message.id}
    >
      <MessageView message={message} />
    </div>
  )
})
