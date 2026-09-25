import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { enforceRoles } from '@/collections/Users'

const req = (totalDocs: number, user?: { id: number; role: string }) =>
  ({ payload: { count: async () => ({ totalDocs }) }, user }) as unknown as PayloadRequest

const run = (args: Partial<Parameters<typeof enforceRoles>[0]>) =>
  enforceRoles({
    collection: {} as never,
    context: {},
    data: {},
    operation: 'create',
    ...args,
  } as never)

describe('enforceRoles', () => {
  it('first user of an empty database becomes developer', async () => {
    await expect(run({ data: { role: 'content' }, req: req(0) })).resolves.toMatchObject({
      role: 'developer',
    })
  })

  it('keeps the requested role when users exist and nobody is logged in (seed, scripts)', async () => {
    await expect(run({ data: { role: 'manager' }, req: req(3) })).resolves.toMatchObject({
      role: 'manager',
    })
  })

  it('manager cannot assign roles', async () => {
    await expect(
      run({ data: { role: 'content' }, req: req(3, { id: 1, role: 'manager' }) }),
    ).rejects.toThrow()
  })
})
