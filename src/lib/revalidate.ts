import { revalidateTag } from 'next/cache'
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeOperationHook,
  CollectionConfig,
  GlobalAfterChangeHook,
  GlobalBeforeOperationHook,
  GlobalConfig,
  PayloadRequest,
} from 'payload'

/** Globals of site pages (README §6): drafts with autosave, read through getPageGlobal. */
export const PAGE_GLOBALS = [
  'home',
  'about',
  'salonsPage',
  'worksPage',
  'catalogsPage',
  'designers',
  'newsPage',
] as const

/** Cache tags of the site data (lib/queries.ts). */
export const globalTag = (slug: string) => `global:${slug}`
export const collectionTag = (slug: string) => `collection:${slug}`
export const newsTag = (slug: string) => `news:${slug}`

/** Every tag of the site data. A `news:<slug>` entry also carries `collection:news`. */
export const ALL_TAGS: readonly string[] = [
  ...['layout', 'settings', 'stats', ...PAGE_GLOBALS].map(globalTag),
  ...['news', 'projects', 'salons', 'catalogs'].map(collectionTag),
]

type Decision = {
  operation: 'create' | 'update' | 'delete'
  /** Seed and other bulk writes ask for no revalidation (`req.context.disableRevalidate`). */
  disabled?: boolean
  /**
   * The write only saved a draft version (autosave, «Сохранить черновик», restore as a draft):
   * the main row that visitors read is untouched. Same rule as Payload's own `isSavingDraft`.
   */
  draftSave?: boolean
  /** `doc._status`; undefined without drafts. */
  status?: string | null
}

/**
 * Whether a write changed what visitors see. `previousDoc._status` is not used: it is the status
 * of the latest version, not of the published row (a draft saved after publishing, then
 * «Снять с публикации», has a draft previousDoc, yet visitors lose the page).
 */
export const shouldRevalidate = ({ operation, disabled, draftSave, status }: Decision): boolean => {
  if (disabled) return false
  if (operation === 'delete') return true
  if (status === undefined) return true
  return !draftSave
}

type Slugged = { slug?: string | null } | null | undefined

/** Tags of a news write: its page, and the old page when the slug changed. */
export const newsTags = (doc: Slugged, previousDoc?: Slugged): string[] => {
  const slugs = new Set([doc?.slug, previousDoc?.slug].filter((s): s is string => !!s))
  return [collectionTag('news'), ...[...slugs].map(newsTag)]
}

// revalidate() outside a Next request (`payload run`, seed, int tests, migrations).
const OUTSIDE_NEXT_CODE = 'E263'
const OUTSIDE_NEXT_MESSAGE = 'Invariant: static generation store missing'

const isOutsideNext = (error: unknown) => {
  const { __NEXT_ERROR_CODE: code, message } = (error ?? {}) as {
    __NEXT_ERROR_CODE?: string
    message?: unknown
  }
  return (
    code === OUTSIDE_NEXT_CODE ||
    (typeof message === 'string' && message.startsWith(OUTSIDE_NEXT_MESSAGE))
  )
}

/**
 * Expires the tags at once: the next request reads fresh data instead of being served the stale
 * entry (`{ expire: 0 }`; the recommended 'max' profile would serve it once more). Outside a Next
 * request there is no site cache in this process, so nothing is done; other errors are thrown.
 */
export const expireTags = (tags: readonly string[]): void => {
  for (const tag of tags) {
    try {
      revalidateTag(tag, { expire: 0 })
    } catch (error) {
      if (isOutsideNext(error)) return
      throw error
    }
  }
}

const WRITE_OPERATIONS = new Set(['create', 'update', 'restoreVersion'])

type DraftSaves = Record<string, boolean>

const draftSaves = (req: PayloadRequest): DraftSaves => (req.context.draftSave ??= {}) as DraftSaves

/**
 * Remembers whether this write only saves a draft: afterChange gets no `draft` argument.
 * Keyed by the collection or global, so another operation in the same request (nested, or the
 * next one of a seed) never reads this flag; every write of that slug sets it anew.
 */
const markDraftSave =
  (key: string) =>
  ({ args, operation, req }: { args?: unknown; operation: string; req: PayloadRequest }) => {
    if (!WRITE_OPERATIONS.has(operation)) return
    const { draft, data } = (args ?? {}) as { draft?: boolean; data?: { _status?: string } }
    draftSaves(req)[key] = Boolean(draft) && data?._status !== 'published'
  }

const disabled = (req: PayloadRequest) => Boolean(req.context.disableRevalidate)

/** Hooks of a global read by the site through one cache tag. */
export const revalidateGlobal = (slug: string): NonNullable<GlobalConfig['hooks']> => {
  const key = globalTag(slug)
  const beforeOperation: GlobalBeforeOperationHook = markDraftSave(key)
  const afterChange: GlobalAfterChangeHook = ({ doc, req }) => {
    const decision = {
      operation: 'update' as const,
      disabled: disabled(req),
      draftSave: draftSaves(req)[key],
      status: (doc as { _status?: string | null })._status,
    }
    if (shouldRevalidate(decision)) expireTags([key])
    return doc
  }
  return { beforeOperation: [beforeOperation], afterChange: [afterChange] }
}

type CollectionTags = (doc: Slugged, previousDoc?: Slugged) => readonly string[]

/** Hooks of a collection: `tagsOf` lists the tags a changed or deleted document touches. */
export const revalidateCollection = (
  slug: string,
  tagsOf: CollectionTags = () => [collectionTag(slug)],
  { onCreate = true }: { onCreate?: boolean } = {},
): NonNullable<CollectionConfig['hooks']> => {
  const key = collectionTag(slug)
  const beforeOperation: CollectionBeforeOperationHook = (args) => {
    markDraftSave(key)(args)
  }
  const afterChange: CollectionAfterChangeHook = ({ doc, previousDoc, operation, req }) => {
    if (operation === 'create' && !onCreate) return doc
    const decision = {
      operation,
      disabled: disabled(req),
      draftSave: draftSaves(req)[key],
      status: (doc as { _status?: string | null })._status,
    }
    if (shouldRevalidate(decision)) expireTags(tagsOf(doc, previousDoc))
    return doc
  }
  const afterDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
    if (shouldRevalidate({ operation: 'delete', disabled: disabled(req) })) {
      expireTags(tagsOf(doc))
    }
    return doc
  }
  return {
    beforeOperation: [beforeOperation],
    afterChange: [afterChange],
    afterDelete: [afterDelete],
  }
}
