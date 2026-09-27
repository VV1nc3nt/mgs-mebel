import Link from 'next/link'
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'

import { classifyHref } from '@/lib/href'

type Common = {
  className?: string
  children?: ReactNode
  disabled?: boolean
}

export type ActionLinkProps = Common &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className' | 'children'> & {
    href: string
  }

export type ActionButtonProps = Common &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    href?: undefined
  }

export type ActionProps = ActionLinkProps | ActionButtonProps

/**
 * Shared element of Button, IconButton and FilterChip: next/link for own pages,
 * a new-tab link for other sites, <a> for tel:/mailto:, <button type="button"> without href.
 * A disabled link has no href: role="link" + aria-disabled="true", out of the tab order.
 */
export function Action(props: ActionProps) {
  if (props.href === undefined) {
    const { href: _href, type = 'button', ...rest } = props
    return <button type={type} {...rest} />
  }

  const { href, disabled, ...rest } = props
  if (disabled) {
    return <a {...rest} role="link" aria-disabled="true" tabIndex={-1} />
  }

  const target = classifyHref(href)
  switch (target.kind) {
    case 'internal':
      return <Link href={target.href} {...rest} />
    case 'external':
      return <a href={target.href} target="_blank" rel="noopener noreferrer" {...rest} />
    default:
      return <a href={target.href} {...rest} />
  }
}
