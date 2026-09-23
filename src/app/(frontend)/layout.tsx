import type { Metadata } from 'next'
import React from 'react'

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
        <main>{children}</main>
      </body>
    </html>
  )
}
