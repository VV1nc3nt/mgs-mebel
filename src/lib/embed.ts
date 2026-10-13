/**
 * Video links of the news video block and the «О нас» presentation: RuTube and VK Video only
 * (YouTube is unavailable in Russia). The editor pastes the link of the video page; the site turns
 * it into the address of the platform's player.
 */

const RUTUBE_HOSTS = ['rutube.ru', 'www.rutube.ru']
const VK_HOSTS = ['vk.com', 'vk.ru', 'vkvideo.ru'].flatMap((host) => [
  host,
  `www.${host}`,
  `m.${host}`,
])

/** Hosts allowed in a video `embedUrl`, https only. */
export const EMBED_HOSTS: readonly string[] = [...RUTUBE_HOSTS, ...VK_HOSTS]

const parse = (value: string): URL | null => {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' && EMBED_HOSTS.includes(url.hostname) ? url : null
  } catch {
    return null
  }
}

export const isAllowedEmbedUrl = (value: string): boolean => parse(value) !== null

export type EmbedHost = 'rutube' | 'vk'

/** Address of a platform's player for an iframe. */
export type Embed = { src: string; host: EmbedHost }

// RuTube video ids are 32 hex digits
const RUTUBE_PATH = /^\/(?:video\/private|video|shorts|play\/embed)\/([0-9a-f]{32})\/?$/i
// VK: owner id (negative for a community) and video id, as in video-22822305_456241864
const VK_VIDEO = /^(?:video|clip)(-?\d+)_(\d+)$/

/**
 * RuTube player (rutube.ru/play/embed/{id}/) for a video page, a short, a private video (its `p`
 * key is kept) or a player link pasted as is.
 */
const rutube = (url: URL): Embed | null => {
  const id = url.pathname.match(RUTUBE_PATH)?.[1]?.toLowerCase()
  if (!id) return null
  const key = url.searchParams.get('p')
  const src = `https://rutube.ru/play/embed/${id}/${key ? `?p=${encodeURIComponent(key)}` : ''}`
  return { src, host: 'rutube' }
}

/**
 * VK Video player (vk.ru/video_ext.php, VK developer docs) for a video or a clip page
 * (/video-1_2, /clip-1_2), a video opened over a feed (?z=video-1_2) or a player link; its `hash`
 * (the access key of a private or restricted video) is kept.
 */
const vk = (url: URL): Embed | null => {
  let oid: string | null = null
  let id: string | null = null
  if (url.pathname === '/video_ext.php') {
    oid = url.searchParams.get('oid')
    id = url.searchParams.get('id')
    if (!oid || !/^-?\d+$/.test(oid) || !id || !/^\d+$/.test(id)) return null
  } else {
    const match =
      url.pathname.slice(1).replace(/\/$/, '').match(VK_VIDEO) ??
      url.searchParams.get('z')?.split('/')[0].match(VK_VIDEO)
    if (!match) return null
    ;[, oid, id] = match
  }
  const params = new URLSearchParams({ oid, id })
  const hash = url.searchParams.get('hash')
  if (hash && /^[0-9a-z]+$/i.test(hash)) params.set('hash', hash)
  return { src: `https://vk.ru/video_ext.php?${params}`, host: 'vk' }
}

/**
 * The player address for a link to a RuTube or VK Video page; null for any other host, plain http
 * or a link that is not one video (a channel, a playlist) — then there is no link to play.
 */
export const toEmbed = (value: string | null | undefined): Embed | null => {
  const url = value ? parse(value) : null
  if (!url) return null
  return RUTUBE_HOSTS.includes(url.hostname) ? rutube(url) : vk(url)
}

/**
 * The player starts on its own (a click on ▶ opened it): RuTube `autoplay=true`, VK `autoplay=1`.
 * RuTube does not guarantee it; browsers may still require another click for a video with sound.
 */
export const withAutoplay = ({ src, host }: Embed): string => {
  const url = new URL(src)
  url.searchParams.set('autoplay', host === 'rutube' ? 'true' : '1')
  return url.toString()
}
