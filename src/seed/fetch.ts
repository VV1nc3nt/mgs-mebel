/**
 * pnpm seed:fetch — fill the seed cache from the manifest: download stock media and generate
 * placeholder PDFs. No database and no Payload; files already in the cache are skipped.
 */
import fs from 'fs/promises'
import path from 'path'

import { cacheDir, ensureCached, missingFiles } from './cache'
import { seedFiles } from './files'

const dir = cacheDir()
const missing = await missingFiles(seedFiles, dir)
console.log(`Кэш ${dir}: ${seedFiles.length} файлов, не хватает ${missing.length}`)

// Stop at the first file that fails all retries: when a stock site is unreachable (timeout / 403),
// trying the remaining files would only take hours.
let fetched = 0
let failure = ''
for (const file of missing) {
  try {
    await ensureCached(file, console.log)
    fetched++
  } catch (error) {
    failure = `${file.key} ${(error as Error).message}`
    break
  }
}

let bytes = 0
for (const file of seedFiles) {
  bytes += await fs.stat(path.join(dir, file.filename)).then(
    (stat) => stat.size,
    () => 0,
  )
}
console.log(
  `Получено ${fetched}, уже было ${seedFiles.length - missing.length}, ` +
    `размер кэша ${(bytes / 1024 / 1024).toFixed(1)} МБ`,
)

if (failure) {
  console.error(`Ошибка: ${failure}\nНе получено ${missing.length - fetched} файлов, кэш неполный.`)
  process.exit(1)
}
