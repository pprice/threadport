import { type RefObject, useLayoutEffect } from 'react'
import type { ItemKey } from '../types'

type UseTailReserveContentMeasurementArgs = {
  activeTailKey: ItemKey | null
  measuredTailReserveKeyRef: RefObject<ItemKey | null>
  scheduleStateEmit: () => void
  tailReserveContentElement: HTMLDivElement | null
  tailReserveContentSizeRef: RefObject<number>
}

export function useTailReserveContentMeasurement({
  activeTailKey,
  measuredTailReserveKeyRef,
  scheduleStateEmit,
  tailReserveContentElement,
  tailReserveContentSizeRef,
}: UseTailReserveContentMeasurementArgs) {
  useLayoutEffect(() => {
    if (measuredTailReserveKeyRef.current !== activeTailKey) {
      measuredTailReserveKeyRef.current = activeTailKey
      tailReserveContentSizeRef.current = 0
    }

    if (activeTailKey === null) {
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
  }, [activeTailKey, tailReserveContentElement])
}
