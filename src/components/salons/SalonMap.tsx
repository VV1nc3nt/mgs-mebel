'use client'

import { Minus, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { YMap } from '@yandex/ymaps3-types'

import { IconButton } from '@/components/ui/IconButton'
import { BREAKPOINTS } from '@/lib/media'
import { mapPanDelta, salonCoordinates, salonMapLocation, type MapSalon } from '@/lib/salonMap'
import { loadYandexMaps } from '@/lib/yandexMaps'

type Props = {
  salons: MapSalon[]
  activeId: number | undefined
  onPick?: (id: number) => void
}

/** The SDK owns this element only; the surrounding card and controls remain React-owned. */
export function SalonMap({ salons, activeId, onPick }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const map = useRef<YMap | null>(null)
  const buttons = useRef(new Map<number, HTMLButtonElement>())
  const pick = useRef(onPick)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    pick.current = onPick
  }, [onPick])
  useEffect(() => {
    const element = root.current
    const key = process.env.NEXT_PUBLIC_YMAPS_KEY
    const points = salons.flatMap((salon) => {
      const coordinates = salonCoordinates(salon.location)
      return coordinates ? [{ salon, coordinates }] : []
    })
    if (!element || !key || !points.length) return
    let cancelled = false
    let started = false
    let resize: ResizeObserver | undefined
    let changes: MutationObserver | undefined
    let tilesTimeout: ReturnType<typeof setTimeout> | undefined
    const pins = buttons.current
    const margin = (): [number, number, number, number] => {
      const panel = element.closest('[data-salon-map-slot]')?.querySelector('[data-salon-panel]')
      const bottom = panel ? panel.getBoundingClientRect().height + 24 : 64
      const right = window.innerWidth >= BREAKPOINTS.md ? 88 : 140
      return [64, right, Math.max(0, Math.min(bottom, element.clientHeight - 100)), 40]
    }
    const start = async () => {
      if (started) return
      started = true
      try {
        const api = await loadYandexMaps(key)
        if (cancelled) return
        const instance = new api.YMap(element, {
          location: salonMapLocation(points.map(({ coordinates }) => coordinates)),
          theme: 'dark',
          margin: margin(),
          copyrightsPosition: 'top left',
          distributionPosition: 'top left',
          behaviors: window.matchMedia('(pointer: fine)').matches
            ? ['drag', 'pinchZoom']
            : ['pinchZoom'],
          zoomRange: { min: 3, max: 19 },
        })
        map.current = instance
        instance.addChild(
          new api.YMapDefaultSchemeLayer({ layers: { ground: { id: 'salon-ground' } } }),
        )
        instance.addChild(new api.YMapDefaultFeaturesLayer({}))
        for (const { salon, coordinates } of points) {
          const button = document.createElement('button')
          button.type = 'button'
          button.className = 'salon-map-pin'
          button.setAttribute('aria-label', salon.name)
          button.onclick = () => pick.current?.(salon.id)
          pins.set(salon.id, button)
          instance.addChild(new api.YMapMarker({ coordinates }, button))
        }
        tilesTimeout = setTimeout(() => {
          if (cancelled) return
          instance.destroy()
          map.current = null
          pins.clear()
          setReady(false)
          setFailed(true)
        }, 12000)
        instance.addChild(
          new api.YMapListener({
            onStateChanged: (state) => {
              const layer = state.getLayerState('salon-ground', 'tile')
              if (layer && layer.tilesReady > 0) {
                clearTimeout(tilesTimeout)
                if (!cancelled) setReady(true)
              }
            },
          }),
        )
        // Keep geographical points above the actual card, without changing its layout.
        const fit = () => {
          if (element.clientHeight < 100 || !element.clientWidth) return
          instance.update({ margin: margin() })
        }
        fit()
        resize = new ResizeObserver(fit)
        resize.observe(element.closest('[data-salon-map-slot]')!)
        const panel = element.closest('[data-salon-map-slot]')?.querySelector('[data-salon-panel]')
        if (panel) resize.observe(panel)
        changes = new MutationObserver(fit)
        changes.observe(element.closest('[data-salon-map-slot]')!, { childList: true })
      } catch {
        clearTimeout(tilesTimeout)
        if (!cancelled) {
          map.current?.destroy()
          map.current = null
          setReady(false)
          setFailed(true)
        }
      }
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect()
        void start()
      }
    })
    observer.observe(element)
    return () => {
      cancelled = true
      observer.disconnect()
      resize?.disconnect()
      changes?.disconnect()
      clearTimeout(tilesTimeout)
      map.current?.destroy()
      map.current = null
      pins.clear()
    }
  }, [salons])

  useEffect(() => {
    for (const [id, button] of buttons.current) {
      button.setAttribute('aria-pressed', String(id === activeId))
    }
    const instance = map.current
    const element = root.current
    const selected = salons.find((salon) => salon.id === activeId)
    const coordinates = selected && salonCoordinates(selected.location)
    if (!instance || !element || !coordinates || !ready || !element.clientWidth) return
    const { projection, bounds } = instance
    const sw = projection.toWorldCoordinates(bounds[0])
    const ne = projection.toWorldCoordinates(bounds[1])
    if (ne.x === sw.x || ne.y === sw.y) return
    const point = projection.toWorldCoordinates(coordinates)
    const width = element.clientWidth,
      height = element.clientHeight
    const panel = element.closest('[data-salon-map-slot]')?.querySelector('[data-salon-panel]')
    const bottom = panel ? panel.getBoundingClientRect().height + 24 : 64
    const [dx, dy] = mapPanDelta(
      ((point.x - sw.x) / (ne.x - sw.x)) * width,
      ((ne.y - point.y) / (ne.y - sw.y)) * height,
      width,
      height,
      bottom,
      window.innerWidth >= BREAKPOINTS.md ? 88 : 140,
    )
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
    const center = projection.toWorldCoordinates([...instance.center])
    instance.setLocation({
      center: projection.fromWorldCoordinates({
        x: center.x + (dx / width) * (ne.x - sw.x),
        y: center.y - (dy / height) * (ne.y - sw.y),
      }),
    })
  }, [activeId, ready, salons])

  const zoom = (delta: number) => {
    const instance = map.current
    if (instance) instance.setLocation({ zoom: Math.min(19, Math.max(3, instance.zoom + delta)) })
  }

  return (
    <>
      <div ref={root} className="absolute inset-x-0 top-16 bottom-0 isolate" data-salon-map />
      {(!process.env.NEXT_PUBLIC_YMAPS_KEY ||
        failed ||
        !salons.some((s) => salonCoordinates(s.location))) && (
        <p role="status" className="absolute top-20 right-3 left-3 text-body-xs text-text-3">
          Карта недоступна.
        </p>
      )}
      {ready && (
        <div className="absolute top-32 right-3 flex gap-2 md:flex-col">
          <IconButton size={44} aria-label="Увеличить масштаб" onClick={() => zoom(1)}>
            <Plus />
          </IconButton>
          <IconButton size={44} aria-label="Уменьшить масштаб" onClick={() => zoom(-1)}>
            <Minus />
          </IconButton>
        </div>
      )}
    </>
  )
}
