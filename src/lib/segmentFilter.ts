/** Filter value from the URL: an unknown or missing value is the fallback («все»). */
export const parseFilter = <T extends string>(
  raw: string | null | undefined,
  values: readonly T[],
  fallback: T,
): T => ((values as readonly string[]).includes(raw ?? '') ? (raw as T) : fallback)

/** Current URL with the filter: the fallback removes the parameter, the hash stays. */
export const filterUrl = (href: string, param: string, value: string, fallback: string): string => {
  const url = new URL(href)
  if (value === fallback) url.searchParams.delete(param)
  else url.searchParams.set(param, value)
  return `${url.pathname}${url.search}${url.hash}`
}
