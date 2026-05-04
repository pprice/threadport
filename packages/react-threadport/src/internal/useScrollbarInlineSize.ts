import { type RefObject, useLayoutEffect, useRef } from 'react'
import { readScrollbarInlineSize } from '../Root'
import { useLatest } from './useLatest'

type Args = {
  /** The scroll element whose scrollbar lane to measure. */
  scrollRef: RefObject<HTMLElement | null>
  /** Called when the measured size changes by at least 0.5 px. */
  onChange?: () => void
}

/**
 * Measures the scrollbar lane width on the given element. Returns a ref
 * holding the most recent measurement. Re-measures on element resize and
 * window resize.
 */
export function useScrollbarInlineSize({ scrollRef, onChange }: Args) {
  const sizeRef = useRef(0)
  const onChangeRef = useLatest(onChange)

  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    function measure() {
      const next = readScrollbarInlineSize(scrollRef.current)

      if (Math.abs(next - sizeRef.current) < 0.5) {
        return
      }

      sizeRef.current = next
      onChangeRef.current?.()
    }

    measure()

    const element = scrollRef.current
    const observer =
      element && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(measure)
        : null

    if (element) {
      observer?.observe(element)
    }

    window.addEventListener('resize', measure)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [onChangeRef, scrollRef])

  return sizeRef
}
