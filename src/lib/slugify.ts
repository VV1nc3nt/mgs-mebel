const MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
}

/** URL slug with Cyrillic transliteration: «Выставка ARTDOM 2026» → `vystavka-artdom-2026`. */
export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .split('')
    .map((ch) => MAP[ch] ?? ch)
    .join('')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/** Longest slug accepted (a sane URL; titles of any reasonable length fit). */
export const SLUG_MAX = 1000

/** A slug as `slugify` makes it: lowercase latin, digits, single dashes inside. */
export const isSlug = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= SLUG_MAX && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
