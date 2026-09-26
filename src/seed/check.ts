/** pnpm seed:check — is the seed cache complete? No network, no database. Exit 1 lists what is missing. */
import { cacheDir, missingFiles, missingFilesMessage } from './cache'
import { seedFiles } from './files'

const dir = cacheDir()
const missing = await missingFiles(seedFiles, dir)
if (missing.length) {
  console.error(missingFilesMessage(missing, dir))
  process.exit(1)
}
console.log(`Кэш ${dir}: все ${seedFiles.length} файлов на месте`)
