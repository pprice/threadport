import { useRef, useState } from 'react'
import {
  ComposerDock,
  createTranscript,
  type DemoMessage,
  EXAMPLE_GPT_VIEWPORT_DEFAULTS,
  InsetOverlays,
  Metrics,
  SettledViewportRoot,
  ThreadPort,
  useGptCommitMessage,
  useInitialViewportSettled,
} from '../../lib/demo'
import { ExamplePage } from '../ExamplePage'

const headInset = 84
const tailInset = 140

export default function InsetsExample() {
  const viewportRef = useRef<ThreadPort.ViewportHandle | null>(null)
  const [messages, setMessages] = useState<DemoMessage[]>(() =>
    createTranscript(34),
  )
  const [state, setState] = useState<ThreadPort.ViewportState | null>(null)
  const viewportSettled = useInitialViewportSettled(state)
  const commitMessage = useGptCommitMessage(
    viewportRef,
    setMessages,
    'The rendered inset bands are overlays, not rows. They reserve space while the transcript remains virtualized.',
  )

  return (
    <ExamplePage
      activeId="insets"
      title="Insets"
      summary="Render the head and tail insets so the reserved chrome space is visible while messages keep their GPT-style flow."
      notes={[
        'headInset reserves room for frame chrome above the transcript.',
        'tailInset reserves room for the composer below the transcript.',
        'Both visible bands are host-owned overlays.',
      ]}
      aside={<Metrics state={viewportSettled ? state : null} />}
    >
      <SettledViewportRoot settled={viewportSettled}>
        <ThreadPort.Viewport
          {...EXAMPLE_GPT_VIEWPORT_DEFAULTS}
          ref={viewportRef}
          ariaLabel="Inset transcript"
          headInset={headInset}
          items={messages}
          onStateChange={setState}
          tailInset={tailInset}
        />
        <InsetOverlays headInset={headInset} labeled tailInset={tailInset} />
        <ComposerDock onSubmit={commitMessage} />
      </SettledViewportRoot>
    </ExamplePage>
  )
}
