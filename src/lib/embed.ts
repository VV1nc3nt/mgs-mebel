/** Hosts allowed in the news video block `embedUrl`. */
export const EMBED_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'rutube.ru',
  'vk.com',
  'vkvideo.ru',
] as const

export const isAllowedEmbedUrl = (value: string): boolean => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && (EMBED_HOSTS as readonly string[]).includes(url.hostname)
  } catch {
    return false
  }
}
