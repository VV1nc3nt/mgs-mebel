/** Explicit page addresses: UI state is never a separate page view. */
const CAMPAIGN_PARAMS = new Set(['yclid', 'gclid', 'fbclid', 'ysclid', 'ymclid', 'from', 'source'])
const PUBLIC_PATH =
  /^\/(?:about|salons|catalogs|designers|privacy|cookies|offer|works(?:\/[^/]+)?|news(?:\/[^/]+)?)?$/

export function publicAnalyticsPath(path: string): boolean {
  return PUBLIC_PATH.test(path)
}

export function analyticsUrl(raw: string): string {
  const url = new URL(raw)
  url.hash = ''
  for (const name of [...url.searchParams.keys()]) {
    if (!name.startsWith('utm_') && !CAMPAIGN_PARAMS.has(name)) url.searchParams.delete(name)
  }
  url.searchParams.sort()
  return url.href
}

export function analyticsConfig(hostname: string): number | null {
  const raw = process.env.NEXT_PUBLIC_METRIKA_ID ?? ''
  const hosts = (process.env.NEXT_PUBLIC_METRIKA_ALLOWED_HOSTS ?? '')
    .split(',')
    .map((v) => v.trim())
  return /^\d+$/.test(raw) &&
    Number.isSafeInteger(Number(raw)) &&
    Number(raw) > 0 &&
    hosts.includes(hostname)
    ? Number(raw)
    : null
}

type Ym = (id: number, method: string, ...args: unknown[]) => void
declare global {
  interface Window {
    ym?: Ym
  }
}

type Page = { path: string; url: string }
let loading: Promise<void> | undefined
let current: Page | null = null
let previous: string | null = null
let counter: number | null = null
let revision = 0
let releaseTimer: ReturnType<typeof setTimeout> | undefined
let lease: object | null = null

/** No command queue: a slow/blocked script must not replay visited pages later. */
function load(id: number): Promise<void> {
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    const timeout = window.setTimeout(fail, 12000)
    function fail() {
      window.clearTimeout(timeout)
      script.onload = script.onerror = null
      script.remove()
      reject(new Error('Analytics unavailable'))
    }
    script.async = true
    script.src = `https://mc.yandex.ru/metrika/tag.js?id=${id}`
    script.onload = () => {
      window.clearTimeout(timeout)
      script.onload = script.onerror = null
      if (typeof window.ym === 'function') resolve()
      else fail()
    }
    script.onerror = fail
    // tag.js uses the standard ym bootstrap; init/hit are called only after it loads.
    window.ym ??= Object.assign(
      function (...args: unknown[]) {
        bootstrap.a.push(args)
      },
      { a: [] as unknown[][], l: Date.now() },
    )
    const bootstrap = window.ym as Ym & { a: unknown[][] }
    document.head.append(script)
  })
  return loading
}

export function stopMetrika() {
  revision++
  lease = null
  current = null
  previous = null
  if (counter !== null) {
    try {
      window.ym?.(counter, 'destruct')
    } catch {
      /* Blocked service must not affect the UI. */
    }
  }
  counter = null
}

/** Shared across page mounts. Deferred release lets a public SPA transition keep its counter. */
export function viewMetrika(id: number, path: string, permitted: () => boolean): () => void {
  clearTimeout(releaseTimer)
  const owner = {}
  lease = owner
  const page = { path, url: analyticsUrl(window.location.href) }
  current = page
  const token = ++revision
  void load(id)
    .then(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())))
    .then(
      () => {
        if (revision !== token || !permitted() || !current) return
        try {
          let referer = previous ?? ''
          if (!previous && document.referrer) {
            const ref = new URL(document.referrer)
            // Do not reconstruct same-site visits made before consent.
            if (ref.origin !== location.origin) referer = document.referrer
          }
          if (counter === null) {
            window.ym?.(id, 'init', {
              ssr: true,
              defer: true,
              clickmap: true,
              ecommerce: 'dataLayer',
              referrer: referer,
              url: current.url,
              accurateTrackBounce: true,
              trackLinks: true,
              webvisor: false,
              trackHash: false,
            })
            counter = id
          }
          if (previous === null || new URL(previous).pathname !== current.path) {
            window.ym?.(id, 'hit', current.url, { referer, title: document.title })
            previous = current.url
          }
        } catch {
          stopMetrika()
        }
      },
      () => {
        /* No retries or page-view backlog when blocked. */
      },
    )
  return () => {
    if (lease !== owner) return
    // A late loader cannot send this page after it has unmounted.
    revision++
    releaseTimer = setTimeout(() => {
      if (lease === owner) stopMetrika()
    }, 0)
  }
}
