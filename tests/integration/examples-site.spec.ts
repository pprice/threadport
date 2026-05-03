import { expect, test } from '@playwright/test'

const exampleRoutes = [
  '/examples/standard/',
  '/examples/insets/',
  '/examples/long-response/',
  '/examples/jump-to-bottom/',
  '/examples/mobile/',
  '/examples/prepend/',
  '/examples/data-loading/',
]

for (const route of exampleRoutes) {
  test(`${route} composer commits on Enter`, async ({ page }, testInfo) => {
    const text = `Enter commit ${testInfo.project.name} ${route
      .replaceAll('/', '-')
      .replace(/^-|-$/g, '')}`

    await page.goto(route)

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

test('/examples/jump-to-bottom/ reveals an explicit jump control', async ({
  page,
}) => {
  await page.goto('/examples/jump-to-bottom/')

  await page.getByRole('button', { name: 'Read earlier' }).click()

  await expect(
    page.getByRole('button', { name: 'Jump to bottom' }),
  ).toBeVisible()
})

test('/examples/long-response/ streams the long assistant row', async ({
  page,
}) => {
  await page.goto('/examples/long-response/')

  await page.getByRole('button', { name: 'Append long response' }).click()

  await expect(
    page.locator('[data-message-role="assistant"]').last(),
  ).toContainText('The final result is mundane', { timeout: 5000 })
})

test('/examples/data-loading/ shows a loading state for older data', async ({
  page,
}) => {
  await page.goto('/examples/data-loading/')

  await page.getByRole('button', { name: 'Load older page' }).click()
  await expect(page.getByText('Loading older messages')).toBeVisible()
  await expect(page.getByText('Loading older messages')).toBeHidden({
    timeout: 3000,
  })
})
