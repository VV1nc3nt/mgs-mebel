import fs from 'fs/promises'
import path from 'path'

import type { SeedFile } from './manifest'
import { placeholderPdf } from './pdf'

export const cacheDir = () => path.resolve(process.env.SEED_CACHE_DIR || '.seed-cache')

/** Offline mode (staging): files come only from the cache, nothing is downloaded or written. */
export const isOffline = () => process.env.SEED_OFFLINE === 'true'

const DOWNLOAD_TIMEOUT_MS = 60_000

const exists = (file: string) =>
  fs.stat(file).then(
    (stat) => stat.size > 0,
    () => false,
  )

const download = async (url: string, target: string) => {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const part = `${target}.part`
      await fs.writeFile(part, Buffer.from(await response.arrayBuffer()))
      await fs.rename(part, target)
      return
    } catch (error) {
      if (attempt >= 3) throw new Error(`Не удалось скачать ${url}: ${(error as Error).message}`)
    }
  }
}

/** Files from the list that are absent from the cache (or empty). */
export const missingFiles = async (files: SeedFile[], dir = cacheDir()): Promise<SeedFile[]> => {
  const present = await Promise.all(files.map((file) => exists(path.join(dir, file.filename))))
  return files.filter((_, index) => !present[index])
}

export const missingFilesMessage = (missing: SeedFile[], dir = cacheDir()) =>
  [
    `В кэше ${dir} не хватает ${missing.length} файлов:`,
    ...missing.map((file) => `  ${file.key.padEnd(5)} ${file.filename}`),
    'Заполните кэш: pnpm seed:fetch (или deploy/seed-upload.sh для staging, см. docs/deploy.md).',
  ].join('\n')

/** Local copy of a seed file: downloaded (or generated) once, then taken from the cache. */
export const ensureCached = async (
  file: SeedFile,
  log: (line: string) => void,
): Promise<string> => {
  const dir = cacheDir()
  const target = path.join(dir, file.filename)
  if (await exists(target)) return target
  if (isOffline()) throw new Error(missingFilesMessage([file], dir))
  await fs.mkdir(dir, { recursive: true })
  if (file.pdfTitle) {
    await fs.writeFile(target, placeholderPdf(file.pdfTitle))
  } else {
    log(`  скачиваю ${file.key}: ${file.url}`)
    await download(file.url, target)
  }
  return target
}
