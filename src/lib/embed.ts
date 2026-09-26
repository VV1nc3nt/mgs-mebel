/** Hosts allowed in the news video block `embedUrl`: RuTube and VK Video only. */
export const EMBED_HOSTS = ['rutube.ru', 'vk.com', 'vkvideo.ru'] as const

export const isAllowedEmbedUrl = (value: string): boolean => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && (EMBED_HOSTS as readonly string[]).includes(url.hostname)
  } catch {
    return false
  }
}
