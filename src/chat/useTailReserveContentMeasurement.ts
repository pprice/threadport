import { useLayoutEffect, type RefObject } from 'react'
import type { ChatItemKey } from './ChatVirtualViewport.types'

type UseTailReserveContentMeasurementArgs = {
  activeReservedTailKey: ChatItemKey | null
  measuredTailReserveKeyRef: RefObject<ChatItemKey | null>
  scheduleStateEmit: () => void
  tailReserveContentElement: HTMLDivElement | null
  tailReserveContentSizeRef: RefObject<number>
  tailReserveMinHeight: number
}

export function useTailReserveContentMeasurement({
  activeReservedTailKey,
  measuredTailReserveKeyRef,
  scheduleStateEmit,
  tailReserveContentElement,
  tailReserveContentSizeRef,
  tailReserveMinHeight,
}: UseTailReserveContentMeasurementArgs) {
  useLayoutEffect(() => {
    if (measuredTailReserveKeyRef.current !== activeReservedTailKey) {
      measuredTailReserveKeyRef.current = activeReservedTailKey
      tailReserveContentSizeRef.current = 0
    }

    if (activeReservedTailKey === null) {
      tailReserveContentSizeRef.current = 0
      scheduleStateEmit()
      return
    }

    const element = tailReserveContentElement

    if (!element) {
      scheduleStateEmit()
      return
    }

    const measuredElement: HTMLDivElement = element

    function measureTailReserveContent() {
      const measuredSize = measuredElement.getBoundingClientRect().height

      if (Math.abs(measuredSize - tailReserveContentSizeRef.current) < 0.5) {
        return
      }

      tailReserveContentSizeRef.current = measuredSize
      scheduleStateEmit()
    }

    measureTailReserveContent()

    const observer = new ResizeObserver(measureTailReserveContent)

    observer.observe(measuredElement)

    return () => observer.disconnect()
  }, [activeReservedTailKey, tailReserveContentElement, tailReserveMinHeight])
}
