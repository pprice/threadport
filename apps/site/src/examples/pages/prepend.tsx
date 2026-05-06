import { useRef, useState } from 'react'
import {
  ComposerDock,
  createOlderBatch,
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

export default function PrependExample() {
  const seedRef = useRef(0)
  const viewportRef = useRef<ThreadPort.ViewportHandle | null>(null)
  const [messages, setMessages] = useState<DemoMessage[]>(() =>
    createTranscript(96),
  )
  const [state, setState] = useState<ThreadPort.ViewportState | null>(null)
  const viewportSettled = useInitialViewportSettled(state)
  const commitMessage = useGptCommitMessage(
    viewportRef,
    setMessages,
    'Appending still behaves like the standard GPT flow, even on a transcript that supports older history above.',
  )

  function prependOlder() {
    const batch = createOlderBatch(seedRef.current)

    seedRef.current += batch.length
    setMessages((current) => [...batch, ...current])
  }

  return (
    <ExamplePage
      activeId="prepend"
      title="Prepend"
      summary="Insert older messages above the viewport without moving the message the reader is looking at."
      notes={[
        'This example has no headReserve; it only prepends loaded rows.',
        'preserveScrollOnPrepend keeps the visible anchor stable.',
        'The same GPT-style composer still appends at the tail.',
      ]}
      aside={
        <>
          <button type="button" onClick={prependOlder}>
            Prepend older messages
          </button>
          <Metrics state={viewportSettled ? state : null} />
        </>
      }
    >
      <SettledViewportRoot settled={viewportSettled}>
        <ThreadPort.Viewport
          {...EXAMPLE_GPT_VIEWPORT_DEFAULTS}
          ref={viewportRef}
          ariaLabel="Prepend transcript"
          items={messages}
          onStateChange={setState}
          preserveScrollOnPrepend
          virtualizerOptions={{ overscan: 10 }}
        />
        <ComposerDock onSubmit={commitMessage} />
      </SettledViewportRoot>
    </ExamplePage>
  )
}
