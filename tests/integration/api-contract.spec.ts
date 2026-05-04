import { expect, type Locator, type Page, test } from '@playwright/test'

type ApiSnapshot = {
  distanceFromHead: number
  distanceFromTail: number
  isAtTail: boolean
  pageScrollY: number
  renderedRows: number
  scrollTop: number
  totalRows: number
  viewportHeight: number
}

type ItemGeometry = {
  exists: boolean
  offsetFromViewportHead: number | null
  top: number | null
}

type TailReserveGeometry = {
  contentHeight: number
  exists: boolean
  minHeight: number
  reserveHeight: number
}

async function gotoApiHarness(page: Page) {
  await page.goto('http://127.0.0.1:5175/fixtures/?fixture=api')
  await expect(page.locator('.apiViewport')).toBeVisible()
  await expect(page.getByTestId('api-rendered')).not.toHaveText('pending')
  await expect.poll(() => page.locator('.apiRow').count()).toBeGreaterThan(0)
}

async function readApiSnapshot(page: Page): Promise<ApiSnapshot> {
  return page.evaluate(() => {
    const viewport = document.querySelector<HTMLElement>('.apiViewport')
    const distanceFromHead = Number(
      document.querySelector('[data-testid="api-distance-head"]')?.textContent,
    )
    const distanceFromTail = Number(
      document.querySelector('[data-testid="api-distance-tail"]')?.textContent,
    )
    const isAtTail =
      document.querySelector('[data-testid="api-is-tail"]')?.textContent ===
      'true'

    return {
      distanceFromHead,
      distanceFromTail,
      isAtTail,
      pageScrollY: Math.round(window.scrollY),
      renderedRows: document.querySelectorAll('.apiRow').length,
      scrollTop: Math.round(viewport?.scrollTop ?? 0),
      totalRows: document.querySelectorAll('[data-harness-item]').length,
      viewportHeight: Math.round(viewport?.clientHeight ?? 0),
    }
  })
}

async function readItemGeometry(page: Page, id: string): Promise<ItemGeometry> {
  return page.evaluate((itemId) => {
    const viewport = document.querySelector<HTMLElement>('.apiViewport')
    const item = document.querySelector<HTMLElement>(
      `[data-harness-item="${itemId}"]`,
    )
    const viewportRect = viewport?.getBoundingClientRect()
    const itemRect = item?.getBoundingClientRect()

    return {
      exists: Boolean(item),
      offsetFromViewportHead:
        viewportRect && itemRect
          ? Math.round(itemRect.top - viewportRect.top)
          : null,
      top: itemRect ? Math.round(itemRect.top) : null,
    }
  }, id)
}

async function readTailReserveGeometry(
  page: Page,
): Promise<TailReserveGeometry> {
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

    const minHeight = Number.parseFloat(
      window.getComputedStyle(reserve).minHeight,
    )

    return {
      contentHeight: Math.round(content.getBoundingClientRect().height),
      exists: true,
      minHeight: Number.isFinite(minHeight) ? Math.round(minHeight) : 0,
      reserveHeight: Math.round(reserve.getBoundingClientRect().height),
    }
  })
}

async function wheelAt(locator: Locator, page: Page, deltaY: number) {
  const box = await locator.boundingBox()

  if (!box) {
    throw new Error('Cannot wheel an element without a layout box')
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.wheel(0, deltaY)
}

async function waitForTail(page: Page) {
  await expect
    .poll(async () => (await readApiSnapshot(page)).distanceFromTail)
    .toBeLessThanOrEqual(1)
  await expect(page.getByTestId('api-is-tail')).toHaveText('true')
}

test('imperative scroll methods target head, index, item key, and tail', async ({
  page,
}) => {
  await gotoApiHarness(page)
  await waitForTail(page)

  await page.getByTestId('api-scroll-head').click()
  await expect
    .poll(async () => (await readApiSnapshot(page)).scrollTop)
    .toBeLessThanOrEqual(1)

  let item = await readItemGeometry(page, 'item-0')

  await expect
    .poll(async () => {
      item = await readItemGeometry(page, 'item-0')

      return item.offsetFromViewportHead ?? Number.POSITIVE_INFINITY
    })
    .toBeLessThanOrEqual(34)
  expect(item.offsetFromViewportHead ?? -1).toBeGreaterThanOrEqual(20)

  await page.getByTestId('api-scroll-index').click()
  await expect
    .poll(async () => {
      item = await readItemGeometry(page, 'item-20')

      return item.offsetFromViewportHead ?? Number.POSITIVE_INFINITY
    })
    .toBeLessThanOrEqual(38)
  expect(item.exists).toBe(true)
  expect(item.offsetFromViewportHead ?? -1).toBeGreaterThanOrEqual(18)

  await page.getByTestId('api-scroll-key').click()
  await expect
    .poll(async () => {
      item = await readItemGeometry(page, 'item-35')

      return item.offsetFromViewportHead ?? Number.POSITIVE_INFINITY
    })
    .toBeLessThanOrEqual(38)
  expect(item.exists).toBe(true)
  expect(item.offsetFromViewportHead ?? -1).toBeGreaterThanOrEqual(18)

  await page.getByTestId('api-scroll-tail').click()
  await waitForTail(page)

  const snapshot = await readApiSnapshot(page)

  expect(snapshot.pageScrollY).toBe(0)
  expect(snapshot.renderedRows).toBeLessThanOrEqual(20)
})

test('prop-only inset and threshold changes update state and geometry', async ({
  page,
}) => {
  await gotoApiHarness(page)

  await page.getByTestId('api-scroll-head').click()
  await expect
    .poll(async () => (await readApiSnapshot(page)).scrollTop)
    .toBeLessThanOrEqual(1)

  let compactHead = await readItemGeometry(page, 'item-0')

  await expect
    .poll(async () => {
      compactHead = await readItemGeometry(page, 'item-0')

      return compactHead.offsetFromViewportHead ?? -1
    })
    .toBeGreaterThanOrEqual(20)
  expect(
    compactHead.offsetFromViewportHead ?? Number.POSITIVE_INFINITY,
  ).toBeLessThanOrEqual(34)

  await page.getByTestId('api-toggle-insets').click()
  await expect(page.getByTestId('api-head-inset')).toHaveText('112')
  await expect
    .poll(async () => {
      const expandedHead = await readItemGeometry(page, 'item-0')

      return expandedHead.offsetFromViewportHead ?? -1
    })
    .toBeGreaterThanOrEqual(104)

  await page.getByTestId('api-scroll-tail').click()
  await waitForTail(page)
  await wheelAt(page.locator('.apiViewport'), page, -260)
  await expect
    .poll(async () => (await readApiSnapshot(page)).distanceFromTail)
    .toBeGreaterThan(80)
  await expect(page.getByTestId('api-is-tail')).toHaveText('false')

  await page.getByTestId('api-toggle-threshold').click()
  await expect(page.getByTestId('api-is-tail')).toHaveText('true')
})

test('overlay wheel forwarding is opt-in per overlay', async ({ page }) => {
  await gotoApiHarness(page)

  await page.getByTestId('api-scroll-head').click()
  await expect
    .poll(async () => (await readApiSnapshot(page)).scrollTop)
    .toBeLessThanOrEqual(1)

  await wheelAt(page.getByTestId('api-static-overlay'), page, 700)
  await page.waitForTimeout(120)
  expect((await readApiSnapshot(page)).scrollTop).toBeLessThanOrEqual(1)

  await wheelAt(page.getByTestId('api-forward-overlay'), page, 700)
  await expect
    .poll(async () => (await readApiSnapshot(page)).scrollTop)
    .toBeGreaterThan(100)
})

test('tail reserve is exposed as active min-height and burns down with growth', async ({
  page,
}) => {
  await gotoApiHarness(page)
  await waitForTail(page)

  await page.getByTestId('api-append-tail').click()
  await expect
    .poll(async () => {
      const reserve = await readTailReserveGeometry(page)

      return reserve.exists
    })
    .toBe(true)

  const reserved = await readTailReserveGeometry(page)

  expect(reserved.minHeight).toBeGreaterThan(120)
  expect(reserved.contentHeight).toBeLessThan(reserved.minHeight)
  expect(reserved.reserveHeight).toBeGreaterThanOrEqual(reserved.minHeight)

  await page.getByTestId('api-grow-tail').click()
  await expect
    .poll(async () => {
      const reserve = await readTailReserveGeometry(page)

      return reserve.contentHeight - reserve.minHeight
    })
    .toBeGreaterThan(120)

  const grown = await readTailReserveGeometry(page)

  expect(grown.reserveHeight).toBeGreaterThanOrEqual(grown.contentHeight)
})
