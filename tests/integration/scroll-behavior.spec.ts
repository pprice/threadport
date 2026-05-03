import { expect, type Locator, type Page, test } from '@playwright/test'

type Snapshot = {
  composerHeight: number | null
  composerY: number | null
  jumpExists: boolean
  pageScrollY: number
  renderedRows: number
  tailDistance: number | null
  tailMetric: string | null
  viewportMaxScrollTop: number | null
  viewportScrollTop: number | null
}

type PromptGeometry = {
  exists: boolean
  headInset: number
  messageTop: number | null
  offsetFromHead: number | null
  overlayBottom: number | null
  viewportTop: number | null
}

type TopGeometry = {
  firstMessageTop: number | null
  headInset: number
  overlayBottom: number | null
  scrollTop: number | null
  viewportTop: number | null
}

type ActiveTailReserveGeometry = {
  contentHeight: number
  exists: boolean
  minHeight: number
  reserveHeight: number
}

type CenterMessageSnapshot = {
  id: string
  top: number
}

const expectedItemCounts = {
  chatgpt: 121,
  history: 421,
  mobile: 81,
} as const

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function readSnapshot(page: Page): Promise<Snapshot> {
  return page.evaluate(() => {
    const composerRect = document
      .querySelector('[data-testid="composer"]')
      ?.getBoundingClientRect()
    const tailMetric =
      document
        .querySelector('[data-testid="metric-tail"]')
        ?.textContent?.trim() ?? null
    const viewport = document.querySelector<HTMLElement>('.chatViewport')

    function parsePixels(value: string | null) {
      if (!value) {
        return null
      }

      const match = value.match(/-?\d+(?:\.\d+)?/)

      return match ? Number(match[0]) : null
    }

    return {
      composerHeight: composerRect ? Math.round(composerRect.height) : null,
      composerY: composerRect ? Math.round(composerRect.y) : null,
      jumpExists: Boolean(
        document.querySelector('[data-testid="jump-to-bottom"]'),
      ),
      pageScrollY: Math.round(window.scrollY),
      renderedRows: document.querySelectorAll('.chatVirtualRow').length,
      tailDistance: parsePixels(tailMetric),
      tailMetric,
      viewportMaxScrollTop: viewport
        ? Math.max(0, viewport.scrollHeight - viewport.clientHeight)
        : null,
      viewportScrollTop: viewport ? Math.round(viewport.scrollTop) : null,
    }
  })
}

async function waitForReady(page: Page) {
  await page.goto('/fixtures/')
  await expect(page.locator('.chatViewport')).toBeVisible()
  await expect(page.getByTestId('metric-rendered')).not.toHaveText('pending')
  await expect
    .poll(() => page.locator('.chatVirtualRow').count())
    .toBeGreaterThan(0)
}

async function switchExample(
  page: Page,
  example: keyof typeof expectedItemCounts,
) {
  await page.getByTestId(`example-${example}`).click()
  await expect(page.getByTestId(`example-${example}`)).toHaveClass(/active/)
  await expect(page.getByTestId('metric-items')).toHaveText(
    String(expectedItemCounts[example]),
  )
  await expect(page.getByTestId('metric-rendered')).not.toHaveText('pending')
  await expect
    .poll(() => page.locator('.chatVirtualRow').count())
    .toBeGreaterThan(0)
}

async function wheelAt(locator: Locator, page: Page, deltaY: number) {
  if ((await locator.count()) === 0) {
    return false
  }

  const box = await locator.boundingBox()

  if (!box) {
    return false
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.wheel(0, deltaY)
  return true
}

async function wheelSeveral(
  locator: Locator,
  page: Page,
  deltaY: number,
  count: number,
) {
  for (let index = 0; index < count; index += 1) {
    const didWheel = await wheelAt(locator, page, deltaY)

    if (!didWheel) {
      return
    }

    await page.waitForTimeout(80)
  }
}

async function showJumpToBottom(page: Page) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await wheelSeveral(page.locator('.chatViewport'), page, -900, 1)

    if ((await page.getByTestId('jump-to-bottom').count()) > 0) {
      await expect(page.getByTestId('jump-to-bottom')).toBeVisible()
      return
    }
  }

  await expect(page.getByTestId('jump-to-bottom')).toBeVisible()
}

async function expectStableComposerAndTail(before: Snapshot, after: Snapshot) {
  expect(after.jumpExists).toBe(false)
  expect(after.tailMetric).toBe('0px')
  expect(after.tailDistance ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(1)
  expect(after.pageScrollY).toBe(0)
  expect(after.composerY).toBe(before.composerY)
  expect(after.composerHeight).toBe(before.composerHeight)
}

async function exerciseJumpToBottom(page: Page, label: string) {
  await test.step(`${label}: hides by wheel over viewport`, async () => {
    await showJumpToBottom(page)
    const before = await readSnapshot(page)

    await wheelSeveral(page.locator('.chatViewport'), page, 900, 8)
    await expect(page.getByTestId('jump-to-bottom')).toHaveCount(0)

    await expectStableComposerAndTail(before, await readSnapshot(page))
  })

  await test.step(`${label}: hides by wheel over jump control`, async () => {
    await showJumpToBottom(page)
    const before = await readSnapshot(page)

    await wheelSeveral(page.getByTestId('jump-to-bottom'), page, 900, 16)
    await expect(page.getByTestId('jump-to-bottom')).toHaveCount(0)

    await expectStableComposerAndTail(before, await readSnapshot(page))
  })

  await test.step(`${label}: hides by click`, async () => {
    await showJumpToBottom(page)
    const before = await readSnapshot(page)

    await page.getByTestId('jump-to-bottom').click()
    await expect(page.getByTestId('jump-to-bottom')).toHaveCount(0)
    await expect
      .poll(async () => (await readSnapshot(page)).tailDistance)
      .toBeLessThanOrEqual(1)

    await expectStableComposerAndTail(before, await readSnapshot(page))
  })
}

async function submitPrompt(page: Page, text: string) {
  const input = page.getByRole('textbox', { name: 'Message' })
  const exactMessageText = new RegExp(`^\\s*${escapeRegExp(text)}\\s*$`)

  await input.fill(text)
  await input.press('Enter')
  await expect(
    page
      .locator('[data-message-role="user"]')
      .filter({ hasText: exactMessageText })
      .last(),
  ).toBeVisible()
}

async function readPromptGeometry(
  page: Page,
  text: string,
): Promise<PromptGeometry> {
  return page.evaluate((promptText) => {
    const viewport = document.querySelector<HTMLElement>('.chatViewport')
    const frame = document.querySelector<HTMLElement>('.chatSurface')
    const message =
      [
        ...document.querySelectorAll<HTMLElement>('[data-message-role="user"]'),
      ].find((node) => node.textContent?.includes(promptText)) ?? null
    const overlay = document.querySelector<HTMLElement>(
      '[data-testid="mobile-head-overlay"]',
    )
    const viewportRect = viewport?.getBoundingClientRect()
    const messageRect = message?.getBoundingClientRect()
    const overlayRect = overlay?.getBoundingClientRect()
    const styles = frame ? window.getComputedStyle(frame) : null
    const headInset = Number.parseFloat(
      styles?.getPropertyValue('--threadport-head-inset') ?? '0',
    )

    return {
      exists: Boolean(message),
      headInset: Number.isFinite(headInset) ? headInset : 0,
      messageTop: messageRect ? Math.round(messageRect.top) : null,
      offsetFromHead:
        messageRect && viewportRect
          ? Math.round(messageRect.top - viewportRect.top)
          : null,
      overlayBottom: overlayRect ? Math.round(overlayRect.bottom) : null,
      viewportTop: viewportRect ? Math.round(viewportRect.top) : null,
    }
  }, text)
}

async function readTopGeometry(page: Page): Promise<TopGeometry> {
  return page.evaluate(() => {
    const viewport = document.querySelector<HTMLElement>('.chatViewport')
    const frame = document.querySelector<HTMLElement>('.chatSurface')
    const overlay = document.querySelector<HTMLElement>(
      '[data-testid="mobile-head-overlay"]',
    )
    const viewportRect = viewport?.getBoundingClientRect()
    const overlayRect = overlay?.getBoundingClientRect()
    const styles = frame ? window.getComputedStyle(frame) : null
    const headInset = Number.parseFloat(
      styles?.getPropertyValue('--threadport-head-inset') ?? '0',
    )
    const firstMessage =
      [...document.querySelectorAll<HTMLElement>('[data-message-id]')]
        .map((node) => ({
          node,
          rect: node.getBoundingClientRect(),
        }))
        .filter(({ rect }) => {
          if (!viewportRect) {
            return false
          }

          return (
            rect.bottom > viewportRect.top && rect.top < viewportRect.bottom
          )
        })
        .sort((a, b) => a.rect.top - b.rect.top)[0] ?? null

    return {
      firstMessageTop: firstMessage ? Math.round(firstMessage.rect.top) : null,
      headInset: Number.isFinite(headInset) ? headInset : 0,
      overlayBottom: overlayRect ? Math.round(overlayRect.bottom) : null,
      scrollTop: viewport ? Math.round(viewport.scrollTop) : null,
      viewportTop: viewportRect ? Math.round(viewportRect.top) : null,
    }
  })
}

async function readActiveTailReserveGeometry(
  page: Page,
): Promise<ActiveTailReserveGeometry> {
  return page.evaluate(() => {
    const reserve = document.querySelector<HTMLElement>(
      '[data-tail-reserve="active"]',
    )
    const content = reserve?.firstElementChild as HTMLElement | null

    if (!reserve || !content) {
      return {
        contentHeight: 0,
        exists: false,
        minHeight: 0,
        reserveHeight: 0,
      }
    }

    const styles = window.getComputedStyle(reserve)
    const minHeight = Number.parseFloat(styles.minHeight)

    return {
      contentHeight: Math.round(content.getBoundingClientRect().height),
      exists: true,
      minHeight: Number.isFinite(minHeight) ? Math.round(minHeight) : 0,
      reserveHeight: Math.round(reserve.getBoundingClientRect().height),
    }
  })
}

async function captureCenterMessage(
  page: Page,
): Promise<CenterMessageSnapshot | null> {
  return page.evaluate(() => {
    const viewport = document.querySelector<HTMLElement>('.chatViewport')
    const viewportRect = viewport?.getBoundingClientRect()

    if (!viewportRect) {
      return null
    }

    const center = viewportRect.top + viewportRect.height / 2
    const candidate =
      [...document.querySelectorAll<HTMLElement>('[data-message-id]')]
        .map((node) => {
          const rect = node.getBoundingClientRect()

          return {
            id: node.dataset.messageId ?? '',
            rect,
            score: Math.abs(rect.top + rect.height / 2 - center),
          }
        })
        .filter(({ id, rect }) => {
          return (
            Boolean(id) &&
            rect.bottom > viewportRect.top &&
            rect.top < viewportRect.bottom
          )
        })
        .sort((a, b) => a.score - b.score)[0] ?? null

    return candidate
      ? {
          id: candidate.id,
          top: Math.round(candidate.rect.top),
        }
      : null
  })
}

async function readMessageTopById(page: Page, id: string) {
  return page.evaluate((messageId) => {
    const message = document.querySelector<HTMLElement>(
      `[data-message-id="${messageId}"]`,
    )

    return message
      ? {
          exists: true,
          top: Math.round(message.getBoundingClientRect().top),
        }
      : {
          exists: false,
          top: null,
        }
  }, id)
}

test('jump-to-bottom behavior is stable in every fixture shell', async ({
  page,
}) => {
  await waitForReady(page)

  await exerciseJumpToBottom(page, 'default shell')

  await switchExample(page, 'mobile')

  await exerciseJumpToBottom(page, 'mobile shell')
})

test('submitted prompts align below the head inset without moving the composer', async ({
  page,
}) => {
  await waitForReady(page)

  for (const example of ['chatgpt', 'mobile'] as const) {
    if (example !== 'chatgpt') {
      await switchExample(page, example)
    }

    const before = await readSnapshot(page)
    const promptText = `Head inset test prompt ${example} ${Date.now()}`

    await submitPrompt(page, promptText)
    await expect
      .poll(async () => {
        const geometry = await readPromptGeometry(page, promptText)

        if (geometry.offsetFromHead === null) {
          return Number.POSITIVE_INFINITY
        }

        return Math.abs(geometry.offsetFromHead - geometry.headInset)
      })
      .toBeLessThanOrEqual(44)

    const geometry = await readPromptGeometry(page, promptText)
    const after = await readSnapshot(page)

    expect(geometry.exists).toBe(true)
    expect(geometry.offsetFromHead ?? -1).toBeGreaterThanOrEqual(
      geometry.headInset - 6,
    )
    expect(
      geometry.offsetFromHead ?? Number.POSITIVE_INFINITY,
    ).toBeLessThanOrEqual(geometry.headInset + 44)

    if (geometry.overlayBottom !== null) {
      expect(geometry.messageTop ?? -1).toBeGreaterThanOrEqual(
        geometry.overlayBottom - 2,
      )
    }

    expect(after.pageScrollY).toBe(0)
    expect(after.composerY).toBe(before.composerY)
    expect(after.composerHeight).toBe(before.composerHeight)
  }
})

test('long streaming content burns through the dynamic tail reserve', async ({
  page,
}) => {
  await waitForReady(page)

  const before = await readSnapshot(page)

  await submitPrompt(page, 'long')
  await expect(
    page.getByText('End of the extended long response.'),
  ).toBeVisible({
    timeout: 8_000,
  })
  await expect
    .poll(async () => {
      const reserve = await readActiveTailReserveGeometry(page)

      return reserve.exists ? reserve.contentHeight - reserve.minHeight : -1
    })
    .toBeGreaterThan(80)
  await expect
    .poll(async () => (await readSnapshot(page)).tailDistance ?? 0)
    .toBeGreaterThan(180)
  await expect(page.getByTestId('jump-to-bottom')).toBeVisible()

  const reserve = await readActiveTailReserveGeometry(page)

  expect(reserve.reserveHeight).toBeGreaterThanOrEqual(reserve.contentHeight)
  expect(reserve.contentHeight).toBeGreaterThan(reserve.minHeight)

  await page.getByTestId('jump-to-bottom').click()
  await expect(page.getByTestId('jump-to-bottom')).toHaveCount(0)

  await expectStableComposerAndTail(before, await readSnapshot(page))
})

test('scroll-to-head accounts for the mobile head inset', async ({ page }) => {
  await waitForReady(page)
  await switchExample(page, 'mobile')

  await page.getByTestId('scroll-to-top').click()
  await expect
    .poll(
      async () =>
        (await readTopGeometry(page)).scrollTop ?? Number.POSITIVE_INFINITY,
    )
    .toBeLessThanOrEqual(1)

  const geometry = await readTopGeometry(page)

  expect(geometry.firstMessageTop ?? -1).toBeGreaterThanOrEqual(
    (geometry.viewportTop ?? 0) + geometry.headInset - 4,
  )
  expect(geometry.firstMessageTop ?? -1).toBeGreaterThanOrEqual(
    (geometry.overlayBottom ?? 0) - 2,
  )
})

test('history prepends preserve the visible anchor while rows stay virtualized', async ({
  page,
}) => {
  await waitForReady(page)
  await switchExample(page, 'history')
  await wheelSeveral(page.locator('.chatViewport'), page, -900, 4)

  const totalBefore = Number(
    await page.getByTestId('metric-items').textContent(),
  )
  const renderedBefore = await page.locator('.chatVirtualRow').count()
  const anchorBefore = await captureCenterMessage(page)

  expect(totalBefore).toBeGreaterThan(400)
  expect(renderedBefore).toBeLessThan(90)
  expect(anchorBefore).not.toBeNull()

  await page.getByTestId('prepend-older').click()
  await expect(page.getByTestId('metric-items')).toHaveText(
    String(totalBefore + 18),
  )

  await expect
    .poll(async () => {
      const anchorAfter = await readMessageTopById(page, anchorBefore?.id ?? '')

      if (
        !anchorAfter.exists ||
        anchorAfter.top === null ||
        anchorBefore === null
      ) {
        return Number.POSITIVE_INFINITY
      }

      return Math.abs(anchorAfter.top - anchorBefore.top)
    })
    .toBeLessThanOrEqual(120)
  expect(await page.locator('.chatVirtualRow').count()).toBeLessThan(90)
  expect((await readSnapshot(page)).pageScrollY).toBe(0)
})
