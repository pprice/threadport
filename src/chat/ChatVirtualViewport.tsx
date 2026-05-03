import { useVirtualizer } from '@tanstack/react-virtual'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ForwardedRef,
  type ReactElement,
  type RefAttributes,
} from 'react'
import {
  readScrollbarInlineSize,
  useChatViewportFrameRegistration,
} from './ChatViewportFrame'
import {
  DEFAULT_AT_HEAD_THRESHOLD,
  DEFAULT_AT_TAIL_THRESHOLD,
  DEFAULT_ESTIMATE,
} from './constants'
import { isTailReserveEnabled } from './TailReserve'
import { VirtualRows } from './VirtualRows'
import {
  animateScrollTop,
  resolveScrollAnimation,
  type ActiveScrollAnimation,
} from './scrollAnimation'
import { useTailReserveContentMeasurement } from './useTailReserveContentMeasurement'
import { useViewportStateEmitter } from './useViewportStateEmitter'
import type {
  ChatItemKey,
  ChatScrollAlign,
  ChatScrollAnimation,
  ChatScrollDirection,
  ChatScrollToItemOptions,
  ChatViewportState,
  ChatVirtualViewportHandle,
  ChatVirtualViewportProps,
} from './ChatVirtualViewport.types'

type AnchorSnapshot = {
  itemKey: ChatItemKey
  scrollDelta: number
}

function toVirtualAlign(align: ChatScrollAlign) {
  if (align === 'head') {
    return 'start'
  }

  if (align === 'tail') {
    return 'end'
  }

  return align
}

function ChatVirtualViewportInner<TItem>(
  {
    items,
    getItemKey,
    estimateSize,
    renderItem,
    ariaLabel,
    atHeadThreshold = DEFAULT_AT_HEAD_THRESHOLD,
    atTailThreshold = DEFAULT_AT_TAIL_THRESHOLD,
    className,
    contentClassName,
    headInset = 0,
    headReserve = 0,
    initialAnchor = 'head',
    itemClassName,
    itemGap,
    onStateChange,
    overscan,
    preserveScrollOnPrepend = true,
    role,
    style,
    tailInset = 0,
    tailReserve,
    scrollAnimation,
    virtualizerOptions,
  }: ChatVirtualViewportProps<TItem>,
  forwardedRef: ForwardedRef<ChatVirtualViewportHandle>,
) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const animationRef = useRef<ActiveScrollAnimation | null>(null)
  const programmaticScrollRef = useRef(false)
  const scrollAnimationIdRef = useRef(0)
  const anchorRef = useRef<AnchorSnapshot | null>(null)
  const previousCountRef = useRef<number | null>(null)
  const previousFirstKeyRef = useRef<ChatItemKey | null>(null)
  const previousLastKeyRef = useRef<ChatItemKey | null>(null)
  const didInitialScrollRef = useRef(false)
  const lastScrollTopRef = useRef(0)
  const scrollDirectionRef = useRef<ChatScrollDirection>(null)
  const requestStateUpdateRef = useRef<(() => void) | null>(null)
  const activeTailReserveKeyRef = useRef<ChatItemKey | null>(null)
  const measuredTailReserveKeyRef = useRef<ChatItemKey | null>(null)
  const tailReserveContentSizeRef = useRef(0)
  const tailReserveMinHeightRef = useRef(0)
  const [reservedTailKey, setReservedTailKey] =
    useState<ChatItemKey | null>(null)
  const [tailReserveContentElement, setTailReserveContentElement] =
    useState<HTMLDivElement | null>(null)
  const reservedTailKeyRef = useRef<ChatItemKey | null>(null)
  const registerViewportFrame = useChatViewportFrameRegistration()

  const tailReserveEnabled = isTailReserveEnabled(tailReserve)
  const tailReserveOptions =
    typeof tailReserve === 'object' ? tailReserve : undefined
  const headPadding = Math.max(0, headInset) + Math.max(0, headReserve)
  const virtualizerGap = itemGap ?? virtualizerOptions?.gap ?? 0
  const virtualizerOverscan = overscan ?? virtualizerOptions?.overscan ?? 10

  const keyToIndex = useMemo(() => {
    const map = new Map<ChatItemKey, number>()

    items.forEach((item, index) => {
      map.set(getItemKey(item, index), index)
    })

    return map
  }, [getItemKey, items])

  function stopScrollAnimation() {
    animationRef.current?.cancel()
    animationRef.current = null
    programmaticScrollRef.current = false
  }

  function getUnconsumedTailReserve() {
    if (!tailReserveEnabled || activeTailReserveKeyRef.current === null) {
      return 0
    }

    return Math.max(
      0,
      tailReserveMinHeightRef.current - tailReserveContentSizeRef.current,
    )
  }

  function getMaxScrollTop() {
    const element = scrollRef.current

    if (!element) {
      return 0
    }

    return Math.max(
      0,
      element.scrollHeight - getUnconsumedTailReserve() - element.clientHeight,
    )
  }

  function getTailReserveMinHeight() {
    const explicitMinHeight = tailReserveOptions?.minHeight
    const viewportSize =
      scrollRef.current?.clientHeight ?? virtualizer.scrollRect?.height ?? 0

    if (typeof explicitMinHeight === 'number') {
      return Math.max(0, explicitMinHeight)
    }

    if (typeof explicitMinHeight === 'function') {
      return Math.max(
        0,
        explicitMinHeight({
          headInset,
          headReserve,
          tailInset,
          viewportSize,
        }),
      )
    }

    return Math.max(0, viewportSize - tailInset)
  }

  function readState(): ChatViewportState {
    const element = scrollRef.current
    const scrollOffset = element?.scrollTop ?? 0
    const viewportSize = element?.clientHeight ?? 0
    const scrollSize = element?.scrollHeight ?? virtualizer.getTotalSize()
    const maxScrollTop = getMaxScrollTop()
    const distanceFromHead = scrollOffset
    const distanceFromTail = Math.max(0, maxScrollTop - scrollOffset)

    return {
      distanceFromHead,
      distanceFromTail,
      isAtHead: scrollOffset <= atHeadThreshold,
      isAtTail: distanceFromTail <= atTailThreshold,
      isScrolling: virtualizer.isScrolling,
      scrollbarInlineSize: readScrollbarInlineSize(element),
      scrollOffset,
      scrollSize,
      viewportSize,
      scrollDirection: scrollDirectionRef.current,
      totalItems: items.length,
      virtualItems: virtualizer.getVirtualItems().length,
    }
  }

  const {
    emitState,
    scheduleSettledStateEmit,
    scheduleStateEmit,
  } = useViewportStateEmitter({ onStateChange, readState })

  requestStateUpdateRef.current = () => {
    emitState()
    scheduleSettledStateEmit()
  }

  function captureAnchor() {
    const element = scrollRef.current

    if (!element || items.length === 0) {
      return
    }

    const anchorItem =
      virtualizer.getVirtualItemForOffset(element.scrollTop) ??
      virtualizer.getVirtualItems()[0]

    if (!anchorItem) {
      return
    }

    const item = items[anchorItem.index]

    if (item === undefined) {
      return
    }

    anchorRef.current = {
      itemKey: getItemKey(item, anchorItem.index),
      scrollDelta: element.scrollTop - anchorItem.start,
    }
  }

  function scrollToTarget(
    getTargetTop: () => number,
    options: ChatScrollAnimation | undefined,
    onSettled?: () => void,
  ) {
    const element = scrollRef.current

    if (!element) {
      return
    }

    stopScrollAnimation()
    programmaticScrollRef.current = true

    let done = false
    const animationId = scrollAnimationIdRef.current + 1
    scrollAnimationIdRef.current = animationId
    const activeAnimation = animateScrollTop(
      element,
      getTargetTop,
      resolveScrollAnimation(options, scrollAnimation),
      () => {
        done = true

        if (scrollAnimationIdRef.current !== animationId) {
          return
        }

        programmaticScrollRef.current = false
        animationRef.current = null
        captureAnchor()
        scheduleStateEmit()
        onSettled?.()
      },
    )

    if (!done) {
      animationRef.current = activeAnimation
    }
  }

  function scrollToIndex(
    index: number,
    { align = 'head', animation }: ChatScrollToItemOptions = {},
  ) {
    if (index < 0 || index >= items.length) {
      return
    }

    scrollToTarget(
      () =>
        virtualizer.getOffsetForIndex(index, toVirtualAlign(align))?.[0] ??
        scrollRef.current?.scrollTop ??
        0,
      animation,
    )
  }

  function scrollToItem(
    key: ChatItemKey,
    options: ChatScrollToItemOptions = {},
  ) {
    const index = keyToIndex.get(key)

    if (index === undefined) {
      return
    }

    scrollToIndex(index, options)
  }

  const virtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
    ...virtualizerOptions,
    count: items.length,
    estimateSize: (index) => {
      const item = items[index]

      if (item === undefined) {
        return DEFAULT_ESTIMATE
      }

      return estimateSize(item, index)
    },
    getItemKey: (index) => {
      const item = items[index]

      if (item === undefined) {
        return index
      }

      return getItemKey(item, index)
    },
    getScrollElement: () => scrollRef.current,
    gap: virtualizerGap,
    onChange: () => {
      captureAnchor()
      scheduleStateEmit()
      scheduleSettledStateEmit()
    },
    overscan: virtualizerOverscan,
    paddingEnd: tailInset,
    paddingStart: headPadding,
    scrollPaddingEnd: tailInset,
    scrollPaddingStart: headInset,
    useAnimationFrameWithResizeObserver:
      virtualizerOptions?.useAnimationFrameWithResizeObserver ?? true,
  })

  useLayoutEffect(() => {
    reservedTailKeyRef.current = reservedTailKey
  }, [reservedTailKey])

  useLayoutEffect(() => {
    if (!registerViewportFrame) {
      return
    }

    return registerViewportFrame({
      headInset,
      requestStateUpdate: () => requestStateUpdateRef.current?.(),
      scrollElement: scrollRef.current,
      tailInset,
    })
  }, [headInset, registerViewportFrame, tailInset])

  useLayoutEffect(() => {
    virtualizer.shouldAdjustScrollPositionOnItemSizeChange = (
      item,
      _delta,
      instance,
    ) => {
      if (programmaticScrollRef.current) {
        return false
      }

      if (reservedTailKeyRef.current === item.key) {
        return false
      }

      const scrollOffset = instance.scrollOffset ?? 0

      return item.start < scrollOffset
    }
  }, [virtualizer])

  useLayoutEffect(() => {
    const firstKey =
      items.length > 0 && items[0] !== undefined
        ? getItemKey(items[0], 0)
        : null
    const lastKey =
      items.length > 0 && items[items.length - 1] !== undefined
        ? getItemKey(items[items.length - 1], items.length - 1)
        : null
    const previousCount = previousCountRef.current
    const previousFirstKey = previousFirstKeyRef.current
    const previousLastKey = previousLastKeyRef.current
    const previousFirstMoved =
      previousFirstKey !== null &&
      keyToIndex.has(previousFirstKey) &&
      (keyToIndex.get(previousFirstKey) ?? 0) > 0
    const appendedToTail =
      previousCount !== null &&
      items.length > previousCount &&
      previousFirstKey === firstKey &&
      previousLastKey !== lastKey

    if (preserveScrollOnPrepend && previousFirstMoved) {
      const anchor = anchorRef.current
      const element = scrollRef.current

      if (anchor && element) {
        const anchorIndex = keyToIndex.get(anchor.itemKey)
        const offset =
          anchorIndex === undefined
            ? undefined
            : virtualizer.getOffsetForIndex(anchorIndex, 'start')?.[0]

        if (offset !== undefined) {
          element.scrollTop = offset + anchor.scrollDelta
        }
      }
    }

    if (!tailReserveEnabled || lastKey === null) {
      setReservedTailKey((current) => (current === null ? current : null))
    } else if (appendedToTail) {
      setReservedTailKey((current) => (current === lastKey ? current : lastKey))
    } else {
      setReservedTailKey((current) =>
        current !== null && !keyToIndex.has(current) ? null : current,
      )
    }

    previousCountRef.current = items.length
    previousFirstKeyRef.current = firstKey
    previousLastKeyRef.current = lastKey
    captureAnchor()
    scheduleStateEmit()
  }, [
    getItemKey,
    items,
    keyToIndex,
    preserveScrollOnPrepend,
    tailReserveEnabled,
    virtualizer,
  ])

  useLayoutEffect(() => {
    if (didInitialScrollRef.current || items.length === 0) {
      return
    }

    didInitialScrollRef.current = true

    if (initialAnchor === 'tail') {
      requestAnimationFrame(() => {
        scrollToTarget(getMaxScrollTop, { duration: 0 })
      })
    }
  }, [initialAnchor, items.length])

  useEffect(() => {
    return () => {
      stopScrollAnimation()
    }
  }, [])

  useImperativeHandle(
    forwardedRef,
    () => ({
      getScrollElement: () => scrollRef.current,
      getState: readState,
      measure: () => virtualizer.measure(),
      scrollToHead: (options) => {
        scrollToTarget(() => 0, options)
      },
      scrollToIndex,
      scrollToItem,
      scrollToTail: (options) => {
        scrollToTarget(getMaxScrollTop, options, () => {
          requestAnimationFrame(() => {
            const element = scrollRef.current

            if (!element) {
              return
            }

            const targetTop = getMaxScrollTop()

            if (Math.abs(element.scrollTop - targetTop) > 1) {
              element.scrollTop = targetTop
            }

            captureAnchor()
            emitState()
          })
        })
      },
      stopScrollAnimation,
    }),
  )

  function handleScroll() {
    const element = scrollRef.current

    if (!element) {
      return
    }

    const delta = element.scrollTop - lastScrollTopRef.current

    if (Math.abs(delta) > 1) {
      scrollDirectionRef.current = delta > 0 ? 'tail' : 'head'
      lastScrollTopRef.current = element.scrollTop
    }

    captureAnchor()
    scheduleStateEmit()
    scheduleSettledStateEmit()
  }

  const virtualItems = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()

  useLayoutEffect(() => {
    scheduleStateEmit()

    const frame = requestAnimationFrame(() => {
      emitState()
    })

    return () => cancelAnimationFrame(frame)
  }, [
    atHeadThreshold,
    atTailThreshold,
    headInset,
    headReserve,
    items.length,
    tailInset,
    totalSize,
    virtualItems.length,
  ])

  const tailReserveMinHeight = getTailReserveMinHeight()
  const renderFirstKey =
    items.length > 0 && items[0] !== undefined ? getItemKey(items[0], 0) : null
  const renderLastKey =
    items.length > 0 && items[items.length - 1] !== undefined
      ? getItemKey(items[items.length - 1], items.length - 1)
      : null
  const renderAppendedToTail =
    previousCountRef.current !== null &&
    items.length > previousCountRef.current &&
    previousFirstKeyRef.current === renderFirstKey &&
    previousLastKeyRef.current !== renderLastKey
  const activeReservedTailKey =
    tailReserveEnabled && renderAppendedToTail && renderLastKey !== null
      ? renderLastKey
      : reservedTailKey

  activeTailReserveKeyRef.current = activeReservedTailKey
  tailReserveMinHeightRef.current = tailReserveMinHeight

  const setActiveTailReserveContent = useCallback(
    (element: HTMLDivElement | null) => {
      setTailReserveContentElement(element)
    },
    [],
  )

  useTailReserveContentMeasurement({
    activeReservedTailKey,
    measuredTailReserveKeyRef,
    scheduleStateEmit,
    tailReserveContentElement,
    tailReserveContentSizeRef,
    tailReserveMinHeight,
  })

  return (
    <div
      ref={scrollRef}
      aria-label={ariaLabel}
      className={className}
      onScroll={handleScroll}
      role={role}
      style={{
        overflowY: 'auto',
        position: 'relative',
        ...style,
      }}
    >
      <VirtualRows
        activeReservedTailKey={activeReservedTailKey}
        contentClassName={contentClassName}
        getItemKey={getItemKey}
        itemClassName={itemClassName}
        items={items}
        measureElement={virtualizer.measureElement}
        renderItem={renderItem}
        setActiveTailReserveContent={setActiveTailReserveContent}
        tailReserveEnabled={tailReserveEnabled}
        tailReserveMinHeight={tailReserveMinHeight}
        tailReserveOptions={tailReserveOptions}
        totalSize={totalSize}
        virtualItems={virtualItems}
      />
    </div>
  )
}

const ChatVirtualViewportBase = forwardRef(ChatVirtualViewportInner)
ChatVirtualViewportBase.displayName = 'ChatVirtualViewport'

export const ChatVirtualViewport = ChatVirtualViewportBase as <TItem>(
  props: ChatVirtualViewportProps<TItem> &
    RefAttributes<ChatVirtualViewportHandle>,
) => ReactElement
