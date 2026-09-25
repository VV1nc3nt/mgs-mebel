import {
  ValidationError,
  type Access,
  type AccessResult,
  type CollectionBeforeChangeHook,
  type CollectionConfig,
} from 'payload'

import { hasRole, roleOptions } from '@/access'

const readUsers: Access = ({ req: { user } }): AccessResult => {
  if (!user) return false
  if (hasRole(user, 'developer')) return true
  if (hasRole(user, 'admin'))
    return { or: [{ role: { not_equals: 'developer' } }, { id: { equals: user.id } }] }
  return { id: { equals: user.id } }
}

const updateUsers: Access = ({ req: { user } }): AccessResult => {
  if (!user) return false
  if (hasRole(user, 'developer')) return true
  if (hasRole(user, 'admin')) return { role: { not_equals: 'developer' } }
  return { id: { equals: user.id } }
}

const deleteUsers: Access = ({ req: { user } }): AccessResult => {
  if (!user) return false
  if (hasRole(user, 'developer')) return { id: { not_equals: user.id } }
  if (hasRole(user, 'admin')) {
    return { and: [{ role: { not_equals: 'developer' } }, { id: { not_equals: user.id } }] }
  }
  return false
}

const roleError = (message: string) => new ValidationError({ errors: [{ path: 'role', message }] })

/**
 * Server-side role rules (the admin UI only hides options):
 * the first user of an empty database becomes developer; nobody changes their own role;
 * only developer grants developer; manager and content never set roles.
 */
export const enforceRoles: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation === 'create') {
    const { totalDocs } = await req.payload.count({
      collection: 'users',
      req,
      overrideAccess: true,
    })
    if (totalDocs === 0) return { ...data, role: 'developer' }
  }

  const { user } = req
  if (!user) return data

  const previousRole = operation === 'update' ? originalDoc?.role : undefined
  const nextRole = data.role ?? previousRole
  const roleChanged = operation === 'create' ? data.role !== undefined : nextRole !== previousRole

  if (!roleChanged) return data
  if (operation === 'update' && originalDoc?.id === user.id) {
    throw roleError('Нельзя изменить собственную роль')
  }
  if (!hasRole(user, 'developer', 'admin')) {
    throw roleError('Недостаточно прав для назначения роли')
  }
  if (nextRole === 'developer' && !hasRole(user, 'developer')) {
    throw roleError('Роль «Разработчик» может назначить только разработчик')
  }
  return data
}

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Пользователь', plural: 'Пользователи' },
  admin: {
    group: 'Настройки',
    useAsTitle: 'email',
    defaultColumns: ['email', 'role', 'updatedAt'],
  },
  auth: true,
  access: {
    admin: ({ req: { user } }) => hasRole(user, 'developer', 'admin', 'manager', 'content'),
    read: readUsers,
    create: ({ req }) => hasRole(req.user, 'developer', 'admin'),
    update: updateUsers,
    delete: deleteUsers,
    unlock: ({ req }) => hasRole(req.user, 'developer', 'admin'),
  },
  hooks: {
    beforeChange: [enforceRoles],
  },
  fields: [
    // Email added by default
    {
      name: 'role',
      type: 'select',
      label: 'Роль',
      required: true,
      defaultValue: 'content',
      saveToJWT: true,
      options: roleOptions,
      // Only hides the option in the admin; without a user (seed, scripts) all roles stay valid.
      filterOptions: ({ options, req }) =>
        !req.user || hasRole(req.user, 'developer')
          ? options
          : options.filter((o) => (typeof o === 'string' ? o : o.value) !== 'developer'),
      access: {
        update: ({ req: { user }, id }) =>
          hasRole(user, 'developer', 'admin') && String(user?.id) !== String(id),
      },
      admin: { position: 'sidebar' },
    },
  ],
}
