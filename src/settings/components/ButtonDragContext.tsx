/**
 * Drag state shared by every toolset of one app.
 *
 * A row is dragged by its handle and can be dropped into any toolset of the same
 * app — the live layout below is a preview of where the row would land, and it is
 * committed to the blueprints on pointer-up. Scripts live under
 * Scripts/<app>/<buttonId>, so a move between toolsets touches no file; crossing
 * apps is not possible because each app block has its own provider.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useBlueprints } from '@/shared/context/BlueprintsContext'
import type { AppName, ButtonDef } from '@/shared/types'

/** toolsetId → ordered button IDs */
type Layout = Record<string, string[]>

interface DragValue {
  /** ID of the row being dragged, or null when idle */
  dragId: string | null
  /** Rows a toolset should render: the drag preview if one is running, else the real order */
  resolveRows: (toolsetId: string, fallback: ButtonDef[]) => ButtonDef[]
  startDrag: (buttonId: string, e: React.PointerEvent) => void
  /** Pointer entered a row — put the dragged row in its place */
  hoverRow: (toolsetId: string, rowId: string, after: boolean) => void
  /** Pointer entered a toolset with no room of its own (empty, collapsed, footer) */
  hoverToolset: (toolsetId: string) => void
}

const DragContext = createContext<DragValue | null>(null)

const EDGE_ZONE  = 44  // px from the scroll container edge where auto-scroll kicks in
const EDGE_SPEED = 14  // px per frame at the very edge

/** Nearest scrollable ancestor, so a drag can reach toolsets that are off-screen */
function findScroller(el: HTMLElement | null): HTMLElement | null {
  let cur = el?.parentElement ?? null
  while (cur) {
    const oy = getComputedStyle(cur).overflowY
    if ((oy === 'auto' || oy === 'scroll') && cur.scrollHeight > cur.clientHeight + 4) return cur
    cur = cur.parentElement
  }
  return null
}

export function ButtonDragProvider({
  app, children,
}: {
  app: AppName
  children: React.ReactNode
}) {
  const { blueprints, applyButtonLayout } = useBlueprints()

  const [dragId, setDragId] = useState<string | null>(null)
  const [live,   setLive]   = useState<Layout | null>(null)

  const dragRef     = useRef<string | null>(null)
  const liveRef     = useRef<Layout | null>(null)
  const baselineRef = useRef<string>('')
  const scrollerRef = useRef<HTMLElement | null>(null)
  const pointerYRef = useRef(0)
  const rafRef      = useRef<number | null>(null)

  const appRef   = useRef(app)
  const applyRef = useRef(applyButtonLayout)
  const bpRef    = useRef(blueprints)
  useEffect(() => { appRef.current   = app              }, [app])
  useEffect(() => { applyRef.current = applyButtonLayout }, [applyButtonLayout])
  useEffect(() => { bpRef.current    = blueprints       }, [blueprints])

  const buttonsById = useMemo(() => {
    const m = new Map<string, ButtonDef>()
    for (const ts of blueprints.apps[app].toolsets) {
      for (const b of ts.buttons) m.set(b.id, b)
    }
    return m
  }, [blueprints, app])

  // ── Drag lifecycle ─────────────────────────────────────────────────────────
  const endDrag = useCallback((commit: boolean) => {
    const layout = liveRef.current
    dragRef.current = null
    liveRef.current = null
    setDragId(null)
    setLive(null)
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    scrollerRef.current = null
    if (commit && layout && JSON.stringify(layout) !== baselineRef.current) {
      applyRef.current(appRef.current, layout)
    }
  }, [])

  const autoScroll = useCallback(() => {
    rafRef.current = null
    const sc = scrollerRef.current
    if (!sc || !dragRef.current) return
    const rect = sc.getBoundingClientRect()
    const y = pointerYRef.current
    let dy = 0
    if (y < rect.top + EDGE_ZONE) {
      dy = -Math.ceil(((rect.top + EDGE_ZONE - y) / EDGE_ZONE) * EDGE_SPEED)
    } else if (y > rect.bottom - EDGE_ZONE) {
      dy = Math.ceil(((y - (rect.bottom - EDGE_ZONE)) / EDGE_ZONE) * EDGE_SPEED)
    }
    if (dy) sc.scrollTop += dy
    rafRef.current = requestAnimationFrame(autoScroll)
  }, [])

  const startDrag = useCallback((buttonId: string, e: React.PointerEvent) => {
    e.preventDefault()
    const snapshot: Layout = {}
    for (const ts of bpRef.current.apps[appRef.current].toolsets) {
      snapshot[ts.id] = [...ts.buttons].sort((a, b) => a.order - b.order).map((b) => b.id)
    }
    dragRef.current     = buttonId
    liveRef.current     = snapshot
    baselineRef.current = JSON.stringify(snapshot)
    pointerYRef.current = e.clientY
    scrollerRef.current = findScroller(e.currentTarget as HTMLElement)
    setDragId(buttonId)
    setLive(snapshot)
    if (rafRef.current === null) rafRef.current = requestAnimationFrame(autoScroll)
  }, [autoScroll])

  useEffect(() => {
    const onMove = (e: PointerEvent) => { pointerYRef.current = e.clientY }
    const onUp   = () => { if (dragRef.current) endDrag(true) }
    const onKey  = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dragRef.current) endDrag(false)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      window.removeEventListener('keydown', onKey)
    }
  }, [endDrag])

  useEffect(() => {
    if (!dragId) return
    const prevCursor = document.body.style.cursor
    const prevSelect = document.body.style.userSelect
    document.body.style.cursor     = 'grabbing'
    document.body.style.userSelect = 'none'
    return () => {
      document.body.style.cursor     = prevCursor
      document.body.style.userSelect = prevSelect
    }
  }, [dragId])

  // ── Live layout edits ──────────────────────────────────────────────────────
  const commitLive = useCallback((next: Layout) => {
    if (JSON.stringify(next) === JSON.stringify(liveRef.current)) return
    liveRef.current = next
    setLive(next)
  }, [])

  const hoverRow = useCallback((toolsetId: string, rowId: string, after: boolean) => {
    const id  = dragRef.current
    const cur = liveRef.current
    if (!id || !cur || id === rowId) return
    const fromTs = Object.keys(cur).find((k) => cur[k].includes(id))
    if (!fromTs || !cur[toolsetId]) return

    const next: Layout = { ...cur }
    if (fromTs === toolsetId) {
      // Same list: pull the row out and drop it on the hovered row's original
      // index — that lands it after the row when moving down, before when up.
      const arr  = [...cur[toolsetId]]
      const from = arr.indexOf(id)
      const to   = arr.indexOf(rowId)
      if (from === -1 || to === -1) return
      arr.splice(from, 1)
      arr.splice(to, 0, id)
      next[toolsetId] = arr
    } else {
      next[fromTs] = cur[fromTs].filter((x) => x !== id)
      const arr = [...cur[toolsetId]]
      const to  = arr.indexOf(rowId)
      if (to === -1) return
      arr.splice(after ? to + 1 : to, 0, id)
      next[toolsetId] = arr
    }
    commitLive(next)
  }, [commitLive])

  const hoverToolset = useCallback((toolsetId: string) => {
    const id  = dragRef.current
    const cur = liveRef.current
    if (!id || !cur || !cur[toolsetId] || cur[toolsetId].includes(id)) return
    const fromTs = Object.keys(cur).find((k) => cur[k].includes(id))
    if (!fromTs) return
    commitLive({
      ...cur,
      [fromTs]: cur[fromTs].filter((x) => x !== id),
      [toolsetId]: [...cur[toolsetId], id],
    })
  }, [commitLive])

  const resolveRows = useCallback(
    (toolsetId: string, fallback: ButtonDef[]) => {
      const ids = live?.[toolsetId]
      if (!ids) return fallback
      return ids.map((id) => buttonsById.get(id)).filter(Boolean) as ButtonDef[]
    },
    [live, buttonsById],
  )

  const value = useMemo<DragValue>(
    () => ({ dragId, resolveRows, startDrag, hoverRow, hoverToolset }),
    [dragId, resolveRows, startDrag, hoverRow, hoverToolset],
  )

  return <DragContext.Provider value={value}>{children}</DragContext.Provider>
}

export function useButtonDrag(): DragValue {
  const ctx = useContext(DragContext)
  if (!ctx) throw new Error('useButtonDrag must be used within ButtonDragProvider')
  return ctx
}
