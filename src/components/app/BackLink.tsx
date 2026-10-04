'use client'

import { ArrowLeft } from 'lucide-react'

import { IconButton } from '@/components/ui/IconButton'
import { useRoutePath } from '@/hooks/useRoutePath'
import { parentOf } from '@/lib/routes'
import { useHeaderOverMedia } from './HeaderShell'

/** Mobile/tablet «←» to the parent section; an empty 40 slot on the home page (README §5.2). */
export function BackLink() {
  const pathname = useRoutePath()
  const parent = parentOf(pathname)
  const overMedia = useHeaderOverMedia()
  if (!parent) return <span aria-hidden="true" className="size-10 shrink-0 xl:hidden" />

  return (
    <IconButton
      href={parent.href}
      aria-label={parent.label}
      variant={overMedia ? 'outline-media' : 'outline'}
      className="xl:hidden"
    >
      <ArrowLeft />
    </IconButton>
  )
}
