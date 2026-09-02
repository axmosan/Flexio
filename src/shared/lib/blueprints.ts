import { nfs } from './nodeEnv'
import { ensureDir } from './nodeEnv'
import { getBlueprintsPath, getFlexioRoot } from './paths'
import type {
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
    panelSettings: defaultPanelSettingsMap(),
    apps,
  }
}

// ─── Load ────────────────────────────────────────────────────────────────────

export function loadBlueprints(): BlueprintsData {
  const path = getBlueprintsPath()
  try {
    if (!nfs.existsSync(path)) return getDefaultBlueprints()
    const raw = nfs.readFileSync(path, 'utf8')
    const parsed = JSON.parse(raw) as BlueprintsData & {
      // Legacy fields that may be present
      settings?: { buttonScale?: number; buttonSpacing?: number; flipToReorder?: boolean }
      panelColumns?: Record<string, Record<string, number>>
    }

    // Ensure all apps exist
    for (const app of APP_NAMES) {
      if (!parsed.apps[app]) parsed.apps[app] = { toolsets: [] }
      if (!parsed.allocation[app]) parsed.allocation[app] = defaultAllocation()
    }

    // ── Migrate legacy structure → panelSettings ──────────────────────────────
    if (!parsed.panelSettings) {
      // Carry old global values forward as per-slot defaults
      const oldScale    = parsed.settings?.buttonScale   ?? 64
      const oldSpacing  = parsed.settings?.buttonSpacing ?? 8
      const oldFlip     = parsed.settings?.flipToReorder ?? false

      parsed.panelSettings = {} as PanelSettingsMap
      for (const slot of PANEL_SLOTS) {
        parsed.panelSettings[slot] = {
          scale: oldScale,
          spacing: oldSpacing,
          flipToReorder: oldFlip,
          uiMode: 'icon',
          iconShape: 'rounded',
          columns: 0,
        }
      }
      // Drop legacy fields
      delete parsed.settings
      delete parsed.panelColumns
    } else {
      // Ensure all slots exist and all fields are present (forward-compat)
      for (const slot of PANEL_SLOTS) {
        if (!parsed.panelSettings[slot]) {
          parsed.panelSettings[slot] = defaultPanelSettings()
        } else {
          const s = parsed.panelSettings[slot]
          if (s.scale        === undefined) s.scale        = 64
          if (s.spacing      === undefined) s.spacing      = 8
          if (s.flipToReorder === undefined) s.flipToReorder = false
          if (s.uiMode       === undefined) s.uiMode       = 'icon'
          if (s.iconShape    === undefined) s.iconShape    = 'rounded'
          if (s.columns      === undefined) s.columns      = 0
        }
      }
    }

    return parsed as BlueprintsData
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
