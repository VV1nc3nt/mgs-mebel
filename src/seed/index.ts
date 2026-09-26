import { ValidationError, type GlobalSlug, type Payload } from 'payload'

import { catalogPdfs, catalogs } from './data/catalogs'
import { globals } from './data/globals'
import { news } from './data/news'
import { projects } from './data/projects'
import { salons } from './data/salons'
import type { MediaId } from './data/types'
import { photos, videos, type SeedFile } from './manifest'
import { upsertMedia } from './media'
import { SeedStats } from './stats'
import { seedOptions, upsertDoc, upsertGlobal } from './upsert'

export type SeedOptions = {
  /** Delete the seed documents and files instead of creating them. */
  reset?: boolean
  log?: (line: string) => void
}

export const seedFiles: SeedFile[] = [...photos, ...videos, ...catalogPdfs]

/** Keys of seed documents, taken from the data itself (ids are irrelevant here). */
const seedKeys = () => {
  const noMedia: MediaId = () => 0
  return {
    projects: projects(noMedia).map((doc) => doc.slug),
    news: news(noMedia).map((doc) => doc.slug as string),
    catalogs: catalogs(noMedia).map((doc) => doc.title),
    salons: salons(noMedia).map((doc) => doc.name),
  }
}

/**
 * Demo content: stock media, salons, projects, news, catalogs and all page globals.
 * Idempotent: documents are matched by slug / name / title, files by file name,
 * and nothing is written when the stored data already matches.
 */
export const seed = async (
  payload: Payload,
  { reset = false, log = console.log }: SeedOptions = {},
) => {
  if (reset) return resetSeed(payload, log)

  const stats = new SeedStats()
  const ids = new Map<string, number>()
  log(`Медиа: ${seedFiles.length} файлов`)
  for (const file of seedFiles) ids.set(file.key, await upsertMedia(payload, stats, file, log))
  const id: MediaId = (key) => {
    const value = ids.get(key)
    if (value === undefined) throw new Error(`Seed: нет файла ${key} в манифесте`)
    return value
  }

  for (const doc of salons(id)) {
    await upsertDoc(payload, stats, 'salons', { name: { equals: doc.name } }, doc)
  }
  for (const doc of projects(id)) {
    await upsertDoc(payload, stats, 'projects', { slug: { equals: doc.slug } }, doc)
  }
  for (const doc of news(id)) {
    await upsertDoc(payload, stats, 'news', { slug: { equals: doc.slug } }, doc)
  }
  for (const doc of catalogs(id)) {
    await upsertDoc(payload, stats, 'catalogs', { title: { equals: doc.title } }, doc)
  }
  for (const [slug, data] of Object.entries(globals(id))) {
    await upsertGlobal(payload, stats, slug as GlobalSlug, data as Record<string, unknown>)
  }

  log(stats.table())
}

/**
 * Removes only what the seed created: documents by their keys, then files from the manifest.
 * Globals stay (the next seed overwrites them), so files they use are kept and listed.
 * Users and anything created by hand are never touched.
 */
const resetSeed = async (payload: Payload, log: (line: string) => void) => {
  const keys = seedKeys()
  const targets = [
    ['projects', 'slug', keys.projects],
    ['news', 'slug', keys.news],
    ['catalogs', 'title', keys.catalogs],
    ['salons', 'name', keys.salons],
  ] as const
  for (const [collection, field, values] of targets) {
    const { docs, errors } = await payload.delete({
      collection,
      where: { [field]: { in: values } },
      ...seedOptions,
    })
    log(`${collection.padEnd(9)} удалено ${docs.length}`)
    for (const error of errors) log(`  ! ${collection} ${error.id}: ${error.message}`)
  }

  const kept: string[] = []
  let deleted = 0
  for (const file of seedFiles) {
    const { docs } = await payload.find({
      collection: 'media',
      where: { filename: { equals: file.filename } },
      limit: 1,
      depth: 0,
      pagination: false,
      ...seedOptions,
    })
    if (!docs[0]) continue
    try {
      await payload.delete({ collection: 'media', id: docs[0].id, ...seedOptions })
      deleted++
    } catch (error) {
      if (!(error instanceof ValidationError)) throw error
      kept.push(`  ${file.filename}: ${error.data.errors.map((e) => e.message).join('; ')}`)
    }
  }
  log(`media     удалено ${deleted}, оставлено ${kept.length} (используются)`)
  for (const line of kept) log(line)
}
