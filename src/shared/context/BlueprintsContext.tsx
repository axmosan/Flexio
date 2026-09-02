import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  loadBlueprints,
  saveBlueprints,
  getDefaultBlueprints,
  getBlueprintsTimestamp,
} from '../lib/blueprints'
import {
  saveScriptFile,
  saveIconFile,
  updateScriptFile,
  updateIconFile,
  deleteScriptDir,
  duplicateScriptDir,
  buildAutoIconText,
} from '../lib/scriptManager'
import { dispatchBlueprintsChanged, onBlueprintsChanged } from '../lib/cepInterface'
import type {
  AppName,
  AllocationMap,
  BlueprintsData,
  ButtonDef,
  PanelSettings,
  PanelSlot,
  ToolsetDef,
} from '../types'

// ─── Context type ─────────────────────────────────────────────────────────────

interface BlueprintsContextValue {
  blueprints: BlueprintsData
  isLoaded: boolean

  // Toolset operations
  addToolset: (app: AppName, name: string) => string
  renameToolset: (app: AppName, toolsetId: string, name: string) => void
  deleteToolset: (app: AppName, toolsetId: string) => void

  // Button operations
  addButton: (
    app: AppName,
    toolsetId: string,
    scriptSrcPath: string,
    iconSrcPath: string | null,
    name: string,
    description: string,
  ) => void
  updateButton: (
    app: AppName,
    toolsetId: string,
    buttonId: string,
    fields: {
      name?: string
      description?: string
      scriptSrcPath?: string
      iconSrcPath?: string | null
      clearIcon?: boolean
    },
  ) => void
  deleteButton: (app: AppName, toolsetId: string, buttonId: string) => void
  duplicateButton: (app: AppName, toolsetId: string, buttonId: string) => void
  setButtonHidden: (app: AppName, toolsetId: string, buttonId: string, hidden: boolean) => void
  reorderButtons: (app: AppName, toolsetId: string, orderedIds: string[]) => void
  /** Rewrite the button layout of one app: toolsetId → ordered button IDs.
   *  Buttons listed under a different toolset than they currently live in are moved. */
  applyButtonLayout: (app: AppName, layout: Record<string, string[]>) => void

  // Settings operations
  updatePanelSettings: (app: AppName, slot: PanelSlot, updates: Partial<PanelSettings>) => void
  updateAllocation: (app: AppName, updates: Partial<AllocationMap>) => void

  // Raw updater (for advanced use)
  update: (updater: (prev: BlueprintsData) => BlueprintsData) => void
}

const BlueprintsContext = createContext<BlueprintsContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function BlueprintsProvider({ children }: { children: React.ReactNode }) {
  const [blueprints, setBlueprints] = useState<BlueprintsData>(getDefaultBlueprints)
  const [isLoaded, setIsLoaded] = useState(false)
  const lastTimestampRef = useRef<string>('')

  useEffect(() => {
    const data = loadBlueprints()
    setBlueprints(data)
    lastTimestampRef.current = getBlueprintsTimestamp()
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      const ts = getBlueprintsTimestamp()
      if (ts && ts !== lastTimestampRef.current) {
        lastTimestampRef.current = ts
        setBlueprints(loadBlueprints())
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    return onBlueprintsChanged(() => {
      const ts = getBlueprintsTimestamp()
      lastTimestampRef.current = ts
      setBlueprints(loadBlueprints())
    })
  }, [])

  const update = useCallback((updater: (prev: BlueprintsData) => BlueprintsData) => {
    setBlueprints((prev) => {
      const next = updater(prev)
      saveBlueprints(next)
      lastTimestampRef.current = getBlueprintsTimestamp()
      dispatchBlueprintsChanged()
      return next
    })
  }, [])

  // ── Toolset operations ──────────────────────────────────────────────────────

  const addToolset = useCallback(
    (app: AppName, name: string): string => {
      const id = uuidv4()
      update((bp) => {
        const toolset: ToolsetDef = { id, name, buttons: [] }
        return {
          ...bp,
          apps: {
            ...bp.apps,
            [app]: { toolsets: [...bp.apps[app].toolsets, toolset] },
          },
        }
      })
      return id
    },
    [update],
  )

  const renameToolset = useCallback(
    (app: AppName, toolsetId: string, name: string) => {
      update((bp) => ({
        ...bp,
        apps: {
          ...bp.apps,
          [app]: {
            toolsets: bp.apps[app].toolsets.map((ts) =>
              ts.id === toolsetId ? { ...ts, name } : ts,
            ),
          },
        },
      }))
    },
    [update],
  )

  const deleteToolset = useCallback(
    (app: AppName, toolsetId: string) => {
      update((bp) => {
        const toolset = bp.apps[app].toolsets.find((ts) => ts.id === toolsetId)
        if (toolset) {
          for (const btn of toolset.buttons) {
            if (btn.scriptPath) {
              try { deleteScriptDir(btn.scriptPath) } catch { /* ok */ }
            }
          }
        }
        const newAlloc = { ...bp.allocation[app] } as AllocationMap
        for (const slot of Object.keys(newAlloc) as PanelSlot[]) {
          if (newAlloc[slot] === toolsetId) newAlloc[slot] = ''
        }
        return {
          ...bp,
          allocation: { ...bp.allocation, [app]: newAlloc },
          apps: {
            ...bp.apps,
            [app]: { toolsets: bp.apps[app].toolsets.filter((ts) => ts.id !== toolsetId) },
          },
        }
      })
    },
    [update],
  )

  // ── Button operations ───────────────────────────────────────────────────────

  const addButton = useCallback(
    (
      app: AppName,
      toolsetId: string,
      scriptSrcPath: string,
      iconSrcPath: string | null,
      name: string,
      description: string,
    ) => {
      const buttonId = uuidv4()
      const { scriptPath, scriptName } = saveScriptFile(app, scriptSrcPath, buttonId)
      let iconPath = ''
      if (iconSrcPath) {
        const saved = saveIconFile(app, buttonId, iconSrcPath)
        iconPath = saved.iconPath
      }
      const autoText = buildAutoIconText(name || scriptName)
      const button: ButtonDef = {
        id: buttonId,
        name: name || scriptName,
        description,
        scriptPath,
        iconPath,
        iconType: iconPath ? 'image' : 'text',
        autoIconText: autoText,
        order: 0,
      }
      update((bp) => {
        const toolsets = bp.apps[app].toolsets.map((ts) => {
          if (ts.id !== toolsetId) return ts
          const buttons = [...ts.buttons, { ...button, order: ts.buttons.length }]
          return { ...ts, buttons }
        })
        return { ...bp, apps: { ...bp.apps, [app]: { toolsets } } }
      })
    },
    [update],
  )

  const updateButton = useCallback(
    (
      app: AppName,
      toolsetId: string,
      buttonId: string,
      fields: {
        name?: string
        description?: string
        scriptSrcPath?: string
        iconSrcPath?: string | null
        clearIcon?: boolean
      },
    ) => {
      update((bp) => {
        const toolsets = bp.apps[app].toolsets.map((ts) => {
          if (ts.id !== toolsetId) return ts
          const buttons = ts.buttons.map((btn) => {
            if (btn.id !== buttonId) return btn
            let { scriptPath, iconPath, iconType, autoIconText } = btn
            if (fields.scriptSrcPath) {
              // Derive dir from existing scriptPath (UUID or legacy name-based)
              scriptPath = updateScriptFile(btn.scriptPath, fields.scriptSrcPath)
            }
            if (fields.clearIcon) {
              iconPath = ''
              iconType = 'text'
            } else if (fields.iconSrcPath) {
              const refPath = btn.iconPath || btn.scriptPath
              iconPath = updateIconFile(refPath, fields.iconSrcPath)
              iconType = 'image'
            }
            const newName = fields.name ?? btn.name
            autoIconText = buildAutoIconText(newName)
            return {
              ...btn,
              name: newName,
              description: fields.description ?? btn.description,
              scriptPath,
              iconPath,
              iconType,
              autoIconText,
            }
          })
          return { ...ts, buttons }
        })
        return { ...bp, apps: { ...bp.apps, [app]: { toolsets } } }
      })
    },
    [update],
  )

  const deleteButton = useCallback(
    (app: AppName, toolsetId: string, buttonId: string) => {
      update((bp) => {
        let targetScriptPath = ''
        const toolsets = bp.apps[app].toolsets.map((ts) => {
          if (ts.id !== toolsetId) return ts
          const target = ts.buttons.find((b) => b.id === buttonId)
          if (target) targetScriptPath = target.scriptPath
          return { ...ts, buttons: ts.buttons.filter((b) => b.id !== buttonId) }
        })
        if (targetScriptPath) {
          try { deleteScriptDir(targetScriptPath) } catch { /* ok */ }
        }
        return { ...bp, apps: { ...bp.apps, [app]: { toolsets } } }
      })
    },
    [update],
  )

  const duplicateButton = useCallback(
    (app: AppName, toolsetId: string, buttonId: string) => {
      update((bp) => {
        const toolsets = bp.apps[app].toolsets.map((ts) => {
          if (ts.id !== toolsetId) return ts
          const original = ts.buttons.find((b) => b.id === buttonId)
          if (!original) return ts
          const newId   = uuidv4()
          const newName = original.name + ' Copy'
          let newScriptPath = original.scriptPath
          let newIconPath   = original.iconPath
          try {
            const duped = duplicateScriptDir(
              original.scriptPath,
              original.iconPath,
              app,
              newId,
            )
            newScriptPath = duped.scriptPath
            newIconPath   = duped.iconPath
          } catch { /* ok — keep original paths */ }
          const copy: ButtonDef = {
            ...original,
            id:          newId,
            name:        newName,
            scriptPath:  newScriptPath,
            iconPath:    newIconPath,
            autoIconText: buildAutoIconText(newName),
            order:       ts.buttons.length,
          }
          return { ...ts, buttons: [...ts.buttons, copy] }
        })
        return { ...bp, apps: { ...bp.apps, [app]: { toolsets } } }
      })
    },
    [update],
  )

  const setButtonHidden = useCallback(
    (app: AppName, toolsetId: string, buttonId: string, hidden: boolean) => {
      update((bp) => {
        const toolsets = bp.apps[app].toolsets.map((ts) => {
          if (ts.id !== toolsetId) return ts
          return {
            ...ts,
            buttons: ts.buttons.map((b) => (b.id === buttonId ? { ...b, hidden } : b)),
          }
        })
        return { ...bp, apps: { ...bp.apps, [app]: { toolsets } } }
      })
    },
    [update],
  )

  /**
   * Reorder a toolset. `orderedIds` may cover only part of the toolset — the
   * panel omits hidden buttons — so unlisted buttons keep their current slot and
   * the listed ones are dealt into the remaining slots in the given order.
   */
  const reorderButtons = useCallback(
    (app: AppName, toolsetId: string, orderedIds: string[]) => {
      update((bp) => {
        const toolsets = bp.apps[app].toolsets.map((ts) => {
          if (ts.id !== toolsetId) return ts
          const current = [...ts.buttons].sort((a, b) => a.order - b.order)
          const queue = orderedIds
            .map((id) => current.find((b) => b.id === id))
            .filter(Boolean) as ButtonDef[]
          const listed = new Set(queue.map((b) => b.id))
          let qi = 0
          const buttons = current.map((b) => (listed.has(b.id) ? queue[qi++] : b))
          return { ...ts, buttons: buttons.map((b, i) => ({ ...b, order: i })) }
        })
        return { ...bp, apps: { ...bp.apps, [app]: { toolsets } } }
      })
    },
    [update],
  )

  /**
   * Commit a whole-app button layout (settings drag). Buttons may travel between
   * toolsets of the same app; the script files live under Scripts/<app>/<buttonId>,
   * so no file has to move. Buttons the layout does not mention anywhere are kept
   * at the end of the toolset they are already in.
   */
  const applyButtonLayout = useCallback(
    (app: AppName, layout: Record<string, string[]>) => {
      update((bp) => {
        const byId = new Map<string, ButtonDef>()
        for (const ts of bp.apps[app].toolsets) {
          for (const b of ts.buttons) byId.set(b.id, b)
        }
        const mentioned = new Set(Object.values(layout).flat())

        const toolsets = bp.apps[app].toolsets.map((ts) => {
          const ids = layout[ts.id]
          if (!ids) return ts
          const listed = ids.map((id) => byId.get(id)).filter(Boolean) as ButtonDef[]
          const untouched = ts.buttons.filter((b) => !mentioned.has(b.id))
          const buttons = [...listed, ...untouched].map((b, i) => ({ ...b, order: i }))
          return { ...ts, buttons }
        })
        return { ...bp, apps: { ...bp.apps, [app]: { toolsets } } }
      })
    },
    [update],
  )

  // ── Settings operations ─────────────────────────────────────────────────────

  const updatePanelSettings = useCallback(
    (app: AppName, slot: PanelSlot, updates: Partial<PanelSettings>) => {
      update((bp) => ({
        ...bp,
        panelSettings: {
          ...bp.panelSettings,
          [app]: {
            ...bp.panelSettings[app],
            [slot]: { ...bp.panelSettings[app][slot], ...updates },
          },
        },
      }))
    },
    [update],
  )

  const updateAllocation = useCallback(
    (app: AppName, updates: Partial<AllocationMap>) => {
      update((bp) => ({
        ...bp,
        allocation: {
          ...bp.allocation,
          [app]: { ...bp.allocation[app], ...updates },
        },
      }))
    },
    [update],
  )

  return (
    <BlueprintsContext.Provider
      value={{
        blueprints,
        isLoaded,
        addToolset,
        renameToolset,
        deleteToolset,
        addButton,
        updateButton,
        deleteButton,
        duplicateButton,
        setButtonHidden,
        reorderButtons,
        applyButtonLayout,
        updatePanelSettings,
        updateAllocation,
        update,
      }}
    >
      {children}
    </BlueprintsContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBlueprints(): BlueprintsContextValue {
  const ctx = useContext(BlueprintsContext)
  if (!ctx) throw new Error('useBlueprints must be used within BlueprintsProvider')
  return ctx
}
