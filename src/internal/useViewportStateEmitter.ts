import { useEffect, useRef } from 'react'
import type { ViewportState } from '../types'
import { shallowEqualState } from './viewportState'

type UseViewportStateEmitterArgs = {
  onStateChange?: (state: ViewportState) => void
  readState: () => ViewportState
}

export function useViewportStateEmitter({
  onStateChange,
  readState,
}: UseViewportStateEmitterArgs) {
  const lastStateRef = useRef<ViewportState | null>(null)
  const stateFrameRef = useRef<number | null>(null)
  const settledStateFrameRef = useRef<number | null>(null)

  function emitState() {
    if (!onStateChange) {
      return
    }

    const next = readState()

    if (shallowEqualState(lastStateRef.current, next)) {
      return
    }

    lastStateRef.current = next
    onStateChange(next)
  }

  function scheduleStateEmit() {
    if (!onStateChange || stateFrameRef.current !== null) {
      return
    }

    stateFrameRef.current = requestAnimationFrame(() => {
      stateFrameRef.current = null
      emitState()
    })
  }

  function scheduleSettledStateEmit() {
    if (!onStateChange || settledStateFrameRef.current !== null) {
      return
    }

    settledStateFrameRef.current = requestAnimationFrame(() => {
      settledStateFrameRef.current = requestAnimationFrame(() => {
        settledStateFrameRef.current = null
        emitState()
      })
    })
  }

  useEffect(() => {
    return () => {
      if (stateFrameRef.current !== null) {
        cancelAnimationFrame(stateFrameRef.current)
        stateFrameRef.current = null
      }

      if (settledStateFrameRef.current !== null) {
        cancelAnimationFrame(settledStateFrameRef.current)
        settledStateFrameRef.current = null
      }
    }
  }, [])

  return {
    emitState,
    scheduleSettledStateEmit,
    scheduleStateEmit,
  }
}
