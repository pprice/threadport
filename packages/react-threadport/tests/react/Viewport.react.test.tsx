import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type RefObject, useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import * as ThreadPort from '../../src'

vi.mock('@tanstack/react-virtual', () => {
  return {
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
  }
})

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

function ViewportHarness({
  handleRef,
  onStateChange,
}: {
  handleRef?: RefObject<ThreadPort.ViewportHandle | null>
  onStateChange?: (state: ThreadPort.ViewportState) => void
}) {
  const fallbackRef = useRef<ThreadPort.ViewportHandle | null>(null)

  return (
    <ThreadPort.Viewport
      ref={handleRef ?? fallbackRef}
      ariaLabel="Test transcript"
      estimateSize={estimateSize}
      getItemKey={getItemKey}
      initialAnchor="head"
      items={baseItems}
      onStateChange={onStateChange}
      renderItem={renderItem}
      style={{ height: 260 }}
      virtualizerOptions={virtualizerOptions()}
    />
  )
}

function AppendingTailReserveHarness() {
  const [items, setItems] = useState(baseItems)

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setItems((current) => [
            ...current,
            {
              body: 'Delta message',
              id: 'delta',
            },
          ])
        }
      >
        Append
      </button>
      <ThreadPort.Viewport
        ariaLabel="Tail reserve transcript"
        estimateSize={estimateSize}
        getItemKey={getItemKey}
        initialAnchor="head"
        items={items}
        renderItem={renderItem}
        style={{ height: 260 }}
        tailReserve={{ className: 'tail-reserve-test', minHeight: 180 }}
        virtualizerOptions={virtualizerOptions()}
      />
    </>
  )
}

function RollingTailReserveHarness() {
  const [items, setItems] = useState(baseItems)
  const counterRef = useRef(0)

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setItems((current) => {
            counterRef.current += 1
            const next: TestItem[] = [
              ...current,
              {
                body: `Rolled message ${counterRef.current}`,
                id: `rolled-${counterRef.current}`,
              },
            ]

            return next.slice(next.length - baseItems.length)
          })
        }
      >
        Roll
      </button>
      <ThreadPort.Viewport
        ariaLabel="Rolling tail reserve transcript"
        estimateSize={estimateSize}
        getItemKey={getItemKey}
        initialAnchor="head"
        items={items}
        renderItem={renderItem}
        style={{ height: 260 }}
        tailReserve={{ className: 'rolling-tail-reserve-test', minHeight: 180 }}
        virtualizerOptions={virtualizerOptions()}
      />
    </>
  )
}

describe('Viewport React rendering', () => {
  it('renders a labeled scroll region with virtualized item content', async () => {
    render(<ViewportHarness />)

    expect(
      screen.getByRole('region', { name: 'Test transcript' }),
    ).toBeInTheDocument()

    expect(await screen.findByTestId('message-alpha')).toHaveTextContent(
      'Alpha message',
    )
    expect(screen.getByTestId('message-bravo')).toHaveTextContent(
      'Bravo message',
    )
  })

  it('exposes the imperative viewport handle', async () => {
    const handleRef = {
      current: null as ThreadPort.ViewportHandle | null,
    } satisfies RefObject<ThreadPort.ViewportHandle | null>

    render(<ViewportHarness handleRef={handleRef} />)

    await waitFor(() => expect(handleRef.current).not.toBeNull())
    const handle = handleRef.current

    if (!handle) {
      throw new Error('Viewport handle was not assigned')
    }

    expect(handle.getScrollElement()).toBe(
      screen.getByRole('region', { name: 'Test transcript' }),
    )
    expect(handle.getState()).toMatchObject({
      totalItems: 3,
    })

    expect(() => handle.scrollToHead({ duration: 0 })).not.toThrow()
    expect(() => handle.scrollToTail({ duration: 0 })).not.toThrow()
    expect(() =>
      handle.scrollToItem('bravo', { animation: { duration: 0 } }),
    ).not.toThrow()
  })

  it('emits viewport state after render', async () => {
    const onStateChange = vi.fn()

    render(<ViewportHarness onStateChange={onStateChange} />)

    await waitFor(() => expect(onStateChange).toHaveBeenCalled())
    expect(onStateChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        totalItems: 3,
      }),
    )
  })

  it('forwards scrollElementProps onto the scroll element', () => {
    render(
      <ThreadPort.Viewport
        ariaLabel="Gesture transcript"
        className="viewport-class"
        estimateSize={estimateSize}
        getItemKey={getItemKey}
        initialAnchor="head"
        items={baseItems}
        renderItem={renderItem}
        scrollElementProps={{
          'data-gesture-root': 'chat',
          id: 'gesture-scroll-root',
          title: 'Gesture scroll root',
        }}
        style={{ height: 260 }}
        virtualizerOptions={virtualizerOptions()}
      />,
    )

    const viewport = screen.getByRole('region', {
      name: 'Gesture transcript',
    })

    expect(viewport).toHaveAttribute('data-gesture-root', 'chat')
    expect(viewport).toHaveAttribute('id', 'gesture-scroll-root')
    expect(viewport).toHaveAttribute('title', 'Gesture scroll root')
    expect(viewport).toHaveClass('viewport-class')
  })

  it('adds the active tail reserve wrapper only after a tail append', async () => {
    const user = userEvent.setup()

    render(<AppendingTailReserveHarness />)

    expect(screen.queryByTestId('message-delta')).not.toBeInTheDocument()
    expect(document.querySelector('[data-tail-reserve="active"]')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Append' }))

    expect(await screen.findByTestId('message-delta')).toHaveTextContent(
      'Delta message',
    )

    const reserve = document.querySelector('[data-tail-reserve="active"]')

    expect(reserve).toBeInTheDocument()
    expect(reserve).toHaveClass('tail-reserve-test')
    expect(reserve).toHaveStyle({ minHeight: '180px' })
  })

  it('activates the tail reserve when the buffer rolls (head trim + tail append)', async () => {
    const user = userEvent.setup()

    render(<RollingTailReserveHarness />)

    expect(document.querySelector('[data-tail-reserve="active"]')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Roll' }))

    expect(await screen.findByTestId('message-rolled-1')).toBeInTheDocument()
    expect(screen.queryByTestId('message-alpha')).not.toBeInTheDocument()

    const firstReserve = document.querySelector('[data-tail-reserve="active"]')

    expect(firstReserve).toBeInTheDocument()
    expect(firstReserve).toHaveClass('rolling-tail-reserve-test')

    await user.click(screen.getByRole('button', { name: 'Roll' }))

    expect(await screen.findByTestId('message-rolled-2')).toBeInTheDocument()
    expect(screen.queryByTestId('message-bravo')).not.toBeInTheDocument()

    const secondReserve = document.querySelector('[data-tail-reserve="active"]')

    expect(secondReserve).toBeInTheDocument()
    expect(secondReserve).toHaveClass('rolling-tail-reserve-test')
  })
})
