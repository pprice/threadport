import { expect, type Page, test } from '@playwright/test'

const SITE_BASE = 'http://127.0.0.1:5176'

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

async function openExampleDetails(page: Page) {
  const disclosure = page.locator('.exampleDisclosure')

  await expect(disclosure).toBeVisible()

  if (!(await disclosure.evaluate((node: HTMLDetailsElement) => node.open))) {
    await disclosure.locator('summary').click()
  }

  await expect
    .poll(() => disclosure.evaluate((node: HTMLDetailsElement) => node.open))
    .toBe(true)
}

async function readFullscreenLayout(page: Page) {
  return page.evaluate(() => {
    const layoutRect = document
      .querySelector<HTMLElement>(
        '.exampleLayout[data-example-id="fullscreen"]',
      )
      ?.getBoundingClientRect()
    const panel = document.querySelector<HTMLElement>('.examplePanel')
    const stageRect = document
      .querySelector<HTMLElement>('.demoStage')
      ?.getBoundingClientRect()
    const shellRect = document
      .querySelector<HTMLElement>('.fullscreenShell')
      ?.getBoundingClientRect()
    const viewportRect = document
      .querySelector<HTMLElement>('.exampleViewport')
      ?.getBoundingClientRect()
    const header = document.querySelector<HTMLElement>('.fullscreenHeader')
    const hamburgerRect = document
      .querySelector<HTMLElement>('.railHamburger')
      ?.getBoundingClientRect()
    const railRect = document
      .querySelector<HTMLElement>('.examplesRail')
      ?.getBoundingClientRect()

    return {
      hamburgerVisible: Boolean(
        hamburgerRect && hamburgerRect.width > 0 && hamburgerRect.height > 0,
      ),
      headerDisplay: header ? getComputedStyle(header).display : '',
      layoutHeight: layoutRect?.height ?? 0,
      panelDisplay: panel ? getComputedStyle(panel).display : '',
      railVisible: Boolean(
        railRect &&
          railRect.left >= -1 &&
          railRect.width > 0 &&
          railRect.height > 0,
      ),
      shellHeight: shellRect?.height ?? 0,
      shellTop: shellRect?.top ?? 0,
      stageHeight: stageRect?.height ?? 0,
      viewportBoxHeight: viewportRect?.height ?? 0,
      viewportTop: viewportRect?.top ?? 0,
      windowHeight: window.innerHeight,
    }
  })
}

for (const route of exampleRoutes) {
  test(`${route} composer commits on Enter`, async ({ page }, testInfo) => {
    const text = `Enter commit ${testInfo.project.name} ${route
      .replaceAll('/', '-')
      .replace(/^-|-$/g, '')}`

    await page.goto(`${SITE_BASE}${route}`)

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

test('home preview aligns the submitted prompt near the viewport head', async ({
  page,
}) => {
  await page.goto(SITE_BASE)

  const viewport = page.locator('.exampleViewport')
  const submittedPrompt = page
    .locator('[data-message-role="user"]')
    .filter({ hasText: 'Reserve space for the next answer.' })
    .last()

  await expect(viewport).toBeVisible()
  await expect(submittedPrompt).toBeVisible({ timeout: 3500 })

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

test('example details default to expanded on web dimensions', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await page.goto(`${SITE_BASE}/examples/standard`)

  await expect(page.locator('.exampleDisclosure')).toHaveJSProperty(
    'open',
    true,
  )
  await expect(page.locator('.noteList li').first()).toBeVisible()
  await expect(page.locator('.integrationPanel')).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${SITE_BASE}/examples/standard`)

  await expect(page.locator('.exampleDisclosure')).toHaveJSProperty(
    'open',
    false,
  )
  await expect(page.locator('.noteList li').first()).toBeHidden()
  await expect(page.locator('.integrationPanel')).toBeHidden()
})

test('fullscreen example fills the tablet viewport with rail navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 700 })
  await page.goto(`${SITE_BASE}/examples/fullscreen`)

  const fullscreen = await readFullscreenLayout(page)

  expect(fullscreen.panelDisplay).toBe('none')
  expect(fullscreen.headerDisplay).toBe('none')
  expect(fullscreen.railVisible).toBe(true)
  expect(fullscreen.hamburgerVisible).toBe(false)
  expect(
    Math.abs(fullscreen.layoutHeight - fullscreen.windowHeight),
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(fullscreen.stageHeight - fullscreen.windowHeight),
  ).toBeLessThanOrEqual(1)
  expect(Math.abs(fullscreen.shellTop)).toBeLessThanOrEqual(1)
  expect(Math.abs(fullscreen.viewportTop)).toBeLessThanOrEqual(1)
  expect(
    Math.abs(fullscreen.shellHeight - fullscreen.windowHeight),
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(fullscreen.viewportBoxHeight - fullscreen.windowHeight),
  ).toBeLessThanOrEqual(1)
})

test('mobile layout keeps header, example stage, and drawer controls separated', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })

  await page.goto(SITE_BASE)

  const header = await page.evaluate(() => {
    const headerRect = document
      .querySelector<HTMLElement>('.siteHeaderInner')
      ?.getBoundingClientRect()
    const brandRect = document
      .querySelector<HTMLElement>('.siteHeader .brand')
      ?.getBoundingClientRect()
    const actionsRect = document
      .querySelector<HTMLElement>('.headerActions')
      ?.getBoundingClientRect()

    return {
      actionsTop: actionsRect?.top ?? 0,
      brandTop: brandRect?.top ?? 0,
      height: headerRect?.height ?? 0,
    }
  })

  expect(header.height).toBeLessThanOrEqual(70)
  expect(Math.abs(header.brandTop - header.actionsTop)).toBeLessThanOrEqual(10)

  await page.goto(`${SITE_BASE}/examples/standard`)

  await expect(page.locator('.examplePanel .lede')).toBeVisible()
  await expect(page.locator('.noteList li')).toHaveCount(3)
  await expect(page.locator('.noteList li').first()).toBeHidden()
  await expect(page.locator('.integrationPanel')).toBeHidden()
  await expect
    .poll(() =>
      page
        .locator('.exampleDisclosure > summary')
        .evaluate((node) => node.getBoundingClientRect().height),
    )
    .toBeGreaterThanOrEqual(44)
  await openExampleDetails(page)
  await expect(page.locator('.noteList li').first()).toBeVisible()
  await expect(page.locator('.integrationPanel')).toBeVisible()

  const stackedLayout = await page.evaluate(() => {
    const buttonRect = document
      .querySelector<HTMLElement>('.railHamburger')
      ?.getBoundingClientRect()
    const titleRect = document
      .querySelector<HTMLElement>('.examplePanel h1')
      ?.getBoundingClientRect()
    const panelRect = document
      .querySelector<HTMLElement>('.examplePanel')
      ?.getBoundingClientRect()
    const stageRect = document
      .querySelector<HTMLElement>('.demoStage')
      ?.getBoundingClientRect()

    return {
      panelTop: panelRect?.top ?? 0,
      panelBottom: panelRect?.bottom ?? 0,
      hamburgerRight: buttonRect?.right ?? 0,
      stageTop: stageRect?.top ?? 0,
      titleLeft: titleRect?.left ?? 0,
    }
  })

  expect(stackedLayout.panelTop).toBeLessThanOrEqual(1)
  expect(stackedLayout.titleLeft).toBeGreaterThanOrEqual(
    stackedLayout.hamburgerRight + 8,
  )
  expect(stackedLayout.stageTop).toBeGreaterThanOrEqual(
    stackedLayout.panelBottom - 1,
  )

  await page.locator('.railHamburger').click()

  const drawer = await page.evaluate(() => {
    const buttonRect = document
      .querySelector<HTMLElement>('.railHamburger')
      ?.getBoundingClientRect()
    const brandRect = document
      .querySelector<HTMLElement>('.examplesRail .brand')
      ?.getBoundingClientRect()

    return {
      brandTop: brandRect?.top ?? 0,
      closeBottom: buttonRect?.bottom ?? 0,
    }
  })

  expect(drawer.brandTop).toBeGreaterThanOrEqual(drawer.closeBottom + 8)

  await page.goto(`${SITE_BASE}/examples/fullscreen`)

  const fullscreen = await readFullscreenLayout(page)

  expect(fullscreen.panelDisplay).toBe('none')
  expect(fullscreen.headerDisplay).toBe('none')
  expect(fullscreen.hamburgerVisible).toBe(true)
  expect(
    Math.abs(fullscreen.layoutHeight - fullscreen.windowHeight),
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(fullscreen.stageHeight - fullscreen.windowHeight),
  ).toBeLessThanOrEqual(1)
  expect(Math.abs(fullscreen.shellTop)).toBeLessThanOrEqual(1)
  expect(Math.abs(fullscreen.viewportTop)).toBeLessThanOrEqual(1)
  expect(
    Math.abs(fullscreen.shellHeight - fullscreen.windowHeight),
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(fullscreen.viewportBoxHeight - fullscreen.windowHeight),
  ).toBeLessThanOrEqual(1)
})

test('/examples/prepend preserves the visible anchor when older rows load', async ({
  page,
}) => {
  await page.goto(`${SITE_BASE}/examples/prepend`)

  const viewport = page.locator('.exampleViewport')

  await expect(viewport).toBeVisible()
  await expect(page.locator('.viewportSettled')).toBeVisible()
  await openExampleDetails(page)
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
  await page.goto(`${SITE_BASE}/examples/jump-to-bottom`)

  await openExampleDetails(page)
  await page.getByRole('button', { name: 'Read earlier' }).click()

  await expect(
    page.getByRole('button', { name: 'Jump to bottom' }),
  ).toBeVisible()
})

test('/examples/long-response streams the long assistant row', async ({
  page,
}) => {
  await page.goto(`${SITE_BASE}/examples/long-response`)

  await openExampleDetails(page)
  await page.getByRole('button', { name: 'Append long response' }).click()

  await expect(
    page.locator('[data-message-role="assistant"]').last(),
  ).toContainText('The final result is mundane', { timeout: 5000 })
})

test('/examples/data-loading shows a loading state for older data', async ({
  page,
}) => {
  await page.goto(`${SITE_BASE}/examples/data-loading`)

  await openExampleDetails(page)
  await page.getByRole('button', { name: 'Scroll backward' }).click()
  await expect(page.getByText('Loading older messages')).toBeVisible()
  await expect(page.getByText('Loading older messages')).toBeHidden({
    timeout: 3000,
  })
})
