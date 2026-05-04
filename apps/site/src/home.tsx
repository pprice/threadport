import {
  createMessage,
  type DemoMessage,
  EXAMPLE_ITEM_GAP,
  estimateMessageSize,
  getMessageKey,
  InsetOverlays,
  MessageView,
  ThreadPort,
  useReducedMotion,
} from '@phipri/react-threadport-demo-shared'
import { useEffect, useRef, useState } from 'react'
import { REPO_URL, SiteHeader } from './Header'

type PreviewExchange = {
  answer: string
  prompt: string
}

const previewExchanges: readonly PreviewExchange[] = [
  {
    prompt: 'Reserve space for the next answer.',
    answer:
      'Starting with active tail reserve. The prompt anchors near the top. Threadport gives the new assistant row breathing room. The host still owns this composer, copy, and visual treatment.',
  },
  {
    prompt: 'How does it handle long answers?',
    answer:
      "Each row is estimated up front, then measured after paint, so the scroll range stays aligned with whatever the assistant actually produces. As new content streams in, the row grows; the virtualizer reconciles measurement deltas without nudging the reader.\n\nIf a wheel, touch, or pointer event lands while a programmatic scroll is in flight, the animation cancels itself immediately. After the scroll settles, captureAnchor records the visible anchor and its viewport-relative top. That capture is rate-limited to once per frame, so fast wheel events do not force a synchronous layout on every native scroll tick.\n\nAny prepend that arrives while the anchor is in view triggers an offset restoration. The new scrollTop becomes the anchor's virtualItem start plus the prior delta, then the actual DOM rect is read on the next frame and corrected for measurement drift. Two passes is intentional: the first pass uses the virtualizer math to land approximately, the second pass uses real layout to fine-tune. The reader sees no flicker, no jump, no measurement reset.\n\nThe tail reserve sits at the bottom of the transcript whenever an append is in flight. Its minHeight is derived from headInset, tailInset, viewport size, and the consumed space above the appended item, so the reserve only takes up what is left over after the new prompt is anchored at the top. As the assistant body streams in, the reserve shrinks; once the content fills it, maxScrollTop returns to the physical scroll bottom and the user can scroll past freely.\n\nNothing here is magic. The viewport owns measurement, virtualization, and anchor preservation. The host owns when to scroll, when to reserve, when to expose controls. That separation is what keeps Threadport useful: integrators can mimic GPT-style behavior without inheriting product opinions.",
  },
  {
    prompt: 'Can older history load above the reader?',
    answer:
      'Prepends preserve the visible reading position. The integrator drives the load; the viewport keeps the anchor. Estimates and measurements stay coherent across the prepend. The reader does not lose their place.',
  },
  {
    prompt: 'What about jumping to the latest answer?',
    answer:
      'Tail policy is explicit, never automatic. onStateChange reports distance from tail to the host. The host decides when to expose a jump control. Submitted prompts still scroll to the top by default.',
  },
]

const THINKING_DELAY = 320
const WORD_INTERVAL = 38
const POST_STREAM_PAUSE = 1400
const MAX_PREVIEW_MESSAGES = 24

type Token = readonly [kind: string, text: string]

const usageTokens: readonly Token[] = [
  ['kw', 'import'],
  ['plain', ' * '],
  ['kw', 'as'],
  ['plain', ' ThreadPort '],
  ['kw', 'from'],
  ['plain', ' '],
  ['str', "'@phipri/react-threadport'"],
  ['plain', '\n\n'],
  ['punct', '<'],
  ['tag', 'ThreadPort.Viewport'],
  ['plain', '\n  '],
  ['attr', 'items'],
  ['punct', '={'],
  ['plain', 'messages'],
  ['punct', '}'],
  ['plain', '\n  '],
  ['attr', 'getItemKey'],
  ['punct', '={('],
  ['plain', 'm'],
  ['punct', ') => '],
  ['plain', 'm'],
  ['punct', '.'],
  ['plain', 'id'],
  ['punct', '}'],
  ['plain', '\n  '],
  ['attr', 'estimateSize'],
  ['punct', '={('],
  ['plain', 'm'],
  ['punct', ') => '],
  ['num', '96'],
  ['punct', '}'],
  ['plain', '\n  '],
  ['attr', 'renderItem'],
  ['punct', '={({ '],
  ['plain', 'item'],
  ['punct', ' }) => (\n    <'],
  ['tag', 'YourMessage'],
  ['plain', ' '],
  ['attr', 'message'],
  ['punct', '={'],
  ['plain', 'item'],
  ['punct', '} />'],
  ['plain', '\n  '],
  ['punct', ')}\n/>'],
]

function tokenizeWords(text: string): readonly string[] {
  return text.match(/\S+\s*/g) ?? []
}

function estimateBodyHeight(body: string): number {
  return 96 + Math.ceil(body.length / 74) * 24
}

export function Home() {
  const viewportRef = useRef<ThreadPort.ViewportHandle | null>(null)
  const reducedMotion = useReducedMotion()
  const [previewMessages, setPreviewMessages] = useState<DemoMessage[]>(
    () => [],
  )
  const [draft, setDraft] = useState('')

  useEffect(() => {
    const timers: number[] = []
    const schedule = (callback: () => void, delay: number) => {
      const id = window.setTimeout(callback, delay)

      timers.push(id)
    }
    let cycleIndex = 0

    function runCycle() {
      const exchange = previewExchanges[cycleIndex % previewExchanges.length]
      cycleIndex += 1
      setDraft('')

      if (!exchange) {
        return
      }

      const characters = reducedMotion
        ? [exchange.prompt]
        : exchange.prompt.split('')
      const typingDelay = reducedMotion ? 0 : 34
      const words = tokenizeWords(exchange.answer)

      characters.forEach((text, index) => {
        schedule(
          () => {
            setDraft((current) => `${current}${text}`)
          },
          380 + index * typingDelay,
        )
      })

      const messageDelay = 380 + characters.length * typingDelay + 540

      schedule(() => {
        const userMessage = createMessage('user', exchange.prompt)
        const assistantMessage = createMessage('assistant', '')

        setDraft('')
        setPreviewMessages((current) => {
          const next = [...current, userMessage, assistantMessage]

          if (next.length <= MAX_PREVIEW_MESSAGES) {
            return next
          }

          return next.slice(next.length - MAX_PREVIEW_MESSAGES)
        })

        requestAnimationFrame(() => {
          viewportRef.current?.scrollToItem(userMessage.id, {
            align: 'head',
            animation: reducedMotion
              ? { duration: 0 }
              : ThreadPort.Animation.easeOutQuart(420),
          })
        })

        if (reducedMotion) {
          schedule(() => {
            setPreviewMessages((current) =>
              current.map((message) =>
                message.id === assistantMessage.id
                  ? {
                      ...message,
                      body: exchange.answer,
                      estimate: estimateBodyHeight(exchange.answer),
                    }
                  : message,
              ),
            )
          }, 0)
          return
        }

        let assembled = ''
        words.forEach((word, index) => {
          schedule(
            () => {
              assembled += word
              const nextBody = assembled
              setPreviewMessages((current) =>
                current.map((message) =>
                  message.id === assistantMessage.id
                    ? {
                        ...message,
                        body: nextBody,
                        estimate: estimateBodyHeight(nextBody),
                      }
                    : message,
                ),
              )
            },
            THINKING_DELAY + index * WORD_INTERVAL,
          )
        })
      }, messageDelay)

      const streamingTime = reducedMotion
        ? 0
        : THINKING_DELAY + words.length * WORD_INTERVAL
      schedule(runCycle, messageDelay + streamingTime + POST_STREAM_PAUSE)
    }

    runCycle()

    return () => {
      timers.forEach((timer) => {
        window.clearTimeout(timer)
      })
    }
  }, [reducedMotion])

  return (
    <div className="siteRoot">
      <SiteHeader />
      <main className="homeMain">
        <section className="homeHero">
          <div className="heroCopy">
            <p className="eyebrow">React · headless · v1.0</p>
            <h1>The headless chat viewport for React</h1>
            <p className="lede">
              All the scroll mechanics that make ChatGPT and Claude feel right,
              headless, in your React app. You ship the messages, composer, and
              styling.
            </p>
            <div className="homeActions">
              <a className="button primary" href="/examples/standard">
                Open the live example
              </a>
              <a
                className="button"
                href={REPO_URL}
                rel="noreferrer"
                target="_blank"
              >
                View on GitHub
              </a>
            </div>
            <pre className="heroCode">
              <code>
                {usageTokens.map(([kind, text], index) =>
                  kind === 'plain' ? (
                    text
                  ) : (
                    <span
                      // biome-ignore lint/suspicious/noArrayIndexKey: static token list
                      key={index}
                      className={`tok-${kind}`}
                    >
                      {text}
                    </span>
                  ),
                )}
              </code>
            </pre>
          </div>

          <div className="heroPreview">
            <ThreadPort.Root className="previewFrame">
              <ThreadPort.Viewport
                ref={viewportRef}
                ariaLabel="Threadport preview transcript"
                className="exampleViewport"
                contentClassName="exampleContent"
                estimateSize={estimateMessageSize}
                getItemKey={getMessageKey}
                headInset={28}
                initialAnchor="tail"
                itemGap={EXAMPLE_ITEM_GAP}
                itemClassName="exampleRow"
                items={previewMessages}
                renderItem={({ item }) => <MessageView message={item} />}
                role="log"
                tailInset={104}
                tailReserve={{ className: 'tailReserve previewTailReserve' }}
                virtualizerOptions={{ overscan: 4 }}
              />
              <InsetOverlays />
              <ThreadPort.Overlay
                className="previewComposerDock"
                placement="tail"
              >
                <div className="previewComposer" aria-hidden="true">
                  <span>{draft || 'Message Threadport'}</span>
                  <span className="typingCaret" />
                  <button type="button">↑</button>
                </div>
              </ThreadPort.Overlay>
            </ThreadPort.Root>
          </div>
        </section>
      </main>
    </div>
  )
}
