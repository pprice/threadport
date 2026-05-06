import { useRef, useState } from 'react'
import {
  ComposerDock,
  createTranscript,
  type DemoMessage,
  EXAMPLE_GPT_VIEWPORT_DEFAULTS,
  Metrics,
  ThreadPort,
  useGptCommitMessage,
  useInitialViewportSettled,
} from '../../lib/demo'
import { ExamplePage } from '../ExamplePage'

export default function FullscreenExample() {
  const viewportRef = useRef<ThreadPort.ViewportHandle | null>(null)
  const [messages, setMessages] = useState<DemoMessage[]>(() =>
    createTranscript(28),
  )
  const [state, setState] = useState<ThreadPort.ViewportState | null>(null)
  const viewportSettled = useInitialViewportSettled(state)
  const commitMessage = useGptCommitMessage(
    viewportRef,
    setMessages,
    'The viewport fills 100% of the host container. Resize the browser: it tracks the available height with no fixed pixels in the chain.',
  )

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
              {...EXAMPLE_GPT_VIEWPORT_DEFAULTS}
              ref={viewportRef}
              ariaLabel="Fullscreen transcript"
              headInset={20}
              items={messages}
              onStateChange={setState}
              tailInset={96}
            />
            <ComposerDock onSubmit={commitMessage} />
          </ThreadPort.Root>
        </div>
      </div>
    </ExamplePage>
  )
}
