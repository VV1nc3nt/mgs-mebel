import { catalogPdfs } from './data/catalogs'
import { photos, videos, type SeedFile } from './manifest'

/** Every file the seed uploads, in upload order. No Payload imports: used by seed:fetch / seed:check. */
export const seedFiles: SeedFile[] = [...photos, ...videos, ...catalogPdfs]
