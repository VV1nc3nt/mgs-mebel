import type { Metadata } from 'next'
import React from 'react'

import { AppShell } from '@/components/app/AppShell'
import { manrope } from './fonts'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'MGS MEBEL',
    template: '%s — MGS MEBEL',
  },
  description: 'MGS MEBEL — мебельная фабрика',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={manrope.variable}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
