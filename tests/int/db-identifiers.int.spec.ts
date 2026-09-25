import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

// Postgres silently truncates identifiers longer than 63 bytes, which can make names collide.
describe('migration identifiers', () => {
  it('are shorter than 63 bytes', () => {
    const dir = path.resolve(process.cwd(), 'src/migrations')
    const long = fs
      .readdirSync(dir)
      .filter((file) => file.endsWith('.ts') && file !== 'index.ts')
      .flatMap((file) => fs.readFileSync(path.join(dir, file), 'utf8').match(/"[^"\s]+"/g) ?? [])
      .map((quoted) => quoted.slice(1, -1))
      .filter((name) => Buffer.byteLength(name) >= 63)
    expect(long).toEqual([])
  })
})
