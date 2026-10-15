'use server'

import { getProjectBySlug } from '@/lib/queries'
import { isProjectSlug, type ViewerProject } from '@/lib/viewer'

/**
 * Frames and texts of a project for the viewer opened from the feed. The slug comes from the
 * client: anything but a well-formed slug of an existing project answers null before the cache.
 */
export async function loadProject(slug: unknown): Promise<ViewerProject | null> {
  if (!isProjectSlug(slug)) return null
  return (await getProjectBySlug(slug))?.project ?? null
}
