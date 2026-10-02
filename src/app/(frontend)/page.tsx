import type { Metadata } from 'next'

import { PreviewRefresh } from '@/components/app/PreviewRefresh'
import { getPageGlobal } from '@/lib/queries'
import { buildMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const { hero, meta } = await getPageGlobal('home')
  return buildMetadata({
    meta,
    fallback: { title: hero?.title, description: hero?.text, image: hero?.poster },
    path: '/',
  })
}

// Placeholder until the home sections (step 6, PR A): only the H1 from the CMS.
export default async function HomePage() {
  const { hero } = await getPageGlobal('home')
  return (
    <section className="mx-auto max-w-page px-gutter py-section md:px-gutter-md xl:px-gutter-xl xl:py-section-xl">
      <h1 className="text-h1 md:text-h1-md xl:text-h1-xl">{hero?.title || 'MGS MEBEL'}</h1>
      <PreviewRefresh />
    </section>
  )
}
