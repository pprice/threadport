import { useState } from 'react'
import {
  Composer,
  type DemoMessage,
  ExamplePage,
  estimateMessageSize,
  getMessageKey,
  Metrics,
  mountPage,
  ThreadPort,
} from '../shared'

function EmptyExample() {
  const [state, setState] = useState<ThreadPort.ViewportState | null>(null)
  const messages: DemoMessage[] = []

  return (
    <ExamplePage
      activeId="empty"
      title="No content"
      summary="An empty viewport should not invent product UI. The host renders its own empty state."
      notes={[
        'items can be an empty array.',
        'The empty state is an overlay owned by the integrator.',
        'Composer, calls to action, and copy remain outside the primitive.',
      ]}
      aside={<Metrics state={state} />}
    >
      <ThreadPort.Root className="demoFrame">
        <ThreadPort.Viewport
          ariaLabel="Empty virtualized transcript"
          className="exampleViewport"
          contentClassName="exampleContent"
          estimateSize={estimateMessageSize}
          getItemKey={getMessageKey}
          headInset={28}
          itemClassName="exampleRow"
          items={messages}
          onStateChange={setState}
          renderItem={({ item }) => item.body}
          role="log"
          tailInset={96}
        />
        <ThreadPort.Overlay placement="fill">
          <div className="emptyState">
            <div>
              <p className="eyebrow">Empty transcript</p>
              <h2>Start with your own first-run state.</h2>
              <p>
                Threadport stays silent when there are no rows. Put onboarding,
                examples, or starter actions wherever your product needs them.
              </p>
            </div>
          </div>
        </ThreadPort.Overlay>
        <ThreadPort.Overlay className="composerDock" placement="tail">
          <Composer disabled placeholder="Composer belongs to your app" />
        </ThreadPort.Overlay>
      </ThreadPort.Root>
    </ExamplePage>
  )
}

mountPage(<EmptyExample />)
