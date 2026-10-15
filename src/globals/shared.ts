import type { GlobalConfig, Tab } from 'payload'

import { contentEditors, publishedOrLoggedIn } from '@/access'
import { revalidateGlobal } from '@/lib/revalidate'
import { siteUrl } from '@/lib/site'

// Live Preview iframe sizes: the three reference widths of the design (README §4).
export const PREVIEW_BREAKPOINTS = [
  { name: 'mobile', label: 'Телефон 390', width: 390, height: 844 },
  { name: 'tablet', label: 'Планшет 834', width: 834, height: 1194 },
  { name: 'desktop', label: 'Десктоп 1440', width: 1440, height: 900 },
]

/** Live Preview address of a site path: the /preview draft mode handler redirects to it. */
export const previewUrl = (path: string) =>
  `${siteUrl()}/preview?path=${encodeURIComponent(path)}`

type PageGlobalOptions = {
  group?: string
  /** Site path of the page: enables Live Preview (through the /preview draft mode handler). */
  previewPath?: string
}

/**
 * Page global: one named tab per page section, in page order (README §6).
 * Drafts with autosave: saving does not publish; the site reads only the published version,
 * anonymous API requests never get a draft (`publishedOrLoggedIn`).
 */
export const pageGlobal = (
  slug: string,
  label: string,
  tabs: Tab[],
  { group = 'Страницы', previewPath }: PageGlobalOptions = {},
): GlobalConfig => ({
  slug,
  label,
  admin: {
    group,
    livePreview: previewPath
      ? {
          url: () => previewUrl(previewPath),
          breakpoints: PREVIEW_BREAKPOINTS,
        }
      : undefined,
  },
  // Every autosave refreshes the preview page on the server: 2 s instead of the default 0.8 s.
  // Autosave keeps rewriting one version, so 50 covers many publications.
  versions: { drafts: { autosave: { interval: 2000 } }, max: 50 },
  access: { read: publishedOrLoggedIn, readVersions: contentEditors, update: contentEditors },
  // Publishing, unpublishing and restoring expire `global:<slug>`; autosaving a draft does not.
  hooks: revalidateGlobal(slug),
  fields: [{ type: 'tabs', tabs }],
})
