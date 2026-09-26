const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

/** Seed may only touch a database on this machine. */
export const isLocalDatabaseUrl = (value: string | undefined): boolean => {
  if (!value) return false
  try {
    return LOCAL_HOSTS.has(new URL(value).hostname)
  } catch {
    return false
  }
}

/**
 * Seed runs against a local database, or anywhere the server owner has set ENABLE_DEMO_SEED=true
 * (staging only; production never has the flag).
 */
export const isSeedAllowed = (env: Record<string, string | undefined>): boolean =>
  isLocalDatabaseUrl(env.DATABASE_URL) || env.ENABLE_DEMO_SEED === 'true'
