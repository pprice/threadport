import type { ChatVirtualizerOptions, ChatVirtualViewportProps } from '../../src'

type Item = {
  id: string
}

const safeOptions: ChatVirtualizerOptions = {
  debug: true,
  gap: 4,
  isScrollingResetDelay: 120,
  overscan: 8,
  useAnimationFrameWithResizeObserver: false,
  useScrollendEvent: true,
}

const props: ChatVirtualViewportProps<Item> = {
  estimateSize: () => 80,
  getItemKey: (item) => item.id,
  items: [{ id: '1' }],
  renderItem: ({ item }) => <div>{item.id}</div>,
  virtualizerOptions: safeOptions,
}

void props

const shorthandOverrides: ChatVirtualViewportProps<Item> = {
  estimateSize: () => 80,
  getItemKey: (item) => item.id,
  itemGap: 8,
  items: [{ id: '1' }],
  overscan: 12,
  renderItem: ({ item }) => <div>{item.id}</div>,
  virtualizerOptions: {
    gap: 4,
    overscan: 2,
  },
}

void shorthandOverrides

const countIsOwned: ChatVirtualizerOptions = {
  // @ts-expect-error Threadport owns item count.
  count: 10,
}

void countIsOwned

const scrollElementIsOwned: ChatVirtualizerOptions = {
  // @ts-expect-error Threadport owns the scroll element.
  getScrollElement: () => null,
}

void scrollElementIsOwned

const paddingIsOwned: ChatVirtualizerOptions = {
  // @ts-expect-error Threadport derives padding from head/tail insets.
  paddingStart: 24,
}

void paddingIsOwned

const changeHandlerIsOwned: ChatVirtualizerOptions = {
  // @ts-expect-error Threadport owns virtualizer change handling.
  onChange: () => undefined,
}

void changeHandlerIsOwned

const lanesAreOwned: ChatVirtualizerOptions = {
  // @ts-expect-error Threadport is a one-dimensional chat viewport.
  lanes: 2,
}

void lanesAreOwned
