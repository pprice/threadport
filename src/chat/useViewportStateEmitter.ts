import { useEffect, useRef } from 'react'
import { shallowEqualState } from './viewportState'
import type { ChatViewportState } from './ChatVirtualViewport.types'

type UseViewportStateEmitterArgs = {
  onStateChange?: (state: ChatViewportState) => void
  readState: () => ChatViewportState
}

export function useViewportStateEmitter({
  onStateChange,
  readState,
}: UseViewportStateEmitterArgs) {
  const lastStateRef = useRef<ChatViewportState | null>(null)
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
      }

      if (settledStateFrameRef.current !== null) {
        cancelAnimationFrame(settledStateFrameRef.current)
      }
    }
  }, [])

  return {
    emitState,
    scheduleSettledStateEmit,
    scheduleStateEmit,
  }
}
