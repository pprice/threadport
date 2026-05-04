import * as ThreadPort from '@phipri/react-threadport'
import { useRef, useState } from 'react'

type HarnessItem = {
  body: string
  height: number
  id: string
}

const baseItems: HarnessItem[] = Array.from({ length: 80 }, (_, index) => ({
  body: `Harness item ${index}`,
  height: 72 + (index % 5) * 36,
  id: `item-${index}`,
}))

function estimateHarnessItemSize(item: HarnessItem) {
  return item.height
}

function getHarnessItemKey(item: HarnessItem) {
  return item.id
}

export function ApiHarness() {
  const viewportRef = useRef<ThreadPort.ViewportHandle | null>(null)
  const [items, setItems] = useState(baseItems)
  const [state, setState] = useState<ThreadPort.ViewportState | null>(null)
  const [largeInsets, setLargeInsets] = useState(false)
  const [wideTailThreshold, setWideTailThreshold] = useState(false)

  const headInset = largeInsets ? 112 : 24
  const tailInset = largeInsets ? 156 : 72

  function appendReservedTail() {
    const nextIndex = items.length

    setItems((current) => [
      ...current,
      {
        body: `Appended tail ${nextIndex}`,
        height: 88,
        id: `append-${nextIndex}`,
      },
    ])
  }

  function growTail() {
    setItems((current) => {
      const tail = current[current.length - 1]

      if (!tail) {
        return current
      }

      return [
        ...current.slice(0, -1),
        {
          ...tail,
          body: `${tail.body} grown`,
          height: tail.height + 720,
        },
      ]
    })
  }

  return (
    <main className="apiHarness">
      <section className="apiControls" aria-label="API harness controls">
        <button
          data-testid="api-scroll-head"
          type="button"
          onClick={() => viewportRef.current?.scrollToHead({ duration: 0 })}
        >
          Head
        </button>
        <button
          data-testid="api-scroll-tail"
          type="button"
          onClick={() => viewportRef.current?.scrollToTail({ duration: 0 })}
        >
          Tail
        </button>
        <button
          data-testid="api-scroll-index"
          type="button"
          onClick={() =>
            viewportRef.current?.scrollToIndex(20, {
              animation: {
                duration: 0,
              },
              align: 'head',
            })
          }
        >
          Index 20
        </button>
        <button
          data-testid="api-scroll-key"
          type="button"
          onClick={() =>
            viewportRef.current?.scrollToItem('item-35', {
              animation: {
                duration: 0,
              },
              align: 'head',
            })
          }
        >
          Key 35
        </button>
        <button
          data-testid="api-toggle-insets"
          type="button"
          onClick={() => setLargeInsets((current) => !current)}
        >
          Insets
        </button>
        <button
          data-testid="api-toggle-threshold"
          type="button"
          onClick={() => setWideTailThreshold((current) => !current)}
        >
          Threshold
        </button>
        <button
          data-testid="api-append-tail"
          type="button"
          onClick={appendReservedTail}
        >
          Append
        </button>
        <button data-testid="api-grow-tail" type="button" onClick={growTail}>
          Grow tail
        </button>
      </section>

      <dl className="apiMetrics" aria-label="API harness metrics">
        <div>
          <dt>head</dt>
          <dd data-testid="api-distance-head">
            {Math.round(state?.distanceFromHead ?? 0)}
          </dd>
        </div>
        <div>
          <dt>tail</dt>
          <dd data-testid="api-distance-tail">
            {Math.round(state?.distanceFromTail ?? 0)}
          </dd>
        </div>
        <div>
          <dt>is tail</dt>
          <dd data-testid="api-is-tail">{String(state?.isAtTail ?? false)}</dd>
        </div>
        <div>
          <dt>rendered</dt>
          <dd data-testid="api-rendered">{state?.virtualItems ?? 'pending'}</dd>
        </div>
        <div>
          <dt>head inset</dt>
          <dd data-testid="api-head-inset">{headInset}</dd>
        </div>
        <div>
          <dt>tail inset</dt>
          <dd data-testid="api-tail-inset">{tailInset}</dd>
        </div>
      </dl>

      <ThreadPort.Root className="apiFrame">
        <ThreadPort.Viewport
          ref={viewportRef}
          ariaLabel="API harness viewport"
          atTailThreshold={wideTailThreshold ? 10_000 : 32}
          className="apiViewport"
          contentClassName="apiContent"
          estimateSize={estimateHarnessItemSize}
          getItemKey={getHarnessItemKey}
          headInset={headInset}
          initialAnchor="tail"
          itemClassName="apiRow"
          items={items}
          onStateChange={setState}
          renderItem={({ item }) => (
            <article
              className="apiMessage"
              data-harness-item={item.id}
              style={{ minHeight: item.height }}
            >
              {item.body}
            </article>
          )}
          role="log"
          tailInset={tailInset}
          tailReserve={{ className: 'apiTailReserve' }}
          virtualizerOptions={{ overscan: 2 }}
        />

        <ThreadPort.Overlay
          className="apiForwardOverlay"
          placement="tail"
          pointerEvents="auto"
        >
          <button data-testid="api-forward-overlay" type="button">
            Forward wheel
          </button>
        </ThreadPort.Overlay>

        <ThreadPort.Overlay
          className="apiStaticOverlay"
          forwardWheelToViewport={false}
          placement="head"
          pointerEvents="auto"
        >
          <button data-testid="api-static-overlay" type="button">
            Static wheel
          </button>
        </ThreadPort.Overlay>
      </ThreadPort.Root>
    </main>
  )
}
