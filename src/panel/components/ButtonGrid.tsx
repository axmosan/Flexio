import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useBlueprints } from '@/shared/context/BlueprintsContext'
import { ScriptButton } from './ScriptButton'
import { AddButtonCell } from './AddButtonCell'
import type { AppName, ButtonDef, UIMode } from '@/shared/types'
import styles from './ButtonGrid.module.css'

const DRAG_THRESHOLD = 6
const FLIP_DURATION  = 180

interface Props {
  buttons: ButtonDef[]
  app: AppName
  toolsetId: string
  scale: number
  spacing: number
  flipToReorder: boolean
  uiMode: UIMode
  columns: number
}

export function ButtonGrid({
  buttons, app, toolsetId, scale, spacing, flipToReorder, uiMode, columns,
}: Props) {
  const { reorderButtons } = useBlueprints()

  const baseSorted = useMemo(
    () => [...buttons].sort((a, b) => a.order - b.order),
    [buttons],
  )

  const [sortedIds, setSortedIds] = useState(() => baseSorted.map((b) => b.id))
  const [liveIds,   setLiveIds]   = useState<string[] | null>(null)
  const [dragId,    setDragId]    = useState<string | null>(null)

  const displayIds = liveIds ?? sortedIds

  const sortedIdsRef       = useRef(sortedIds)
  const liveIdsRef         = useRef<string[] | null>(null)
  const dragIdRef          = useRef<string | null>(null)
  const pendingRef         = useRef<{ id: string; startX: number; startY: number } | null>(null)
  const pendingSnapshotRef = useRef<Map<string, DOMRect> | null>(null)
  const cardRefs           = useRef<Map<string, HTMLDivElement>>(new Map())
  const didDragRef         = useRef(false)
  const flipToReorderRef   = useRef(flipToReorder)

  const appRef       = useRef(app)
  const toolsetIdRef = useRef(toolsetId)
  const reorderRef   = useRef(reorderButtons)
  useEffect(() => { appRef.current          = app           }, [app])
  useEffect(() => { toolsetIdRef.current    = toolsetId     }, [toolsetId])
  useEffect(() => { reorderRef.current      = reorderButtons }, [reorderButtons])
  useEffect(() => { flipToReorderRef.current = flipToReorder }, [flipToReorder])

  useEffect(() => {
    if (dragIdRef.current) return
    const ids = baseSorted.map((b) => b.id)
    sortedIdsRef.current = ids
    setSortedIds(ids)
  }, [baseSorted])

  // ── FLIP animation ────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    const snapshot = pendingSnapshotRef.current
    pendingSnapshotRef.current = null
    if (!snapshot) return

    cardRefs.current.forEach((el, id) => {
      const oldRect = snapshot.get(id)
      if (!oldRect) return
      const newRect = el.getBoundingClientRect()
      const dx = oldRect.left - newRect.left
      const dy = oldRect.top  - newRect.top
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return

      el.style.transform  = `translate(${dx}px,${dy}px)`
      el.style.transition = 'none'
      void el.getBoundingClientRect()
      el.style.transition = `transform ${FLIP_DURATION}ms ease`
      el.style.transform  = ''
    })
  }, [displayIds])

  // ── Body cursor while dragging ────────────────────────────────────────────
  useEffect(() => {
    if (dragId) {
      document.body.style.cursor     = 'grabbing'
      document.body.style.userSelect = 'none'
    } else {
      document.body.style.cursor     = ''
      document.body.style.userSelect = ''
    }
    return () => {
      document.body.style.cursor     = ''
      document.body.style.userSelect = ''
    }
  }, [dragId])

  // ── Global mouse listeners ────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!flipToReorderRef.current) return
      const p = pendingRef.current
      if (!p || dragIdRef.current !== null) return
      if (Math.hypot(e.clientX - p.startX, e.clientY - p.startY) < DRAG_THRESHOLD) return

      pendingRef.current = null
      const snapshot = [...sortedIdsRef.current]
      dragIdRef.current  = p.id
      liveIdsRef.current = snapshot
      setDragId(p.id)
      setLiveIds(snapshot)
    }

    const onUp = () => {
      if (pendingRef.current) {
        pendingRef.current = null
        return
      }
      if (dragIdRef.current === null) return

      const final = liveIdsRef.current ?? sortedIdsRef.current
      const orig  = sortedIdsRef.current
      if (final.some((id, i) => id !== orig[i])) {
        reorderRef.current(appRef.current, toolsetIdRef.current, final)
      }

      didDragRef.current = true
      dragIdRef.current  = null
      liveIdsRef.current = null
      setDragId(null)
      setLiveIds(null)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [])

  // ── Per-card handlers ─────────────────────────────────────────────────────
  function handleMouseDown(id: string, e: React.MouseEvent) {
    if (!flipToReorder) return
    pendingRef.current = { id, startX: e.clientX, startY: e.clientY }
  }

  function handleMouseEnter(id: string) {
    if (!dragIdRef.current || dragIdRef.current === id) return

    const live    = liveIdsRef.current ?? sortedIdsRef.current
    const fromIdx = live.indexOf(dragIdRef.current)
    const toIdx   = live.indexOf(id)
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return

    const snapshot = new Map<string, DOMRect>()
    cardRefs.current.forEach((el, cid) => snapshot.set(cid, el.getBoundingClientRect()))
    pendingSnapshotRef.current = snapshot

    const arr = [...live]
    ;[arr[fromIdx], arr[toIdx]] = [arr[toIdx], arr[fromIdx]]
    liveIdsRef.current = arr
    setLiveIds(arr)
  }

  function handleClickCapture(e: React.MouseEvent) {
    if (didDragRef.current) {
      didDragRef.current = false
      e.stopPropagation()
      e.preventDefault()
    }
  }

  function setRef(id: string, el: HTMLDivElement | null) {
    if (el) cardRefs.current.set(id, el)
    else    cardRefs.current.delete(id)
  }

  const idToButton = useMemo(() => {
    const m: Record<string, ButtonDef> = {}
    for (const b of buttons) m[b.id] = b
    return m
  }, [buttons])

  const displayButtons = displayIds
    .map((id) => idToButton[id])
    .filter(Boolean) as ButtonDef[]

  // ── Grid layout (icon mode) ───────────────────────────────────────────────
  if (uiMode === 'icon') {
    const gridStyle: React.CSSProperties = columns > 0
      ? { gap: spacing, display: 'grid', gridTemplateColumns: `repeat(${columns}, ${scale}px)` }
      : { gap: spacing }

    return (
      <div className={styles.grid} style={gridStyle}>
        {displayButtons.map((btn) => (
          <div
            key={btn.id}
            ref={(el) => setRef(btn.id, el)}
            style={{ width: scale, height: scale }}
            className={[
              styles.item,
              flipToReorder ? styles.draggable : '',
              dragId === btn.id ? styles.dragging : '',
            ].filter(Boolean).join(' ')}
            onMouseDown={(e) => handleMouseDown(btn.id, e)}
            onMouseEnter={() => handleMouseEnter(btn.id)}
            onClickCapture={handleClickCapture}
          >
            <ScriptButton button={btn} app={app} scale={scale} uiMode={uiMode} />
          </div>
        ))}
        <AddButtonCell size={scale} app={app} />
      </div>
    )
  }

  // ── List layout (icon+name / name) ────────────────────────────────────────
  return (
    <div className={styles.list} style={{ gap: spacing }}>
      {displayButtons.map((btn) => (
        <div
          key={btn.id}
          ref={(el) => setRef(btn.id, el)}
          className={[
            styles.listItem,
            flipToReorder ? styles.draggable : '',
            dragId === btn.id ? styles.dragging : '',
          ].filter(Boolean).join(' ')}
          onMouseDown={(e) => handleMouseDown(btn.id, e)}
          onMouseEnter={() => handleMouseEnter(btn.id)}
          onClickCapture={handleClickCapture}
        >
          <ScriptButton button={btn} app={app} scale={scale} uiMode={uiMode} />
        </div>
      ))}
      <AddButtonCell size={scale} app={app} listMode />
    </div>
  )
}
