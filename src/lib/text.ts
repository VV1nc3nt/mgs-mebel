/** Paragraphs of a CMS textarea: separated by a blank line; single line breaks stay spaces. */
export const paragraphs = (text: string | null | undefined): string[] =>
  (text ?? '')
    .split(/\r?\n\s*\r?\n/)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
