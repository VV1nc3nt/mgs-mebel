import type { Metadata } from 'next'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return { title: slug }
}

export default async function NewsArticlePage({ params }: Props) {
  const { slug } = await params

  return (
    <article className="mx-auto max-w-page px-gutter py-section md:px-gutter-md xl:px-gutter-xl xl:py-section-xl">
      <h1 className="text-article-title md:text-article-title-md xl:text-article-title-xl">
        {slug}
      </h1>
    </article>
  )
}
