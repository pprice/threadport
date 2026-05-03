# Threadport

Headless virtualized chat viewport primitives for React, built on TanStack
Virtual. Threadport is intended to mimic the scroll behavior of ChatGPT and
Claude-style applications while your app owns messages, composer, buttons,
styling, and layout.

## Install

```sh
npm install threadport react
```

## Usage

```tsx
import {
  ChatViewportFrame,
  ChatViewportOverlay,
  ChatVirtualViewport,
  easeOutQuart,
  type ChatVirtualViewportHandle,
} from 'threadport'
import { useRef } from 'react'

type Message = { id: string; body: string }

export function Chat({ messages }: { messages: Message[] }) {
  const viewportRef = useRef<ChatVirtualViewportHandle | null>(null)

  return (
    <ChatViewportFrame>
      <ChatVirtualViewport
        ref={viewportRef}
        items={messages}
        getItemKey={(message) => message.id}
        estimateSize={() => 160}
        renderItem={({ item }) => <article>{item.body}</article>}
        headInset={64}
        tailInset={168}
        initialAnchor="tail"
        tailReserve
        virtualizerOptions={{ overscan: 12 }}
      />

      <ChatViewportOverlay placement="tail">
        <Composer
          onSubmit={(messageId) => {
            viewportRef.current?.scrollToItem(messageId, {
              align: 'head',
              duration: 520,
              easing: easeOutQuart,
            })
          }}
        />
      </ChatViewportOverlay>
    </ChatViewportFrame>
  )
}
```

## Concepts

- `head`: older/start side of the transcript.
- `tail`: newer/end side of the transcript.
- `inset`: persistent overlap from app chrome, such as a header or composer.
- `reserve`: intentional space, such as unloaded history or active tail space.
- `threshold`: tolerance for `isAtHead` and `isAtTail`.

## API

`ChatVirtualViewport` props:

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `items` | `readonly TItem[]` | Yes | Items to virtualize. |
| `getItemKey` | `(item, index) => string \| number` | Yes | Stable key for each item. |
| `estimateSize` | `(item, index) => number` | Yes | Estimated row height before measurement. |
| `renderItem` | `(args) => ReactNode` | Yes | Renders one item. |
| `ariaLabel` | `string` | No | Accessible label for the scroll region. |
| `atHeadThreshold` | `number` | No | Distance in px considered "at head". |
| `atTailThreshold` | `number` | No | Distance in px considered "at tail". |
| `className` | `string` | No | Class for the scroll element. |
| `contentClassName` | `string` | No | Class for the virtual content element. |
| `headInset` | `number` | No | Persistent overlap at the head, usually top chrome. |
| `headReserve` | `number` | No | Extra reserved space before the first item. |
| `initialAnchor` | `'head' \| 'tail'` | No | Initial scroll position. |
| `itemClassName` | `string` | No | Class for each measured virtual row. |
| `itemGap` | `number` | No | Gap in px between rows. |
| `onStateChange` | `(state) => void` | No | Receives scroll distances, booleans, sizes, and render count. |
| `overscan` | `number` | No | Extra rows rendered outside the viewport. |
| `preserveScrollOnPrepend` | `boolean` | No | Keeps the visible anchor stable when items are inserted at the head. |
| `role` | `string` | No | ARIA role for the scroll element. |
| `style` | `CSSProperties` | No | Inline style for the scroll element. |
| `tailInset` | `number` | No | Persistent overlap at the tail, usually composer space. |
| `tailReserve` | `boolean \| ChatTailReserveOptions` | No | Gives the active appended tail item a viewport-sized minimum height. |
| `virtualizerOptions` | `ChatVirtualizerOptions` | No | Safe TanStack Virtual options; Threadport-owned scroll/padding options are omitted. |

`virtualizerOptions` is for TanStack tuning without prop thunking. Threadport
still owns `count`, `getScrollElement`, item keys, estimates, inset padding,
scroll padding, `onChange`, orientation, lanes, and initial offset. `overscan`
and `itemGap` are shorthands that win over `virtualizerOptions.overscan` and
`virtualizerOptions.gap`.

Imperative handle:

- `scrollToHead(options)`
- `scrollToTail(options)`
- `scrollToIndex(index, { align, ...options })`
- `scrollToItem(key, { align, ...options })`
- `measure()`, `getState()`, `getScrollElement()`, `stopScrollAnimation()`

Frame helpers:

- `ChatViewportFrame`: shares inset and scrollbar geometry with overlays.
- `ChatViewportOverlay`: frame-relative overlay; avoids the scrollbar lane by default and can forward wheel events to the viewport.
- `useChatViewportFrameState`: read frame geometry in custom UI.

## Layout Rules

- Give the viewport a bounded height.
- Keep composer and floating controls outside `ChatVirtualViewport`.
- Pass overlap as `headInset` / `tailInset`; do not fake it with message padding.
- Use `tailReserve` when newly appended responses should start with a screen of empty space beneath them.

## Development

```sh
npm install
npm run dev
npm test
npm run build
npm run pack:dry
```

The playground is at `/`. The API test harness is at `/?fixture=api`.

## License

MIT
