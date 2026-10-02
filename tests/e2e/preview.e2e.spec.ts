import { expect, test, type Page } from '@playwright/test'

import { e2eEditor } from '../helpers/e2eEditor'

const BASE = 'http://localhost:3000'
const EMPTY_DB = !!process.env.E2E_EMPTY_DB
const DRAFT_COOKIE = '__prerender_bypass'

const draftCookie = async (page: Page) =>
  (await page.context().cookies()).find((c) => c.name === DRAFT_COOKIE)

const jsonLd = async (page: Page) =>
  page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((nodes) => nodes.map((n) => JSON.parse(n.textContent ?? '{}')))

test.describe('draft mode', () => {
  test.skip(EMPTY_DB, 'needs the editor from tests/helpers/seedChrome.ts')

  test('anonymous: 401, no draft mode cookie', async ({ page }) => {
    const response = await page.request.get(`${BASE}/preview?path=/`, { maxRedirects: 0 })
    expect(response.status()).toBe(401)
    expect(response.headers()['set-cookie'] ?? '').not.toContain(DRAFT_COOKIE)
  })

  test('editor: enables draft mode, shows the banner, «Выйти» leaves it', async ({ page }) => {
    const login = await page.request.post(`${BASE}/api/users/login`, {
      data: { email: e2eEditor.email, password: e2eEditor.password },
    })
    expect(login.ok()).toBe(true)

    await page.goto(`${BASE}/preview?path=/`)
    await expect(page).toHaveURL(`${BASE}/`)
    expect(await draftCookie(page)).toBeTruthy()
    const banner = page.getByRole('status').filter({ hasText: 'Предпросмотр черновика' })
    await expect(banner).toBeVisible()

    await banner.getByRole('button', { name: 'Выйти' }).click()
    await expect(page).toHaveURL(`${BASE}/`)
    expect(await draftCookie(page)).toBeFalsy()
    await expect(page.getByText('Предпросмотр черновика')).toHaveCount(0)
  })

  for (const target of ['//evil.example', 'https://evil.example/', '/admin']) {
    test(`redirects only to own pages: ${target}`, async ({ page }) => {
      await page.request.post(`${BASE}/api/users/login`, {
        data: { email: e2eEditor.email, password: e2eEditor.password },
      })
      const response = await page.request.get(
        `${BASE}/preview?path=${encodeURIComponent(target)}`,
        { maxRedirects: 0 },
      )
      expect(response.status()).toBe(307)
      expect(response.headers().location).toBe('/')
      await page.request.get(`${BASE}/preview/exit?path=/`, { maxRedirects: 0 })
    })
  }
})

const expectOrganization = async (page: Page, telephone?: string) => {
  await page.goto(`${BASE}/`)
  const data = await jsonLd(page)
  expect(data).toHaveLength(1)
  expect(data[0]).toMatchObject({ '@type': 'Organization', name: 'MGS MEBEL' })
  if (telephone) expect(data[0].contactPoint).toMatchObject({ telephone })
  else expect(data[0]).not.toHaveProperty('contactPoint')

  await page.goto(`${BASE}/nesushchestvuet`)
  expect(await jsonLd(page)).toHaveLength(0)
}

test('JSON-LD Organization with contacts; none on the global 404', async ({ page }) => {
  test.skip(EMPTY_DB, 'needs tests/helpers/seedChrome.ts data')
  await expectOrganization(page, '8 800 100-16-58')
})

test('JSON-LD Organization without contacts on an empty database @empty', async ({ page }) => {
  test.skip(!EMPTY_DB, 'empty database only')
  await expectOrganization(page)
})
