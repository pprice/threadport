import {
  type CSSProperties,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type WheelEvent,
} from 'react'
import { initialRootState, RootContext } from './internal/rootContext'
import { createViewportStore } from './internal/viewportStore'
import type {
  OverlayProps,
  RootProps,
  RootRegistration,
  RootState,
} from './types'

const INITIAL_VIEWPORT_STATE = {
  distanceFromHead: 0,
  distanceFromTail: 0,
  isAtHead: true,
  isAtTail: false,
  isReady: false,
  isScrolling: false,
  scrollbarInlineSize: 0,
  scrollOffset: 0,
  scrollSize: 0,
  viewportSize: 0,
  scrollDirection: null,
  totalItems: 0,
  virtualItems: 0,
} as const

type RootStyle = CSSProperties & {
  '--threadport-head-inset'?: string
  '--threadport-scrollbar-inline-size'?: string
  '--threadport-tail-inset'?: string
}

function clampSize(value: number) {
  return Math.max(0, Number.isFinite(value) ? value : 0)
}

function sameFrameState(previous: RootState, next: RootState) {
  return (
    previous.headInset === next.headInset &&
    previous.scrollbarInlineSize === next.scrollbarInlineSize &&
    previous.tailInset === next.tailInset
  )
}

function setStateIfChanged(
  setState: (updater: (state: RootState) => RootState) => void,
  patch: Partial<RootState>,
) {
  setState((current) => {
    const next = {
      ...current,
      ...patch,
    }

    return sameFrameState(current, next) ? current : next
  })
}

function wheelDeltaToPixels(
  event: WheelEvent<HTMLElement>,
  scrollElement: HTMLElement,
) {
  if (event.deltaMode === 1) {
    return event.deltaY * 16
  }

  if (event.deltaMode === 2) {
    return event.deltaY * scrollElement.clientHeight
  }

  return event.deltaY
}

/**
 * Measure the vertical scrollbar lane width on a scrollable element, in CSS
 * pixels. Returns 0 on overlay-scrollbar systems (macOS, iOS) where the
 * scrollbar floats over content, and 0 when called outside a browser
 * (SSR-safe).
 *
 * Used internally by Root to publish {@link RootState.scrollbarInlineSize};
 * exposed for hosts that need to mirror the scrollbar size in custom chrome
 * computed outside the Viewport tree.
 *
 * @param element The scroll element to measure, or null. SSR-safe.
 * @returns Scrollbar lane width in CSS pixels.
 */
export function readScrollbarInlineSize(element: HTMLElement | null) {
  if (!element || typeof window === 'undefined') {
    return 0
  }

  const rect = element.getBoundingClientRect()
  const styles = window.getComputedStyle(element)
  const borderInlineStart =
    Number.parseFloat(styles.borderInlineStartWidth) || 0
  const borderInlineEnd = Number.parseFloat(styles.borderInlineEndWidth) || 0

  return clampSize(
    rect.width - element.clientWidth - borderInlineStart - borderInlineEnd,
  )
}

/**
 * Read the active {@link RootState} from the nearest Root ancestor.
 *
 * Returns the default state (`{ headInset: 0, scrollbarInlineSize: 0,
 * tailInset: 0 }`) when used outside a Root, so it's safe to call
 * unconditionally. Use this in custom chrome that needs to coordinate with
 * the Viewport's published geometry — for example, a sticky header that
 * sizes itself to the active `headInset`.
 *
 * @example
 * function MyHeader() {
 *   const { headInset } = ThreadPort.useRootState()
 *   return <header style={{ height: headInset }}>...</header>
 * }
 */
export function useRootState() {
  return useContext(RootContext)?.state ?? initialRootState
}

/**
 * Frame component that wraps a Viewport plus optional Overlays.
 *
 * Root does three things:
 * 1. Provides `display: flex; flex-direction: column; min-height: 0;
 *    min-width: 0; position: relative` defaults so the inner Viewport fills
 *    any parent that has a definite height.
 * 2. Receives the active Viewport's inset declarations and the scrollbar
 *    measurement, then publishes them via React context so Overlays can
 *    position themselves accurately.
 * 3. Exposes `--threadport-head-inset`, `--threadport-tail-inset`, and
 *    `--threadport-scrollbar-inline-size` as CSS custom properties on the
 *    frame for use in stylesheet rules.
 *
 * **Layout contract**: Root's parent must have a definite height (100dvh,
 * `flex: 1`, fixed pixels, or a sized grid track) for internal scrolling to
 * engage. An unconstrained parent will let the Viewport grow with content
 * instead of scrolling. See the README's Layout section.
 *
 * @example
 * <ThreadPort.Root>
 *   <ThreadPort.Viewport ... />
 *   <ThreadPort.Overlay placement="tail">
 *     <Composer onSubmit={handleSubmit} />
 *   </ThreadPort.Overlay>
 * </ThreadPort.Root>
 */
export function Root({ children, className, style }: RootProps) {
  const registrationIdRef = useRef(0)
  const requestStateUpdateRef = useRef<(() => void) | null>(null)
  const viewportStoreRef = useRef(createViewportStore(INITIAL_VIEWPORT_STATE))
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null)
  const [state, setState] = useState<RootState>(initialRootState)

  const registerViewport = useCallback(
    ({
      headInset,
      requestStateUpdate,
      scrollElement,
      tailInset,
    }: RootRegistration) => {
      const registrationId = registrationIdRef.current + 1
      registrationIdRef.current = registrationId
      requestStateUpdateRef.current = requestStateUpdate ?? null
      setScrollElement(scrollElement)
      setStateIfChanged(setState, {
        headInset: clampSize(headInset),
        tailInset: clampSize(tailInset),
      })

      return () => {
        if (registrationIdRef.current !== registrationId) {
          return
        }

        setScrollElement(null)
        requestStateUpdateRef.current = null
        setState(initialRootState)
      }
    },
    [],
  )
  const requestViewportStateUpdate = useCallback(() => {
    requestStateUpdateRef.current?.()
  }, [])

  useLayoutEffect(() => {
    if (!scrollElement) {
      setStateIfChanged(setState, { scrollbarInlineSize: 0 })
      return
    }

    function measureScrollbar() {
      setStateIfChanged(setState, {
        scrollbarInlineSize: readScrollbarInlineSize(scrollElement),
      })
    }

    measureScrollbar()

    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(measureScrollbar)

    observer?.observe(scrollElement)
    window.addEventListener('resize', measureScrollbar)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measureScrollbar)
    }
  }, [scrollElement])

  const contextValue = useMemo(
    () => ({
      registerViewport,
      requestViewportStateUpdate,
      scrollElement,
      state,
      viewportStore: viewportStoreRef.current,
    }),
    [registerViewport, requestViewportStateUpdate, scrollElement, state],
  )
  const frameStyle: RootStyle = {
    '--threadport-head-inset': `${state.headInset}px`,
    '--threadport-scrollbar-inline-size': `${state.scrollbarInlineSize}px`,
    '--threadport-tail-inset': `${state.tailInset}px`,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    minWidth: 0,
    position: 'relative',
    ...style,
  }

  return (
    <RootContext.Provider value={contextValue}>
      <div className={className} style={frameStyle}>
        {children}
      </div>
    </RootContext.Provider>
  )
}

/**
 * Frame-relative dock for chrome and floating controls. Must be rendered
 * inside a {@link Root}.
 *
 * Overlays render absolutely-positioned inside the Root, sized by the active
 * inset (for `placement: 'head'` and `'tail'`) or the full frame (for
 * `'fill'`). They automatically reserve the scrollbar lane width so their
 * right edge doesn't slide under the scrollbar, and they forward wheel
 * events to the Viewport's scroll element so the user can scroll the
 * transcript even when the cursor is over the Overlay.
 *
 * Use Overlays for:
 * - The composer dock (placement="tail").
 * - Sticky headers (placement="head").
 * - Floating jump-to-bottom buttons (placement="fill", `pointerEvents:
 *   'none'` on the Overlay with `pointer-events: auto` on the button).
 * - Inset visualizations or status badges that should track chrome
 *   geometry without participating in transcript layout.
 *
 * @example
 * // A composer pinned to the bottom band, scrollable through:
 * <ThreadPort.Overlay placement="tail">
 *   <Composer onSubmit={handleSubmit} />
 * </ThreadPort.Overlay>
 *
 * @example
 * // A floating jump-to-bottom button that doesn't block clicks elsewhere:
 * <ThreadPort.Overlay placement="fill" pointerEvents="none">
 *   <button
 *     style={{ pointerEvents: 'auto' }}
 *     onClick={() => ref.current?.scrollToTail()}
 *   >
 *     Jump to bottom
 *   </button>
 * </ThreadPort.Overlay>
 */
export function Overlay({
  avoidScrollbar = true,
  children,
  className,
  forwardWheelToViewport = true,
  placement = 'fill',
  pointerEvents = 'none',
  style,
}: OverlayProps) {
  const frameContext = useContext(RootContext)
  const scrollElement = frameContext?.scrollElement ?? null
  const insetInlineEnd = avoidScrollbar
    ? 'var(--threadport-scrollbar-inline-size, 0px)'
    : 0
  const overlayStyle: CSSProperties = {
    insetInlineEnd,
    insetInlineStart: 0,
    pointerEvents,
    position: 'absolute',
    ...style,
  }

  if (placement === 'head') {
    overlayStyle.blockSize = 'var(--threadport-head-inset, 0px)'
    overlayStyle.insetBlockStart = 0
  } else if (placement === 'tail') {
    overlayStyle.blockSize = 'var(--threadport-tail-inset, 0px)'
    overlayStyle.insetBlockEnd = 0
  } else {
    overlayStyle.insetBlockEnd = 0
    overlayStyle.insetBlockStart = 0
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    if (!forwardWheelToViewport || !scrollElement || event.defaultPrevented) {
      return
    }

    const currentScrollTop = scrollElement.scrollTop
    const maxScrollTop = Math.max(
      0,
      scrollElement.scrollHeight - scrollElement.clientHeight,
    )
    const nextScrollTop = Math.min(
      Math.max(0, currentScrollTop + wheelDeltaToPixels(event, scrollElement)),
      maxScrollTop,
    )

    event.preventDefault()

    if (Math.abs(nextScrollTop - currentScrollTop) >= 0.5) {
      scrollElement.scrollTop = nextScrollTop
    }

    scrollElement.dispatchEvent(new Event('scroll', { bubbles: true }))
    frameContext?.requestViewportStateUpdate()
  }

  return (
    <div className={className} onWheel={handleWheel} style={overlayStyle}>
      {children}
    </div>
  )
}
