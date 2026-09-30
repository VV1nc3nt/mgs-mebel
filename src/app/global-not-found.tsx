import type { Metadata } from 'next'

import { AppShell } from '@/components/app/AppShell'
import { NOT_FOUND_TITLE, NotFoundContent } from '@/components/app/NotFoundContent'
import { NOT_FOUND_PATH } from '@/lib/routes'
import { manrope } from './(frontend)/fonts'
import './(frontend)/globals.css'

// Unmatched URLs outside /admin and /api. No layout wraps this page: the title is absolute.
export const metadata: Metadata = {
  title: { absolute: `${NOT_FOUND_TITLE} — MGS MEBEL` },
  robots: { index: false, follow: false },
}

export default function GlobalNotFound() {
  return (
    <html lang="ru" className={manrope.variable}>
      <body>
        <AppShell routePath={NOT_FOUND_PATH}>
          <NotFoundContent />
        </AppShell>
      </body>
    </html>
  )
}
