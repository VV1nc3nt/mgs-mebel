'use client'

import type { ReactNode } from 'react'

import { ProjectViewerContext, useViewerState } from '@/hooks/useProjectViewer'
import type { ViewerProject } from '@/lib/viewer'
import type { FeedWork, WorksCounts, WorksFeedFilter } from '@/lib/works'
import { ProjectViewer } from './ProjectViewer'
import { WorksFeedProvider } from './WorksFeedProvider'

type Props = {
  /** Pages of the feed rendered on the server. */
  initial: { filter: WorksFeedFilter; items: FeedWork[]; hasMore: boolean; page?: number }
  counts: WorksCounts
  /** Open on the server: a direct visit to /works/<slug>. */
  project?: ViewerProject | null
  /** <title> of /works, restored after closing the server's viewer. */
  listTitle: string
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
  afterViewer,
  children,
}: Props) {
  const viewer = useViewerState(project?.slug ?? null)
  return (
    <WorksFeedProvider initial={initial}>
      <ProjectViewerContext value={viewer}>
        <ProjectViewer counts={counts} initialProject={project} listTitle={listTitle} />
        {afterViewer}
        <div className="contents" inert={viewer.slug !== null}>
          {children}
        </div>
      </ProjectViewerContext>
    </WorksFeedProvider>
  )
}
