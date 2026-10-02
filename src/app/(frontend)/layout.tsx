import type { Metadata } from 'next'
import React from 'react'

import { AppShell } from '@/components/app/AppShell'
import { JsonLd } from '@/components/seo/JsonLd'
import { organizationJsonLd } from '@/lib/jsonld'
import { getSettings } from '@/lib/queries'
import { siteUrl } from '@/lib/site'
import { manrope } from './fonts'
import './globals.css'

export const generateMetadata = (): Metadata => ({
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'MGS MEBEL',
    template: '%s — MGS MEBEL',
  },
  description: 'MGS MEBEL — мебельная фабрика',
})

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings()
  return (
    <html lang="ru" className={manrope.variable}>
      <body>
        <JsonLd data={organizationJsonLd(settings)} />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
