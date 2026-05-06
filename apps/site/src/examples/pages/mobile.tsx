import { useRef, useState } from 'react'
import {
  ComposerDock,
  createTranscript,
  type DemoMessage,
  EXAMPLE_GPT_VIEWPORT_DEFAULTS,
  Metrics,
  SettledViewportRoot,
  ThreadPort,
  useGptCommitMessage,
  useInitialViewportSettled,
} from '../../lib/demo'
import { ExamplePage } from '../ExamplePage'

export default function MobileExample() {
  const viewportRef = useRef<ThreadPort.ViewportHandle | null>(null)
  const [messages, setMessages] = useState<DemoMessage[]>(() =>
    createTranscript(30),
  )
  const [state, setState] = useState<ThreadPort.ViewportState | null>(null)
  const viewportSettled = useInitialViewportSettled(state)
  const commitMessage = useGptCommitMessage(
    viewportRef,
    setMessages,
    'The mobile frame uses the same submit policy: align the prompt high and let the answer start beneath it.',
  )

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
      aside={<Metrics state={viewportSettled ? state : null} />}
    >
      <div className="phoneStage">
        <SettledViewportRoot className="phoneFrame" settled={viewportSettled}>
          <div className="mobileHead" aria-hidden="true">
            <span>Threadport</span>
            <span>Menu</span>
          </div>
          <ThreadPort.Viewport
            {...EXAMPLE_GPT_VIEWPORT_DEFAULTS}
            ref={viewportRef}
            ariaLabel="Mobile virtualized transcript"
            headInset={76}
            items={messages}
            onStateChange={setState}
            tailInset={150}
          />
          <ComposerDock onSubmit={commitMessage} />
        </SettledViewportRoot>
      </div>
    </ExamplePage>
  )
}
