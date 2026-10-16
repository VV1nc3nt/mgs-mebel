import type { Page } from '@playwright/test'

export type Listener = { type: string; passive: boolean }

/**
 * The site's event listeners on `window` and `document`, as DevTools lists them (CDP
 * DOMDebugger). Only listeners from the site's scripts: Playwright's injected script adds its own
 * non-passive touch listeners on window once a locator is used.
 */
export async function pageListeners(page: Page): Promise<Record<'window' | 'document', Listener[]>> {
  const cdp = await page.context().newCDPSession(page)
  const urls = new Map<string, string>()
  cdp.on('Debugger.scriptParsed', ({ scriptId, url }) => urls.set(scriptId, url))
  try {
    // Reports every script parsed so far before it resolves
    await cdp.send('Debugger.enable')
    const of = async (expression: string) => {
      const { result } = await cdp.send('Runtime.evaluate', { expression })
      const { listeners } = await cdp.send('DOMDebugger.getEventListeners', {
        objectId: result.objectId!,
      })
      return listeners
        .filter((l) => urls.get(l.scriptId)?.includes('/_next/'))
        .map(({ type, passive }) => ({ type, passive }))
    }
    return { window: await of('window'), document: await of('document') }
  } finally {
    await cdp.detach()
  }
}

/** Input that blocks scrolling until the main thread answers. */
const SCROLL_INPUT = ['wheel', 'touchstart', 'touchmove']

/** Non-passive wheel / touchstart / touchmove listeners on `window` and `document`. */
export async function blockingScroll(page: Page): Promise<string[]> {
  const all = await pageListeners(page)
  return (['window', 'document'] as const).flatMap((target) =>
    all[target]
      .filter((l) => SCROLL_INPUT.includes(l.type) && !l.passive)
      .map((l) => `${target}:${l.type}`),
  )
}
