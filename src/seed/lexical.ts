/** Lexical rich text with a single paragraph, as the admin editor stores it. */
export const richParagraph = (text: string) => ({
  root: {
    type: 'root',
    format: '' as const,
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: [
      {
        type: 'paragraph',
        format: '' as const,
        indent: 0,
        version: 1,
        direction: 'ltr' as const,
        textFormat: 0,
        textStyle: '',
        children: [
          { type: 'text', text, format: 0, detail: 0, mode: 'normal', style: '', version: 1 },
        ],
      },
    ],
  },
})
