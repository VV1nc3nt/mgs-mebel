import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { WorksPageBody } from '@/components/works/WorksPageBody'
import { getProjectBySlug, getProjectPosition } from '@/lib/queries'
import { buildMetadata } from '@/lib/seo'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getProjectBySlug((await params).slug)
  if (!data) notFound()
  const { project, meta } = data
  return buildMetadata({
    meta,
    fallback: {
      title: project.title,
      description: project.description,
      image: project.frames[0]?.image,
    },
    path: project.href,
  })
}

/**
 * Project page (README §6.4 «Просмотр проекта»): the project viewer open over the works feed
 * «все». The same page as /works with the viewer open from a card; closing it leaves /works.
 */
export default async function ProjectPage({ params }: Props) {
  // Before anything streams: an unknown project answers 404
  const data = await getProjectBySlug((await params).slug)
  if (!data) notFound()
  const position = await getProjectPosition(data.sort)
  return <WorksPageBody project={{ data: data.project, position }} />
}
