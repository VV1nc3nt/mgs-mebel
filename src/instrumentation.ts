/**
 * Runs once when the server process starts, before any request. The data cache (`unstable_cache`,
 * `.next/cache/fetch-cache`) is kept on disk, but the marks of expired tags live only in memory:
 * after a restart an entry expired by a publication would be served again, with no end. So the
 * data cache lives no longer than the process. The optimized images cache is left alone.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NODE_ENV !== 'production') return
  const { rm } = await import('node:fs/promises')
  const path = await import('node:path')
  // The standalone server chdirs to its own folder, so the path is the same in the image and in CI.
  await rm(path.join(process.cwd(), '.next', 'cache', 'fetch-cache'), {
    recursive: true,
    force: true,
  })
}
