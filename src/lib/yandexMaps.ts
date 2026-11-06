import type * as Maps from '@yandex/ymaps3-types'

let loading: Promise<typeof Maps> | undefined

/** One script per document. A failed load stays failed until the next full visit. */
export function loadYandexMaps(key: string): Promise<typeof Maps> {
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    const timeout = window.setTimeout(() => fail(), 12000)
    const fail = () => {
      window.clearTimeout(timeout)
      script.onload = script.onerror = null
      script.remove()
      reject(new Error('Map unavailable'))
    }
    script.async = true
    script.src = `https://api-maps.yandex.ru/v3/?${new URLSearchParams({ apikey: key, lang: 'ru_RU' })}`
    script.onerror = fail
    script.onload = () => {
      if (typeof ymaps3 === 'undefined') return fail()
      ymaps3.ready.then(() => {
        window.clearTimeout(timeout)
        script.onload = script.onerror = null
        resolve(ymaps3)
      }, fail)
    }
    document.head.append(script)
  })
  return loading
}
