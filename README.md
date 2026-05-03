# Threadport

Headless virtualized chat viewport primitives for React. Threadport owns scroll
mechanics; your app owns messages, composer, buttons, styling, and layout.

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

- Required: `items`, `getItemKey`, `estimateSize`, `renderItem`.
- Layout: `headInset`, `tailInset`, `headReserve`, `tailReserve`, `itemGap`.
- Behavior: `initialAnchor`, `overscan`, `preserveScrollOnPrepend`, `atHeadThreshold`, `atTailThreshold`.
- State: `onStateChange` reports scroll distance, tail/head booleans, viewport size, rendered count, and scrollbar size.

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
