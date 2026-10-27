import {
  test as base,
  expect,
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
} from '@playwright/test'

export * from '@playwright/test'

/*
 * Every e2e spec takes `test` from here, not from @playwright/test (a CI step checks it): the
 * cookie choice is already made, so the notice never covers what a spec looks at. On any origin —
 * also behind the slow HTML proxy of partial-paint. cookies.e2e turns it off: `consent: false`.
 */
export const CONSENT_KEY = 'mgs-cookie-consent'

/** The visitor accepted everything (README of the footer §2, version 1). */
export const ACCEPTED = {
  necessary: true,
  analytics: true,
  marketing: true,
  rejected: false,
  date: '2026-10-27T00:00:00.000Z',
  version: 1,
}

// A string, not a function: tsx would add helpers the page does not have (__name)
const CONSENT_SCRIPT = `try {
  if (!localStorage.getItem(${JSON.stringify(CONSENT_KEY)})) {
    localStorage.setItem(${JSON.stringify(CONSENT_KEY)}, ${JSON.stringify(JSON.stringify(ACCEPTED))})
  }
} catch (e) {}`

export const NOTICE = '[role="dialog"][aria-label="Cookies"]'

/** `browser.newContext()` with the cookie choice made. */
export async function newConsentContext(
  browser: Browser,
  options?: BrowserContextOptions,
): Promise<BrowserContext> {
  const context = await browser.newContext(options)
  await context.addInitScript(CONSENT_SCRIPT)
  return context
}

export const test = base.extend<{ consent: boolean; noticeCheck: void }>({
  consent: [true, { option: true }],
  context: async ({ context, consent }, provide) => {
    if (consent) await context.addInitScript(CONSENT_SCRIPT)
    await provide(context)
  },
  // One check for every spec: with the choice made the notice is never in the DOM
  noticeCheck: [
    async ({ context, consent }, provide) => {
      await provide()
      if (!consent) return
      for (const page of context.pages()) {
        if (page.isClosed()) continue
        const count = await page
          .locator(NOTICE)
          .count()
          .catch(() => 0)
        expect(count, `cookie notice on ${page.url()}`).toBe(0)
      }
    },
    { auto: true },
  ],
})
