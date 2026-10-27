import { Suspense, type ReactNode } from 'react'

import { CookieBanner } from '@/components/cookies/CookieBanner'
import { RoutePathProvider } from '@/hooks/useRoutePath'
import { toChrome } from '@/lib/chrome'
import { toCookieTexts, toFooter } from '@/lib/footer'
import { getLayout, getLegalLinks, getSalons, getSettings } from '@/lib/queries'
import { AppFooter } from './AppFooter'
import { AppHeader } from './AppHeader'
import { AppMenu } from './AppMenu'
import { FirstScreenEnd, HEADER_END_ID } from './FirstScreenEnd'
import { FloatingDock } from './FloatingDock'
import { MenuProvider, PageRoot } from './MenuProvider'
import { PreviewBanner } from './PreviewBanner'
import { RouteHistory } from './RouteHistory'
import { SkipLink } from './SkipLink'
import { ViewerInert } from './ViewerInert'

/**
 * Everything inside <body> around the page: skip link, header, <main>, footer, cookie notice,
 * dock and menu.
 * Shared by the (frontend) layout and the global 404, which renders without a layout.
 * `routePath` replaces the URL for the header and menu (see NOT_FOUND_PATH).
 */
export async function AppShell({
  children,
  routePath,
}: {
  children: ReactNode
  routePath?: string
}) {
  const [layout, settings, salons, legal] = await Promise.all([
    getLayout(),
    getSettings(),
    getSalons(),
    getLegalLinks(),
  ])
  const chrome = toChrome(layout, settings)
  const footer = toFooter({
    layout,
    settings,
    nav: chrome.nav,
    phone: chrome.phone,
    messengers: chrome.messengers,
    salons,
    legal,
  })
  const cookieTexts = toCookieTexts(layout, legal)

  return (
    <RoutePathProvider value={routePath ?? null}>
      <MenuProvider>
        <PageRoot>
          <ViewerInert>
            <SkipLink />
            <PreviewBanner />
          </ViewerInert>
          <div className="relative">
            <ViewerInert>
              <AppHeader chrome={chrome} />
            </ViewerInert>
            {/* No first frame with a half-parsed header (nav shifted, CTA missing) on any page */}
            <FirstScreenEnd id={HEADER_END_ID} />
            <main id="content" tabIndex={-1} className="focus-visible:outline-none">
              {children}
            </main>
            <ViewerInert>
              <AppFooter footer={footer} cookieSettings={Boolean(cookieTexts)} />
            </ViewerInert>
          </div>
          <ViewerInert>
            {/* Under the dock in the stacking order, inert under the menu and the viewer */}
            {cookieTexts && <CookieBanner texts={cookieTexts} />}
            <FloatingDock askLabel={chrome.askLabel} messengers={chrome.messengers} />
          </ViewerInert>
        </PageRoot>
        <AppMenu
          chrome={{
            nav: chrome.nav,
            phone: chrome.phone,
            messengers: chrome.messengers,
            menu: chrome.menu,
          }}
        />
        {/* The query is read on the client only: nothing of the page waits for it */}
        <Suspense fallback={null}>
          <RouteHistory />
        </Suspense>
      </MenuProvider>
    </RoutePathProvider>
  )
}
