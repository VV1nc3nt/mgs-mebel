import { plural } from './plural'

const KB = 1024
const MB = KB * KB

/** File size for people: whole megabytes from 1 MB («24 МБ»), whole kilobytes below («312 КБ»). */
export const formatFileSize = (bytes: number): string => {
  const kb = Math.max(1, Math.round(bytes / KB))
  // 1023.6 KB rounds to 1024: that is already «1 МБ»
  return kb >= KB ? `${Math.round(bytes / MB)} МБ` : `${kb} КБ`
}

/** Catalog card meta: «48 страниц · PDF, 24 МБ»; without pages — «PDF, 24 МБ». */
export const catalogMeta = (
  pages: number | null | undefined,
  filesize: number | null | undefined,
): string => {
  const file = filesize ? `PDF, ${formatFileSize(filesize)}` : 'PDF'
  return pages ? `${pages} ${plural(pages, ['страница', 'страницы', 'страниц'])} · ${file}` : file
}

/** Result counter of the catalog filter: «8 каталогов». */
export const catalogCount = (n: number): string =>
  `${n} ${plural(n, ['каталог', 'каталога', 'каталогов'])}`
