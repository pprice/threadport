import { useRef, useState } from 'react'
import {
  Composer,
  createGptExchange,
  createTranscript,
  type DemoMessage,
  EXAMPLE_ITEM_GAP,
  estimateMessageSize,
  getMessageKey,
  InsetOverlays,
  MessageView,
  Metrics,
  scrollPromptToHead,
  ThreadPort,
  useInitialViewportSettled,
  useReducedMotion,
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
  const reducedMotion = useReducedMotion()
  const [hostHeight, setHostHeight] = useState(520)
  const [messages, setMessages] = useState<DemoMessage[]>(() =>
    createTranscript(36),
  )
  const [state, setState] = useState<ThreadPort.ViewportState | null>(null)
  const viewportSettled = useInitialViewportSettled(state)

  function commitMessage(value: string) {
    const { assistantMessage, userMessage } = createGptExchange(
      value,
      'The host container sets the viewport height. Drag the slider or pick a preset to watch the viewport adapt without a remount.',
    )

    setMessages((current) => [...current, userMessage, assistantMessage])
    scrollPromptToHead(viewportRef, userMessage.id, reducedMotion)
  }

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
            ref={viewportRef}
            ariaLabel="Variable height transcript"
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
          <InsetOverlays />
          <ThreadPort.Overlay className="composerDock" placement="tail">
            <Composer onSubmit={commitMessage} />
          </ThreadPort.Overlay>
        </ThreadPort.Root>
      </div>
    </ExamplePage>
  )
}
