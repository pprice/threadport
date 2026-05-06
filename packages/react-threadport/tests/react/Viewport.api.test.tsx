import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type RefObject, useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import * as ThreadPort from '../../src'

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({
    count,
    estimateSize,
    getItemKey,
    gap = 0,
    paddingEnd = 0,
    paddingStart = 0,
  }: {
    count: number
    estimateSize: (index: number) => number
    getItemKey: (index: number) => string | number
    gap?: number
    paddingEnd?: number
    paddingStart?: number
  }) => {
    let start = paddingStart
    const virtualItems = Array.from({ length: count }, (_, index) => {
      const size = estimateSize(index)
      const item = {
        end: start + size,
        index,
        key: getItemKey(index),
        lane: 0,
        size,
        start,
      }

      start += size + gap
      return item
    })

    return {
      getOffsetForIndex: (index: number) => [virtualItems[index]?.start ?? 0],
      getTotalSize: () => Math.max(0, start + paddingEnd - gap),
      getVirtualItemForOffset: (offset: number) =>
        virtualItems.find((item) => item.end >= offset) ?? virtualItems[0],
      getVirtualItems: () => virtualItems,
      isScrolling: false,
      measure: vi.fn(),
      measureElement: vi.fn(),
      scrollOffset: 0,
      scrollRect: {
        height: 260,
        width: 360,
      },
      shouldAdjustScrollPositionOnItemSizeChange: undefined,
    }
  },
}))

type TestItem = {
  body: string
  id: string
}

const baseItems: TestItem[] = [
  { body: 'Alpha message', id: 'alpha' },
  { body: 'Bravo message', id: 'bravo' },
  { body: 'Charlie message', id: 'charlie' },
]

function getItemKey(item: TestItem) {
  return item.id
}

function estimateSize() {
  return 56
}

function renderItem({ item }: ThreadPort.RenderItemArgs<TestItem>) {
  return <article data-testid={`message-${item.id}`}>{item.body}</article>
}

function virtualizerOptions() {
  return {
    initialRect: {
      height: 260,
      width: 360,
    },
    overscan: 3,
  } satisfies ThreadPort.VirtualizerOptions
}

function patchClientHeight(value: number) {
  const proto = HTMLDivElement.prototype
  const original = Object.getOwnPropertyDescriptor(proto, 'clientHeight')

  Object.defineProperty(proto, 'clientHeight', {
    configurable: true,
    get(this: HTMLDivElement) {
      const declared = this.style.height
      return declared?.endsWith('px') ? Number.parseInt(declared, 10) : value
    },
  })

  return () => {
    if (original) {
      Object.defineProperty(proto, 'clientHeight', original)
    } else {
      Reflect.deleteProperty(proto, 'clientHeight')
    }
  }
}

describe('isReady + useViewportReady', () => {
  it('reports isReady=true immediately when items are empty', async () => {
    const onStateChange = vi.fn()

    render(
      <ThreadPort.Viewport
        ariaLabel="Empty transcript"
        estimateSize={estimateSize}
        getItemKey={getItemKey}
        initialAnchor="head"
        items={[]}
        onStateChange={onStateChange}
        renderItem={renderItem}
        style={{ height: 260 }}
        virtualizerOptions={virtualizerOptions()}
      />,
    )

    await waitFor(() => expect(onStateChange).toHaveBeenCalled())
    expect(onStateChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ isReady: true }),
    )
  })

  it('flips isReady from false to true after the initial settled emit', async () => {
    const states: ThreadPort.ViewportState[] = []

    render(
      <ThreadPort.Viewport
        ariaLabel="Settling transcript"
        estimateSize={estimateSize}
        getItemKey={getItemKey}
        initialAnchor="head"
        items={baseItems}
        onStateChange={(state) => {
          states.push(state)
        }}
        renderItem={renderItem}
        style={{ height: 260 }}
        virtualizerOptions={virtualizerOptions()}
      />,
    )

    await waitFor(() => expect(states.some((s) => s.isReady)).toBe(true))
    expect(states[0]?.isReady).toBe(false)
  })

  it('useViewportReady returns false then true under a Root', async () => {
    const seen: boolean[] = []

    function Probe() {
      const ready = ThreadPort.useViewportReady()
      seen.push(ready)
      return <span data-testid="ready">{ready ? 'ready' : 'pending'}</span>
    }

    render(
      <ThreadPort.Root>
        <ThreadPort.Viewport
          ariaLabel="Probe transcript"
          estimateSize={estimateSize}
          getItemKey={getItemKey}
          initialAnchor="head"
          items={baseItems}
          renderItem={renderItem}
          style={{ height: 260 }}
          virtualizerOptions={virtualizerOptions()}
        />
        <Probe />
      </ThreadPort.Root>,
    )

    await waitFor(() =>
      expect(screen.getByTestId('ready')).toHaveTextContent('ready'),
    )
    expect(seen[0]).toBe(false)
  })
})

describe('useViewportSelector', () => {
  it('throws outside of a Root', () => {
    function Probe() {
      ThreadPort.useViewportSelector((state) => state.isAtTail)
      return null
    }

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<Probe />)).toThrow(/<ThreadPort.Root>/)
    consoleError.mockRestore()
  })

  it('returns the synthetic initial state under a Root with no Viewport yet', () => {
    const observedRef: { current: ThreadPort.ViewportState | null } = {
      current: null,
    }

    function Probe() {
      observedRef.current = ThreadPort.useViewportSelector((state) => state)
      return null
    }

    render(
      <ThreadPort.Root>
        <Probe />
      </ThreadPort.Root>,
    )

    const observed = observedRef.current
    expect(observed).not.toBeNull()
    expect(observed?.isReady).toBe(false)
    expect(observed?.totalItems).toBe(0)
  })

  it('only re-renders when the selected slice changes', async () => {
    const renderSpy = vi.fn()

    function Probe() {
      const totalItems = ThreadPort.useViewportSelector(
        (state) => state.totalItems,
      )
      renderSpy(totalItems)
      return <span data-testid="total">{totalItems}</span>
    }

    function Harness() {
      const [items, setItems] = useState(baseItems)

      return (
        <ThreadPort.Root>
          <ThreadPort.Viewport
            ariaLabel="Selector transcript"
            estimateSize={estimateSize}
            getItemKey={getItemKey}
            initialAnchor="head"
            items={items}
            renderItem={renderItem}
            style={{ height: 260 }}
            virtualizerOptions={virtualizerOptions()}
          />
          <Probe />
          <button
            type="button"
            onClick={() =>
              setItems((current) => [
                ...current,
                { body: 'Delta', id: 'delta' },
              ])
            }
          >
            Append
          </button>
        </ThreadPort.Root>
      )
    }

    const user = userEvent.setup()
    render(<Harness />)

    await waitFor(() =>
      expect(screen.getByTestId('total')).toHaveTextContent('3'),
    )
    const baselineCalls = renderSpy.mock.calls.length

    await user.click(screen.getByRole('button', { name: 'Append' }))

    await waitFor(() =>
      expect(screen.getByTestId('total')).toHaveTextContent('4'),
    )

    expect(renderSpy.mock.calls.length).toBeGreaterThan(baselineCalls)
    expect(renderSpy.mock.calls.map((call) => call[0])).toEqual(
      expect.arrayContaining([3, 4]),
    )
  })
})

describe('scroll commands return promises', () => {
  it('resolves to "completed" after an instant scroll', async () => {
    const handleRef = {
      current: null as ThreadPort.ViewportHandle | null,
    } satisfies RefObject<ThreadPort.ViewportHandle | null>

    render(
      <ThreadPort.Viewport
        ref={handleRef}
        ariaLabel="Promise transcript"
        estimateSize={estimateSize}
        getItemKey={getItemKey}
        initialAnchor="head"
        items={baseItems}
        renderItem={renderItem}
        style={{ height: 260 }}
        virtualizerOptions={virtualizerOptions()}
      />,
    )

    await waitFor(() => expect(handleRef.current).not.toBeNull())
    const handle = handleRef.current

    if (!handle) throw new Error('handle missing')

    expect(await handle.scrollToHead({ duration: 0 })).toBe('completed')
    expect(await handle.scrollToTail({ duration: 0 })).toBe('completed')
    expect(
      await handle.scrollToItem('bravo', { animation: { duration: 0 } }),
    ).toBe('completed')
  })

  it('resolves to "rejected" for an out-of-range index', async () => {
    const handleRef = {
      current: null as ThreadPort.ViewportHandle | null,
    } satisfies RefObject<ThreadPort.ViewportHandle | null>

    render(
      <ThreadPort.Viewport
        ref={handleRef}
        ariaLabel="Rejected transcript"
        estimateSize={estimateSize}
        getItemKey={getItemKey}
        initialAnchor="head"
        items={baseItems}
        renderItem={renderItem}
        style={{ height: 260 }}
        virtualizerOptions={virtualizerOptions()}
      />,
    )

    await waitFor(() => expect(handleRef.current).not.toBeNull())
    const handle = handleRef.current

    if (!handle) throw new Error('handle missing')

    expect(await handle.scrollToIndex(99, { animation: { duration: 0 } })).toBe(
      'rejected',
    )
    expect(
      await handle.scrollToItem('does-not-exist', {
        animation: { duration: 0 },
      }),
    ).toBe('rejected')
  })

  it('awaitMount: defers the scroll until the new key is in items', async () => {
    let appendDelta: (() => void) | null = null
    let scrollPromise: Promise<ThreadPort.ScrollResult> | null = null

    function Harness() {
      const handleRef = useRef<ThreadPort.ViewportHandle | null>(null)
      const [items, setItems] = useState(baseItems)

      appendDelta = () => {
        const next: TestItem = { body: 'Delta', id: 'delta' }
        scrollPromise =
          handleRef.current?.scrollToItem('delta', {
            animation: { duration: 0 },
            awaitMount: true,
          }) ?? null
        setItems((current) => [...current, next])
      }

      return (
        <ThreadPort.Viewport
          ref={handleRef}
          ariaLabel="Await mount transcript"
          estimateSize={estimateSize}
          getItemKey={getItemKey}
          initialAnchor="head"
          items={items}
          renderItem={renderItem}
          style={{ height: 260 }}
          virtualizerOptions={virtualizerOptions()}
        />
      )
    }

    render(<Harness />)

    await act(async () => {
      appendDelta?.()
    })

    expect(await scrollPromise).toBe('completed')
  })
})

describe('visibility options', () => {
  it('respects thresholdPercent so partial overlap does not count', async () => {
    const restore = patchClientHeight(80)
    const onVisibilityChange = vi.fn()

    try {
      render(
        <ThreadPort.Viewport
          ariaLabel="Threshold transcript"
          estimateSize={estimateSize}
          getItemKey={getItemKey}
          initialAnchor="head"
          items={baseItems}
          onVisibilityChange={onVisibilityChange}
          renderItem={renderItem}
          style={{ height: 80 }}
          virtualizerOptions={virtualizerOptions()}
          visibilityOptions={{ thresholdPercent: 0.95 }}
        />,
      )

      await waitFor(() => expect(onVisibilityChange).toHaveBeenCalled())

      const lastCall = onVisibilityChange.mock.calls.at(-1)?.[0] as
        | ThreadPort.VisibilityChange
        | undefined

      expect(lastCall?.visible ?? []).toEqual(['alpha'])
    } finally {
      restore()
    }
  })

  it('skips computation entirely when no callback is registered', () => {
    // No callback → no visibility-related work. We just verify the
    // Viewport mounts cleanly with options set but no handler.
    expect(() =>
      render(
        <ThreadPort.Viewport
          ariaLabel="No-handler transcript"
          estimateSize={estimateSize}
          getItemKey={getItemKey}
          initialAnchor="head"
          items={baseItems}
          renderItem={renderItem}
          style={{ height: 260 }}
          virtualizerOptions={virtualizerOptions()}
          visibilityOptions={{ thresholdPercent: 1, dwellMs: 1000 }}
        />,
      ),
    ).not.toThrow()
  })

  it('honors dwellMs by gating entered until the time has elapsed', async () => {
    vi.useFakeTimers()

    try {
      const restore = patchClientHeight(260)
      const onVisibilityChange = vi.fn()

      try {
        render(
          <ThreadPort.Viewport
            ariaLabel="Dwell transcript"
            estimateSize={estimateSize}
            getItemKey={getItemKey}
            initialAnchor="head"
            items={baseItems}
            onVisibilityChange={onVisibilityChange}
            renderItem={renderItem}
            style={{ height: 260 }}
            virtualizerOptions={virtualizerOptions()}
            visibilityOptions={{ dwellMs: 50 }}
          />,
        )

        // Without dwell elapsed, no fire yet.
        expect(onVisibilityChange).not.toHaveBeenCalled()

        await act(async () => {
          vi.advanceTimersByTime(60)
        })

        expect(onVisibilityChange).toHaveBeenCalled()
        const lastCall = onVisibilityChange.mock.calls.at(-1)?.[0] as
          | ThreadPort.VisibilityChange
          | undefined

        expect(lastCall?.entered ?? []).toEqual(['alpha', 'bravo', 'charlie'])
      } finally {
        restore()
      }
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('useReducedMotion', () => {
  it('returns the current matchMedia value', () => {
    const original = window.matchMedia
    window.matchMedia = vi.fn((query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    })) as typeof window.matchMedia

    let observed: boolean | null = null

    function Probe() {
      observed = ThreadPort.useReducedMotion()
      return null
    }

    try {
      render(<Probe />)
      expect(observed).toBe(true)
    } finally {
      window.matchMedia = original
    }
  })
})
