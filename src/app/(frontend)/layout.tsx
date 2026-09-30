import type { Metadata } from 'next'
import React from 'react'

import { AppFooter } from '@/components/app/AppFooter'
import { AppHeader } from '@/components/app/AppHeader'
import { AppMenu } from '@/components/app/AppMenu'
import { FloatingDock } from '@/components/app/FloatingDock'
import { MenuProvider, PageRoot } from '@/components/app/MenuProvider'
import { SkipLink } from '@/components/app/SkipLink'
import { toChrome } from '@/lib/chrome'
import { getLayout, getSettings } from '@/lib/queries'
import { manrope } from './fonts'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'MGS MEBEL',
    template: '%s — MGS MEBEL',
  },
  description: 'MGS MEBEL — мебельная фабрика',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [layout, settings] = await Promise.all([getLayout(), getSettings()])
  const chrome = toChrome(layout, settings)

  return (
    <html lang="ru" className={manrope.variable}>
      <body>
        <MenuProvider>
          <PageRoot>
            <SkipLink />
            <div className="relative mx-auto max-w-page">
              <AppHeader chrome={chrome} />
              <main id="content" tabIndex={-1} className="focus-visible:outline-none">
                {children}
              </main>
              <AppFooter chrome={chrome} />
            </div>
            <FloatingDock askLabel={chrome.askLabel} action={chrome.contactAction} />
          </PageRoot>
          <AppMenu
            chrome={{
              nav: chrome.nav,
              phone: chrome.phone,
              messengers: chrome.messengers,
              menu: chrome.menu,
            }}
          />
        </MenuProvider>
      </body>
    </html>
  )
}
