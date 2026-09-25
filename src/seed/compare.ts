/** Fields Payload fills in by itself: never a reason to update. */
const IGNORED = new Set(['id', 'createdAt', 'updatedAt', '_status', 'generateSlug', 'readingTime'])
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Keeps only the parts of `existing` that `desired` describes (array rows and blocks by position). */
const project = (existing: unknown, desired: unknown): unknown => {
  if (Array.isArray(desired)) {
    if (!Array.isArray(existing)) return existing
    return existing.map((row, index) => project(row, desired[index]))
  }
  if (isPlainObject(desired)) {
    if (!isPlainObject(existing)) return existing
    // A populated relation compared with an id.
    return Object.fromEntries(
      Object.keys(desired).map((key) => [key, project(existing[key], desired[key])]),
    )
  }
  if (isPlainObject(existing) && 'id' in existing && typeof desired === 'number') return existing.id
  return existing
}

/** Canonical form: no service keys, no empty values, sorted keys, ISO dates. */
const normalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalize)
  if (isPlainObject(value)) {
    const entries = Object.keys(value)
      .filter((key) => !IGNORED.has(key) && !key.startsWith('$'))
      .sort()
      .map((key) => [key, normalize(value[key])] as const)
      .filter(([, item]) => item !== undefined)
    return Object.fromEntries(entries)
  }
  if (value === null || value === undefined || value === '') return undefined
  if (typeof value === 'string' && ISO_DATE.test(value)) return new Date(value).toISOString()
  return value
}

/** True if saving `desired` over `existing` would change nothing. */
export const isSame = (existing: unknown, desired: unknown): boolean =>
  JSON.stringify(normalize(project(existing, desired))) === JSON.stringify(normalize(desired))
