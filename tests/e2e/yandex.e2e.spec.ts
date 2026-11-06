import { test, expect, ACCEPTED, CONSENT_KEY } from '../helpers/test'
import { e2eEditor } from '../helpers/e2eEditor'
import { E2E_SALONS } from '../helpers/e2eHome'

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000'
const enabled = Boolean(process.env.NEXT_PUBLIC_YMAPS_KEY && process.env.NEXT_PUBLIC_METRIKA_ID)
const calls = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { __metrikaCalls?: unknown[][] }).__metrikaCalls ?? [])
const hits = async (page: import('@playwright/test').Page) =>
  (await calls(page)).filter((call) => call[1] === 'hit')

test.describe('Yandex integration', () => {
  test.skip(
    !enabled || Boolean(process.env.E2E_EMPTY_DB),
    'requires test build and isolated seeded database',
  )
  test.use({ consent: false })

  for (const width of [390, 834, 1440]) {
    test(`${width}: map selection, retained view/card and attribution`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 1000 })
      await page.goto(`${BASE}/salons`)
      const map = page.locator('[data-salon-map-slot]')
      await map.scrollIntoViewIfNeeded()
      await expect(map.locator('[data-sdk-ready]')).toBeVisible()
      expect(await hits(page)).toHaveLength(0)
      await page.getByRole('button', { name: 'Только необходимые', exact: true }).click()
      await expect(map.getByRole('link', { name: 'Открыть в Картах' })).toBeVisible()
      const selected = map.locator('.salon-map-pin').nth(2)
      await selected.click()
      await expect(map.getByRole('heading', { level: 3 })).toHaveText(E2E_SALONS[2])
      await expect(selected).toHaveAttribute('aria-pressed', 'true')
      await map.getByRole('button', { name: 'Скрыть карточку салона' }).click()
      await map.getByRole('button', { name: 'Показать салон', exact: true }).click()
      await expect(map.getByRole('heading', { level: 3 })).toHaveText(E2E_SALONS[2])
      await map.getByRole('button', { name: 'Списком', exact: true }).click()
      await expect(selected).toBeHidden()
      await page.getByRole('button', { name: E2E_SALONS[1], exact: true }).first().click()
      // Upper cards preserve the current list mode, as in the existing implementation.
      await expect(selected).toBeHidden()
      await map.getByRole('button', { name: 'Карта', exact: true }).click()
      await expect(map.getByRole('heading', { level: 3 })).toHaveText(E2E_SALONS[1])
      await expect(map.locator('[data-map-attribution]')).toBeVisible()
      const copyright = (await map.locator('[data-map-attribution]').boundingBox())!
      const card = (await map.locator('[data-salon-panel]').boundingBox())!
      expect(copyright.y + copyright.height).toBeLessThan(card.y)
      for (const name of ['Увеличить масштаб', 'Уменьшить масштаб']) {
        const control = (await map.getByRole('button', { name }).boundingBox())!
        expect(control.y + control.height <= card.y || control.x >= card.x + card.width).toBe(true)
      }
      await map.screenshot({ path: testInfo.outputPath(`map-${width}.png`) })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
    })
  }

  for (const width of [390, 834, 1440])
    test(`${width}: home pins select the card without analytics`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 1000 })
      await page.goto(BASE)
      const map = page.locator('[data-salon-map-slot]')
      await map.scrollIntoViewIfNeeded()
      await map.locator('.salon-map-pin').nth(1).click()
      await expect(map.getByRole('heading', { level: 3 })).toHaveText(E2E_SALONS[1])
      expect(await hits(page)).toHaveLength(0)
      await page.getByRole('button', { name: 'Только необходимые', exact: true }).click()
      await map.screenshot({ path: testInfo.outputPath(`home-map-${width}.png`) })
    })

  test('late consent, SPA and Back/Forward, filters, 404 and cross-tab revocation', async ({
    page,
    context,
  }) => {
    await page.goto(`${BASE}/about?utm_source=acceptance&photo=2`)
    await expect.poll(() => calls(page)).toEqual([])
    await page.evaluate(
      ({ key, consent }) => {
        localStorage.setItem(key, JSON.stringify(consent))
        window.dispatchEvent(new StorageEvent('storage', { key }))
      },
      { key: CONSENT_KEY, consent: ACCEPTED },
    )
    await expect.poll(async () => (await hits(page)).length).toBe(1)
    expect((await hits(page))[0][2]).toBe(`${BASE}/about?utm_source=acceptance`)
    expect((await hits(page))[0][3]).toMatchObject({ title: await page.title() })
    await page
      .locator('footer')
      .getByRole('link', { name: 'Фирменные салоны', exact: true })
      .click()
    await expect.poll(async () => (await hits(page)).length).toBe(2)
    await page.goBack()
    await expect.poll(async () => (await hits(page)).length).toBe(3)
    await page.goForward()
    await expect.poll(async () => (await hits(page)).length).toBe(4)
    await page.evaluate(() =>
      history.replaceState(null, '', '/salons?category=test&photo=2&reel=x'),
    )
    await page.waitForTimeout(100)
    expect(await hits(page)).toHaveLength(4)
    expect((await calls(page)).filter((call) => call[1] === 'init')).toHaveLength(1)
    const tab = await context.newPage()
    await tab.goto(`${BASE}/about`)
    await tab.evaluate((key) => localStorage.removeItem(key), CONSENT_KEY)
    await expect.poll(async () => (await calls(page)).at(-1)?.[1]).toBe('destruct')
    await tab.close()
    await page.goto(`${BASE}/news/does-not-exist-yandex-check`)
    await expect(page.getByRole('heading', { name: 'Страница не найдена' })).toBeVisible()
    expect(await calls(page)).toHaveLength(0)
  })

  test('API failure retains salon selection and external link', async ({ page, context }) => {
    await context.route('https://api-maps.yandex.ru/**', (route) => route.abort())
    await page.goto(`${BASE}/salons`)
    const map = page.locator('[data-salon-map-slot]')
    await map.scrollIntoViewIfNeeded()
    await expect(map.getByRole('status')).toHaveText('Карта недоступна.')
    await map.getByRole('button', { name: 'Списком', exact: true }).click()
    await map.getByRole('button', { name: E2E_SALONS[1], exact: true }).click()
    await expect(map.getByRole('heading', { level: 3 })).toHaveText(E2E_SALONS[1])
    await expect(map.getByRole('link', { name: 'Открыть в Картах' })).toBeVisible()
  })
  for (const choice of ['Отказаться', 'Только необходимые'])
    test(`${choice}: no analytics requests`, async ({ page }) => {
      const requests: string[] = []
      page.on('request', (request) => {
        if (new URL(request.url()).hostname === 'mc.yandex.ru') requests.push(request.url())
      })
      await page.goto(`${BASE}/about`)
      await page.getByRole('button', { name: choice, exact: true }).click()
      await page
        .locator('footer')
        .getByRole('link', { name: 'Фирменные салоны', exact: true })
        .click()
      await expect(page.locator('h1')).toHaveText('Приходите в гости')
      expect(requests).toEqual([])
    })

  test('a delayed tag records the current page, not a pre-consent visit', async ({
    page,
    context,
  }) => {
    let release!: () => void
    const waiting = new Promise<void>((resolve) => {
      release = resolve
    })
    await context.route('https://mc.yandex.ru/metrika/tag.js*', async (route) => {
      await waiting
      await route.fallback()
    })
    await page.goto(`${BASE}/about`)
    await page.getByRole('button', { name: 'Принять все', exact: true }).click()
    await page
      .locator('footer')
      .getByRole('link', { name: 'Фирменные салоны', exact: true })
      .click()
    await expect(page.locator('h1')).toHaveText('Приходите в гости')
    release()
    await expect.poll(async () => (await hits(page)).length).toBe(1)
    expect((await hits(page))[0][2]).toBe(`${BASE}/salons`)
  })

  test('preview, admin, service pages and 404 never load a counter', async ({ page }) => {
    await page.addInitScript(
      ({ key, consent }) => localStorage.setItem(key, JSON.stringify(consent)),
      { key: CONSENT_KEY, consent: ACCEPTED },
    )
    const requests: string[] = []
    page.on('request', (request) => {
      if (new URL(request.url()).hostname === 'mc.yandex.ru') requests.push(request.url())
    })
    for (const path of [
      '/admin/login',
      '/ui-kit',
      '/healthz',
      '/unknown-yandex-page',
      '/news/unknown-yandex-page',
    ])
      await page.goto(`${BASE}${path}`)
    const login = await page.request.post(`${BASE}/api/users/login`, {
      data: { email: e2eEditor.email, password: e2eEditor.password },
    })
    expect(login.ok()).toBe(true)
    await page.goto(`${BASE}/preview?path=/`)
    await expect(page.getByText('Предпросмотр черновика')).toBeVisible()
    await page.goto(`${BASE}/salons`)
    await expect(page.getByText('Предпросмотр черновика')).toBeVisible()
    expect(requests).toEqual([])
  })

  test('a blocked counter leaves navigation usable', async ({ page, context }) => {
    await context.route('https://mc.yandex.ru/**', (route) => route.abort())
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`${BASE}/about`)
    await page.getByRole('button', { name: 'Принять все', exact: true }).click()
    await page
      .locator('footer')
      .getByRole('link', { name: 'Фирменные салоны', exact: true })
      .click()
    await expect(page.locator('h1')).toHaveText('Приходите в гости')
    expect(errors).toEqual([])
  })
  test('repeat full visit records once; revoking in the banner reloads without a tag', async ({
    page,
  }) => {
    let scripts = 0
    page.on('request', (request) => {
      if (request.url().startsWith('https://mc.yandex.ru/metrika/tag.js')) scripts++
    })
    await page.goto(`${BASE}/about`)
    await page.getByRole('button', { name: 'Принять все', exact: true }).click()
    await expect.poll(async () => (await hits(page)).length).toBe(1)
    await page.reload()
    await expect.poll(async () => (await hits(page)).length).toBe(1)
    expect(scripts).toBe(2)
    await page
      .locator('footer')
      .getByRole('button', { name: 'Настройки cookies', exact: true })
      .click()
    await Promise.all([
      page.waitForEvent('load'),
      page.getByRole('button', { name: 'Только необходимые', exact: true }).click(),
    ])
    await expect(page.locator('h1')).toBeVisible()
    expect(scripts).toBe(2)
    expect(await calls(page)).toEqual([])
  })
})
