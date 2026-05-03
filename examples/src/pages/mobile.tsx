import { useMemo, useState } from 'react'
import {
  Composer,
  createTranscript,
  ExamplePage,
  estimateMessageSize,
  getMessageKey,
  MessageView,
  Metrics,
  mountPage,
  ThreadPort,
} from '../shared'

function MobileExample() {
  const messages = useMemo(() => createTranscript(30), [])
  const [state, setState] = useState<ThreadPort.ViewportState | null>(null)

  return (
    <ExamplePage
      activeId="mobile"
      title="Mobile shell"
      summary="Insets and frame-relative overlays keep phone chrome outside the virtualized list."
      notes={[
        'The top overlay is not a row.',
        'Wheel and touch scrolling stay attached to the viewport.',
        'The composer is outside the measured message tree.',
      ]}
      aside={<Metrics state={state} />}
    >
      <div className="phoneStage">
        <ThreadPort.Root className="phoneFrame">
          <div className="mobileHead" aria-hidden="true">
            <span>Threadport</span>
            <span>Menu</span>
          </div>
          <ThreadPort.Viewport
            ariaLabel="Mobile virtualized transcript"
            className="exampleViewport"
            contentClassName="exampleContent"
            estimateSize={estimateMessageSize}
            getItemKey={getMessageKey}
            headInset={76}
            initialAnchor="tail"
            itemClassName="exampleRow"
            items={messages}
            onStateChange={setState}
            renderItem={({ item }) => <MessageView message={item} />}
            role="log"
            tailInset={150}
            virtualizerOptions={{ overscan: 8 }}
          />
          <ThreadPort.Overlay className="composerDock" placement="tail">
            <Composer disabled />
          </ThreadPort.Overlay>
        </ThreadPort.Root>
      </div>
    </ExamplePage>
  )
}

mountPage(<MobileExample />)
