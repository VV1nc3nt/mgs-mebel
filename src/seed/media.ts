import { spawnSync } from 'child_process'
import type { Payload } from 'payload'

import { ensureCached } from './cache'
import type { SeedFile } from './manifest'
import type { SeedStats } from './stats'
import { seedOptions } from './upsert'

/** Background videos must be silent (README §7). Checked only when ffprobe is installed. */
const warnIfAudio = (file: SeedFile, filePath: string, log: (line: string) => void) => {
  if (!file.background) return
  const probe = spawnSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-select_streams',
      'a',
      '-show_entries',
      'stream=index',
      '-of',
      'csv=p=0',
      filePath,
    ],
    { encoding: 'utf8' },
  )
  if (probe.status === 0 && probe.stdout.trim()) {
    log(`  ! ${file.key}: у фонового видео есть аудиодорожка`)
  }
}

/** Upload once, matched by file name; only the alt text is kept in sync afterwards. */
export const upsertMedia = async (
  payload: Payload,
  stats: SeedStats,
  file: SeedFile,
  log: (line: string) => void,
): Promise<number> => {
  const { docs } = await payload.find({
    collection: 'media',
    where: { filename: { equals: file.filename } },
    limit: 1,
    depth: 0,
    pagination: false,
    ...seedOptions,
  })
  const existing = docs[0]
  if (existing) {
    if (file.alt && existing.alt !== file.alt) {
      await payload.update({
        collection: 'media',
        id: existing.id,
        data: { alt: file.alt },
        ...seedOptions,
      })
      stats.add('media', 'updated')
    } else {
      stats.add('media', 'skipped')
    }
    return existing.id
  }
  const filePath = await ensureCached(file, log)
  warnIfAudio(file, filePath, log)
  const doc = await payload.create({
    collection: 'media',
    data: file.alt ? { alt: file.alt } : {},
    filePath,
    ...seedOptions,
  })
  if (doc.filename !== file.filename) {
    log(
      `  ! ${file.key}: Payload сохранил файл как ${doc.filename} (на диске уже был ${file.filename})`,
    )
  }
  stats.add('media', 'created')
  return doc.id
}
