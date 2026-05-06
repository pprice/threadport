import { Eye, EyeOff } from 'lucide-react'
import { memo, useEffect, useRef, useState } from 'react'
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

const VISIBILITY_OPTIONS = {
  thresholdPercent: 0.5,
  dwellMs: 500,
} satisfies ThreadPort.VisibilityOptions

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
  const isAtTail = state?.isAtTail ?? false

  useEffect(() => {
    if (!isAtTail) {
      return
    }

    setReadKeys((current) => {
      if (current.size === messages.length) {
        return current
      }

      const next = new Set(current)
      for (const message of messages) {
        next.add(getMessageKey(message))
      }
      return next
    })
  }, [isAtTail, messages])

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
      summary="Mark items as read with a threshold + dwell so scroll-flybys don't count. The unread badge subscribes to viewport state via useViewportSelector — no onStateChange plumbing for that slice."
      notes={[
        'visibilityOptions tighten the signal: an item must be 50% visible for 500ms before it counts as entered.',
        'The unread badge is a sibling component that reads isAtHead via useViewportSelector and only re-renders when that slice changes.',
        'Reaching the tail (scroll, End, jump) is host policy here — the page marks everything read so a fast jump past unread rows still resolves to "caught up".',
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
          visibilityOptions={VISIBILITY_OPTIONS}
        />
        <ThreadPort.Overlay className="visibilityCounterLayer" placement="head">
          <VisibilityCounter unread={unread} />
        </ThreadPort.Overlay>
      </SettledViewportRoot>
    </ExamplePage>
  )
}

function VisibilityCounter({ unread }: { unread: number }) {
  const isAtHead = ThreadPort.useViewportSelector((state) => state.isAtHead)

  if (unread === 0) {
    return (
      <div
        aria-live="polite"
        className="visibilityCounter"
        data-state="caught-up"
      >
        <Eye aria-hidden="true" size={14} />
        <span>All caught up</span>
      </div>
    )
  }

  return (
    <div aria-live="polite" className="visibilityCounter" data-state="unread">
      <EyeOff aria-hidden="true" size={14} />
      <span>
        {unread} unread{isAtHead ? '' : ' below'}
      </span>
    </div>
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
