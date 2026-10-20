import { ValidationError, type GlobalSlug, type Payload } from 'payload'

import { catalogs } from './data/catalogs'
import { globals } from './data/globals'
import { news } from './data/news'
import { RETIRED_FILES, RETIRED_SALONS, salons } from './data/salons'
import type { MediaId } from './data/types'
import { RETIRED_PROJECTS, itemPlan, itemWhere, workItems, workProjects } from './data/works'
import { seedFiles } from './files'
import { upsertMedia } from './media'
import { SeedStats } from './stats'
import { seedOptions, upsertDoc, upsertGlobal } from './upsert'

export type SeedOptions = {
  /** Delete the seed documents and files instead of creating them. */
  reset?: boolean
  log?: (line: string) => void
}

export { seedFiles }

/** Keys of seed documents, taken from the data itself (ids are irrelevant here). */
const seedKeys = () => {
  const noMedia: MediaId = () => 0
  return {
    projects: workProjects(noMedia).map((doc) => doc.slug as string),
    news: news(noMedia).map((doc) => doc.slug as string),
    catalogs: catalogs(noMedia).map((doc) => doc.title),
    salons: salons(noMedia).map((doc) => doc.name),
  }
}

/**
 * Demo content: stock media, salons, projects and their items, news, catalogs and all page globals.
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
  // Posters of the videos: the files exist now
  for (const file of seedFiles) {
    if (!file.poster) continue
    await upsertDoc(payload, stats, 'media', { id: { equals: id(file.key) } }, {
      poster: id(file.poster),
    } as never)
  }

  for (const doc of salons(id)) {
    await upsertDoc(payload, stats, 'salons', { name: { equals: doc.name } }, doc)
  }
  const projectIds = new Map<string, number>()
  for (const doc of workProjects(id)) {
    projectIds.set(
      doc.title,
      await upsertDoc(payload, stats, 'projects', { slug: { equals: doc.slug } }, doc),
    )
  }
  for (const doc of workItems(id, projectIds)) {
    await upsertDoc(payload, stats, 'items', itemWhere(doc), doc)
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
  // Last: the new data no longer references retired files.
  await removeRetired(payload, log)

  log(stats.table())
}

/**
 * Deletes what earlier seeds created and the current one no longer has: salons by name, stock
 * files by file name. A file still in use (e.g. picked by an editor) is kept and logged.
 */
const removeRetired = async (payload: Payload, log: (line: string) => void) => {
  const { docs: oldProjects } = await payload.delete({
    collection: 'projects',
    where: { slug: { in: RETIRED_PROJECTS } },
    ...seedOptions,
  })
  for (const doc of oldProjects) log(`Удалён проект прошлых seed: ${doc.title}`)

  const { docs } = await payload.delete({
    collection: 'salons',
    where: { name: { in: RETIRED_SALONS } },
    ...seedOptions,
  })
  for (const doc of docs) log(`Удалён салон прошлых seed: ${doc.name}`)

  for (const filename of RETIRED_FILES) {
    const { docs: files } = await payload.find({
      collection: 'media',
      where: { filename: { equals: filename } },
      limit: 1,
      depth: 0,
      pagination: false,
      ...seedOptions,
    })
    if (!files[0]) continue
    try {
      await payload.delete({ collection: 'media', id: files[0].id, ...seedOptions })
      log(`Удалён файл прошлых seed: ${filename}`)
    } catch (error) {
      if (!(error instanceof ValidationError)) throw error
      log(`Оставлен файл ${filename}: ${error.data.errors.map((e) => e.message).join('; ')}`)
    }
  }
}

/**
 * Removes only what the seed created: documents by their keys, then files from the manifest.
 * Globals stay (the next seed overwrites them), so files they use are kept and listed.
 * Users and anything created by hand are never touched.
 */
const resetSeed = async (payload: Payload, log: (line: string) => void) => {
  const keys = seedKeys()
  // Items first: a project with items cannot be deleted
  const { docs: seedProjects } = await payload.find({
    collection: 'projects',
    where: { slug: { in: keys.projects } },
    pagination: false,
    depth: 0,
    select: { title: true },
    ...seedOptions,
  })
  const projectIds = new Map(seedProjects.map((p) => [p.title, p.id]))
  let items = 0
  for (const { plan, project } of itemPlan) {
    const projectId = project ? projectIds.get(project) : null
    if (project && !projectId) continue
    const { docs } = await payload.delete({
      collection: 'items',
      where: itemWhere({ type: plan.type, title: plan.title, project: projectId ?? null }),
      ...seedOptions,
    })
    items += docs.length
  }
  log(`items     удалено ${items}`)
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
  // Videos before images: a poster in use by a video cannot be deleted
  for (const file of [...seedFiles].reverse()) {
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
