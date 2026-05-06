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

const MIN_HEIGHT = 240
const MAX_HEIGHT = 920
const PRESETS: ReadonlyArray<{ label: string; value: number }> = [
  { label: 'Compact', value: 320 },
  { label: 'Comfortable', value: 520 },
  { label: 'Tall', value: 760 },
]

export default function VariableHeightExample() {
  const viewportRef = useRef<ThreadPort.ViewportHandle | null>(null)
  const [hostHeight, setHostHeight] = useState(520)
  const [messages, setMessages] = useState<DemoMessage[]>(() =>
    createTranscript(36),
  )
  const [state, setState] = useState<ThreadPort.ViewportState | null>(null)
  const viewportSettled = useInitialViewportSettled(state)
  const commitMessage = useGptCommitMessage(
    viewportRef,
    setMessages,
    'The host container sets the viewport height. Drag the slider or pick a preset to watch the viewport adapt without a remount.',
  )

  return (
    <ExamplePage
      activeId="variable-height"
      title="Variable height"
      summary="The host owns the container's height. Move the slider — the viewport tracks live, scrolls internally, and never pushes the page."
      notes={[
        'The viewport size is a function of the host container, not the message count.',
        'Threadport ships flex defaults so resizing the host just works.',
        'Useful for split-pane layouts, IDE panels, drag-to-resize chat docks.',
      ]}
      aside={
        <>
          <div className="resizerControl">
            <label htmlFor="host-height">
              Container height
              <output htmlFor="host-height">{hostHeight}px</output>
            </label>
            <input
              id="host-height"
              type="range"
              min={MIN_HEIGHT}
              max={MAX_HEIGHT}
              step={10}
              value={hostHeight}
              onChange={(event) =>
                setHostHeight(Number.parseInt(event.target.value, 10))
              }
            />
            <div className="resizerPresets">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  aria-pressed={hostHeight === preset.value}
                  onClick={() => setHostHeight(preset.value)}
                  type="button"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <Metrics state={viewportSettled ? state : null} />
        </>
      }
    >
      <div
        className="resizerHost"
        style={{ height: `${hostHeight}px` }}
        data-resizer-host
      >
        <ThreadPort.Root
          className={`previewFrame ${
            viewportSettled ? 'viewportSettled' : 'viewportSettling'
          }`}
        >
          <ThreadPort.Viewport
            {...EXAMPLE_GPT_VIEWPORT_DEFAULTS}
            ref={viewportRef}
            ariaLabel="Variable height transcript"
            items={messages}
            onStateChange={setState}
          />
          <ComposerDock onSubmit={commitMessage} />
        </ThreadPort.Root>
      </div>
    </ExamplePage>
  )
}
