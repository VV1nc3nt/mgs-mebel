/** `tel:` link from a phone as editors type it: «8 800 100-16-58» → `tel:88001001658`. */
export const telHref = (phone: string): string | undefined => {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return undefined
  return `tel:${phone.trim().startsWith('+') ? '+' : ''}${digits}`
}
