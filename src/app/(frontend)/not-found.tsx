import type { Metadata } from 'next'

import { NOT_FOUND_TITLE, NotFoundContent } from '@/components/app/NotFoundContent'

export const metadata: Metadata = {
  title: NOT_FOUND_TITLE,
  robots: { index: false, follow: false },
}

/** notFound() inside a (frontend) page: rendered within the site layout. */
export default function NotFound() {
  return <NotFoundContent />
}
