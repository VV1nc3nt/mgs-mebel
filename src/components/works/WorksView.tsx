'use client'

import type { ReactNode } from 'react'

import { ProjectViewerContext, useViewerState } from '@/hooks/useProjectViewer'
import { cn } from '@/lib/cn'
import type { ViewerProject } from '@/lib/viewer'
import type { FeedWork, WorksCounts, WorksFeedFilter } from '@/lib/works'
import { ProjectViewer, type ViewerCta } from './ProjectViewer'
import { WorksFeedProvider } from './WorksFeedProvider'

type Props = {
  /** Pages of the feed rendered on the server. */
  initial: { filter: WorksFeedFilter; items: FeedWork[]; hasMore: boolean; page?: number }
  counts: WorksCounts
  /** Open on the server: a direct visit to /works/<slug>. */
  project?: ViewerProject | null
  /** <title> of /works, restored after closing the server's viewer. */
  listTitle: string
  /** Origin of the site (`siteUrl()`): the shared links are absolute. */
  origin: string
  /** «Хочу такой же проект» of the viewer. */
  cta: ViewerCta
  /** Right after the viewer: the first-screen marker of the project page. */
  afterViewer?: ReactNode
  /** Heading and feed: inert while the viewer covers them. */
  children: ReactNode
}

/**
 * «Наши работы» with the project viewer: the feed state (WorksFeedProvider) and the viewer's open
 * state around the viewer, then the list. The viewer comes first in <main>: on a project page it
 * is the first screen.
 */
export function WorksView({
  initial,
  counts,
  project = null,
  listTitle,
  origin,
  cta,
  afterViewer,
  children,
}: Props) {
  const viewer = useViewerState(project?.slug ?? null)
  return (
    <WorksFeedProvider initial={initial}>
      <ProjectViewerContext value={viewer}>
        <ProjectViewer
          counts={counts}
          initialProject={project}
          listTitle={listTitle}
          origin={origin}
          cta={cta}
        />
        {afterViewer}
        {/* Under the fully shown viewer the list is covered (the backdrop is opaque): hidden too,
            so its cards, parsed after the viewer on a slow connection, never count as layout
            shifts. Opened on the server — hidden from the first paint; opened from the feed —
            once its appearing has ended (no flash under the fading backdrop); visible again
            from the first frame of closing (`leave`). */}
        <div
          className={cn('contents', viewer.slug !== null && viewer.phase === 'open' && 'invisible')}
          inert={viewer.slug !== null}
        >
          {children}
        </div>
      </ProjectViewerContext>
    </WorksFeedProvider>
  )
}
