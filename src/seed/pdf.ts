import { slugify } from '@/lib/slugify'

const escape = (value: string) => value.replace(/[\\()]/g, (ch) => `\\${ch}`)

/** ASCII rendering of a Cyrillic title: the built-in PDF fonts have no Cyrillic glyphs. */
const asciiTitle = (title: string) => {
  const words = slugify(title).replace(/-/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** One-page placeholder catalog: valid PDF 1.4 with a correct xref table, no dependencies. */
export const placeholderPdf = (title: string): Buffer => {
  const lines = [
    { size: 36, y: 700, text: 'MGS MEBEL' },
    { size: 20, y: 650, text: asciiTitle(title) },
    { size: 12, y: 610, text: 'Demo catalog placeholder' },
  ]
  const stream = lines
    .map(({ size, y, text }) => `BT /F1 ${size} Tf 60 ${y} Td (${escape(text)}) Tj ET`)
    .join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let body = '%PDF-1.4\n'
  const offsets = objects.map((object, index) => {
    const offset = Buffer.byteLength(body, 'latin1')
    body += `${index + 1} 0 obj\n${object}\nendobj\n`
    return offset
  })
  const xref = Buffer.byteLength(body, 'latin1')
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  body += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(body, 'latin1')
}
