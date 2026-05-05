export type FullFeatureTranscriptTurn = {
  prompt: string
  response: string
  searchDelayMs: number
  streamWordsPerChunk: number
  thinkingDelayMs: number
}

export const fullFeatureTranscript: FullFeatureTranscriptTurn[] = [
  {
    prompt: 'What does Threadport actually handle for me?',
    response: `Threadport is the headless viewport for chat-style transcripts. It owns the parts that go wrong when you wire your own:

- Virtualization with per-row measurement, so long Markdown stays performant.
- Scroll anchoring on prepend, so loading older messages does not move the row you are reading.
- A reserved tail that stays open while a streamed reply grows downward.
- Imperative scroll commands (\`scrollToHead\`, \`scrollToTail\`, \`scrollToItem\`) with cancelable easing.

Everything else stays in your render tree. You bring the messages, the composer, and the chrome.`,
    searchDelayMs: 780,
    streamWordsPerChunk: 8,
    thinkingDelayMs: 1100,
  },
  {
    prompt: 'How does it compare to building this with react-window?',
    response: `### Where the work goes

react-window gives you the virtualization primitive. Everything else, including the chat-specific behaviors that make a transcript feel right, you write yourself.

| Behavior | react-window | Threadport |
| --- | --- | --- |
| Per-row virtualization | Yes | Yes |
| Anchor preservation on prepend | You build it | Built in |
| Tail reserve during streaming | You build it | Built in |
| Cancelable scroll animations | You build it | Built in |
| Jump-to-bottom state | You build it | Reported via \`onStateChange\` |
| Composer and chrome | You build it | You build it |

Threadport's surface is intentionally smaller than a chat framework. It does not own messages, styling, the composer, or accessibility semantics for your row content. Those decisions belong to the integrator.`,
    searchDelayMs: 880,
    streamWordsPerChunk: 9,
    thinkingDelayMs: 1200,
  },
  {
    prompt: 'Show me auto-follow that only sticks when the reader is already at the bottom.',
    response: `### Conditional auto-follow

The pattern is "stick if sticky, otherwise leave alone." Two ingredients: the latest viewport state from \`onStateChange\`, and a one-line decision before each content append.

#### The setup

Capture the current state into a ref so append-time logic can read it without subscribing:

\`\`\`tsx
const stateRef = useRef<ViewportState | null>(null)

<ThreadPort.Viewport
  onStateChange={(next) => {
    stateRef.current = next
  }}
  /* ... */
/>
\`\`\`

#### The append

When a streamed delta arrives, decide *before* applying it whether the reader was already at tail. After applying, scroll only if they were.

\`\`\`tsx
function appendDelta(delta: string) {
  const wasAtTail = stateRef.current?.isAtTail ?? true

  setItems((current) => applyAssistantDelta(current, delta))

  if (wasAtTail) {
    queueMicrotask(() =>
      viewportRef.current?.scrollToTail({ duration: 0 }),
    )
  }
}
\`\`\`

#### What this avoids

1. Yanking the reader back to the bottom while they are reading older messages.
2. Fighting the user's own scroll: if they scrolled up mid-stream, the next chunk does not snap them down.
3. Hiding the new content entirely: pair this with a jump-to-bottom button gated on \`distanceFromTail\`.

#### Edge cases worth knowing

- **First message**: when the transcript is empty, \`isAtTail\` is true. The \`?? true\` fallback keeps the first response anchored to the bottom.
- **Reduced motion**: \`{ duration: 0 }\` is intentional. Animated scroll during streaming feels chatty; an instant snap reads as the tail being held.
- **Rapid deltas**: \`queueMicrotask\` defers the scroll until React's commit, so per-frame measurement is accurate.

This page uses exactly this pattern. Watch the \`distanceFromTail\` reading in the metrics panel and try scrolling away mid-stream.`,
    searchDelayMs: 980,
    streamWordsPerChunk: 11,
    thinkingDelayMs: 1300,
  },
]
