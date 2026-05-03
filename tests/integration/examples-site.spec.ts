import { expect, test } from '@playwright/test'

const exampleRoutes = [
  '/examples/basic/',
  '/examples/streaming/',
  '/examples/tail-reserve/',
  '/examples/history/',
  '/examples/mobile/',
  '/examples/empty/',
  '/examples/controls/',
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
    await expect(page.getByText(text)).toBeVisible()
  })
}
