import type { User } from '@/payload-types'

export type Role = User['role']

export const roleOptions: { label: string; value: Role }[] = [
  { label: 'Разработчик', value: 'developer' },
  { label: 'Администратор', value: 'admin' },
  { label: 'Менеджер', value: 'manager' },
  { label: 'Контент-менеджер', value: 'content' },
]

type MaybeUser = { role?: Role | null } | null | undefined

export const hasRole = (user: MaybeUser, ...roles: Role[]): boolean =>
  Boolean(user?.role && roles.includes(user.role))
