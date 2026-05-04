import { expect, type Page, test } from '@playwright/test'

const PLAYGROUND_BASE = 'http://127.0.0.1:5177'

const exampleRoutes = [
  '/examples/standard',
  '/examples/insets',
  '/examples/long-response',
  '/examples/jump-to-bottom',
  '/examples/mobile',
  '/examples/prepend',
  '/examples/data-loading',
  '/examples/fullscreen',
]

async function captureCenterExampleMessage(page: Page) {
  return page.evaluate(() => {
    const viewport = document.querySelector<HTMLElement>('.exampleViewport')
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
            score: Math.abs(rect.top + rect.height / 2 - center),
            top: Math.round(rect.top),
          }
        })
        .filter(({ id }) => id.length > 0)
        .sort((a, b) => a.score - b.score)[0] ?? null

    return candidate
  })
}

async function readExampleMessageTop(page: Page, id: string) {
  return page.evaluate((messageId) => {
    const message = document.querySelector<HTMLElement>(
      `[data-message-id="${messageId}"]`,
    )
    const rect = message?.getBoundingClientRect()

    return {
      exists: Boolean(message),
      top: rect ? Math.round(rect.top) : null,
    }
  }, id)
}

for (const route of exampleRoutes) {
  test(`${route} composer commits on Enter`, async ({ page }, testInfo) => {
    const text = `Enter commit ${testInfo.project.name} ${route
      .replaceAll('/', '-')
      .replace(/^-|-$/g, '')}`

    await page.goto(`${PLAYGROUND_BASE}${route}`)

    const composer = page.locator('textarea[aria-label="Message"]')

    await expect(composer).toBeVisible()
    await expect(composer).toBeEnabled()

    await composer.fill(text)
    await composer.press('Enter')

    await expect(composer).toHaveValue('')

    const submittedPrompt = page
      .locator('[data-message-role="user"]')
      .filter({ hasText: text })
      .last()
    const viewport = page.locator('.exampleViewport')

    await expect(submittedPrompt).toBeVisible()

    await expect
      .poll(
        async () => {
          const [promptBox, viewportBox] = await Promise.all([
            submittedPrompt.boundingBox(),
            viewport.boundingBox(),
          ])

          expect(promptBox).not.toBeNull()
          expect(viewportBox).not.toBeNull()

          return (promptBox?.y ?? 0) - (viewportBox?.y ?? 0)
        },
        { timeout: 2400 },
      )
      .toBeLessThan(190)
  })
}

test('/examples/prepend preserves the visible anchor when older rows load', async ({
  page,
}) => {
  await page.goto(`${PLAYGROUND_BASE}/examples/prepend`)

  const viewport = page.locator('.exampleViewport')

  await expect(viewport).toBeVisible()
  await expect(page.locator('.viewportSettled')).toBeVisible()
  await viewport.evaluate((element) => {
    element.scrollTop = Math.max(0, element.scrollTop - 900)
    element.dispatchEvent(new Event('scroll', { bubbles: true }))
  })

  const anchorBefore = await captureCenterExampleMessage(page)

  expect(anchorBefore).not.toBeNull()

  for (let count = 0; count < 3; count += 1) {
    await page.getByRole('button', { name: 'Prepend older messages' }).click()

    await expect
      .poll(async () => {
        const anchorAfter = await readExampleMessageTop(
          page,
          anchorBefore?.id ?? '',
        )

        if (!anchorAfter.exists || anchorAfter.top === null) {
          return Number.POSITIVE_INFINITY
        }

        return Math.abs(anchorAfter.top - (anchorBefore?.top ?? 0))
      })
      .toBeLessThanOrEqual(4)
  }
})

test('/examples/jump-to-bottom reveals an explicit jump control', async ({
  page,
}) => {
  await page.goto(`${PLAYGROUND_BASE}/examples/jump-to-bottom`)

  await page.getByRole('button', { name: 'Read earlier' }).click()

  await expect(
    page.getByRole('button', { name: 'Jump to bottom' }),
  ).toBeVisible()
})

test('/examples/long-response streams the long assistant row', async ({
  page,
}) => {
  await page.goto(`${PLAYGROUND_BASE}/examples/long-response`)

  await page.getByRole('button', { name: 'Append long response' }).click()

  await expect(
    page.locator('[data-message-role="assistant"]').last(),
  ).toContainText('The final result is mundane', { timeout: 5000 })
})

test('/examples/data-loading shows a loading state for older data', async ({
  page,
}) => {
  await page.goto(`${PLAYGROUND_BASE}/examples/data-loading`)

  await page.getByRole('button', { name: 'Scroll backward' }).click()
  await expect(page.getByText('Loading older messages')).toBeVisible()
  await expect(page.getByText('Loading older messages')).toBeHidden({
    timeout: 3000,
  })
})
