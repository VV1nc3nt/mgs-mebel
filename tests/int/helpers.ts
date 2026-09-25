import config from '@/payload.config'
import type { User } from '@/payload-types'
import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'

export const PREFIX = `int-${process.pid}-${Date.now()}`

let fileCounter = 0
/** Unique file name. Payload bumps trailing digits of duplicate names, so names end with a letter. */
const fileName = (ext: string) => `${PREFIX}-${++fileCounter}-file.${ext}`

export const getTestPayload = async (): Promise<Payload> => getPayload({ config: await config })

/** Creates one user per role. A placeholder user is created first so the «first user → developer» rule does not kick in. */
export const createRoleUsers = async (payload: Payload) => {
  const make = (role: User['role']) =>
    payload.create({
      collection: 'users',
      data: { email: `${PREFIX}-${role}@test.local`, password: 'test-password', role },
    })
  const developer = await make('developer')
  return {
    developer,
    admin: await make('admin'),
    manager: await make('manager'),
    content: await make('content'),
  }
}

export const pngFile = async (name = fileName('png')) => {
  const data = await sharp({
    create: { width: 4, height: 4, channels: 3, background: '#c9d730' },
  })
    .png()
    .toBuffer()
  return { data, mimetype: 'image/png', name, size: data.length }
}

/** Minimal MP4: `ftyp` + empty `free` box — passes type detection and box-structure checks. */
export const mp4File = (name = fileName('mp4')) => {
  const data = Buffer.from(
    '000000186674797069736f6d0000020069736f6d69736f32' + '0000000866726565',
    'hex',
  )
  return { data, mimetype: 'video/mp4', name, size: data.length }
}

export const createImage = async (payload: Payload, name?: string) =>
  payload.create({ collection: 'media', data: { alt: 'test' }, file: await pngFile(name) })

export const createVideo = async (payload: Payload, name?: string) =>
  payload.create({ collection: 'media', data: {}, file: mp4File(name) })

/** Deletes everything whose field starts with the test prefix. Fails loudly if something could not be deleted. */
export const cleanup = async (payload: Payload) => {
  const like = { like: PREFIX }
  const targets = [
    ['news', 'title'],
    ['projects', 'title'],
    ['salons', 'name'],
    ['catalogs', 'title'],
    ['media', 'filename'],
    ['users', 'email'],
  ] as const
  for (const [collection, field] of targets) {
    const { errors } = await payload.delete({ collection, where: { [field]: like } })
    if (errors.length) throw new Error(`cleanup ${collection}: ${JSON.stringify(errors)}`)
  }
}

/** Smallest structurally valid PDF (one empty page, correct xref offsets). */
export const pdfFile = (name = fileName('pdf')) => {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>',
  ]
  let body = '%PDF-1.4\n'
  const offsets = objects.map((object, index) => {
    const offset = body.length
    body += `${index + 1} 0 obj\n${object}\nendobj\n`
    return offset
  })
  const xref = body.length
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  body += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  const data = Buffer.from(body, 'latin1')
  return { data, mimetype: 'application/pdf', name, size: data.length }
}
