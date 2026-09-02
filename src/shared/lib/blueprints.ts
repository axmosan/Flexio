import { nfs } from './nodeEnv'
import { ensureDir } from './nodeEnv'
import { getBlueprintsPath, getFlexioRoot } from './paths'
import type {
  AppPanelSettingsMap,
  BlueprintsData,
  PanelSettings,
  PanelSettingsMap,
  AllocationMap,
} from '../types'
import { APP_NAMES, PANEL_SLOTS } from '../types'

// ─── Defaults ────────────────────────────────────────────────────────────────

function defaultAllocation(): AllocationMap {
  return { panel1: '', panel2: '', panel3: '', panel4: '' }
}

export function defaultPanelSettings(): PanelSettings {
  return {
    scale: 64,
    spacing: 8,
    flipToReorder: false,
    uiMode: 'icon',
    iconShape: 'rounded',
    columns: 0,
  }
}

function defaultPanelSettingsMap(): PanelSettingsMap {
  return {
    panel1: defaultPanelSettings(),
    panel2: defaultPanelSettings(),
    panel3: defaultPanelSettings(),
    panel4: defaultPanelSettings(),
  }
}

function defaultAppPanelSettings(): AppPanelSettingsMap {
  const map = {} as AppPanelSettingsMap
  for (const app of APP_NAMES) map[app] = defaultPanelSettingsMap()
  return map
}

export function getDefaultBlueprints(): BlueprintsData {
  const apps = {} as BlueprintsData['apps']
  const allocation = {} as BlueprintsData['allocation']
  for (const app of APP_NAMES) {
    apps[app] = { toolsets: [] }
    allocation[app] = defaultAllocation()
  }
  return {
    version: '1.2.0',
    lastModified: new Date().toISOString(),
    allocation,
    panelSettings: defaultAppPanelSettings(),
    apps,
  }
}

// ─── panelSettings normalisation / migration ─────────────────────────────────

/** Fill in any field a stored (or imported) panel settings object is missing. */
export function normalizePanelSettings(s?: Partial<PanelSettings> | null): PanelSettings {
  const d = defaultPanelSettings()
  if (!s) return d
  // Field by field: a missing key must fall back to the default, and `false`
  // / `0` are legitimate stored values that must survive.
  return {
    scale:         s.scale         ?? d.scale,
    spacing:       s.spacing       ?? d.spacing,
    flipToReorder: s.flipToReorder ?? d.flipToReorder,
    uiMode:        s.uiMode        ?? d.uiMode,
    iconShape:     s.iconShape     ?? d.iconShape,
    columns:       s.columns       ?? d.columns,
  }
}

/**
 * Up to v1.2 `panelSettings` was keyed by slot only, so every host app shared
 * one set of visual settings. The current shape is keyed by app first.
 * Slot keys at the top level mean we are looking at the old shape.
 */
export function isSlotKeyedPanelSettings(
  ps: AppPanelSettingsMap | PanelSettingsMap,
): ps is PanelSettingsMap {
  return PANEL_SLOTS.some((slot) => slot in ps)
}

/** Expand any stored/imported shape into a full per-app, per-slot map. */
function toAppPanelSettings(
  ps: AppPanelSettingsMap | PanelSettingsMap | undefined,
  fallback: PanelSettings,
): AppPanelSettingsMap {
  const slotKeyed = ps && isSlotKeyedPanelSettings(ps) ? ps : null
  const appKeyed  = ps && !slotKeyed ? (ps as AppPanelSettingsMap) : null

  const result = {} as AppPanelSettingsMap
  for (const app of APP_NAMES) {
    const slots = {} as PanelSettingsMap
    for (const slot of PANEL_SLOTS) {
      // Slot-keyed data predates per-app settings: every app inherits a copy.
      const stored = slotKeyed ? slotKeyed[slot] : appKeyed?.[app]?.[slot]
      slots[slot] = stored ? normalizePanelSettings(stored) : { ...fallback }
    }
    result[app] = slots
  }
  return result
}

// ─── Load ────────────────────────────────────────────────────────────────────

export function loadBlueprints(): BlueprintsData {
  const path = getBlueprintsPath()
  try {
    if (!nfs.existsSync(path)) return getDefaultBlueprints()
    const raw = nfs.readFileSync(path, 'utf8')
    const parsed = JSON.parse(raw) as Omit<BlueprintsData, 'panelSettings'> & {
      panelSettings?: AppPanelSettingsMap | PanelSettingsMap
      // Legacy fields that may be present
      settings?: { buttonScale?: number; buttonSpacing?: number; flipToReorder?: boolean }
      panelColumns?: Record<string, Record<string, number>>
    }

    // Ensure all apps exist
    for (const app of APP_NAMES) {
      if (!parsed.apps[app]) parsed.apps[app] = { toolsets: [] }
      if (!parsed.allocation[app]) parsed.allocation[app] = defaultAllocation()
    }

    // ── Migrate every historical shape → per-app, per-slot panelSettings ─────
    // v1.0: one global `settings` object; v1.1–v1.2: keyed by slot only.
    const legacyBase = normalizePanelSettings({
      scale:         parsed.settings?.buttonScale,
      spacing:       parsed.settings?.buttonSpacing,
      flipToReorder: parsed.settings?.flipToReorder,
    })
    const panelSettings = toAppPanelSettings(parsed.panelSettings, legacyBase)

    // Drop legacy fields
    delete parsed.settings
    delete parsed.panelColumns

    return { ...parsed, panelSettings } as BlueprintsData
  } catch {
    return getDefaultBlueprints()
  }
}

// ─── Save ────────────────────────────────────────────────────────────────────

export function saveBlueprints(data: BlueprintsData): void {
  data.lastModified = new Date().toISOString()
  const path = getBlueprintsPath()
  ensureDir(getFlexioRoot())
  nfs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8')
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getBlueprintsTimestamp(): string {
  try {
    const path = getBlueprintsPath()
    if (!nfs.existsSync(path)) return ''
    const stat = nfs.statSync(path)
    return stat.mtimeMs.toString()
  } catch {
    return ''
  }
}
