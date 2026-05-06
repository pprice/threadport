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

export default function BasicExample() {
  const viewportRef = useRef<ThreadPort.ViewportHandle | null>(null)
  const [messages, setMessages] = useState<DemoMessage[]>(() =>
    createTranscript(36),
  )
  const [state, setState] = useState<ThreadPort.ViewportState | null>(null)
  const viewportSettled = useInitialViewportSettled(state)
  const commitMessage = useGptCommitMessage(
    viewportRef,
    setMessages,
    'The prompt is aligned below the head inset, then the assistant response starts in the open space beneath it.',
  )

  return (
    <ExamplePage
      activeId="basic"
      title="Basic"
      summary="A GPT-style transcript: submit a prompt, align it high, and let the response begin with room below."
      notes={[
        'The host app appends both the user prompt and assistant row.',
        'scrollToItem aligns the submitted prompt to the head.',
        'tailReserve gives the newest response a natural starting space.',
      ]}
      aside={<Metrics state={viewportSettled ? state : null} />}
    >
      <SettledViewportRoot settled={viewportSettled}>
        <ThreadPort.Viewport
          {...EXAMPLE_GPT_VIEWPORT_DEFAULTS}
          ref={viewportRef}
          ariaLabel="Basic GPT-style transcript"
          items={messages}
          onStateChange={setState}
        />
        <ComposerDock onSubmit={commitMessage} />
      </SettledViewportRoot>
    </ExamplePage>
  )
}
