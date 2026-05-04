import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.unmock('@tanstack/react-virtual')

import * as ThreadPort from '../../src'

type SizedItem = {
  height: number
  id: string
}

function makeItems(count: number, height = 80): SizedItem[] {
  return Array.from({ length: count }, (_, index) => ({
    height,
    id: `item-${index}`,
  }))
}

function getItemKey(item: SizedItem) {
  return item.id
}

function renderSizedItem({ item }: ThreadPort.RenderItemArgs<SizedItem>) {
  return (
    <article
      data-test-height={item.height}
      data-testid={`row-${item.id}`}
      style={{ height: item.height }}
    >
      {item.id}
    </article>
  )
}

function virtualizerOptions() {
  return {
    initialRect: {
      height: 260,
      width: 360,
    },
    overscan: 8,
  } satisfies ThreadPort.VirtualizerOptions
}

function flushResizeObservers() {
  act(() => {
    globalThis.__flushResizeObservers?.()
  })
}

function bottomDistance(element: HTMLElement) {
  return element.scrollHeight - element.clientHeight - element.scrollTop
}

function ResizingHarness() {
  const [items, setItems] = useState(() => makeItems(8))

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setItems((current) =>
            current.map((item, index) =>
              index === 0 ? { ...item, height: item.height + 40 } : item,
            ),
          )
        }
      >
        Grow first row
      </button>
      <ThreadPort.Viewport
        ariaLabel="Resizable transcript"
        estimateSize={() => 80}
        getItemKey={getItemKey}
        initialAnchor="head"
        items={items}
        renderItem={renderSizedItem}
        style={{ height: 260 }}
        virtualizerOptions={virtualizerOptions()}
      />
    </>
  )
}

describe('Viewport measured scrolling behavior', () => {
  it('starts at the tail after the StrictMode remount cycle settles', async () => {
    render(
      <StrictMode>
        <ThreadPort.Viewport
          ariaLabel="Tail transcript"
          estimateSize={() => 80}
          getItemKey={getItemKey}
          initialAnchor="tail"
          items={makeItems(12)}
          renderItem={renderSizedItem}
          style={{ height: 260 }}
          virtualizerOptions={virtualizerOptions()}
        />
      </StrictMode>,
    )

    const viewport = screen.getByRole('region', { name: 'Tail transcript' })

    await waitFor(() => expect(viewport.scrollTop).toBeGreaterThan(0))
    await waitFor(() => {
      expect(Math.abs(bottomDistance(viewport))).toBeLessThan(1)
    })
  })

  it('keeps dynamic row measurements and compensates when a measured row above the viewport grows', async () => {
    render(<ResizingHarness />)

    const viewport = screen.getByRole('region', {
      name: 'Resizable transcript',
    })

    await screen.findByTestId('row-item-0')
    flushResizeObservers()

    await waitFor(() => expect(viewport.scrollHeight).toBe(640))

    act(() => {
      viewport.scrollTop = 180
      fireEvent.scroll(viewport)
    })

    const scrollTopBeforeResize = viewport.scrollTop
    const scrollHeightBeforeResize = viewport.scrollHeight

    fireEvent.click(screen.getByRole('button', { name: 'Grow first row' }))
    flushResizeObservers()

    await waitFor(() => {
      expect(viewport.scrollHeight).toBe(scrollHeightBeforeResize + 40)
    })
    await waitFor(() => {
      expect(Math.round(viewport.scrollTop)).toBe(scrollTopBeforeResize + 40)
    })
  })
})
