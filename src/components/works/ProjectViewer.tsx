'use client'

import { ArrowUp, X } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react'

import { loadProject } from '@/app/(frontend)/works/[slug]/actions'
import { Action } from '@/components/ui/Action'
import { Chip } from '@/components/ui/Chip'
import { HIT_AREA_Y } from '@/components/ui/hitArea'
import { IconButton } from '@/components/ui/IconButton'
import { transitionTime } from '@/hooks/useMenu'
import { useProjectViewer } from '@/hooks/useProjectViewer'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useScrollLock } from '@/hooks/useScrollLock'
import { useViewerInput, VIEWER_SCROLL_ATTR } from '@/hooks/useViewerInput'
import { closeChooser } from '@/lib/chooser'
import { cn } from '@/lib/cn'
import { focalPosition, imageSizes, imageSource } from '@/lib/media'
import { setOverlay } from '@/lib/overlay'
import {
  frameWindow,
  jumpProject,
  nextFrame,
  pendingStep,
  prevFrame,
  projectSubtitle,
  shouldLoadMore,
  swipeMove,
  viewerCounter,
  WORKS_PATH,
  type ViewerBounds,
  type ViewerFrame,
  type ViewerMove,
  type ViewerProject,
} from '@/lib/viewer'
import type { WorksCounts } from '@/lib/works'
import { useWorksFeed } from './WorksFeedProvider'
import { ViewerProgress } from './ViewerProgress'
import { ViewerSoundButton, ViewerVideo } from './ViewerVideo'

type Props = {
  counts: WorksCounts
  /** The project rendered on the server (a direct visit to /works/<slug>); its title is the H1. */
  initialProject: ViewerProject | null
  /** <title> of the works list: back on it after closing a viewer opened on the server. */
  listTitle: string
}

/**
 * Project viewer (README §6.4), Reels-like: frames of a project and the projects of the loaded
 * feed in its order. Opens from a card of the feed (history entry /works/<slug>) or on the
 * project page itself.
 */
export function ProjectViewer(props: Props) {
  const { slug } = useProjectViewer()
  if (!slug) return null
  return <ViewerDialog {...props} slug={slug} />
}

type Loaded = Record<string, ViewerProject | 'error'>

/** Plain left click: a modified one (new tab, window) stays a link. */
const plainClick = (event: MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey

const FRAME_SIZES = imageSizes({ base: '100vw', md: '52vh' })

function ViewerDialog({ counts, initialProject, listTitle, slug }: Props & { slug: string }) {
  const viewer = useProjectViewer()
  const feed = useWorksFeed()
  const reducedMotion = useReducedMotion()
  const { lock, unlock } = useScrollLock()
  const dialogRef = useRef<HTMLDivElement>(null)

  // Projects by slug: frames and texts; the server's one is there from the start
  const [loaded, setLoaded] = useState<Loaded>(() =>
    initialProject ? { [initialProject.slug]: initialProject } : {},
  )
  const requested = useRef(new Set<string>(initialProject ? [initialProject.slug] : []))
  const load = useCallback((target: string) => {
    if (requested.current.has(target)) return
    requested.current.add(target)
    loadProject(target)
      .then((project) => setLoaded((all) => ({ ...all, [target]: project ?? 'error' })))
      // Tried again the next time this project is opened
      .catch(() => {
        requested.current.delete(target)
        setLoaded((all) => ({ ...all, [target]: 'error' }))
      })
  }, [])

  const index = feed.items.findIndex((work) => work.slug === slug)
  const card = index >= 0 ? feed.items[index] : undefined
  const entry = loaded[slug]
  const project = entry && entry !== 'error' ? entry : null
  // Until the frames come (or if they fail): the first frame of the card
  const frames: ViewerFrame[] = project?.frames.length
    ? project.frames
    : card?.image
      ? [{ kind: card.kind, image: card.image, video: null, duration: null }]
      : []
  const title = project?.title ?? card?.title ?? ''

  // Frame and «ещё» belong to the project: another project starts at its first frame, collapsed
  const [at, setAt] = useState({ slug, frame: 0, expanded: false })
  const frame = at.slug === slug ? Math.min(at.frame, Math.max(frames.length - 1, 0)) : 0
  const expanded = at.slug === slug && at.expanded

  // Video of the current frame: sound off by default, the choice kept until the viewer closes;
  // a frame whose video failed shows its poster (no sound button) until it is shown again
  const [muted, setMuted] = useState(true)
  const [videoFailed, setVideoFailed] = useState<string | null>(null)
  const frameKey = `${slug}-${frame}`
  const current = frames[frame]
  const video = current?.kind === 'video' && videoFailed !== frameKey ? current.video : null
  const fillRef = useRef<HTMLDivElement>(null)

  const bounds: ViewerBounds = {
    frames: project ? frames.length : entry === 'error' ? 1 : null,
    length: feed.items.length,
    hasMore: feed.hasMore,
  }

  // A step to the next project that is still loading: taken once the page comes, or dropped
  const pending = useRef<number | null>(null)

  const close = viewer.close
  const goToProject = useCallback(
    (target: number) => {
      const next = feed.items[target]
      if (!next) return
      // Every project starts at its first frame, with the description collapsed
      setAt({ slug: next.slug, frame: 0, expanded: false })
      setVideoFailed(null)
      viewer.go(next.slug)
    },
    [feed.items, viewer],
  )

  const apply = (move: ViewerMove) => {
    switch (move.type) {
      case 'frame':
        setAt({ slug, frame: move.frame, expanded })
        setVideoFailed(null)
        break
      case 'project':
        pending.current = null
        goToProject(move.index)
        break
      case 'load':
        feed.loadMore()
        pending.current = index + 1
        break
      case 'close':
        close()
        break
    }
  }
  const position = { index, frame }
  const known = index >= 0
  const frameStep = (dir: 1 | -1) =>
    apply(
      !known
        ? { type: 'none' }
        : dir === 1
          ? nextFrame(position, bounds)
          : prevFrame(position, bounds),
    )

  useViewerInput({
    frame: frameStep,
    project: (dir) => known && apply(jumpProject(position, dir, bounds)),
    swipe: (dir) =>
      apply(
        known
          ? swipeMove(position, dir, bounds)
          : dir === -1
            ? { type: 'close' }
            : { type: 'none' },
      ),
    close,
    reducedMotion,
  })

  // The pending step after the feed's next page
  useEffect(() => {
    const target = pending.current
    if (target === null) return
    const decision = pendingStep(target, {
      length: feed.items.length,
      loading: feed.loading !== null,
    })
    if (decision === 'wait') return
    pending.current = null
    if (decision === 'go') goToProject(target)
  }, [feed.items.length, feed.loading, goToProject])

  // Frames of the current project and its neighbours; the feed's next page near its end
  useEffect(() => {
    load(slug)
    if (index > 0) load(feed.items[index - 1]!.slug)
    if (index >= 0 && index + 1 < feed.items.length) load(feed.items[index + 1]!.slug)
  }, [slug, index, feed.items, load])
  const { hasMore, loading, failed, loadMore } = feed
  useEffect(() => {
    if (index >= 0 && !loading && !failed && shouldLoadMore(index, feed.items.length, hasMore)) {
      loadMore()
    }
  }, [index, feed.items.length, hasMore, loading, failed, loadMore])

  // The project's title while it is shown (the page's own on a direct visit)
  const titleRef = useRef(initialProject?.documentTitle ?? '')
  useEffect(() => {
    if (!project) return
    document.title = project.documentTitle
    titleRef.current = project.documentTitle
  }, [project])

  // The page under the viewer: frozen, covered (background videos pause), no messenger choice.
  // Closing brings back the list's title (Next does not, for a page restored from history) and
  // the focus; when the page itself is left, the next page's title and focus stay.
  const [openedOnServer] = useState(viewer.phase === 'open')
  const slugRef = useRef(slug)
  useLayoutEffect(() => {
    slugRef.current = slug
  }, [slug])
  const fromFeedRef = useRef(viewer.fromFeed)
  useLayoutEffect(() => {
    fromFeedRef.current = viewer.fromFeed
  }, [viewer.fromFeed])
  useEffect(() => {
    lock()
    setOverlay('viewer', true)
    closeChooser()
    dialogRef.current?.focus({ preventScroll: true })
    return () => {
      unlock({ toTop: false })
      setOverlay('viewer', false)
      const title = document.title
      if (title !== titleRef.current && title !== listTitle) return
      document.title = listTitle
      // Focus back on the card of the last project shown (the feed has it), else on the content
      const href = `${WORKS_PATH}/${slugRef.current}`
      const cardLink = document.querySelector<HTMLElement>(`[data-works-feed] a[href="${href}"]`)
      if (!cardLink) {
        document.getElementById('content')?.focus({ preventScroll: true })
        return
      }
      if (fromFeedRef.current) {
        const rect = cardLink.getBoundingClientRect()
        if (rect.bottom <= 0 || rect.top >= window.innerHeight) {
          cardLink.scrollIntoView({ block: 'nearest', behavior: 'instant' })
        }
        cardLink.focus({ preventScroll: true })
      } else {
        cardLink.focus()
      }
    }
  }, [lock, unlock, listTitle])

  // Appearing: the closed styles first, the open ones in the next frame (the work of opening —
  // scroll lock, inert, focus — does not share a frame with the start of the animation)
  const [shown, setShown] = useState(viewer.phase === 'open')
  const [animating, setAnimating] = useState(false)
  useEffect(() => {
    if (shown || viewer.phase !== 'enter') return
    const frameId = requestAnimationFrame(() => {
      setAnimating(true)
      setShown(true)
    })
    return () => cancelAnimationFrame(frameId)
  }, [shown, viewer.phase])
  const leaving = viewer.phase === 'leave'
  const dataState = leaving ? 'leave' : shown ? 'open' : 'enter'

  // End of appearing / closing: the dialog's opacity transition, or its duration as a fallback
  const settle = viewer.settle
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || !(leaving || animating)) return
    const done = () => (leaving ? settle() : setAnimating(false))
    const onEnd = (event: TransitionEvent) => {
      if (event.target === dialog && event.propertyName === 'opacity') done()
    }
    dialog.addEventListener('transitionend', onEnd)
    const timer = window.setTimeout(done, transitionTime(dialog) + 50)
    return () => {
      dialog.removeEventListener('transitionend', onEnd)
      window.clearTimeout(timer)
    }
  }, [leaving, animating, settle])

  // «ещё» is in the HTML from the start (as in the design): a text that fits in two lines keeps
  // its place but hides it — measured only on the client, so showing or removing it would shift
  const descriptionRef = useRef<HTMLParagraphElement>(null)
  const [clamped, setClamped] = useState(true)
  const description = project?.description ?? null
  useLayoutEffect(() => {
    const element = descriptionRef.current
    if (!element || expanded) return
    const measure = () => setClamped(element.scrollHeight > element.clientHeight + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [description, expanded])

  const prev = index > 0 ? feed.items[index - 1] : undefined
  const next = index >= 0 ? feed.items[index + 1] : undefined
  // The next project's first frame, loaded ahead (hidden)
  const nextEntry = next ? loaded[next.slug] : undefined
  const nextFirst =
    (nextEntry && nextEntry !== 'error' ? nextEntry.frames[0]?.image : null) ?? next?.image ?? null
  const nextImage = imageSource(nextFirst, 'hero')
  const total = counts[feed.filter]
  const Title = initialProject && openedOnServer ? 'h1' : 'h2'

  const onLink = (event: MouseEvent, move: () => void) => {
    if (!plainClick(event)) return
    event.preventDefault()
    move()
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={title || undefined}
      tabIndex={-1}
      data-state={dataState}
      data-frame={frame}
      data-animating={animating || leaving ? '' : undefined}
      inert={leaving}
      // From tablet the window floats: a click on the backdrop around it closes
      onClick={(event) => event.target === event.currentTarget && close()}
      className="fixed inset-0 z-viewer flex items-center justify-center bg-bg-outer viewer-dialog focus-visible:outline-none"
    >
      <div className="relative isolate size-full viewer-window overflow-hidden bg-bg-outer md:aspect-9/16 md:h-viewer md:w-auto md:max-w-full md:rounded-thumb-lg">
        <div className="absolute inset-0 -z-10">
          {/* The current frame and its neighbours (instant steps); only the current one is read */}
          {frameWindow(frame, frames.length).map((i) => {
            const item = frames[i]!
            const image = imageSource(item.image, 'hero')
            const shown = i === frame
            return (
              image && (
                <Image
                  key={`${slug}-${i}-${item.image?.id ?? 'card'}`}
                  src={image.src}
                  alt={shown ? image.alt : ''}
                  aria-hidden={shown ? undefined : true}
                  data-viewer-frame={i}
                  fill
                  sizes={FRAME_SIZES}
                  preload={Boolean(initialProject) && i === 0}
                  fetchPriority={shown ? 'high' : 'low'}
                  className={cn('object-cover', shown ? 'opacity-100' : 'opacity-0')}
                  style={{ objectPosition: focalPosition(item.image) }}
                />
              )
            )
          })}
          {nextImage && (
            <Image
              key={`next-${next?.slug}`}
              src={nextImage.src}
              alt=""
              aria-hidden
              data-viewer-next=""
              fill
              sizes={FRAME_SIZES}
              fetchPriority="low"
              className="object-cover opacity-0"
              style={{ objectPosition: focalPosition(nextFirst) }}
            />
          )}
          {video && (
            <ViewerVideo
              key={frameKey}
              source={video}
              muted={muted}
              active={!leaving}
              fillRef={fillRef}
              onEnded={() => frameStep(1)}
              onFallback={() => setVideoFailed(frameKey)}
              onMuted={() => setMuted(true)}
            />
          )}
          <div className="absolute inset-0 bg-overlay-viewer" />
        </div>

        <div className="flex h-full flex-col">
          <div className="flex flex-col gap-3 px-3 pt-3">
            <ViewerProgress
              count={Math.max(frames.length, 1)}
              current={frame}
              playback={Boolean(video)}
              frameKey={frameKey}
              fillRef={fillRef}
            />
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex size-8.5 shrink-0 items-center justify-center rounded-full bg-bg text-viewer-mark ring-2 ring-accent"
              >
                MG<span className="text-accent">S</span>
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-px">
                <p className="text-body-xs font-bold">mgs mebel</p>
                {(project ?? card) && (
                  <p className="truncate text-caption-s font-normal text-text-2">
                    {projectSubtitle(project ?? { category: card?.category ?? '', place: null })}
                  </p>
                )}
              </div>
              {video && (
                <ViewerSoundButton muted={muted} onToggle={() => setMuted(!muted)} />
              )}
              <IconButton
                href={WORKS_PATH}
                prefetch={false}
                variant="glass"
                size={36}
                aria-label="Закрыть"
                onClick={(event) => onLink(event, close)}
              >
                <X />
              </IconButton>
            </div>
          </div>

          {/* Tap zones between the header and the bottom block: 35 % back, 65 % forward */}
          <div className="flex min-h-0 flex-1">
            <button
              type="button"
              tabIndex={-1}
              aria-label="Предыдущий кадр"
              aria-busy={bounds.frames === null ? true : undefined}
              onClick={() => frameStep(-1)}
              className="w-7/20 cursor-w-resize"
            />
            <button
              type="button"
              tabIndex={-1}
              aria-label="Следующий кадр"
              aria-busy={bounds.frames === null ? true : undefined}
              onClick={() => frameStep(1)}
              className="flex-1 cursor-e-resize"
            />
          </div>

          <div className="flex max-h-1/2 min-h-0 flex-col gap-3 px-5 viewer-bottom">
            {project && project.facts.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {project.facts.map((fact) => (
                  <li key={fact}>
                    <Chip variant="frost">{fact}</Chip>
                  </li>
                ))}
              </ul>
            )}
            {title && <Title className="text-viewer-title">{title}</Title>}
            {description && (
              <div className="flex min-h-0 flex-col items-start">
                <p
                  ref={descriptionRef}
                  {...(expanded ? { [VIEWER_SCROLL_ATTR]: '' } : {})}
                  className={cn(
                    'min-h-0 text-body-s text-pretty text-text-2',
                    expanded ? 'overflow-y-auto overscroll-contain' : 'line-clamp-2',
                  )}
                >
                  {description}
                </p>
                {!expanded && (
                  <button
                    type="button"
                    aria-expanded="false"
                    onClick={() => setAt({ slug, frame, expanded: true })}
                    className={cn(
                      'relative text-body-xs font-bold text-text-3',
                      HIT_AREA_Y,
                      !clamped && 'invisible',
                    )}
                  >
                    ещё
                  </button>
                )}
              </div>
            )}
            {known && (
              <div className="flex items-center justify-between gap-4 text-caption-s">
                {prev ? (
                  <Action
                    href={prev.href}
                    prefetch={false}
                    aria-label={`Предыдущий проект: ${prev.title}`}
                    onClick={(event) => onLink(event, () => goToProject(index - 1))}
                    className={cn('relative font-normal text-text-3', HIT_AREA_Y)}
                  >
                    {viewerCounter(index, total)}
                  </Action>
                ) : (
                  <span className="font-normal text-text-3">{viewerCounter(index, total)}</span>
                )}
                {next ? (
                  <Action
                    href={next.href}
                    prefetch={false}
                    onClick={(event) => onLink(event, () => goToProject(index + 1))}
                    className={cn('relative flex items-center gap-1.5 text-text-2', HIT_AREA_Y)}
                  >
                    Свайп вверх — следующий проект
                    <ArrowUp aria-hidden="true" className="size-3" />
                  </Action>
                ) : (
                  hasMore && (
                    <button
                      type="button"
                      onClick={() => apply(jumpProject(position, 1, bounds))}
                      className={cn('relative flex items-center gap-1.5 text-text-2', HIT_AREA_Y)}
                    >
                      Свайп вверх — следующий проект
                      <ArrowUp aria-hidden="true" className="size-3" />
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
