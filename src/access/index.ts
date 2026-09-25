import type { Access, FieldAccess } from 'payload'

import { hasRole, type Role } from './roles'

export { hasRole, roleOptions, type Role } from './roles'

const allow =
  (...roles: Role[]): Access =>
  ({ req: { user } }) =>
    hasRole(user, ...roles)

const allowField =
  (...roles: Role[]): FieldAccess =>
  ({ req: { user } }) =>
    hasRole(user, ...roles)

export const publicRead: Access = () => true

/** Pages, layout, stats, projects, news. */
export const contentEditors = allow('developer', 'admin', 'content')
/** Salons and editable parts of settings. */
export const salonEditors = allow('developer', 'admin', 'manager')
export const anyRole = allow('developer', 'admin', 'manager', 'content')
export const developerOnly = allow('developer')

/** Media: everybody uploads, manager also edits, only content roles delete. */
export const mediaUpdaters = allow('developer', 'admin', 'manager', 'content')
export const mediaDeleters = contentEditors

/** Drafts are visible to logged-in users only. */
export const publishedOrLoggedIn: Access = ({ req: { user } }) =>
  user ? true : { _status: { equals: 'published' } }

export const technicalFieldRead = allowField('developer', 'admin')
export const technicalFieldUpdate = allowField('developer')
