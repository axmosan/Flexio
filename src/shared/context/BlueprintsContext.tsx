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
  safeFolderName,
  buildAutoIconText,
} from '../lib/scriptManager'
import { dispatchBlueprintsChanged, onBlueprintsChanged } from '../lib/cepInterface'
import type {
  AppName,
  AllocationMap,
  BlueprintsData,
  ButtonDef,
  GlobalSettings,
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
  reorderButtons: (app: AppName, toolsetId: string, orderedIds: string[]) => void

  // Settings operations
  updateSettings: (updates: Partial<GlobalSettings>) => void
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

  // Initial load
  useEffect(() => {
    const data = loadBlueprints()
    setBlueprints(data)
    lastTimestampRef.current = getBlueprintsTimestamp()
    setIsLoaded(true)
  }, [])

  // Poll for external changes (panel sync)
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

  // Subscribe to blueprintsChanged events from other panels/settings window
  useEffect(() => {
    return onBlueprintsChanged(() => {
      const ts = getBlueprintsTimestamp()
      lastTimestampRef.current = ts
      setBlueprints(loadBlueprints())
    })
  }, [])

  // Commit changes to disk and update React state
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
            try { deleteScriptDir(app, safeFolderName(btn.name)) } catch { /* ok */ }
          }
        }
        // Remove from allocation if assigned
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
      const folderName = safeFolderName(name)
      const { scriptPath, scriptName } = saveScriptFile(app, scriptSrcPath, folderName)
      let iconPath = ''
      if (iconSrcPath) {
        const saved = saveIconFile(app, scriptName, iconSrcPath)
        iconPath = saved.iconPath
      }
      const autoText = buildAutoIconText(name || scriptName)
      const button: ButtonDef = {
        id: uuidv4(),
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
            const folderName = safeFolderName(btn.name)
            let { scriptPath, iconPath, iconType, autoIconText } = btn
            if (fields.scriptSrcPath) {
              scriptPath = updateScriptFile(app, folderName, fields.scriptSrcPath)
            }
            if (fields.clearIcon) {
              iconPath = ''
              iconType = 'text'
            } else if (fields.iconSrcPath) {
              iconPath = updateIconFile(app, folderName, fields.iconSrcPath)
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
        let deletedName = ''
        const toolsets = bp.apps[app].toolsets.map((ts) => {
          if (ts.id !== toolsetId) return ts
          const target = ts.buttons.find((b) => b.id === buttonId)
          if (target) deletedName = safeFolderName(target.name)
          return { ...ts, buttons: ts.buttons.filter((b) => b.id !== buttonId) }
        })
        if (deletedName) {
          try { deleteScriptDir(app, deletedName) } catch { /* ok */ }
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
          const newName = original.name + ' Copy'
          const newFolderName = safeFolderName(newName)
          try {
            duplicateScriptDir(app, safeFolderName(original.name), newFolderName)
          } catch { /* ok */ }
          const copy: ButtonDef = {
            ...original,
            id: uuidv4(),
            name: newName,
            scriptPath: original.scriptPath.replace(
              safeFolderName(original.name),
              newFolderName,
            ),
            iconPath: original.iconPath.replace(
              safeFolderName(original.name),
              newFolderName,
            ),
            order: ts.buttons.length,
          }
          return { ...ts, buttons: [...ts.buttons, copy] }
        })
        return { ...bp, apps: { ...bp.apps, [app]: { toolsets } } }
      })
    },
    [update],
  )

  const reorderButtons = useCallback(
    (app: AppName, toolsetId: string, orderedIds: string[]) => {
      update((bp) => {
        const toolsets = bp.apps[app].toolsets.map((ts) => {
          if (ts.id !== toolsetId) return ts
          const buttons = orderedIds.map((id, idx) => {
            const btn = ts.buttons.find((b) => b.id === id)
            return btn ? { ...btn, order: idx } : null
          }).filter(Boolean) as ButtonDef[]
          // Keep any buttons not in orderedIds at the end
          const remaining = ts.buttons.filter((b) => !orderedIds.includes(b.id))
          return { ...ts, buttons: [...buttons, ...remaining.map((b, i) => ({ ...b, order: buttons.length + i }))] }
        })
        return { ...bp, apps: { ...bp.apps, [app]: { toolsets } } }
      })
    },
    [update],
  )

  // ── Settings operations ─────────────────────────────────────────────────────

  const updateSettings = useCallback(
    (updates: Partial<GlobalSettings>) => {
      update((bp) => ({ ...bp, settings: { ...bp.settings, ...updates } }))
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
        reorderButtons,
        updateSettings,
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
